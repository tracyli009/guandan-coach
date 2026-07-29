// test/coach-history.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const CoachHistory = require('../src/coach-history.js');

test('summarizeHistory on empty history returns zeroed-out defaults', () => {
  const summary = CoachHistory.summarizeHistory([]);
  assert.equal(summary.gamesPlayed, 0);
  assert.equal(summary.averageCooperationScore, 0);
  assert.equal(summary.dominantArchetype, null);
  assert.deepEqual(summary.trend, []);
});

test('summarizeHistory aggregates score average, pattern frequency, dominant archetype, and trend order', () => {
  const records = [
    { cooperationScore: 60, patterns: [{ key: 'takeover_from_partner' }] },
    { cooperationScore: 80, patterns: [{ key: 'takeover_from_partner' }] },
    { cooperationScore: 90, patterns: [] }
  ];
  const summary = CoachHistory.summarizeHistory(records);
  assert.equal(summary.gamesPlayed, 3);
  assert.equal(summary.averageCooperationScore, 77);
  assert.equal(summary.patternFrequency.takeover_from_partner, 2);
  assert.equal(summary.dominantArchetype, CoachHistory.ARCHETYPES.takeover_from_partner);
  assert.deepEqual(summary.trend, [60, 80, 90]);
});
