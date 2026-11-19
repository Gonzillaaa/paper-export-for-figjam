// Run with: node --test tests/*.test.js
// Font names and other style values come from the FigJam file. A crafted value must not be able to
// close the style attribute or add CSS declarations of its own.
const test = require('node:test');
const assert = require('node:assert/strict');
const { st, familyCss } = require('../plugin/code.js');

test('style values cannot close the attribute or open a tag', () => {
  const out = st({ 'font-family': 'X"><script>alert(1)</script>' });
  assert.ok(!out.includes('"'), out);
  assert.ok(!out.includes('<'), out);
});

test('style values cannot add declarations or blocks', () => {
  assert.equal(st({ color: 'red;background:url(x){}' }), 'color:redbackground:url(x)');
});

test('font family is quoted, with quotes and backslashes removed', () => {
  assert.equal(familyCss('Roboto Mono'), "'Roboto Mono'");
  assert.equal(familyCss(`Evil'"\\Font`), "'EvilFont'");
});
