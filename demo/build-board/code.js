// A fictional service-design workshop. All content is built from native FigJam objects.
const ink = '#183B34';
const leaf = '#376952';
const paper = '#FAFBF5';
const lime = '#D6F47D';
const mint = '#CAE8D3';
const apricot = '#FFC6A1';
const lilac = '#DFDBFA';
const white = '#FFFFFF';
const font = style => ({ family: 'Inter', style });

function paint(hex) {
  const rgb = hex.match(/[0-9A-F]{2}/gi).map(v => parseInt(v, 16) / 255);
  return [{ type: 'SOLID', color: { r: rgb[0], g: rgb[1], b: rgb[2] } }];
}

function place(parent, node, x, y) {
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function label(parent, x, y, text, size, style = 'Regular', color = ink) {
  const node = figma.createText();
  node.fontName = font(style);
  node.fontSize = size;
  node.characters = text;
  node.fills = paint(color);
  node.name = text.split('\n')[0];
  return place(parent, node, x, y);
}

function shape(parent, name, x, y, w, h, fill, kind = 'SQUARE') {
  const node = figma.createShapeWithText();
  node.shapeType = kind;
  node.resize(w, h);
  node.fills = paint(fill);
  node.strokes = [];
  node.name = name;
  return place(parent, node, x, y);
}

function sticky(board, x, y, name, text, fill) {
  const node = figma.createSticky();
  node.text.fontName = font('Medium');
  node.text.characters = text;
  node.text.fontSize = 24;
  node.authorVisible = false;
  node.fills = paint(fill);
  node.name = name;
  return place(board, node, x, y);
}

function connect(board, a, b, arrow, color) {
  const link = figma.createConnector();
  board.appendChild(link);
  link.connectorLineType = 'STRAIGHT';
  link.connectorStart = { endpointNodeId: a.id, magnet: 'CENTER' };
  link.connectorEnd = { endpointNodeId: b.id, magnet: 'CENTER' };
  link.connectorEndStrokeCap = arrow ? 'ARROW_LINES' : 'NONE';
  link.strokeWeight = 4;
  link.strokes = paint(color);
  link.name = a.name + ' to ' + b.name;
}

function heading(board, x, y, text) {
  return label(board, x, y, text, 20, 'Bold', leaf);
}

function section(name, x, y, step, title, prompt, duration) {
  const board = figma.createSection();
  board.name = name;
  board.x = x;
  board.y = y;
  board.resizeWithoutConstraints(1800, 1120);
  board.fills = paint(paper);
  shape(board, 'Workshop masthead', 0, 0, 1800, 204, ink);
  label(board, 52, 31, 'THE FRIDAY GAP     /     SERVICE DESIGN WORKSHOP', 20, 'Bold', lime);
  label(board, 50, 70, title, 68, 'Bold', white);
  label(board, 55, 160, prompt, 24, 'Regular', white);
  label(board, 1460, 34, step + '  /  04     •     ' + duration + ' MIN', 22, 'Bold', lime);
  return board;
}

function evidence() {
  const b = section('01 · Evidence wall', 0, 0, '01', 'Why did Friday work wait until Monday?',
    'Read the sources in pairs. Mark what you observed and where the evidence runs out.', 12);
  shape(b, 'Sample summary', 48, 254, 520, 809, ink);
  label(b, 81, 290, 'QUEUE AUDIT   /   TWO FRIDAYS', 21, 'Bold', lime);
  label(b, 73, 343, '7 of 12', 100, 'Bold', white);
  label(b, 83, 477, 'Friday requests waited\nuntil Monday for review.', 29, 'Medium', white);
  for (let i = 0; i < 12; i++) {
    shape(b, i < 7 ? 'Waited until Monday' : 'Reviewed on Friday',
      83 + (i % 6) * 66, 602 + Math.floor(i / 6) * 48, 52, 31, i < 7 ? apricot : mint);
  }
  label(b, 84, 726, '7 waited    /    5 reviewed Friday', 22, 'Medium', white);
  label(b, 84, 822, 'WHAT TO CHECK NEXT', 19, 'Bold', lime);
  label(b, 84, 863, 'Five of the seven had no named\nbackup. Trace one of those five\nthrough the handoff.', 25, 'Regular', white);
  const columns = [
    { x: 632, role: 'Author', source: 'INTERVIEW  /  A1', fill: mint,
      quotes: ['“It was green at lunch. I thought someone had it.”', '“I nudged the channel before I signed off.”'],
      meaning: 'A passing check looked\nlike a handoff.' },
    { x: 1010, role: 'Reviewer', source: 'INTERVIEW  /  R1', fill: lilac,
      quotes: ['“I was on support. I never accepted the review.”', '“The backup list still had last month’s names.”'],
      meaning: 'Being tagged and accepting\nwork were different events.' },
    { x: 1388, role: 'Queue history', source: 'EVENT LOG  /  Q1', fill: apricot,
      quotes: ['6 of the 7 delayed requests already had green checks.', 'The first human reply on Q-17 came at 09:10 Monday.'],
      meaning: 'A faster build would leave\nthe wait mostly untouched.' },
  ];
  for (const c of columns) {
    heading(b, c.x, 263, c.source);
    label(b, c.x, 307, c.role, 40, 'Bold');
    sticky(b, c.x + 7, 385, c.role + ' evidence 1', c.quotes[0], c.fill);
    sticky(b, c.x + 65, 596, c.role + ' evidence 2', c.quotes[1], c.fill);
    heading(b, c.x, 881, 'TEAM INTERPRETATION');
    label(b, c.x, 927, c.meaning, 23, 'Medium');
  }
  return b;
}

function blueprint() {
  const b = section('02 · Current-state blueprint', 1920, 0, '02', 'Trace the handoff that nobody owned.',
    'Follow request Q-17 across four moments. Read down each column to see who could act.', 20);
  const x0 = 338;
  const col = 354;
  const phases = [
    ['FRI  13:05', 'Request', 'Opens Q-17 and\nlinks the change.', 'Sees a green build\nand a review request.', 'Checks pass. The default\nroster adds a team tag.'],
    ['FRI  13:12', 'Route', 'Assumes the team tag\nmeans it is assigned.', 'Primary reviewer is\ncovering support.', 'Team notification lands.\nNo one accepts ownership.'],
    ['FRI  15:40', 'Escalate', 'Posts a second nudge\nin the team channel.', 'Backup sees the nudge\nafter their shift.', 'No timeout, rotation or\nacknowledgement exists.'],
    ['MON  09:10', 'Recover', 'Reposts Q-17 in the\nMonday stand-up.', 'Day lead claims it\nand begins review.', 'Queue finally records\na named reviewer.'],
  ];
  const lanes = [['01', 'Author', 'What they do'], ['02', 'Review desk', 'What people see'], ['03', 'Routing rules', 'Behind the scenes']];
  for (let row = 0; row < lanes.length; row++) {
    const y = 367 + row * 133;
    shape(b, 'Lane ' + lanes[row][1], 49, y, 273, 124, row === 2 ? lilac : mint);
    label(b, 66, y + 15, lanes[row][0], 17, 'Bold', leaf);
    label(b, 66, y + 40, lanes[row][1], 29, 'Bold');
    label(b, 67, y + 82, lanes[row][2], 19);
  }
  for (const [i, p] of phases.entries()) {
    const x = x0 + i * col;
    shape(b, 'Stage ' + p[1], x, 241, col - 8, 113, i === 2 ? apricot : ink);
    label(b, x + 15, 254, p[0], 19, 'Bold', i === 2 ? ink : lime);
    label(b, x + 14, 289, p[1], 38, 'Bold', i === 2 ? ink : white);
    for (let row = 0; row < lanes.length; row++) {
      const y = 367 + row * 133;
      const hot = i === 2 && row === 2;
      shape(b, p[1] + ' / ' + lanes[row][1], x, y, col - 8, 124, hot ? apricot : row === 2 ? '#EEECF8' : '#E8F1E9');
      label(b, x + 15, y + 28, p[row + 2], 23, hot ? 'Bold' : 'Regular');
    }
  }
  heading(b, 55, 789, 'AUTHOR CONFIDENCE');
  label(b, 55, 828, 'Self-reported\nin interview A1', 22);
  const levels = [['High', 802], ['Unsure', 843], ['Low', 883], ['Relieved', 818]];
  const points = levels.map(([name, y], i) => {
    const x = x0 + i * col + 56;
    const dot = shape(b, name, x, y, 21, 21, leaf, 'ELLIPSE');
    label(b, x + 30, y - 21, name, 20, 'Bold', leaf);
    return dot;
  });
  for (let i = 1; i < points.length; i++) connect(b, points[i - 1], points[i], false, leaf);
  shape(b, 'Working hypothesis', 49, 973, 1699, 94, lime);
  label(b, 70, 1006, 'HYPOTHESIS', 19, 'Bold');
  label(b, 247, 999, 'The risky moment is the unclaimed request. Give the author a named fallback before sign-off.', 26, 'Medium');
  return b;
}

function options() {
  const b = section('03 · Intervention map', 0, 1240, '03', 'Which change earns a two-Friday trial?',
    'Place each option by expected impact and effort. Spend two votes per person, then record the objection.', 15);
  heading(b, 54, 236, 'EXPECTED REDUCTION IN WAIT   ↑');
  const quadrants = [
    [52, 292, '#DEEDCE', 'TRY FIRST'], [652, 292, '#EBE7F6', 'PLAN'],
    [52, 636, '#F0F3E9', 'SMALL WINS'], [652, 636, '#F1EFEA', 'PARK'],
  ];
  for (const [x, y, color, title] of quadrants) {
    shape(b, title, x, y, 588, 329, color);
    heading(b, x + 22, y + 17, title);
  }
  const proposals = [
    [88, 402, 'A', 'Named backup\n+ noon check', 5], [743, 415, 'B', 'Automatic\nrerouting', 2],
    [228, 779, 'C', 'Daily queue\ndigest', 1], [807, 770, 'D', 'Replace the\nreview tool', 0],
  ];
  for (const [x, y, key, name, votes] of proposals) {
    shape(b, 'Option ' + key, x, y, 59, 59, ink, 'ELLIPSE');
    label(b, x + 18, y + 12, key, 28, 'Bold', white);
    label(b, x + 78, y - 4, name, 28, 'Bold');
    for (let i = 0; i < votes; i++) shape(b, 'Vote for ' + key, x + 79 + i * 30, y + 77, 21, 21, leaf, 'ELLIPSE');
  }
  heading(b, 54, 994, 'LOW EFFORT');
  heading(b, 1012, 994, 'HIGH EFFORT   →');
  shape(b, 'Decision record', 1285, 291, 462, 674, ink);
  label(b, 1320, 330, 'DECISION   /   8 VOTES CAST', 20, 'Bold', lime);
  label(b, 1315, 406, 'A wins.', 69, 'Bold', white);
  label(b, 1320, 501, '5 of 8 votes', 31, 'Medium', lime);
  label(b, 1320, 571, 'It tests ownership with a rota\nthe team can change by hand.', 24, 'Regular', white);
  label(b, 1320, 704, 'DISSENT   /   SUPPORT LEAD', 19, 'Bold', lime);
  label(b, 1320, 749, '“A backup on incident duty\ncan’t own two queues.”', 25, 'Medium', white);
  label(b, 1320, 868, 'Carry this into the stop rule.', 22, 'Regular', white);
  return b;
}

function pilot() {
  const b = section('04 · Pilot agreement', 1920, 1240, '04', 'Put a name on the handoff.',
    'Write the runbook, choose a threshold and give someone authority to stop the trial.', 13);
  heading(b, 55, 248, 'FIELD TRIAL   /   NEXT TWO FRIDAYS');
  const steps = [
    [58, '11:45', 'Publish rota', 'Mina · desk lead', 'Name a primary and a\nbackup for the shift.'],
    [471, '12:00', 'Check claims', 'Sam · backup', 'Claim any green request\nwithout a reviewer.'],
    [884, '15:30', 'Sweep queue', 'Jo · duty lead', 'Reassign anything still\nunclaimed before sign-off.'],
    [1297, 'MON', 'Read results', 'Ari · facilitator', 'Count carryovers and\ncheck support coverage.'],
  ];
  const markers = [];
  for (const [x, when, title, owner, body] of steps) {
    markers.push(shape(b, title, x, 312, 36, 36, leaf, 'ELLIPSE'));
    label(b, x, 373, when, 23, 'Bold', leaf);
    label(b, x, 414, title, 36, 'Bold');
    label(b, x, 475, owner, 22, 'Bold', leaf);
    label(b, x, 520, body, 23);
  }
  for (let i = 1; i < markers.length; i++) connect(b, markers[i - 1], markers[i], true, leaf);
  shape(b, 'Measurement contract', 49, 646, 1038, 406, ink);
  label(b, 83, 679, 'MEASURE   /   FRIDAY REQUESTS STILL WAITING ON MONDAY', 20, 'Bold', lime);
  label(b, 79, 738, '7 / 12', 77, 'Bold', white);
  label(b, 416, 757, '→', 57, 'Regular', lime);
  label(b, 561, 738, '≤ 2 / 12', 77, 'Bold', lime);
  label(b, 84, 850, 'Observed baseline', 24, 'Medium', white);
  label(b, 563, 850, 'Pilot target', 24, 'Medium', white);
  label(b, 85, 944, 'If volume differs, compare carryover rates. Review the raw counts together.', 23, 'Regular', white);
  shape(b, 'Stop rule', 1111, 646, 637, 406, apricot);
  label(b, 1144, 679, 'GUARDRAIL   /   INCIDENT COVERAGE', 20, 'Bold');
  label(b, 1142, 744, 'When to pause', 43, 'Bold');
  label(b, 1145, 824, 'If the backup is also on incident duty,\nJo pauses the trial and finds cover.\nLog the exception before assigning work.', 25);
  return b;
}

async function build() {
  if (figma.currentPage.children.length) throw new Error('Run the demo on an empty FigJam page.');
  for (const style of ['Regular', 'Medium', 'Bold']) await figma.loadFontAsync(font(style));
  const sections = [evidence(), blueprint(), options(), pilot()];
  figma.viewport.scrollAndZoomIntoView(sections);
}

build()
  .then(() => figma.closePlugin('Workshop ready. Run Paper Export for FigJam on this page.'))
  .catch(error => figma.closePlugin(error.message));
