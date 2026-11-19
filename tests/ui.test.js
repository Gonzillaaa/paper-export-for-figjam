const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('downloading references preserves the board download and clipboard data', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../plugin/ui.html'), 'utf8');
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
    textContent: '', select() {}, focus() {},
  }]));
  const downloads = [];
  const blobs = [];
  const window = {};
  const document = {
    getElementById: id => elements[id], body: { appendChild() {} },
    createElement: () => ({ click() { downloads.push(this.download); }, remove() {} }),
    execCommand: () => true,
  };
  const requests = [];
  const parent = { postMessage: ({ pluginMessage }) => requests.push(pluginMessage) };
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document, window, parent, Blob, URL: {
      createObjectURL(blob) { blobs.push(blob); return 'blob:download'; }, revokeObjectURL() {},
    }, setTimeout() {},
    set onmessage(cb) { window.onmessage = cb; },
  });
  assert.deepEqual(requests, ['ready']);
  const send = (type, json) => window.onmessage({ data: { pluginMessage: { type, json } } });
  send('result', '{"sections":[]}');
  send('pngs', '{"board":"PNG"}');
  elements.dl.onclick();
  elements.cp.onclick();
  assert.deepEqual(downloads, ['figjam-export.json', 'figjam-reference-pngs.json', 'figjam-export.json']);
  assert.deepEqual(await Promise.all(blobs.map(b => b.text())), ['{"sections":[]}', '{"board":"PNG"}', '{"sections":[]}']);
  assert.equal(elements.ta.value, '{"sections":[]}');
});
