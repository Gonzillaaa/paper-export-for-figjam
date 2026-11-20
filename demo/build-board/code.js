// The sample uses the open FigJam canvas, just as a team would in a quick retro.
const ink = '#3C3545';
const purple = '#76539A';
const medium = { family: 'Inter', style: 'Medium' };

function paint(hex) {
  const [r, g, b] = hex.match(/[0-9A-F]{2}/gi).map(v => parseInt(v, 16) / 255);
  return [{ type: 'SOLID', color: { r, g, b } }];
}

function at(node, x, y) {
  node.x = x;
  node.y = y;
  return node;
}

function label(x, y, text, size, font, color) {
  const node = figma.createText();
  node.fontName = font;
  node.fontSize = size;
  node.characters = text;
  node.fills = paint(color);
  node.name = text;
  return at(node, x, y);
}

function note(x, y, name, text, fill) {
  const node = figma.createSticky();
  node.text.fontName = medium;
  node.text.characters = text;
  node.text.fontSize = 24;
  node.authorVisible = false;
  node.fills = paint(fill);
  node.name = name;
  return at(node, x, y);
}

async function build() {
  const page = figma.currentPage;
  if (page.children.length) throw new Error('Run the demo on an empty FigJam page.');
  const fonts = await figma.listAvailableFontsAsync();
  const hand = fonts.find(f => f.fontName.family === 'Kalam' && f.fontName.style === 'Regular');
  const heading = hand ? hand.fontName : medium;
  await figma.loadFontAsync(medium);
  await figma.loadFontAsync(heading);

  label(35, 0, 'Friday reviews', 58, heading, ink);
  label(52, 121, 'Last week', 32, heading, purple);
  note(35, 201, 'Waiting for a review', 'Mine was ready at noon. I heard back on Monday.\n— Mina', '#FFE68B');
  note(309, 174, 'On support', 'I was on support all afternoon.\n— Sam', '#DCCBFF');
  note(191, 443, 'Team chat', 'I asked in chat. We all thought someone else had it.\n— Jo', '#FFE68B');

  label(708, 105, 'Next Friday', 32, heading, purple);
  note(688, 187, 'Friday cover', 'Who’s picking up reviews after lunch?', '#FFBFD4');
  note(796, 461, 'Rota idea', 'Put one name on the rota before we go to lunch.', '#C4EBC9');

  const arrow = figma.createVector();
  arrow.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 14 C 41 36 98 30 142 4 M 115 4 L 144 2 L 130 28' }];
  at(arrow, 493, 420);
  arrow.fills = [];
  arrow.strokes = paint(purple);
  arrow.strokeWeight = 4;
  arrow.name = 'From team chat to Friday cover';
  figma.viewport.scrollAndZoomIntoView(page.children);
}

build()
  .then(() => figma.closePlugin('Friday reviews is ready to export.'))
  .catch(error => figma.closePlugin(error.message));
