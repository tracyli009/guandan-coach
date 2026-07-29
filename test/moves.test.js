const test = require('node:test');
const assert = require('node:assert/strict');
const Moves = require('../src/moves.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

const hand = [
  c('3', 'S', '1'), c('3', 'H', '2'),
  c('4', 'S', '3'),
  c('7', 'S', '4'), c('7', 'H', '5'), c('7', 'D', '6'),
  c('9', 'S', '7'), c('9', 'H', '8')
];

test('candidateLeads finds singles, pairs, triples, and triple_pair', () => {
  const leads = Moves.candidateLeads(hand, level);
  assert.ok(leads.some(x => x.category === 'single'));
  assert.ok(leads.some(x => x.category === 'pair' && x.compareValue === 1));
  assert.ok(leads.some(x => x.category === 'triple'));
  assert.ok(leads.some(x => x.category === 'triple_pair'));
});

test('legalPlays only returns combos of the same category/length that beat the current one, plus bombs', () => {
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false }; // single '4'
  const legal = Moves.legalPlays(hand, currentCombo, level);
  assert.ok(legal.every(x => x.isBomb || (x.category === 'single' && x.compareValue > 2)));
  assert.ok(legal.some(x => x.category === 'single' && x.compareValue === 5)); // single 7 beats single 4
});

test('legalPlays with no current combo returns the same set as candidateLeads', () => {
  const leads = Moves.candidateLeads(hand, level);
  const legal = Moves.legalPlays(hand, null, level);
  assert.equal(legal.length, leads.length);
});
