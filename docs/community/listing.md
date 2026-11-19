# Board Export on Figma Community

| Field | Value |
| --- | --- |
| Name | Board Export |
| Tagline | Move FigJam boards into Paper |
| Suggested category | Design tools |
| Support | [GitHub Issues](https://github.com/Gonzillaaa/board-export/issues) |
| Instructions and splitter | [Project README](https://github.com/Gonzillaaa/board-export#use-it) |
| Icon | [128 × 128 PNG](icon.png) |
| Cover | [1920 × 1080 PNG](cover.png) |

## Description

Bring a workshop into Paper with its sticky notes, text and layout in place. Board Export saves the visible sections and loose items on your current FigJam page as one JSON file. Your FigJam board stays untouched.

Run the companion Python splitter on the download, then use an agent connected to Paper Desktop to import the generated layers. Notes and text remain editable. Photos become image layers, connectors become static graphics, and decision diamonds become rectangles.

You’ll need Python 3.10 or later, the free splitter and a Paper Desktop MCP connection. The plugin has no network access. [Get the splitter and follow the walkthrough](https://github.com/Gonzillaaa/board-export#use-it).

## Submission

1. Run the tests in the README. In Figma Desktop, run Board Export on the demo page, save the JSON and split it into an empty folder. The demo produces three plan entries with 9, 11 and 1 top-level items. Check the imported artboards in Paper.
2. In **Plugins → Manage plugins**, open **Publish** for Board Export. Use the name, tagline, description and category above. Upload the PNG icon and cover. Both have editable SVG sources in this directory. The cover uses the repository’s original demo screenshots.
3. Enter the GitHub Issues URL in the support field. Verify that the manifest ID matches the one Figma assigned and that Figma displays **No network access**.
4. The publishing account must have two-factor authentication enabled. The publisher selects the author, reviews the Community terms and submits the plugin when ready. [Figma’s publishing guide](https://help.figma.com/hc/en-us/articles/360042293394-Publish-classic-plugins-to-the-Figma-Community).
