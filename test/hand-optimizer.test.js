// test/hand-optimizer.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const HandOptimizer = require('../src/hand-optimizer.js');
const Cards = require('../src/cards.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

function totalCards(plan) {
  return plan.reduce((sum, g) => sum + g.cards.length, 0);
}

test('buildBombFirstPlan: a partition always accounts for every card exactly once', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), c('3', 'S', '4'),
    c('4', 'D', '5'), c('5', 'H', '6'), c('6', 'S', '7'), c('7', 'D', '8'),
    c('K', 'D', '9'), c('K', 'S', '10'),
    { rank: 'SJ', suit: null, id: 'sj1' }, { rank: 'BJ', suit: null, id: 'bj1' }
  ];
  const plan = HandOptimizer.buildBombFirstPlan(hand, level);
  assert.equal(totalCards(plan), hand.length);
});

test('buildDeGoSingleFirstPlan: a partition always accounts for every card exactly once', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), c('3', 'S', '4'),
    c('4', 'D', '5'), c('5', 'H', '6'), c('6', 'S', '7'), c('7', 'D', '8'),
    c('K', 'D', '9'), c('K', 'S', '10'),
    { rank: 'SJ', suit: null, id: 'sj1' }, { rank: 'BJ', suit: null, id: 'bj1' }
  ];
  const plan = HandOptimizer.buildDeGoSingleFirstPlan(hand, level);
  assert.equal(totalCards(plan), hand.length);
});

test('保炸优先 keeps a clean same-rank 4-stack as one bomb group, untouched', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), c('3', 'S', '4'),
    c('9', 'S', '5')
  ];
  const plan = HandOptimizer.buildBombFirstPlan(hand, level);
  const bomb = plan.find(g => g.category === 'bomb');
  assert.ok(bomb, 'expected a bomb group');
  assert.equal(bomb.cards.length, 4);
});

test('去单化优先 will cannibalize a 4-stack to complete a straight when one is available', () => {
  // 3x4 + 4,5,6,7 singles = a straight 3-4-5-6-7 is available using one '3'.
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), c('3', 'S', '4'),
    c('4', 'D', '5'), c('5', 'H', '6'), c('6', 'S', '7'), c('7', 'D', '8')
  ];
  const plan = HandOptimizer.buildDeGoSingleFirstPlan(hand, level);
  const straight = plan.find(g => g.category === 'straight');
  assert.ok(straight, 'expected a straight to form by pulling one card from each rank, including the 4-stack');
  const bomb = plan.find(g => g.category === 'bomb');
  assert.ok(!bomb, 'the 4-stack should no longer be a bomb once one of its cards is used in the straight');
  const leftoverTriple = plan.find(g => g.rank === '3' && g.category === 'triple');
  assert.ok(leftoverTriple, 'the remaining 3 copies of rank 3 should be flushed as a triple');
});

test('scorePlan: deadCardPenalty counts weak lone singles (below J, not the level rank)', () => {
  const hand = [c('4', 'D', '1'), c('9', 'S', '2')];
  const plan = [
    { category: 'single', cards: [hand[0]], rank: '4' },
    { category: 'single', cards: [hand[1]], rank: '9' }
  ];
  const { breakdown } = HandOptimizer.scorePlan(plan, hand, level);
  assert.equal(breakdown.deadCardPenalty, 2);
});

test('scorePlan: a strong single (J/Q/K/A or the level rank) is not counted as a dead card', () => {
  const hand = [c('K', 'D', '1'), c('2', 'S', '2')]; // level rank '2'
  const plan = [
    { category: 'single', cards: [hand[0]], rank: 'K' },
    { category: 'single', cards: [hand[1]], rank: '2' }
  ];
  const { breakdown } = HandOptimizer.scorePlan(plan, hand, level);
  assert.equal(breakdown.deadCardPenalty, 0);
});

test('scorePlan: bombValue rewards bomb count, and grows (slightly) with bomb tier', () => {
  const fourCards = ['1', '2', '3', '4'].map(t => c('9', 'S', t));
  const fiveCards = ['1', '2', '3', '4', '5'].map(t => c('9', 'S', t));
  const plan4 = [{ category: 'bomb', cards: fourCards, rank: '9' }];
  const plan5 = [{ category: 'bomb', cards: fiveCards, rank: '9' }];
  const noBombPlan = [{ category: 'triple', cards: fourCards.slice(0, 3), rank: '9' }];

  const s4 = HandOptimizer.scorePlan(plan4, fourCards, level).breakdown.bombValue;
  const s5 = HandOptimizer.scorePlan(plan5, fiveCards, level).breakdown.bombValue;
  const sNone = HandOptimizer.scorePlan(noBombPlan, fourCards.slice(0, 3), level).breakdown.bombValue;

  assert.ok(s4 > sNone, 'any bomb should score higher bombValue than no bomb');
  assert.ok(s5 > s4, 'a higher-tier bomb (5 of a kind) should score slightly higher than a 4-bomb');
});

