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

test('build() output attaches all 8 pure-logic modules to window.GD when module/require are absent (browser simulation)', () => {
  const { build } = require('../build.js');
  const html = build();
  const scriptBody = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const pureLogicOnly = scriptBody.split('/* UI_BOUNDARY */')[0];
  const sandbox = {};
  sandbox.window = sandbox;
  new Function('window', 'module', 'require', 'exports', pureLogicOnly)(sandbox, undefined, undefined, undefined);
  const expected = ['Cards', 'Combos', 'Moves', 'Engine', 'AI', 'CoachRealtime', 'CoachReview', 'CoachHistory'];
  for (const name of expected) {
    assert.ok(sandbox.GD[name], `expected window.GD.${name} to be defined`);
  }
});
