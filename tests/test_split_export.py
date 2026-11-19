"""Tests for tools/split_export.py. Run with: uv run pytest"""
import base64
import json
from pathlib import Path

import pytest
from split_export import ExportError, elements, group, split_export

PNG = base64.b64encode(b"\x89PNG fake bytes").decode()


def test_bundled_workshop_splits_into_four_artboards_without_losing_layers(tmp_path):
    from split_export import main

    source = Path(__file__).resolve().parents[1] / "demo" / "workshop.json"
    out = tmp_path / "workshop"
    assert main([str(source), str(out)]) == 0
    boards = json.loads(source.read_text(encoding="utf-8"))["sections"]
    plan = json.loads((out / "plan.json").read_text(encoding="utf-8"))
    assert len(plan["sections"]) == len(boards) == 4
    for board, imported in zip(boards, plan["sections"]):
        parts = imported["parts"]
        assert sum(part["elements"] for part in parts) == board["total"]
        assert "".join((out / "parts" / p["file"]).read_text(encoding="utf-8") for p in parts) == board["html"]


def section(id_, html, total, **geo):
    base = {"id": id_, "name": f"Board {id_}", "x": 100, "y": 50, "w": 800, "h": 600,
            "fill": "#FFFFFF", "stroke": "", "r": 0}
    return {**base, **geo, "total": total, "html": html}


def write_export(tmp_path, sections, images=None):
    path = tmp_path / "figjam-export.json"
    path.write_text(json.dumps({"fileKey": None, "page": "0:1", "sections": sections, "images": images or {}}))
    return path


# Splitting must never lose or reorder characters, or pasted boards silently drop items.
def test_elements_round_trip_with_nesting_void_tags_and_quoted_angle_brackets():
    html = ('<div style="a"><p>x &lt; y</p><img src="a.png" /></div>'
            '<svg layer-name="a > b"><path d="M0 0"/></svg><p>tail</p>')
    els = elements(html)
    assert len(els) == 3
    assert "".join(els) == html


# Unbalanced HTML means the plugin output is broken; fail rather than paste half a board.
def test_elements_rejects_unbalanced_html():
    with pytest.raises(ExportError, match="unbalanced"):
        elements("<div><p>open</div></div>")


# Parts stay under the budget, keep order, and an element larger than the budget is never cut.
def test_group_respects_budget_and_keeps_oversized_elements_whole():
    els = ["a" * 40, "b" * 40, "c" * 150, "d" * 10]
    assert group(els, 100) == [["a" * 40, "b" * 40], ["c" * 150], ["d" * 10]]


def test_split_writes_parts_assets_and_plan(tmp_path):
    html = ('<div>one</div><img src="__FIGJAM_ASSET__/k1.png" />'
            '<p>three</p>')
    export = write_export(tmp_path, [
        section("1:2", html, 3),
        section("1:9", "<p>far</p>", 1, x=1100, y=-50),
        {"id": "LOOSE", "name": "Loose page items", "x": 0, "y": 0, "total": 1, "html": "<p>loose</p>"},
    ], images={"k1": PNG})
    out = tmp_path / "out"

    plan = split_export(export, out, budget=20, asset_prefix="paper-asset://ASSETS")

    assert (out / "assets" / "k1.png").read_bytes() == b"\x89PNG fake bytes"
    first = plan["sections"][0]
    assert (first["left"], first["top"]) == (100, 100)  # positions are relative to the top-left of all boards
    assert plan["sections"][1]["top"] == 0
    assert plan["sections"][2]["width"] is None  # loose items have no board size
    pasted = "".join((out / "parts" / p["file"]).read_text() for p in first["parts"])
    assert pasted == html.replace("__FIGJAM_ASSET__", "paper-asset://ASSETS")
    assert sum(p["elements"] for p in first["parts"]) == 3
    assert json.loads((out / "plan.json").read_text()) == plan


# A count mismatch means the HTML does not match the board; stop before anything is written.
def test_split_rejects_element_count_mismatch(tmp_path):
    export = write_export(tmp_path, [section("1:2", "<p>a</p>", 2)])
    with pytest.raises(ExportError, match="1:2"):
        split_export(export, tmp_path / "out", budget=100, asset_prefix="x")
    assert not (tmp_path / "out").exists()


