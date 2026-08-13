const test = require('node:test');
const assert = require('node:assert/strict');
const Knowledge = require('../src/knowledge.js');

test('PRINCIPLES contains non-empty Chinese text for every key', () => {
  const keys = Object.keys(Knowledge.PRINCIPLES);
  assert.ok(keys.length > 0);
  for (const k of keys) {
    assert.equal(typeof Knowledge.PRINCIPLES[k], 'string');
    assert.ok(Knowledge.PRINCIPLES[k].length > 0);
  }
});

test('cite() quotes the exact principle text and names the source document', () => {
  const text = Knowledge.cite('partner_defer');
  assert.match(text, /搭档顺时少抢牌/);
  assert.match(text, /标准牌局输入格式/);
});

test('cite() returns an empty string for an unknown key instead of throwing', () => {
  assert.equal(Knowledge.cite('does_not_exist'), '');
});

test('every principle referenced by name in this file actually exists in PRINCIPLES', () => {
  const usedElsewhere = [
    'partner_defer', 'bomb_is_tool', 'bomb_plan_ahead', 'weak_road_first'
  ];
  for (const key of usedElsewhere) {
    assert.ok(Knowledge.PRINCIPLES[key], `expected PRINCIPLES.${key} to exist`);
  }
});
