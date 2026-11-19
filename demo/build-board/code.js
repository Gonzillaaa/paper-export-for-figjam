// A fictional product-team workshop, built with native FigJam objects.
const ink = '#292735';
const violet = '#65459A';
const gold = '#FFE79B';
const pink = '#FFD0CA';
const mint = '#BEEACF';
const lavender = '#DED4FA';
const font = style => ({ family: 'Inter', style });
const paint = hex => [{
  type: 'SOLID',
  color: {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  },
}];

function place(parent, node, x, y) {
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function section(name, x, width, height, color) {
  const node = figma.createSection();
  node.name = name;
  node.x = x;
  node.y = 0;
  node.fills = paint(color);
  node.resizeWithoutConstraints(width, height);
  return node;
}

function label(parent, x, y, text, size, style, color) {
  const node = figma.createText();
  node.fontName = font(style);
  node.fontSize = size;
  node.characters = text;
  node.fills = paint(color);
  node.name = text.split('\n')[0];
  return place(parent, node, x, y);
}

function note(parent, x, y, text, fill, name) {
  const node = figma.createSticky();
  node.name = name;
  node.text.fontName = font('Medium');
  node.text.characters = text;
  node.text.fontSize = 24;
  node.fills = paint(fill);
  node.authorVisible = false;
  return place(parent, node, x, y);
}

function shape(parent, x, y, w, h, kind, text, fill) {
  const node = figma.createShapeWithText();
  node.shapeType = kind;
  node.resize(w, h);
  node.fills = paint(fill);
  node.strokes = text ? paint(ink) : [];
  node.strokeWeight = 2;
  if (text) {
    node.text.fontName = font('Bold');
    node.text.characters = text;
    node.text.fontSize = 20;
    node.text.fills = paint(ink);
  }
  node.name = text || 'Vote';
  return place(parent, node, x, y);
}

function votes(parent, x, y, count) {
  for (let i = 0; i < count; i++) {
    shape(parent, x + i * 32, y, 24, 24, 'ELLIPSE', '', violet);
  }
}

function link(parent, from, start, to, end, text) {
  const node = figma.createConnector();
  parent.appendChild(node);
  node.connectorStart = { endpointNodeId: from.id, magnet: start };
  node.connectorEnd = { endpointNodeId: to.id, magnet: end };
  node.connectorEndStrokeCap = 'ARROW_LINES';
  node.strokeWeight = 3;
  node.strokes = paint(violet);
  if (text) {
    node.text.fontName = font('Medium');
    node.text.characters = text;
  }
}

function gather() {
  const board = section('Gather & vote', 0, 1430, 900, '#FBF8F1');
  label(board, 54, 46, 'LAUNCH RETRO     /     ACTIVITY 1 OF 2', 20, 'Bold', violet);
  label(board, 50, 92, 'What held up the launch?', 66, 'Bold', ink);
  label(board, 54, 192, 'Add one observation per sticky. Cluster similar notes, then give each person two votes.', 24, 'Regular', ink);

  label(board, 54, 296, 'Waiting for review', 34, 'Bold', ink);
  label(board, 546, 296, 'Testing the release', 34, 'Bold', ink);
  label(board, 1032, 296, 'Keeping people in sync', 30, 'Bold', ink);
  note(board, 60, 370, 'Three changes waited overnight for a second reviewer.', gold, 'Review queue');
  note(board, 217, 595, 'Nobody knew who could cover Friday reviews.', gold, 'Friday cover');
  note(board, 548, 382, 'The billing sandbox reset halfway through QA.', pink, 'Sandbox reset');
  note(board, 703, 595, 'We repeated the same smoke test on two branches.', pink, 'Duplicate testing');
  note(board, 1054, 374, 'Support saw the launch notes after the rollout.', mint, 'Late handoff');
  votes(board, 81, 550, 4);
  votes(board, 569, 559, 2);
  votes(board, 1075, 554, 1);
  label(board, 1035, 700, '●  =  one team vote', 24, 'Medium', violet);
  label(board, 1035, 758, 'Take the most-voted\nobservation into activity 2.', 24, 'Regular', ink);
  return board;
}

function decide() {
  const board = section('Decide & assign', 1530, 1430, 900, '#F3EFFA');
  label(board, 54, 46, 'LAUNCH RETRO     /     ACTIVITY 2 OF 2', 20, 'Bold', violet);
  label(board, 50, 92, 'Try a Friday review buddy.', 64, 'Bold', ink);
  label(board, 54, 190, 'Four votes went to the review queue. Sketch a fallback and agree on a two-Friday trial.', 24, 'Regular', ink);
  label(board, 55, 276, 'Proposed handoff', 32, 'Bold', ink);

  const ready = shape(board, 56, 412, 205, 88, 'ROUNDED_RECTANGLE', 'PR ready', '#FFFFFF');
  const available = shape(board, 366, 350, 250, 210, 'DIAMOND', 'Reviewer\nfree?', gold);
  const review = shape(board, 744, 412, 214, 88, 'ROUNDED_RECTANGLE', 'Review today', mint);
  const backup = shape(board, 378, 668, 226, 88, 'ROUNDED_RECTANGLE', 'Ask the buddy', lavender);
  link(board, ready, 'RIGHT', available, 'LEFT', '');
  link(board, available, 'RIGHT', review, 'LEFT', 'Yes');
  link(board, available, 'BOTTOM', backup, 'TOP', 'No');
  link(board, backup, 'RIGHT', review, 'BOTTOM', '');
  label(board, 1054, 277, 'First experiment', 30, 'Bold', ink);
  note(board, 1066, 350, 'Pick a backup reviewer for next Friday.', gold, 'Experiment');
  label(board, 1056, 638, 'Owner', 20, 'Bold', violet);
  label(board, 1056, 669, 'Engineering lead', 26, 'Medium', ink);
  label(board, 1056, 740, 'Check after two Fridays', 20, 'Bold', violet);
  label(board, 1056, 773, 'Count PRs left overnight.', 24, 'Regular', ink);
  return board;
}

async function build() {
  if (figma.currentPage.children.length) throw new Error('Run the demo on an empty FigJam page.');
  for (const style of ['Regular', 'Medium', 'Bold']) await figma.loadFontAsync(font(style));
  const boards = [gather(), decide()];
  figma.viewport.scrollAndZoomIntoView(boards);
}

build()
  .then(() => figma.closePlugin('Workshop ready. Run Paper Export for FigJam on this page.'))
  .catch(error => figma.closePlugin(error.message));
