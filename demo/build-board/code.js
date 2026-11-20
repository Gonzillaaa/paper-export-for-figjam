// A fictional sprint on an open FigJam canvas. The demo sketch is an editable group.
const ink = '#242B3D';
const blue = '#354EAC';
const muted = '#536074';
const font = style => ({ family: 'Inter', style });

function paint(hex) {
  const [r, g, b] = hex.match(/[0-9A-F]{2}/gi).map(v => parseInt(v, 16) / 255);
  return [{ type: 'SOLID', color: { r, g, b } }];
}

function at(node, x, y) {
  node.x = x;
  node.y = y;
  return node;
}

function label(x, y, text, size, style, color = ink) {
  const node = figma.createText();
  node.fontName = font(style);
  node.fontSize = size;
  node.characters = text;
  node.fills = paint(color);
  node.name = text.split('\n')[0];
  return at(node, x, y);
}

function note(x, y, name, text, fill) {
  const node = figma.createSticky();
  node.text.fontName = font('Medium');
  node.text.characters = text;
  node.text.fontSize = 24;
  node.authorVisible = false;
  node.fills = paint(fill);
  node.name = name;
  return at(node, x, y);
}

function shape(x, y, width, height, name, fill, kind = 'SQUARE') {
  const node = figma.createShapeWithText();
  node.shapeType = kind;
  node.resize(width, height);
  node.fills = paint(fill);
  node.strokes = [];
  node.name = name;
  return at(node, x, y);
}

function mark(x, y, name, path, color, weight) {
  const node = figma.createVector();
  node.vectorPaths = [{ windingRule: 'NONE', data: path }];
  node.fills = [];
  node.strokes = paint(color);
  node.strokeWeight = weight;
  node.name = name;
  return at(node, x, y);
}

function demoSketch(page) {
  const nodes = [
    shape(915, 317, 492, 255, 'Invite list sketch', '#FFFFFF'),
    shape(915, 317, 492, 52, 'Sketch heading', '#28364E'),
    label(935, 329, 'Workspace / Invitations', 23, 'Bold', '#FFFFFF'),
    label(936, 391, 'Person', 17, 'Bold', muted),
    label(1080, 391, 'Status', 17, 'Bold', muted),
    label(1232, 391, 'Action', 17, 'Bold', muted),
    mark(932, 425, 'Heading divider', 'M 0 0 L 452 0', '#D5DAE2', 2),
    label(936, 440, 'Kai L.', 23, 'Medium'),
    label(1080, 440, 'Pending', 22, 'Medium'),
    label(1232, 440, 'Resend', 22, 'Bold', blue),
    mark(932, 488, 'Row divider', 'M 0 0 L 452 0', '#D5DAE2', 2),
    label(936, 507, 'Ren B.', 23, 'Medium'),
    label(1080, 507, 'Expired', 22, 'Medium', '#9C4829'),
    label(1232, 507, 'Copy link', 22, 'Bold', blue),
    mark(1218, 494, 'Expired action circled at review',
      'M 4 23 C 4 0 119 -3 126 18 C 139 48 28 58 5 36 C 0 31 0 27 4 23', '#B94E35', 3),
  ];
  figma.group(nodes, page).name = 'Invite list · demo build 214';
}

async function build() {
  const page = figma.currentPage;
  if (page.children.length) throw new Error('Run the demo on an empty FigJam page.');
  await Promise.all(['Regular', 'Medium', 'Bold'].map(style => figma.loadFontAsync(font(style))));

  label(40, 12, 'SPRINT 18     /     WORKSPACE TEAM     /     2–13 NOV', 20, 'Bold', blue);
  label(36, 53, 'Team invites', 67, 'Bold');
  label(40, 148, 'Let admins get a teammate in when an invite email goes missing.', 29, 'Regular');

  label(40, 238, 'Sprint planning', 40, 'Bold');
  label(42, 292, '2 Nov   ·   8 points available', 24, 'Medium', muted);
  note(40, 359, 'Plan · Pending list', 'INV-41 · 2 pts\nList pending invites.\n\nJo', '#FFE58B');
  note(306, 347, 'Plan · Resend email', 'INV-42 · 3 pts\nResend an expired invite.\n\nMina', '#FFE58B');
  note(573, 360, 'Plan · Copy link', 'INV-43 · 3 pts\nCopy an invite link for chat.\n\nSam', '#FFE58B');

  label(47, 653, 'What support heard', 27, 'Bold');
  mark(50, 708, 'Quote margin', 'M 0 0 L 0 96', blue, 4);
  label(70, 707, '“I sent it twice. How do I tell\nwhether Kai ever got in?”', 25, 'Regular');
  label(70, 784, 'Lee · workspace admin', 19, 'Medium', muted);
  label(492, 653, 'Left out of this sprint', 27, 'Bold');
  label(493, 709, 'Bulk resend can wait. Support\nusually gets asked about one\nmissing teammate at a time.', 23, 'Regular');

  label(916, 238, 'Sprint review', 40, 'Bold');
  label(918, 292, '13 Nov   ·   demo build 214', 21, 'Medium', muted);
  demoSketch(page);
  note(1493, 339, 'Copy link follow-up', 'What should Lee see on Ren’s expired invite?', '#DBCCFA');
  mark(1358, 468, 'From circled action to follow-up',
    'M 0 45 C 41 46 76 23 117 2 M 96 2 L 119 1 L 109 20', '#B94E35', 3);

  label(916, 602, 'Demo notes', 26, 'Bold');
  note(916, 654, 'Review · Pending list', 'INV-41 · Shipped\nLee found Kai’s pending invite without asking support.', '#C9EAD3');
  note(1184, 665, 'Review · Resend email', 'INV-42 · Shipped\nJo joined from the second email after the first expired.', '#C9EAD3');
  note(1452, 650, 'Review · Copy link', 'INV-43 · Held\nCopy was still offered on an expired invite.', '#FFC6A3');
  figma.viewport.scrollAndZoomIntoView(page.children);
}

build()
  .then(() => figma.closePlugin('Team invites is ready to export.'))
  .catch(error => figma.closePlugin(error.message));
