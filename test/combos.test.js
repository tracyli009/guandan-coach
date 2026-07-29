// test/combos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Cards = require('../src/cards.js');
const Combos = require('../src/combos.js');

function c(rank, suit) { return { rank, suit: suit || null, id: `${rank}${suit || ''}_${Math.random()}` }; }
const level = '2';

test('classify single/pair/triple', () => {
  assert.equal(Combos.classify([c('7','S')], level).category, 'single');
  assert.equal(Combos.classify([c('7','S'), c('7','H')], level).category, 'pair');
  assert.equal(Combos.classify([c('7','S'), c('7','H'), c('7','D')], level).category, 'triple');
});

test('classify triple_pair (三带二)', () => {
  const combo = Combos.classify([c('7','S'), c('7','H'), c('7','D'), c('4','S'), c('4','H')], level);
  assert.equal(combo.category, 'triple_pair');
  assert.equal(combo.compareValue, Cards.naturalIndex('7'));
});

test('classify straight, including A-high and A-low', () => {
  assert.equal(Combos.classify([c('3','S'), c('4','H'), c('5','D'), c('6','C'), c('7','S')], level).category, 'straight');
  assert.equal(Combos.classify([c('10','S'), c('J','H'), c('Q','D'), c('K','C'), c('A','S')], level).category, 'straight');
  assert.equal(Combos.classify([c('A','S'), c('2','H'), c('3','D'), c('4','C'), c('5','S')], level).category, 'straight');
});

test('classify plate (钢板, 2 consecutive triples) and pair_straight (三连对, 3 consecutive pairs)', () => {
  assert.equal(Combos.classify([c('5','S'), c('5','H'), c('5','D'), c('6','S'), c('6','H'), c('6','D')], level).category, 'plate');
  assert.equal(Combos.classify([c('5','S'), c('5','H'), c('6','S'), c('6','H'), c('7','S'), c('7','H')], level).category, 'pair_straight');
});

test('classify bombs: 4-of-a-kind, joker bomb, straight flush', () => {
  const b4 = Combos.classify([c('9','S'), c('9','H'), c('9','D'), c('9','C')], level);
  assert.equal(b4.category, 'bomb');
  assert.equal(b4.length, 4);

  const jokerBomb = Combos.classify([
    { rank: 'SJ', suit: null, id: 'sj0' }, { rank: 'SJ', suit: null, id: 'sj1' },
    { rank: 'BJ', suit: null, id: 'bj0' }, { rank: 'BJ', suit: null, id: 'bj1' }
  ], level);
  assert.equal(jokerBomb.bombSubtype, 'joker');

  const sf = Combos.classify([c('3','S'), c('4','S'), c('5','S'), c('6','S'), c('7','S')], level);
  assert.equal(sf.bombSubtype, 'straight_flush');
});

test('classify returns null for an invalid selection', () => {
  assert.equal(Combos.classify([c('3','S'), c('5','H')], level), null);
});

test('wildcard substitutes to complete a pair of a different rank', () => {
  const combo = Combos.classify([c('9','S'), c('5','H')], '5');
  assert.equal(combo.category, 'pair');
  assert.equal(combo.usedWildcardAs, '9');
});

test('wildcard completes a straight gap', () => {
  const combo = Combos.classify([c('3','S'), c('4','H'), c('9','H'), c('6','S'), c('7','C')], '9');
  assert.equal(combo.category, 'straight');
  assert.equal(combo.usedWildcardAs, '5');
});

test('compare: higher single beats lower single', () => {
  assert.ok(Combos.compare(Combos.classify([c('9','S')], level), Combos.classify([c('7','S')], level)) > 0);
});

test('compare: any bomb beats any non-bomb', () => {
  const single = Combos.classify([c('A','S')], level);
  const bomb = Combos.classify([c('3','S'), c('3','H'), c('3','D'), c('3','C')], level);
  assert.ok(Combos.compare(bomb, single) > 0);
});

test('compare: bomb tier ladder bomb4 < bomb5 < straight_flush < bomb6', () => {
  const bomb4 = Combos.classify([c('K','S'), c('K','H'), c('K','D'), c('K','C')], level);
  const bomb5 = Combos.classify([c('3','S'), c('3','H'), c('3','D'), c('3','C'), c('3','H')], level);
  const sf = Combos.classify([c('3','S'), c('4','S'), c('5','S'), c('6','S'), c('7','S')], level);
  const bomb6 = Combos.classify([c('4','S'), c('4','H'), c('4','D'), c('4','C'), c('4','S'), c('4','H')], level);
  assert.ok(Combos.compare(bomb5, bomb4) > 0);
  assert.ok(Combos.compare(sf, bomb5) > 0);
  assert.ok(Combos.compare(bomb6, sf) > 0);
});

test('compare throws for mismatched non-bomb categories', () => {
  const single = Combos.classify([c('7','S')], level);
  const pair = Combos.classify([c('7','S'), c('7','H')], level);
  assert.throws(() => Combos.compare(single, pair));
});

test('level-rank elevation applies to single comparison', () => {
  const elevated = Combos.classify([c('9','S')], '9');
  const ace = Combos.classify([c('A','S')], '9');
  assert.ok(Combos.compare(elevated, ace) > 0);
});
