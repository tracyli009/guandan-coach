// test/cards.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Cards = require('../src/cards.js');

test('createDeck returns 108 cards', () => {
  assert.equal(Cards.createDeck().length, 108);
});

test('createDeck has exactly 2 copies of each rank/suit and 4 jokers', () => {
  const counts = {};
  for (const c of Cards.createDeck()) {
    const key = c.suit ? `${c.rank}${c.suit}` : c.rank;
    counts[key] = (counts[key] || 0) + 1;
  }
  assert.equal(counts['AH'], 2);
  assert.equal(counts['2S'], 2);
  assert.equal(counts['SJ'], 2);
  assert.equal(counts['BJ'], 2);
});

test('deal splits 108 cards into 4 hands of 27', () => {
  const hands = Cards.deal(Cards.createDeck());
  assert.equal(hands.length, 4);
  for (const h of hands) assert.equal(h.length, 27);
});

test('deal throws if deck is not 108 cards', () => {
  assert.throws(() => Cards.deal([{ rank: '2', suit: 'S', id: 'x' }]));
});

test('rankValue: natural order 2 < 3 < ... < A when not level rank', () => {
  assert.ok(Cards.rankValue('2', '5') < Cards.rankValue('3', '5'));
  assert.ok(Cards.rankValue('K', '5') < Cards.rankValue('A', '5'));
});

test('rankValue: level rank is elevated above A', () => {
  assert.ok(Cards.rankValue('7', '7') > Cards.rankValue('A', '7'));
});

test('rankValue: jokers rank above level rank, big joker above small joker', () => {
  assert.ok(Cards.rankValue('SJ', '9') > Cards.rankValue('9', '9'));
  assert.ok(Cards.rankValue('BJ', '9') > Cards.rankValue('SJ', '9'));
});

test('isWildcard: true only for red-heart level-rank card', () => {
  assert.equal(Cards.isWildcard({ rank: '5', suit: 'H' }, '5'), true);
  assert.equal(Cards.isWildcard({ rank: '5', suit: 'S' }, '5'), false);
  assert.equal(Cards.isWildcard({ rank: '6', suit: 'H' }, '5'), false);
});

test('shuffle with injected rng preserves every card', () => {
  const deck = Cards.createDeck();
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const shuffled = Cards.shuffle(deck, rng);
  assert.equal(shuffled.length, deck.length);
  assert.deepEqual(shuffled.map(c => c.id).sort(), deck.map(c => c.id).sort());
});

test('sortHand orders by rankValue ascending', () => {
  const hand = [{ rank: 'A', suit: 'S' }, { rank: '3', suit: 'H' }, { rank: 'BJ', suit: null }];
  assert.deepEqual(Cards.sortHand(hand, '5').map(c => c.rank), ['3', 'A', 'BJ']);
});
