const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawnSync } = require('node:child_process');
const { promisify } = require('node:util');

const cli = path.resolve(__dirname, '../tools/split_export.js');
const sample = path.resolve(__dirname, '../demo/workshop.json');
const png = Buffer.from([137, 80, 78, 71]);
const exec = promisify(execFile);

function board(html, total, fields = {}) {
  return { id: '1:2', name: 'Board', x: 100, y: 50, w: 800, h: 600,
    fill: '#FFFFFF', stroke: '', r: 0, html, total, ...fields };
}

function workspace(t, data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-export-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = path.join(dir, 'input.json');
  if (data !== undefined) fs.writeFileSync(input, JSON.stringify(data));
  return { dir, input, out: path.join(dir, 'split output') };
}

function run(input, out, ...args) {
  return spawnSync(process.execPath, [cli, input, out, ...args], { encoding: 'utf8' });
}

function readPlan(out) {
  return JSON.parse(fs.readFileSync(path.join(out, 'plan.json'), 'utf8'));
}

function readParts(out, section) {
  return section.parts.map(part => fs.readFileSync(path.join(out, 'parts', part.file), 'utf8'));
}

test('the documented CLI splits the bundled sprint into editable plan and review notes', t => {
  const { out } = workspace(t);
  const result = run(sample, out);
  assert.equal(result.status, 0, result.stderr);
  const { sections: [original] } = JSON.parse(fs.readFileSync(sample, 'utf8'));
  const plan = readPlan(out);
  assert.equal(plan.sections.length, 1);
  const [imported] = plan.sections;
  assert.equal(imported.id, 'LOOSE');
  assert.equal(imported.width, null);
  assert.equal(imported.parts.reduce((sum, part) => sum + part.elements, 0), original.total);
  const html = readParts(out, imported).join('');
  assert.equal(html, original.html);
  const tickets = Array.from(html.matchAll(/<p\b[^>]*>(INV-\d+)/g), m => m[1]);
  assert.equal(new Set(tickets).size, 3);
  for (const ticket of new Set(tickets)) assert.equal(tickets.filter(id => id === ticket).length, 2);
  assert.equal(plan.budget, require('../tools/settings.json').partBudget);
  assert.match(plan.asset_prefix, /^paper-asset:\/\//);
  assert.match(plan.asset_prefix, /\/split%20output\/assets$/);
});

test('ordered groups use Unicode character budgets and keep an oversized SVG whole', t => {
  const small = '<p>🌱</p>';
  const large = '<svg layer-name="a > b"><g><path d="M0 0"/></g></svg>';
  const tail = "<div title='x > y'><br><img src=\"remote\"/></div>";
  const layers = [small, small, large, tail];
  const { input, out } = workspace(t, { sections: [board(layers.join(''), layers.length)], images: {} });
  const result = run(input, out, '--budget=16');
  assert.equal(result.status, 0, result.stderr);
  const [section] = readPlan(out).sections;
  assert.deepEqual(readParts(out, section), [small + small, large, tail]);
  assert.deepEqual(section.parts.map(p => [p.elements, p.chars, p.over_budget]),
    [[2, 16, false], [1, large.length, true], [1, tail.length, true]]);
  assert.match(result.stdout, /over the budget/);
});

test('multi-board import preserves geometry and resolves only exported image sources', t => {
  const marker = '__FIGJAM_ASSET__/label.png';
  const original = '<p>' + marker + '</p><img layer-name="' + marker + '" src="__FIGJAM_ASSET__/n1.png"/>';
  const jpeg = Buffer.from([255, 216, 255, 224, 0, 1]);
  const gif = Buffer.from('GIF89atest');
  const images = { n1: jpeg.toString('base64'), n2: gif.toString('base64'), n3: png.toString('base64') };
  const loose = { id: 'LOOSE', name: 'Loose items', x: 0, y: -50, html: '<img src="__FIGJAM_ASSET__/n2.png">', total: 1 };
  const { input, out } = workspace(t, { sections: [board(original, 2, { x: 100.125 }), loose], images });
  const result = run(input, out, '--asset-prefix', 'local/" & assets/', '--budget', '30');
  assert.equal(result.status, 0, result.stderr);
  const [first, second] = readPlan(out).sections;
  assert.deepEqual([first.left, first.top, first.width, first.height, first.border, first.fill, first.radius],
    [100.12, 100, 800, 600, null, '#FFFFFF', 0]);
  assert.deepEqual([second.left, second.top, second.width, second.height], [0, 0, null, null]);
  assert.deepEqual(first.parts.map(p => p.file), ['00-1-2-00.html', '00-1-2-01.html']);
  assert.equal(readParts(out, first).join(''), original.replace('src="__FIGJAM_ASSET__/n1.png"', 'src="local/&quot; &amp; assets/n1.jpg"'));
  assert.equal(readParts(out, second)[0], '<img src="local/&quot; &amp; assets/n2.gif">');
  for (const [name, bytes] of [['n1.jpg', jpeg], ['n2.gif', gif], ['n3.png', png]]) {
    assert.deepEqual(fs.readFileSync(path.join(out, 'assets', name)), bytes);
  }
});

test('accepts an empty page, a UTF-8 BOM and an existing empty destination', t => {
  const { input, out } = workspace(t);
  fs.writeFileSync(input, '\uFEFF{"sections":[],"images":{}}');
  fs.mkdirSync(out);
  const result = run(input, out);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readPlan(out).sections, []);
  assert.deepEqual(fs.readdirSync(out).sort(), ['assets', 'parts', 'plan.json']);
});

