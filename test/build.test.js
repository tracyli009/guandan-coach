// test/build.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('build() produces guandan.html with title and no leftover placeholders', () => {
  const { build } = require('../build.js');
  build();
  const outPath = path.join(__dirname, '..', 'guandan.html');
  assert.ok(fs.existsSync(outPath));
  const html = fs.readFileSync(outPath, 'utf8');
  assert.match(html, /<title>掼蛋教练 MVP<\/title>/);
  assert.ok(!html.includes('{{STYLES}}'));
  assert.ok(!html.includes('{{SCRIPTS}}'));
});
