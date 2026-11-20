# Paper Export for FigJam

Take a FigJam workshop into Paper. The notes stay where your team put them, and you can still move them around and edit what they say.

The sample follows a two-week sprint called **Team invites**. A workspace admin has sent an email twice and still can’t tell whether Kai joined. The team has eight points to spend. They pick three tickets and leave bulk resend for later.

![Team invites sprint board in FigJam, with “Copy link” circled on an expired invitation. The Paper Export for FigJam dialog shows that the board JSON download was requested.](docs/images/demo-figjam.png)

**Try the sample first.** The project includes the workshop export. From the project folder, run `node tools/split_export.js demo/workshop.json sample-out/`, then use the prompt in step 3 with `sample-out/` as your folder. [Sample export](demo/workshop.json)

## Use it

You’ll need the plugin in Figma, Node.js 22 or later, and an agent connected to Paper Desktop. Download and unzip this project to get the splitter. It runs directly with Node and uses only built-in modules. [Download the project ZIP](https://github.com/Gonzillaaa/paper-export-for-figjam/archive/refs/heads/main.zip) · [Connect your agent to Paper](https://paper.design/docs/mcp).

1. **Save your workshop.** Open the FigJam page you want and run **Paper Export for FigJam**. Save `figjam-export.json` beside this README. If the save dialog doesn’t appear, click **Download board JSON**. If you’re installing from source, first choose **Plugins → Development → Import plugin from manifest** in Figma Desktop and select `plugin/manifest.json`.
2. **Prepare the layers.** Open a terminal in the project folder and run the command below. It creates `out/` with your artboard plan, layers and images. Choose a new or empty folder for each export.

   ```sh
   node tools/split_export.js figjam-export.json out/
   ```

   Use the same command on macOS, Windows and Linux. It also works with earlier board exports.

3. **Bring it into Paper.** Open your destination file in Paper Desktop, give your connected agent access to `out/`, and paste this prompt.

   > Import my workshop from `out/plan.json` onto this Paper page. Create an artboard for each entry using its name, dimensions, fill, shadow and radius. If there’s a board for loose items, size it to fit its contents. After creating each artboard, set its left and top from the plan with `update_styles`. Read its files from `out/parts/` in order and insert each file’s exact HTML once using `write_html` with `insert-children`. Check each board’s position and direct child count against the plan, then show me the result.

## Inside the sample workshop

At the review, Lee can find Kai’s pending invite and Jo can join from a second email. The team holds the third ticket. In the invite-list sketch, **Copy link** still appears beside Ren’s expired invite.

The lilac sticky in FigJam asks what Lee should see there. Here’s the review area in Paper after Sam edited it to say, “Show Resend instead of Copy on expired invites.”

![Paper Desktop zoomed in on the review. The invite list and three outcomes are visible, with Sam’s follow-up selected in the layer list and its Inter text settings on the right.](docs/images/demo-paper.png)

To recreate the editable source board, import `demo/build-board/manifest.json` as a development plugin, run **Paper Export demo board** on an empty FigJam page, then export it with the main plugin.

## What comes across

Each FigJam section becomes a Paper artboard. Loose items share an artboard called **Loose page items**. In the sample, you can move a sticky or expand the invite-list group to edit a name, status or action. Groups and frames keep their layout, and image rectangles become image layers.

A few details change. Connectors become fixed graphics, decision diamonds become rectangles, and sticky author labels are omitted. Font availability can affect line breaks. To compare a particular board, use **Export reference PNGs** in the plugin. [Import details, limits and troubleshooting](docs/import.md).

The plugin reads the current page and has no network access. Exported files contain the workshop content. When you import, the chosen content goes to Paper and may also be shared with your agent.

[Report an issue](https://github.com/Gonzillaaa/paper-export-for-figjam/issues) · [Development and checks](docs/import.md#development) · [Listing and artwork](docs/community/listing.md) · [MIT license](LICENSE)
