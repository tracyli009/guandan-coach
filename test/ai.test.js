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

test('when leading, does not break up a same-rank 4-stack (a bomb in waiting) just because it is the lowest rank held', () => {
  const hand = [
    c('3', 'S', '1'), c('3', 'H', '2'), c('3', 'D', '3'), c('3', 'C', '4'), // 4x '3' - bomb-eligible
    c('6', 'S', '5'), c('6', 'H', '6'), c('6', 'D', '7'),                  // triple '6'
    c('9', 'S', '8')                                                       // lone '9'
  ];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.cards[0].rank, '6', 'should lead with the 6, not cannibalize the 4x3 bomb-in-waiting');
});

test('when leading and every rank is bomb-eligible, falls back to breaking one rather than passing', () => {
  const hand = [
    c('3', 'S', '1'), c('3', 'H', '2'), c('3', 'D', '3'), c('3', 'C', '4')
  ];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.cards[0].rank, '3');
});

test('leading with a heterogeneous hand (singles and pairs both available) does not throw and picks a sane smallest option', () => {
  const hand = [
    c('3', 'S', '1'), c('3', 'H', '2'),
    c('9', 'S', '3'),
    c('K', 'H', '4'), c('K', 'D', '5')
  ];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.isBomb, false);
});

test('when leading and the lowest rank has 3 copies (non-bomb) with no adjacent rank to plate with, plays the whole triple instead of peeling off a lone single', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), // triple '3' - lowest rank, only 3 copies (not bomb-eligible)
    c('9', 'D', '4'), c('9', 'H', '5'), c('9', 'S', '6'), // triple '9' - NOT adjacent to 3, so no plate is possible
    c('5', 'H', '7'), c('5', 'S', '8'),                   // pair '5'
    c('K', 'S', '9'), c('K', 'S', '10')                   // pair 'K'
  ];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.category, 'triple', 'should lead the whole triple of 3s, not a lone single 3');
  assert.equal(decision.combo.cards.length, 3);
});

test('when leading and the lowest two ranks are both triples of adjacent rank, leads the 6-card plate over just the lower triple', () => {
  // Per the hand-optimizer's 组牌五原则 (去单化/减少轮次): clearing both
  // triples in ONE lead (a plate/钢板) is strictly more efficient than
  // leading the lower triple alone and leaving the other triple stranded
  // for a separate turn.
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'),
    c('4', 'D', '4'), c('4', 'H', '5'), c('4', 'S', '6'),
    c('9', 'S', '7'), c('K', 'H', '8')
  ];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.category, 'plate', 'should lead the plate covering both triples, not just the lower triple');
  assert.equal(decision.combo.cards.length, 6);
});

test('when leading and the lowest rank has only 2 copies, plays the pair rather than a lone single', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), // pair '3' - lowest rank
    c('9', 'S', '3'), c('K', 'H', '4')
  ];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.category, 'pair');
  assert.equal(decision.combo.cards.length, 2);
});
