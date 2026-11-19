"""Split a FigJam to Paper export into image files and HTML parts small enough to paste into Paper.

Usage:
    python3 tools/split_export.py figjam-export.json out/ [--budget 24000] [--asset-prefix URL]

Writes:
    out/assets/<key>.png      images referenced by the HTML
    out/parts/<nn>-<board>-<pp>.html
                              each board's HTML, cut only between top-level elements,
                              at most --budget characters per part (one oversized element stays whole)
    out/plan.json             every board with its name, position, size, fill, border, radius
                              and the ordered list of parts to paste into it

Everything is checked before anything is written: balanced HTML, element counts matching the
export, and every referenced image present. The output folder must be new or empty.
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from pathlib import Path

PLACEHOLDER = "__FIGJAM_ASSET__"
ASSET_REF = re.compile(re.escape(PLACEHOLDER) + r"/([\w-]+)\.png")
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


def split_export(export_path: Path, out: Path, budget: int, asset_prefix: str) -> dict:
    data = json.loads(Path(export_path).read_text())
    sections, images = data["sections"], data["images"]
    if out.exists() and any(out.iterdir()):
        raise ExportError(f"output folder {out} is not empty; choose a new one")

    # Check everything first, write nothing until it all passes.
    split = []
    for s in sections:
        missing = sorted(set(ASSET_REF.findall(s["html"])) - set(images))
        if missing:
            raise ExportError(f"board {s['id']} uses images missing from the export: {', '.join(missing)}")
        els = elements(s["html"].replace(PLACEHOLDER, asset_prefix))
        if len(els) != s["total"]:
            raise ExportError(f"board {s['id']}: HTML has {len(els)} top-level elements, export says {s['total']}")
        split.append(group(els, budget))

    min_x = min(s["x"] for s in sections)
    min_y = min(s["y"] for s in sections)
    (out / "assets").mkdir(parents=True, exist_ok=True)
    (out / "parts").mkdir(exist_ok=True)
    for key, b64 in images.items():
        (out / "assets" / f"{key}.png").write_bytes(base64.b64decode(b64))

    plan = {"budget": budget, "asset_prefix": asset_prefix, "sections": []}
    for i, (s, groups) in enumerate(zip(sections, split)):
        parts = []
        for p, g in enumerate(groups):
            name = f"{i:02d}-{_slug(s['id'])}-{p:02d}.html"
            text = "".join(g)
            (out / "parts" / name).write_text(text)
            parts.append({"file": name, "elements": len(g), "chars": len(text), "over_budget": len(text) > budget})
        plan["sections"].append({
            "id": s["id"], "name": s["name"],
            "left": round(s["x"] - min_x, 2), "top": round(s["y"] - min_y, 2),
            "width": s.get("w"), "height": s.get("h"),
            "fill": s.get("fill"), "border": s.get("stroke") or None, "radius": s.get("r"),
            "parts": parts,
        })
    (out / "plan.json").write_text(json.dumps(plan, indent=2) + "\n")
    return plan


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("export", type=Path, help="figjam-export.json downloaded from the plugin")
    ap.add_argument("out", type=Path, help="new or empty output folder")
    ap.add_argument("--budget", type=int, default=24000,
                    help="maximum characters per HTML part (default 24000, the size used in testing)")
    ap.add_argument("--asset-prefix",
                    help="what image src values start with (default paper-asset://<absolute out>/assets, "
                         "which Paper's MCP write_html reads from local disk)")
    args = ap.parse_args(argv)
    prefix = args.asset_prefix or f"paper-asset://{(args.out / 'assets').resolve()}"
    try:
        plan = split_export(args.export, args.out, args.budget, prefix)
    except ExportError as e:
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
