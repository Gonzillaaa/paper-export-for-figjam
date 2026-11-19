const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('demo builder leaves a nonempty workshop alone and explains where to run it', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../demo/build-board/code.js'), 'utf8');
  const page = { children: [{ type: 'STICKY', name: 'Existing workshop note' }] };
  let result;
  vm.runInNewContext(source, { figma: { currentPage: page, closePlugin: message => { result = message; } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(result, /empty FigJam page/);
  assert.equal(page.children.length, 1);
});
