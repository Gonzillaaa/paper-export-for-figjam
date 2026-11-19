# Paper Export for FigJam

Keep working on your FigJam workshop in Paper. Each section becomes an artboard, with the sticky notes and shapes where your team left them. You can move a note, edit its text and pick up the conversation there.

In this sample launch retro, the team votes on what slowed them down. Four votes land on the review queue. They’ll take that observation into Paper and agree on an experiment.

![FigJam workshop with five clustered sticky notes and seven purple vote dots. The review queue receives four votes.](docs/images/demo-figjam.png)

## Use it

You’ll need the plugin in Figma, Python 3.10 or later, and an agent connected to Paper Desktop. Download and unzip this project to get the splitter. It runs with Python alone. [Download the project ZIP](https://github.com/Gonzillaaa/paper-export-for-figjam/archive/refs/heads/main.zip) · [Connect your agent to Paper](https://paper.design/docs/mcp).

1. **Save your workshop.** Open the FigJam page you want and run **Paper Export for FigJam**. Save `figjam-export.json` beside this README. If the save dialog doesn’t appear, click **Download board JSON**. If you’re installing from source, first choose **Plugins → Development → Import plugin from manifest** in Figma Desktop and select `plugin/manifest.json`.
2. **Prepare the layers.** Open a terminal in the project folder and run the command below. It creates `out/` with your artboard plan, layers and images. Choose a new or empty folder for each export.

   ```sh
   python3 tools/split_export.py figjam-export.json out/
   ```

   On Windows, use `py -3` in place of `python3`.

3. **Bring it into Paper.** Open your destination file in Paper Desktop, give your connected agent access to `out/`, and paste this prompt.

   > Import my workshop from `out/plan.json` onto this Paper page. Create an artboard for each entry using its name, dimensions, fill, shadow and radius. If there’s a board for loose items, size it to fit its contents. After creating each artboard, set its left and top from the plan with `update_styles`. Read its files from `out/parts/` in order and insert each file’s exact HTML once using `write_html` with `insert-children`. Check each board’s position and direct child count against the plan, then show me the result.

## Inside the sample workshop

After **Gather & vote**, the team moves to **Decide & assign**. They sketch who can take a review when the usual reviewer is busy and pick a two-Friday trial. Here’s the second activity in Paper.

![Imported Paper artboard with a branching review flow, the edited experiment sticky, an owner and a follow-up measure.](docs/images/demo-paper.png)

The yellow note started as a reminder in FigJam. We edited it in Paper to record who volunteered and when they’d be available.

![The original FigJam sticky says “Pick a backup reviewer for next Friday.” The same sticky edited in Paper says “Sam will cover Friday reviews until noon.”](docs/images/demo-edit.png)

To try this workshop yourself, import `demo/build-board/manifest.json` as a development plugin, run **Paper Export demo board** on an empty FigJam page, then export it with the main plugin.

## What comes across

Sticky notes and text stay editable. Sections, groups and frames keep their layout, image rectangles become image layers, and visible items outside sections get their own artboard. Voting dots in this sample are ordinary FigJam shapes.

A few details change. Connectors become fixed graphics, decision diamonds become rectangles, and sticky author labels are omitted. Font availability can affect line breaks. To compare a particular board, use **Export reference PNGs** in the plugin. [Import details, limits and troubleshooting](docs/import.md).

The plugin reads the current page and has no network access. Exported files contain the workshop content. When you import, the chosen content goes to Paper and may also be shared with your agent.

[Report an issue](https://github.com/Gonzillaaa/paper-export-for-figjam/issues) · [Development and checks](docs/import.md#development) · [Listing and artwork](docs/community/listing.md) · [MIT license](LICENSE)