test('scorePlan: wildcardValue rewards the level-rank wildcard landing in a bomb/structure over a lone single', () => {
  const wildcard = c('2', 'H', 'wc'); // level rank '2', red heart = wildcard
  const other = c('9', 'S', 'x');
  const hand = [wildcard, other];

  const wildcardInBomb = [
    { category: 'bomb', cards: [wildcard, c('2', 'S', 'a'), c('2', 'D', 'b'), c('2', 'C', 'c')], rank: '2' },
    { category: 'single', cards: [other], rank: '9' }
  ];
  const wildcardAlone = [
    { category: 'single', cards: [wildcard], rank: '2' },
    { category: 'single', cards: [other], rank: '9' }
  ];

  const bombScore = HandOptimizer.scorePlan(wildcardInBomb, hand, level).breakdown.wildcardValue;
  const aloneScore = HandOptimizer.scorePlan(wildcardAlone, hand, level).breakdown.wildcardValue;
  assert.ok(bombScore > aloneScore, 'wildcard put to work in a bomb should score higher than left as a lone single');
});

test('generatePlans returns 2 labeled plans, each scored, each accounting for the whole hand', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'),
    c('4', 'D', '4'), c('4', 'H', '5'), c('4', 'S', '6'),
    c('5', 'H', '7'), c('5', 'S', '8'),
    c('8', 'S', '9'), c('8', 'C', '10'),
    c('J', 'H', '11'), c('J', 'S', '12'),
    c('Q', 'D', '13'), c('Q', 'S', '14'), c('Q', 'H', '15'),
    c('K', 'D', '16'), c('K', 'S', '17'), c('K', 'C', '18'),
    { rank: 'BJ', suit: null, id: 'bj1' }, { rank: 'BJ', suit: null, id: 'bj2' }
  ];
  const plans = HandOptimizer.generatePlans(hand, level);
  assert.equal(plans.length, 2);
  const labels = plans.map(p => p.label).sort();
  assert.deepEqual(labels, ['去单化优先', '保炸优先'].sort());
  for (const p of plans) {
    assert.equal(totalCards(p.groups), hand.length);
    assert.equal(typeof p.score, 'number');
  }
});

test('choosePlan picks the higher-scoring plan and explains the pick by the score components that actually differ', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'), c('3', 'S', '4'),
    c('9', 'S', '5'), c('10', 'D', '6')
  ];
  const result = HandOptimizer.choosePlan(hand, level);
  assert.ok(result.best);
  assert.equal(result.alternatives.length, 1);
  assert.ok(result.best.score >= result.alternatives[0].score);
  assert.match(result.explanation, /推荐|采用/);
});

test('two same-face jokers (e.g. both 大王) are grouped as a pair, not two lone singles', () => {
  const hand = [{ rank: 'BJ', suit: null, id: 'bj1' }, { rank: 'BJ', suit: null, id: 'bj2' }, c('9', 'S', '1')];
  const plan = HandOptimizer.buildBombFirstPlan(hand, level);
  const jokerPair = plan.find(g => g.rank === 'BJ');
  assert.ok(jokerPair, 'expected a BJ group');
  assert.equal(jokerPair.category, 'pair');
  assert.equal(jokerPair.cards.length, 2);
});

test('all 4 jokers (2 small + 2 big) form a joker bomb', () => {
  const hand = [
    { rank: 'SJ', suit: null, id: 'sj1' }, { rank: 'SJ', suit: null, id: 'sj2' },
    { rank: 'BJ', suit: null, id: 'bj1' }, { rank: 'BJ', suit: null, id: 'bj2' }
  ];
  const plan = HandOptimizer.buildBombFirstPlan(hand, level);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].category, 'bomb');
  assert.equal(plan[0].rank, 'joker');
});

test('describePlan renders each group with its Chinese category label', () => {
  const plan = [
    { category: 'triple', cards: [c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3')], rank: '3' },
    { category: 'bomb', cards: [c('9', 'S', '1'), c('9', 'H', '2'), c('9', 'D', '3'), c('9', 'C', '4')], rank: '9' }
  ];
  const text = HandOptimizer.describePlan(plan);
  assert.match(text, /三同张/);
  assert.match(text, /炸弹/);
});
