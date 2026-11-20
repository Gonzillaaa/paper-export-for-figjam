# Import details

## Files and options

The splitter writes `out/plan.json` with artboard names, dimensions and positions relative to the top-left of the export. Each entry lists its HTML files under `out/parts/` in drawing order. `out/assets/` holds local images.

- `--budget N` sets the character budget per part. The default is 24,000. The splitter keeps a single oversized layer intact and prints a warning.
- `--asset-prefix URL` overrides the image location. The default is an absolute `paper-asset://` path for the local Paper Desktop MCP server. If you move the output folder, split the original export again in the new location.
- **Export reference PNGs** saves `figjam-reference-pngs.json`. It contains a base64-encoded PNG for each visible section, keyed by its section ID with the colon replaced by a hyphen.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| No JSON download | Use **Download board JSON** or **Copy board JSON**. Save the clipboard as a plain UTF-8 text file named `figjam-export.json`. |
| The splitter asks for a board export | Select `figjam-export.json`. The similarly named reference download contains pictures for comparison. |
| The output folder already contains files | Pick another folder. The splitter checks HTML balance, item counts and image references before publishing the output. |
| An empty plan | Check that you exported the right FigJam page and that its layers are visible. |
| Artboards appear in the wrong positions | Paper picks a free spot when it creates a board. Apply the plan’s left and top with `update_styles` after creation. |
| Unexpected text or a count mismatch | Read the raw HTML files from `out/parts/` without line numbers. Check which parts are already present before retrying. |
| Images are missing | Keep the split output in place and make sure Paper Desktop can read its local assets. |

## Fidelity

Text carries font names, size, weight, colour, alignment, spacing and supported mixed styles. List markers become text. Ellipses keep their outline. Other shapes with text use rectangles or rounded rectangles. Shapes built from multiple paints, rotations, masks or complex text may look different.

Connectors, vectors and stamps export as SVGs. An SVG with an embedded bitmap or over 60,000 characters becomes a PNG at 2× scale. Image rectangles are rendered with their crop and effects. Hidden layers, comments, widget interactions and other pages are outside the export.

An earlier version was also exercised on a larger workshop with 15 sections, 548 top-level items, 8 images and 73 connectors.

**Manual paste (untested).** Paper supports pasting HTML with inline styles. This route requires publicly accessible image URLs. Use `--asset-prefix` if your images are already intended to be public. [Paper’s HTML import guide](https://paper.design/docs/paste/html).

## Development

The main plugin runs as plain JavaScript. `plugin/settings.json` holds the raster scale, reference width, SVG threshold and dialog size. `tools/settings.json` sets the default split budget.

```sh
node --test
npx --yes oxlint@1.94.0 --deny-warnings plugin/code.js demo/build-board/code.js tests
uv run --locked pytest
uv run --locked ruff check .
```

The JavaScript tests exercise the exporter, UI and demo builder through Figma and browser boundary fixtures. Python tests cover the splitter using files, including malformed exports, images and concurrent writes. For a live smoke test, build the sprint sample on an empty FigJam page and import it into Paper. Check that all three planned tickets have matching review notes and that the invite-list sketch expands into editable layers. Edit the lilac follow-up and compare it with the original in FigJam. [Workshop walkthrough](../README.md#inside-the-sample-workshop).
