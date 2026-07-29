// test/coach-realtime.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const CoachRealtime = require('../src/coach-realtime.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

test('describeCombo maps categories to Chinese labels', () => {
  assert.equal(CoachRealtime.describeCombo({ category: 'pair' }), '对子');
  assert.equal(CoachRealtime.describeCombo(null), '过牌');
});

test('suggests passing with a "不接对门的牌" rationale when the partner is winning', () => {
  const hand = [c('9', 'S', '1')];
  const currentCombo = { category: 'single', length: 1, compareValue: 5, isBomb: false };
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 2, levelRank: level });
  assert.equal(suggestion.action, 'pass');
  assert.match(suggestion.rationale, /不接对门的牌/);
});

test('suggests playing the smallest beating combo against an opponent, with a rationale naming the meld type', () => {
  const hand = [c('9', 'S', '1'), c('K', 'H', '2')];
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false };
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(suggestion.action, 'play');
  assert.match(suggestion.rationale, /单张/);
});
