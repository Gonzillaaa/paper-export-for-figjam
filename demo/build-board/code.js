// Builds the demo board used in the README: a title, a retro section with stickies and a flow
// section with shapes and connectors. Run it once on an empty FigJam page, then run the export plugin.
const hex = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = h => [{ type: 'SOLID', color: hex(h) }];
const NAVY = '#1E3A5F', GREEN = '#B3EFBD', RED = '#FFC0C0', YELLOW = '#FFE299', VIOLET = '#C7B9FF';

async function build() {
  for (const style of ['Regular', 'Medium', 'Bold']) await figma.loadFontAsync({ family: 'Inter', style });
  const page = figma.currentPage;

  const title = figma.createText();
  title.fontName = { family: 'Inter', style: 'Bold' };
  title.characters = 'Product team board';
  title.fontSize = 56;
  title.x = 0; title.y = -140;

  const section = (name, x, w, fill) => {
    const s = figma.createSection();
    s.name = name; s.x = x; s.y = 0;
    s.resizeWithoutConstraints(w, 760);
    s.fills = solid(fill);
    return s;
  };
  const shape = (parent, type, text, x, y, w, h, fill, opts = {}) => {
    const n = figma.createShapeWithText();
    n.shapeType = type;
    n.resize(w, h);
    n.fills = solid(fill);
    n.text.fontName = { family: 'Inter', style: opts.bold ? 'Bold' : 'Medium' };
    n.text.characters = text;
    n.text.fontSize = opts.size || 20;
    if (opts.color) n.text.fills = solid(opts.color);
    parent.appendChild(n);
    n.x = x; n.y = y;
    return n;
  };
  const sticky = (parent, text, x, y, fill) => {
    const n = figma.createSticky();
    n.text.fontName = { family: 'Inter', style: 'Medium' };
    n.text.characters = text;
    n.fills = solid(fill);
    parent.appendChild(n);
    n.x = x; n.y = y;
    return n;
  };

  // Retro: three columns of stickies under dark headers.
  const retro = section('Team retro', 0, 1180, '#EBF5FF');
  [
    { head: 'Went well', fill: GREEN, notes: ['Shipped onboarding a week early', 'Pairing on reviews cut wait time'] },
    { head: 'To improve', fill: RED, notes: ['Too many meetings on Tuesdays', 'Flaky tests block merges'] },
    { head: 'Try next', fill: YELLOW, notes: ['No-meeting Wednesday afternoons', 'Fix the three flakiest tests'] },
  ].forEach((col, i) => {
    const x = 60 + i * 370;
    shape(retro, 'ROUNDED_RECTANGLE', col.head, x, 60, 320, 72, NAVY, { bold: true, size: 24, color: '#FFFFFF' });
    col.notes.forEach((t, j) => sticky(retro, t, x + 40, 170 + j * 280, col.fill));
  });

  // Flow: shapes joined by arrows, one labelled branch, one loop back.
  const flow = section('Launch plan', 1320, 1240, '#F3EEFF');
  const idea = shape(flow, 'ELLIPSE', 'Idea', 60, 120, 180, 180, VIOLET);
  const proto = shape(flow, 'ROUNDED_RECTANGLE', 'Prototype', 340, 150, 220, 120, '#FFFFFF');
  const check = shape(flow, 'DIAMOND', 'Users happy?', 660, 110, 220, 200, YELLOW);
  const launch = shape(flow, 'ROUNDED_RECTANGLE', 'Launch', 980, 150, 200, 120, GREEN);
  const iterate = shape(flow, 'ROUNDED_RECTANGLE', 'Iterate', 660, 470, 220, 110, RED);
  const link = (from, to, label) => {
    const k = figma.createConnector();
    flow.appendChild(k);
    k.connectorStart = { endpointNodeId: from.id, magnet: 'AUTO' };
    k.connectorEnd = { endpointNodeId: to.id, magnet: 'AUTO' };
    k.connectorEndStrokeCap = 'ARROW_LINES';
    k.strokeWeight = 4;
    k.strokes = solid(NAVY);
    if (label) { k.text.fontName = { family: 'Inter', style: 'Medium' }; k.text.characters = label; }
  };
  link(idea, proto); link(proto, check); link(check, launch, 'yes'); link(check, iterate, 'no'); link(iterate, proto);
  sticky(flow, 'Test with five users before launch', 980, 440, YELLOW);

  figma.viewport.scrollAndZoomIntoView([title, retro, flow]);
  return page.children.length;
}

build()
  .then(n => figma.closePlugin(`Demo board built (${n} top-level items).`))
  .catch(e => figma.closePlugin(`Demo board failed: ${e.message}`));