# Never overwrite or mix with an earlier run's files.
def test_split_refuses_non_empty_output_dir(tmp_path):
    export = write_export(tmp_path, [section("1:2", "<p>a</p>", 1)])
    out = tmp_path / "out"
    out.mkdir()
    (out / "keep.txt").write_text("mine")
    with pytest.raises(ExportError, match="not empty"):
        split_export(export, out, budget=100, asset_prefix="x")
    assert (out / "keep.txt").read_text() == "mine"


# An image the HTML points to but the export lacks would paste as a broken image.
def test_split_rejects_missing_image(tmp_path):
    export = write_export(tmp_path, [section("1:2", '<img src="__FIGJAM_ASSET__/gone.png" />', 1)])
    with pytest.raises(ExportError, match="gone"):
        split_export(export, tmp_path / "out", budget=100, asset_prefix="x")


@pytest.mark.parametrize("key,value", [("invalid/key", PNG), ("second", "invalid base64")])
def test_invalid_image_leaves_existing_empty_directory_untouched(tmp_path, key, value):
    export = write_export(tmp_path, [section("1", "<p>ok</p>", 1)], {"first": PNG, key: value})
    out = tmp_path / "out"
    out.mkdir()
    with pytest.raises(ExportError, match="image"):
        split_export(export, out, 100, "assets")
    assert list(out.iterdir()) == []


def test_empty_page_writes_empty_plan(tmp_path):
    export = write_export(tmp_path, [])
    out = tmp_path / "out"
    plan = split_export(export, out, 100, "assets")
    assert plan["sections"] == []
    assert json.loads((out / "plan.json").read_text()) == plan


def test_asset_rewrite_preserves_board_text_and_escapes_attribute(tmp_path):
    label = "__FIGJAM_ASSET__/label.png"
    html = f'<p>{label}</p><img layer-name="{label}" src="__FIGJAM_ASSET__/k1.png" />'
    export = write_export(tmp_path, [section("1", html, 2)], {"k1": PNG})
    out = tmp_path / "out"
    plan = split_export(export, out, 1000, 'local/" & assets')
    part = plan["sections"][0]["parts"][0]["file"]
    assert (out / "parts" / part).read_text() == html.replace(
        'src="__FIGJAM_ASSET__', 'src="local/&quot; &amp; assets'
    )


@pytest.mark.parametrize("data,budget", [
    ({"sections": [], "images": {}}, 0),
    ({"some-section": "PNG"}, 100),
    ({"sections": [section("1", "", 0, x="x")], "images": {}}, 100),
    ({"sections": [section("1", "", 0), {"id": "missing"}], "images": {}}, 100),
])
def test_cli_rejects_invalid_exports_without_creating_output(tmp_path, capsys, data, budget):
    from split_export import main

    export = tmp_path / "export.json"
    export.write_text(json.dumps(data))
    out = tmp_path / "out"
    assert main([str(export), str(out), "--budget", str(budget)]) != 0
    assert "error:" in capsys.readouterr().err
    assert not out.exists()


def test_legacy_photos_get_their_actual_extension(tmp_path):
    raw = b"\xff\xd8\xff\xe0demo"
    data = write_export(tmp_path, [section("1", '<img src="__FIGJAM_ASSET__/k.png"/>', 1)],
                        {"k": base64.b64encode(raw).decode()})
    out = tmp_path / "out"
    plan = split_export(data, out, 100, "assets")
    part = plan["sections"][0]["parts"][0]["file"]
    assert (out / "assets/k.jpg").read_bytes() == raw
    assert (out / "parts" / part).read_text() == '<img src="assets/k.jpg"/>'


def test_image_keys_are_portable_across_platforms(tmp_path):
    data = write_export(tmp_path, [], {"CON": PNG})
    with pytest.raises(ExportError, match="image"):
        split_export(data, tmp_path / "out", 100, "assets")


def test_concurrent_runs_publish_one_complete_result(tmp_path):
    from concurrent.futures import ThreadPoolExecutor

    export = write_export(tmp_path, [section("1", "<p>ok</p>", 1)])
    out = tmp_path / "out"
    out.mkdir()
    with ThreadPoolExecutor(max_workers=2) as workers:
        jobs = [workers.submit(split_export, export, out, 100, "assets") for _ in range(2)]
    assert sum(job.exception() is None for job in jobs) == 1
    winner = next(job.result() for job in jobs if job.exception() is None)
    assert json.loads((out / "plan.json").read_text()) == winner
    assert (out / "parts" / winner["sections"][0]["parts"][0]["file"]).read_text() == "<p>ok</p>"
