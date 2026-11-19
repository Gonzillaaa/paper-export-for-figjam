const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../plugin/code.js'), 'utf8');
const bounds = { x: 10, y: 20, width: 80, height: 60 };
const rect = { type: 'RECTANGLE', id: '1:2', name: 'Note', absoluteBoundingBox: bounds, fills: [], strokes: [] };
const hidden = { ...rect, visible: false, name: 'Hidden', absoluteBoundingBox: null };
const section = children => ({ type: 'SECTION', id: '1:1', name: 'Board', children, fills: [],
  absoluteBoundingBox: bounds, findOne: () => null });

async function exportInFigma(children) {
  const messages = [];
  const figma = {
    currentPage: { id: '0:1', children }, mixed: Symbol(), showUI() {},
    ui: { postMessage: message => messages.push(message) },
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
  };
  const settings = fs.readFileSync(path.join(__dirname, '../plugin/settings.json'), 'utf8');
  vm.runInNewContext(source, { figma, __uiFiles__: { main: '', settings } });
  await figma.ui.onmessage('ready');
  await new Promise(resolve => setImmediate(resolve));
  const result = messages.find(m => m.type === 'result');
  assert.ok(result, JSON.stringify(messages));
  return { board: JSON.parse(result.json), figma, messages };
}

test('visible sections and loose items count only emitted layers and omit hidden assets', async () => {
  const hiddenImage = { ...hidden, fills: [{ type: 'IMAGE', imageHash: 'unused' }] };
  const emptyText = { ...rect, type: 'TEXT', characters: '', getStyledTextSegments: () => [] };
  const { board } = await exportInFigma([
    { ...section([rect]), visible: false }, section([rect, hiddenImage, emptyText]), hidden, rect,
  ]);
  assert.deepEqual(board.sections.map(s => [s.id, s.total]), [['1:1', 1], ['LOOSE', 1]]);
  assert.equal(board.sections[1].x, bounds.x);
  assert.deepEqual(board.images, {});
});

test('an image rectangle uses its rendered PNG and rendered bounds', async () => {
  const photo = { ...rect, name: 'Cropped photo', fills: [{ type: 'IMAGE', imageHash: 'photo' }],
    absoluteRenderBounds: { ...bounds, width: 96 },
    exportAsync: async opts => {
      assert.equal(opts.format, 'PNG');
      return Uint8Array.of(137, 80, 78, 71);
    },
  };
  const { board } = await exportInFigma([photo]);
  const [[key, bytes]] = Object.entries(board.images);
  assert.equal(bytes, 'iVBORw==');
  assert.ok(board.sections[0].html.includes(`src="__FIGJAM_ASSET__/${key}.png"`));
  assert.match(board.sections[0].html, /width:96px/);
});

test('reference export uses only visible sections of the originally exported page', async () => {
  const visible = { ...section([]), exportAsync: async () => Uint8Array.of(1) };
  const { figma, messages } = await exportInFigma([visible, { ...section([]), visible: false }]);
  figma.currentPage = { id: 'other', children: [] };
  await figma.ui.onmessage('pngs');
  assert.deepEqual(JSON.parse(messages.find(m => m.type === 'pngs').json), { '1-1': 'AQ==' });
});
