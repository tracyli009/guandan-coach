// test/ai.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const AI = require('../src/ai.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

test('passes when the current winner is a teammate', () => {
  const hand = [c('9', 'S', '1')];
  const currentCombo = { category: 'single', length: 1, compareValue: 5, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 2, levelRank: level });
  assert.equal(decision.action, 'pass');
});

test('beats an opponent with the smallest sufficient non-bomb combo', () => {
  const hand = [c('9', 'S', '1'), c('K', 'H', '2')];
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.isBomb, false);
});

test('preserves a bomb when hand is still large', () => {
  const hand = [c('9','S','a'), c('9','H','b'), c('9','D','c'), c('9','C','d'),
                c('3','S','e'), c('4','S','f'), c('5','S','g'), c('6','S','h')];
  const currentCombo = { category: 'triple', length: 3, compareValue: 12, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(decision.action, 'pass');
});

test('uses the bomb when it is the only option and the hand is nearly empty', () => {
  const hand = [c('9','S','a'), c('9','H','b'), c('9','D','c'), c('9','C','d')];
  const currentCombo = { category: 'triple', length: 3, compareValue: 12, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.isBomb, true);
});

test('leads with the smallest available combo when there is no current combo', () => {
  const hand = [c('9', 'S', '1'), c('3', 'H', '2')];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 1, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.category, 'single');
  assert.equal(decision.combo.compareValue, 1); // single '3'
});