test('the default Paper asset URL encodes punctuation in a local folder name', t => {
  const { dir, input } = workspace(t, { sections: [], images: {} });
  const out = path.join(dir, 'assets & notes (v2)!#é');
  const result = run(input, out);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(readPlan(out).asset_prefix.endsWith('/assets%20%26%20notes%20%28v2%29%21%23%C3%A9/assets'));
});

const badCases = [
  ['reference export', { '1-2': 'png' }, /board export/],
  ['array of images', { sections: [], images: [] }, /board export/],
  ['malformed board', { sections: [{}], images: {} }, /board/],
  ['invalid geometry', { sections: [board('', 0, { x: 'x' })], images: {} }, /geometry/],
  ['invalid count', { sections: [board('', -1)], images: {} }, /count/],
  ['count mismatch', { sections: [board('<p>Hi</p>', 2)], images: {} }, /1:2/],
  ['unbalanced nesting', { sections: [board('<div><p>x</div></div>', 1)], images: {} }, /unbalanced/],
  ['unmatched text', { sections: [board('<p>a</p>tail', 1)], images: {} }, /unbalanced/],
  ['missing image', { sections: [board('<img src="__FIGJAM_ASSET__/gone.png">', 1)], images: {} }, /gone/],
];

for (const [name, data, reason] of badCases) {
  test('rejects ' + name + ' without publishing partial output', t => {
    const { dir, input, out } = workspace(t, data);
    const result = run(input, out);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, reason);
    assert.deepEqual(fs.readdirSync(dir), ['input.json']);
  });
}

for (const [key, value] of [['folder/name', 'AAAA'], ['CON', 'AAAA'], ['FIRST', 'AAAA'],
  ['bad', 'invalid base64'], ['bad', 'AQ'], ['bad', 'AA=A'], ['bad', '']]) {
  test('invalid image leaves an existing empty directory intact (' + key + ', ' + value + ')', t => {
    const { input, out } = workspace(t, { sections: [], images: { first: 'AAAA', [key]: value } });
    fs.mkdirSync(out);
    const result = run(input, out);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /image/);
    assert.deepEqual(fs.readdirSync(out), []);
  });
}

test('CLI rejects invalid budgets before publishing output', t => {
  const { input, out } = workspace(t, { sections: [], images: {} });
  for (const value of ['0', '1.5', '2e2', '1x']) {
    const result = run(input, out, '--budget', value);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /budget/);
    assert.equal(fs.existsSync(out), false);
  }
});

test('an existing nonempty directory is preserved', t => {
  const { input, out } = workspace(t, { sections: [], images: {} });
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, 'keep.txt'), 'mine');
  const result = run(input, out);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not empty/);
  assert.equal(fs.readFileSync(path.join(out, 'keep.txt'), 'utf8'), 'mine');
});

test('a directory symlink or junction is never used as the destination', t => {
  const { dir, input, out } = workspace(t, { sections: [], images: {} });
  const target = path.join(dir, 'user-folder');
  fs.mkdirSync(target);
  fs.symlinkSync(target, out, 'junction');
  const result = run(input, out);
  assert.notEqual(result.status, 0);
  assert.deepEqual(fs.readdirSync(target), []);
  assert.ok(fs.lstatSync(out).isSymbolicLink());
});

test('two simultaneous CLI runs publish exactly one complete result', async t => {
  const { input, out } = workspace(t, { sections: [board('<p>ok</p>', 1)], images: {} });
  fs.mkdirSync(out);
  const runs = await Promise.allSettled([exec(process.execPath, [cli, input, out]), exec(process.execPath, [cli, input, out])]);
  assert.equal(runs.filter(result => result.status === 'fulfilled').length, 1);
  const [winner] = readPlan(out).sections;
  assert.deepEqual(readParts(out, winner), ['<p>ok</p>']);
});
