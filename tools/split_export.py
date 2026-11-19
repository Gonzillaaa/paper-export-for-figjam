"""Split a FigJam to Paper export into image files and HTML parts small enough to paste into Paper.

Usage:
    python3 tools/split_export.py figjam-export.json out/ [--budget 24000] [--asset-prefix URL]

Writes:
    out/assets/                decoded images referenced by the HTML
    out/parts/<nn>-<board>-<pp>.html
                              each board's HTML, cut only between top-level elements,
                              at most --budget characters per part (one oversized element stays whole)
    out/plan.json             every board with its name, position, size, fill, border, radius
                              and the ordered list of parts to paste into it

The complete result replaces a new or empty output folder after validation.
"""
from __future__ import annotations

import argparse
import base64
import binascii
import html as markup
import json
import math
import os
import re
import sys
import tempfile
from pathlib import Path

PLACEHOLDER = "__FIGJAM_ASSET__"
ASSET_KEY = re.compile(r"[A-Za-z0-9_-]+")
RESERVED_NAME = re.compile(r"(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", re.IGNORECASE)
ATTRIBUTE = re.compile(r"""(\s+)([^\s=/>]+)(\s*=\s*)("[^"]*"|'[^']*')""")
TAG = re.compile(r'<(/?)([a-zA-Z][\w:.-]*)(?:[^>"]|"[^"]*")*?(/?)>')
VOID = {"img", "br", "hr", "input", "meta", "link"}


class ExportError(Exception):
    """The export cannot be split safely."""


def elements(html: str) -> list[str]:
    """Split HTML into its top-level elements, losing no characters."""
    els, stack, start = [], [], 0
    for m in TAG.finditer(html):
        closing, tag, selfclose = m.group(1), m.group(2).lower(), m.group(3)
        if not stack and not closing:
            start = m.start()
        if closing:
            if not stack or stack.pop() != tag:
                raise ExportError(f"unbalanced HTML: unexpected </{tag}> at character {m.start()}")
        elif not selfclose and tag not in VOID:
            stack.append(tag)
        if not stack:
            els.append(html[start:m.end()])
    if stack or "".join(els) != html:
        raise ExportError("unbalanced HTML: elements do not add back up to the original")
    return els


def group(els: list[str], budget: int) -> list[list[str]]:
    """Pack elements in order into groups of at most `budget` characters."""
    groups, cur, size = [], [], 0
    for e in els:
        if cur and size + len(e) > budget:
            groups.append(cur)
            cur, size = [], 0
        cur.append(e)
        size += len(e)
    if cur:
        groups.append(cur)
    return groups


def _slug(section_id: str) -> str:
    return re.sub(r"[^\w-]", "-", section_id).lower()


