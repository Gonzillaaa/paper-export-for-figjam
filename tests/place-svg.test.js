// Run with: node --test tests/
// Checks how exported SVGs (connectors, vectors, stamps) are positioned. Figma reports a node's
// render bounds smaller than the exported SVG's own width/height, so the SVG must take its own
// size and be centred on the render bounds, or arrows come out squashed or invisible.
const test = require('node:test');
const assert = require('node:assert/strict');
const { placeSvg } = require('../plugin/code.js');

const svg = (w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`;
const box = s => s.match(/^<svg layer-name="[^"]*" style="position:absolute;left:([-\d.]+)px;top:([-\d.]+)px;width:([-\d.]+)px;height:([-\d.]+)px"/).slice(1).map(Number);

test('horizontal arrow with zero render height takes the SVG size, centred', () => {
  const out = placeSvg(svg(212, 23), 'Connector line', { x: 5211.37, y: 2538.86, width: 208.64, height: 0 }, { x: 0, y: 0 });
  assert.deepEqual(box(out), [5209.69, 2527.36, 212, 23]);
});

test('vertical arrow, positioned relative to its parent', () => {
  const out = placeSvg(svg(23, 202), 'Connector line', { x: 5175.18, y: 2303.37, width: 0, height: 198.8 }, { x: 100, y: 100 });
  assert.deepEqual(box(out), [5063.68, 2201.77, 23, 202]);
});

test('SVG whose size already matches its bounds is unchanged', () => {
  assert.deepEqual(box(placeSvg(svg(40, 30), 'Star', { x: 10, y: 20, width: 40, height: 30 }, { x: 0, y: 0 })), [10, 20, 40, 30]);
});

test('SVG without width/height attributes fails loudly', () => {
  assert.throws(() => placeSvg('<svg viewBox="0 0 1 1"></svg>', 'x', { x: 0, y: 0, width: 1, height: 1 }, { x: 0, y: 0 }), /width\/height/);
});

test('layer name is escaped', () => {
  assert.match(placeSvg(svg(1, 1), 'a "b" <c>', { x: 0, y: 0, width: 1, height: 1 }, { x: 0, y: 0 }), /layer-name="a &quot;b&quot; &lt;c&gt;"/);
});
