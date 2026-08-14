// test/hand-organizer.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const HandOrganizer = require('../src/hand-organizer.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

test('classifies a low 1-3 copy group as a weak path', () => {
  const hand = [c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3')];
  const analysis = HandOrganizer.analyzeHand(hand, level);
  assert.equal(analysis.weakGroups.length, 1);
  assert.equal(analysis.weakGroups[0].rank, '3');
  assert.equal(analysis.strongGroups.length, 0);
  assert.equal(analysis.bombGroups.length, 0);
});

test('classifies J/Q/K/A groups as strong holds, not weak paths', () => {
  const hand = [c('K', 'D', '1'), c('K', 'S', '2'), c('K', 'C', '3'), c('A', 'H', '4')];
  const analysis = HandOrganizer.analyzeHand(hand, level);
  assert.equal(analysis.weakGroups.length, 0);
  assert.equal(analysis.strongGroups.length, 2);
});

test('treats the current level rank as a strong hold even if numerically low', () => {
  const hand = [c('2', 'D', '1'), c('2', 'S', '2')]; // level rank '2'
  const analysis = HandOrganizer.analyzeHand(hand, level);
  assert.equal(analysis.strongGroups.length, 1);
  assert.equal(analysis.weakGroups.length, 0);
});

test('classifies a same-rank group of 4+ as a bomb-in-waiting, not a weak path', () => {
  const hand = [c('4', 'D', '1'), c('4', 'H', '2'), c('4', 'S', '3'), c('4', 'C', '4')];
  const analysis = HandOrganizer.analyzeHand(hand, level);
  assert.equal(analysis.bombGroups.length, 1);
  assert.equal(analysis.weakGroups.length, 0);
});

test('recognizes a joker pair as a strong hold', () => {
  const hand = [{ rank: 'SJ', suit: null, id: 'sj1' }, { rank: 'BJ', suit: null, id: 'bj1' }];
  const analysis = HandOrganizer.analyzeHand(hand, level);
  assert.equal(analysis.jokerPair, true);
});

test('a lone joker (not a pair) is not flagged as jokerPair', () => {
  const hand = [{ rank: 'SJ', suit: null, id: 'sj1' }];
  const analysis = HandOrganizer.analyzeHand(hand, level);
  assert.equal(analysis.jokerPair, false);
});

test('summarize produces a single sentence naming weak/strong/bomb groups by rank', () => {
  const hand = [
    c('3', 'C', '1'), c('3', 'D', '2'), c('3', 'H', '3'),
    c('4', 'D', '4'), c('4', 'H', '5'), c('4', 'S', '6'), c('4', 'C', '7'),
    c('K', 'D', '8'), c('K', 'S', '9')
  ];
  const summary = HandOrganizer.summarize(HandOrganizer.analyzeHand(hand, level));
  assert.match(summary, /理牌/);
  assert.match(summary, /弱路/);
  assert.match(summary, /3/);
  assert.match(summary, /待命炸弹/);
  assert.match(summary, /4/);
  assert.match(summary, /强张/);
  assert.match(summary, /K/);
});

test('summarize says there is no obvious weak path when every group is strong or a bomb', () => {
  const hand = [c('K', 'D', '1'), c('K', 'S', '2'), c('A', 'H', '3')];
  const summary = HandOrganizer.summarize(HandOrganizer.analyzeHand(hand, level));
  assert.match(summary, /暂无明显弱路/);
});
