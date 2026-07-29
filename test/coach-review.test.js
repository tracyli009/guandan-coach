const test = require('node:test');
const assert = require('node:assert/strict');
const CoachReview = require('../src/coach-review.js');

function entry(overrides) {
  return Object.assign({
    action: 'play', partnerWasWinning: false, comboCategory: 'single', comboIsBomb: false,
    handSizeBefore: 20, matchedSuggestion: true, hadBeatingOptionNonBomb: false
  }, overrides);
}

test('flags takeover_from_partner when the human repeatedly plays while a teammate is winning', () => {
  const log = [entry({ partnerWasWinning: true }), entry({ partnerWasWinning: true })];
  const review = CoachReview.reviewHand(log);
  assert.ok(review.patterns.some(p => p.key === 'takeover_from_partner'));
});

test('flags early_bomb when a bomb is played with a large hand remaining', () => {
  const log = [entry({ comboIsBomb: true, handSizeBefore: 15 })];
  const review = CoachReview.reviewHand(log);
  assert.ok(review.patterns.some(p => p.key === 'early_bomb'));
});

test('flags passive_pass when passing despite having a non-bomb beating option', () => {
  const log = [
    entry({ action: 'pass', hadBeatingOptionNonBomb: true, matchedSuggestion: true }),
    entry({ action: 'pass', hadBeatingOptionNonBomb: true, matchedSuggestion: true })
  ];
  const review = CoachReview.reviewHand(log);
  assert.ok(review.patterns.some(p => p.key === 'passive_pass'));
});

test('cooperationScore is the percentage of moves that matched the coach suggestion', () => {
  const log = [entry({ matchedSuggestion: true }), entry({ matchedSuggestion: false })];
  const review = CoachReview.reviewHand(log);
  assert.equal(review.cooperationScore, 50);
});

test('a clean hand with no flagged patterns still returns a valid score', () => {
  const log = [entry({}), entry({})];
  const review = CoachReview.reviewHand(log);
  assert.equal(review.patterns.length, 0);
  assert.equal(review.cooperationScore, 100);
});
