# Paper Export for FigJam

Take a FigJam workshop into Paper. The notes stay where your team put them, and you can still move them around and edit what they say.

The sample follows a two-week sprint called **Team invites**. A workspace admin has sent an email twice and still can’t tell whether Kai joined. The team has eight points to spend. They pick three tickets and leave bulk resend for later.

![Team invites sprint board in FigJam, with “Copy link” circled on an expired invitation. The Paper Export for FigJam dialog shows that the board JSON download was requested.](docs/images/demo-figjam.png)

## Use it

The FigJam plugin saves your current page as a JSON file. A command on your computer splits that file into layers, and your agent adds those layers to an open Paper file. To try the included workshop, you can skip the Figma installation.

### Get the project and check Node.js

1. On the release page, open **Assets**, download the ZIP whose name starts with `paper-export-for-figjam-`, and unzip it. Open the folder containing `README.md`, `plugin` and `tools`. If you already cloned the repository, use that folder. [Get the latest release](https://github.com/Gonzillaaa/paper-export-for-figjam/releases/latest)
2. Open a terminal in that folder. On macOS, right-click the folder in Finder and choose **New Terminal at Folder** (sometimes under **Services**). On Windows 11, right-click the folder in File Explorer and choose **Open in Terminal**.
3. Run `node --version`. If the command is missing or the version is below 22, install the current Node.js LTS release, reopen the terminal in the project folder, and check again. The splitter runs directly with Node. [Download Node.js](https://nodejs.org/en/download)

### Install the plugin in Figma Desktop

If you’re using the sample or already have an exported board JSON, go straight to [Prepare the layers](#prepare-the-layers).

1. Open a FigJam board you can edit in the Figma desktop app. [Download Figma Desktop](https://www.figma.com/downloads/)
2. Right-click an empty spot on the canvas and choose **Plugins → Development → Import plugin from manifest…**.
3. In the project folder, select `plugin/manifest.json` and click **Open**. The other manifest, under `demo/build-board/`, installs a separate tool that creates the sample board.
4. On the page you want to export, choose **Plugins → Development → Paper Export for FigJam**. You should see the dialog in the screenshot above. Save `figjam-export.json` in the project folder, beside `README.md`. If Figma saves it to Downloads, move the file into the project folder. If the download didn’t start, click **Download board JSON**.

For future exports, start at step 4.

### Prepare the layers

In the terminal you opened in the project folder, run the command for the board you want to import.

**Your own board** — This reads the file you saved from FigJam and creates `out/plan.json`.

```sh
node tools/split_export.js figjam-export.json out/
```

**Sample workshop** — This creates `sample-out/plan.json` from the included export. Look for `Loose page items: 1 part(s), 23 items` in the terminal. [Sample export](demo/workshop.json)

```sh
node tools/split_export.js demo/workshop.json sample-out/
```

Both commands work on macOS, Windows and Linux, including with earlier board exports. Use a new or empty output folder each time. If you already used `out/` or `sample-out/`, change the last argument to a fresh folder name and use that folder below.

### Bring the layers into Paper

1. Open the destination design file in Paper Desktop. [Download Paper Desktop](https://paper.design/downloads)
2. Click **Connect your agent** at the top right of the editor, choose your agent, and click **Add to** for that agent. Follow the instructions shown for your app. To check the connection, ask your agent, “What’s the name of my current Paper file?” [Paper’s agent setup guide](https://paper.design/docs/mcp)
3. Give the same agent the full path to your output folder (`out/` or `sample-out/`) and access to its files. Keep the destination file open in Paper Desktop and paste this prompt.

> Open `plan.json` in the output folder I shared and import the workshop onto this Paper page. Create an artboard for each entry using its name, dimensions, fill, shadow and radius. If there’s a board for loose items, size it to fit its contents. After creating each artboard, set its left and top from the plan with `update_styles`. Read the files from `parts/` in the order listed for each board and insert each file’s exact HTML once using `write_html` with `insert-children`. Check each board’s position and direct child count against the plan, then show me the result.

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