def image_files(images, directory):
    """Decode only portable file names inside the private staging directory."""
    names = {}
    used = set()
    for key, value in images.items():
        if not ASSET_KEY.fullmatch(key) or RESERVED_NAME.fullmatch(key) or key.casefold() in used:
            raise ExportError(f"invalid or duplicate image key {key!r}")
        if not isinstance(value, str) or not value:
            raise ExportError(f"missing base64 data for image {key}")
        try:
            raw = base64.b64decode(value, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ExportError(f"invalid base64 for image {key}") from error
        # Older exporters kept the original JPEG or GIF bytes under a PNG reference.
        extension = ".png"
        if raw.startswith(b"\xff\xd8\xff"):
            extension = ".jpg"
        elif raw.startswith((b"GIF87a", b"GIF89a")):
            extension = ".gif"
        names[key] = key + extension
        used.add(key.casefold())
        (directory / names[key]).write_bytes(raw)
    return names


def resolve_images(html, names, prefix, board):
    def rewrite_tag(tag):
        if tag[1] or tag[2].lower() != "img":
            return tag[0]

        def rewrite_attribute(attr):
            value = attr[4][1:-1]
            if attr[2].lower() != "src" or not value.startswith(PLACEHOLDER + "/"):
                return attr[0]
            key = value[len(PLACEHOLDER) + 1:].removesuffix(".png")
            if key not in names:
                raise ExportError(f"board {board} uses image missing from the export: {key}")
            url = markup.escape(f"{prefix.rstrip('/')}/{names[key]}", quote=True)
            return f'{attr[1]}{attr[2]}{attr[3]}"{url}"'

        return ATTRIBUTE.sub(rewrite_attribute, tag[0])

    return TAG.sub(rewrite_tag, html)


def validate_section(section):
    if not isinstance(section, dict) or not all(isinstance(section.get(k), str) for k in ("id", "name", "html")):
        raise ExportError("each board needs an id, name and HTML string")
    if type(section.get("total")) is not int or section["total"] < 0:
        raise ExportError(f"board {section['id']} has an invalid item count")
    for key in ("x", "y", "w", "h", "r"):
        value = section.get(key)
        if value is None and key in ("w", "h", "r"):
            continue
        if type(value) not in (int, float) or not math.isfinite(value):
            raise ExportError(f"board {section['id']} has invalid geometry for {key}")


def write_export(data, stage, budget, asset_prefix):
    sections = data["sections"]
    for s in sections:
        validate_section(s)
    (stage / "parts").mkdir()
    (stage / "assets").mkdir()
    names = image_files(data["images"], stage / "assets")
    min_x = min((s["x"] for s in sections), default=0)
    min_y = min((s["y"] for s in sections), default=0)
    plan = {"budget": budget, "asset_prefix": asset_prefix, "sections": []}
    for i, s in enumerate(sections):
        els = elements(resolve_images(s["html"], names, asset_prefix, s["id"]))
        if len(els) != s["total"]:
            raise ExportError(f"board {s['id']}: HTML has {len(els)} top-level elements, export says {s['total']}")
        groups = group(els, budget)
        parts = []
        for p, g in enumerate(groups):
            name = f"{i:02d}-{_slug(s['id'])}-{p:02d}.html"
            text = "".join(g)
            (stage / "parts" / name).write_text(text, encoding="utf-8", newline="")
            parts.append({"file": name, "elements": len(g), "chars": len(text), "over_budget": len(text) > budget})
        plan["sections"].append({
            "id": s["id"], "name": s["name"],
            "left": round(s["x"] - min_x, 2), "top": round(s["y"] - min_y, 2),
            "width": s.get("w"), "height": s.get("h"),
            "fill": s.get("fill"), "border": s.get("stroke") or None, "radius": s.get("r"),
            "parts": parts,
        })
    (stage / "plan.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    return plan


def split_export(export_path: Path, out: Path, budget: int, asset_prefix: str) -> dict:
    if type(budget) is not int or budget <= 0:
        raise ExportError("budget must be a positive integer")
    data = json.loads(Path(export_path).read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict) or not isinstance(data.get("sections"), list) or not isinstance(data.get("images"), dict):
        raise ExportError("expected a board export with sections and images; use figjam-export.json")
    if out.is_symlink() or (out.exists() and (not out.is_dir() or any(out.iterdir()))):
        raise ExportError(f"output path {out} is not empty or is not a directory; choose a new one")

    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent) as temporary:
        stage = Path(temporary) / "export"
        stage.mkdir()
        plan = write_export(data, stage, budget, asset_prefix)
        # POSIX can replace an empty directory atomically. Windows needs it vacant.
        if os.name == "nt" and out.is_dir():
            out.rmdir()
        stage.rename(out)
    return plan


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("export", type=Path, help="figjam-export.json downloaded from the plugin")
    ap.add_argument("out", type=Path, help="new or empty output folder")
    ap.add_argument("--budget", type=int,
                    help="maximum characters per HTML part (default from tools/settings.json)")
    ap.add_argument("--asset-prefix",
                    help="what image src values start with (default paper-asset://<absolute out>/assets, "
                         "which Paper's MCP write_html reads from local disk)")
    args = ap.parse_args(argv)
    prefix = args.asset_prefix or (args.out / "assets").resolve().as_uri().replace("file:", "paper-asset:", 1)
    try:
        settings = json.loads(Path(__file__).with_name("settings.json").read_text(encoding="utf-8"))
        if not isinstance(settings, dict) or "partBudget" not in settings:
            raise ExportError("missing partBudget in tools/settings.json")
        budget = settings["partBudget"] if args.budget is None else args.budget
        plan = split_export(args.export, args.out, budget, prefix)
    except (ExportError, OSError, ValueError, OverflowError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    for s in plan["sections"]:
        n = sum(p["elements"] for p in s["parts"])
        print(f"{s['name']}: {len(s['parts'])} part(s), {n} items")
        for p in s["parts"]:
            if p["over_budget"]:
                print(f"  warning: {p['file']} is {p['chars']} characters, over the budget (one large item)")
    print(f"Wrote {sum(len(s['parts']) for s in plan['sections'])} parts and the plan to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
