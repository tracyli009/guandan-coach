// test/engine.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../src/engine.js');

function card(rank, suit, tag) { return { rank, suit, id: `${rank}${suit}_${tag}` }; }

function baseState(hands) {
  return {
    levelRank: '2', hands, currentLeader: 0, currentTurn: 0, currentCombo: null,
    lastPlayerIndex: null, passStreak: 0, finishedOrder: [], history: []
  };
}

test('startRound deals 27 cards to each of 4 players and sets initial turn state', () => {
  const state = Engine.startRound('2', Math.random);
  assert.equal(state.hands.length, 4);
  for (const h of state.hands) assert.equal(h.length, 27);
  assert.equal(state.currentTurn, 0);
  assert.equal(state.currentCombo, null);
});

test('a full trick cycle: lead, all three others pass, turn returns to the leader', () => {
  const state = baseState([
    [card('3', 'S', 'a'), card('10', 'S', 'a2')],
    [card('4', 'S', 'b'), card('10', 'H', 'b2')],
    [card('5', 'S', 'c'), card('10', 'D', 'c2')],
    [card('6', 'S', 'd'), card('10', 'C', 'd2')]
  ]);
  Engine.playCombo(state, 0, [state.hands[0][0]]);
  assert.equal(state.currentTurn, 1);
  Engine.pass(state, 1);
  assert.equal(state.currentTurn, 2);
  Engine.pass(state, 2);
  assert.equal(state.currentTurn, 3);
  Engine.pass(state, 3);
  assert.equal(state.currentTurn, 0);
  assert.equal(state.currentCombo, null);
  assert.equal(state.currentLeader, 0);
});

test('round ends the instant the 3rd player empties their hand', () => {
  const state = baseState([
    [card('3', 'S', 'a')], [card('4', 'S', 'b')], [card('5', 'S', 'c')], [card('6', 'S', 'd')]
  ]);
  Engine.playCombo(state, 0, [state.hands[0][0]]);
  Engine.playCombo(state, 1, [state.hands[1][0]]);
  const r = Engine.playCombo(state, 2, [state.hands[2][0]]);
  assert.equal(r.roundOver, true);
  assert.equal(state.currentTurn, null);
  assert.deepEqual(state.finishedOrder, [0, 1, 2]);
});

test('rejects plays out of turn, cards not in hand, and passing while leading', () => {
  const state = baseState([
    [card('3', 'S', 'a')], [card('4', 'S', 'b')], [card('5', 'S', 'c')], [card('6', 'S', 'd')]
  ]);
  assert.equal(Engine.playCombo(state, 1, [state.hands[1][0]]).error, 'not your turn');
  assert.equal(Engine.playCombo(state, 0, [{ rank: '9', suit: 'H', id: 'not-in-hand' }]).error, 'cards not in hand');
  assert.equal(Engine.pass(state, 0).error, 'cannot pass when leading');
});

test('a follower must beat with the same category and length, or play a bomb', () => {
  const state = baseState([
    [card('7', 'S', 'a'), card('7', 'H', 'a2')],
    [card('4', 'S', 'b')], [card('5', 'S', 'c')], [card('6', 'S', 'd')]
  ]);
  Engine.playCombo(state, 0, [state.hands[0][0], state.hands[0][1]]); // pair of 7s
  const r = Engine.playCombo(state, 1, [state.hands[1][0]]); // single 4, wrong category
  assert.equal(r.error, 'combo does not beat current combo');
});

test('teamLevelGain: 1st & 2nd same team = 3, 1st & 3rd = 2, 1st & 4th = 1', () => {
  assert.equal(Engine.teamLevelGain([0, 2, 1]).gain, 3);
  assert.equal(Engine.teamLevelGain([0, 1, 2]).gain, 2);
  assert.equal(Engine.teamLevelGain([0, 1, 3]).gain, 1);
});
