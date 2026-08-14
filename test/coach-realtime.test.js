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
  assert.match(suggestion.rationale, /拿下当前墩/);
});

test('when leading a fresh trick (no current combo), the rationale says you are leading, not "taking" a nonexistent trick', () => {
  const hand = [c('3', 'S', '1'), c('9', 'H', '2')];
  const suggestion = CoachRealtime.suggestPlay(hand, null, { selfIndex: 1, lastPlayerIndex: null, levelRank: level });
  assert.equal(suggestion.action, 'play');
  assert.match(suggestion.rationale, /单张/);
  assert.match(suggestion.rationale, /新的一墩，由你领出/);
  assert.ok(!suggestion.rationale.includes('拿下当前墩'), 'leading rationale must not claim to take a trick that does not exist');
});

test('describeCards names the actual card(s), not just the shape', () => {
  const single = { cards: [{ rank: '8', suit: 'H' }] };
  assert.equal(CoachRealtime.describeCards(single), '8♥️');
  const pair = { cards: [{ rank: 'Q', suit: 'S' }, { rank: 'Q', suit: 'S' }] };
  assert.equal(CoachRealtime.describeCards(pair), 'Q♠️Q♠️');
  assert.equal(CoachRealtime.describeCards({ cards: [{ rank: 'BJ', suit: null }] }), '大王');
  assert.equal(CoachRealtime.describeCards(null), '');
});

test('rationale names the specific card, not just "单张", so a player with no rank held exactly once can still tell which card is meant', () => {
  // Every rank in this hand appears 2+ times - there is no card that is a
  // "lone single" by count, but the game still lets you peel one off any
  // rank to play as a single. The rationale must say WHICH one.
  const hand = [
    c('8', 'H', '1'), c('8', 'C', '2'), c('8', 'D', '3'),
    c('Q', 'D', '4'), c('Q', 'S', '5')
  ];
  const currentCombo = { category: 'single', length: 1, compareValue: 4, isBomb: false }; // single '6'
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 3, levelRank: level });
  assert.equal(suggestion.action, 'play');
  assert.match(suggestion.rationale, /8♥️|8♣️|8♦️/, 'rationale should name one specific 8, not just say "单张"');
});

test('when leading with a low triple in hand (no adjacent triple to plate with), rationale calls it "三同张" (naming all 3 cards), not "单张"', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'),
    c('9', 'D', '4'), c('9', 'H', '5'), c('9', 'S', '6'), // not adjacent to 3 - no plate available
    c('5', 'H', '7'), c('5', 'S', '8')
  ];
  const suggestion = CoachRealtime.suggestPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.equal(suggestion.action, 'play');
  assert.match(suggestion.rationale, /三同张/, 'should recommend the whole triple, not a lone single');
  assert.match(suggestion.rationale, /3♣️/);
  assert.match(suggestion.rationale, /3♦️/);
  assert.match(suggestion.rationale, /3♥️/);
});

test('rationale is prefixed with a 理牌 structure overview before the specific play/pass advice', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'),
    c('K', 'D', '4'), c('K', 'S', '5')
  ];
  const suggestion = CoachRealtime.suggestPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.match(suggestion.rationale, /^理牌：/, 'rationale should open with the hand-structure summary');
  assert.match(suggestion.rationale, /弱路/);
});

test('when leading, the rationale also includes the hand-optimizer\'s chosen plan and its reasoning', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), c('3', 'S', '4'),
    c('9', 'S', '5'), c('10', 'D', '6')
  ];
  const suggestion = CoachRealtime.suggestPlay(hand, null, { selfIndex: 0, lastPlayerIndex: null, levelRank: level });
  assert.match(suggestion.rationale, /方案/, 'leading rationale should mention the chosen 组牌 plan');
});

test('a follow/beat turn (currentCombo present) does not repeat the whole-hand optimizer plan', () => {
  const hand = [c('9', 'S', '1'), c('K', 'H', '2')];
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false };
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.ok(!suggestion.rationale.includes('方案'), 'follow-turn rationale should stay focused on the specific beat, not restate the whole-hand plan');
});

test('the 理牌 prefix is also present on pass suggestions', () => {
  const hand = [c('9', 'S', '1')];
  const currentCombo = { category: 'single', length: 1, compareValue: 5, isBomb: false };
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 2, levelRank: level });
  assert.equal(suggestion.action, 'pass');
  assert.match(suggestion.rationale, /^理牌：/);
});
