(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Moves = isNode ? require('./moves.js') : root.GD.Moves;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

  function countByRank(hand) {
    const counts = {};
    for (const c of hand) counts[c.rank] = (counts[c.rank] || 0) + 1;
    return counts;
  }

  // True if this lead uses even one card from a same-rank stack of 4+ (a
  // plain 4/5/6/7/8-bomb waiting to happen). Using any card from that stack
  // - whether as a bare single, part of a pair/triple, or folded into a
  // triple_pair - drops it below bomb size and cannibalizes it, so this
  // checks every rank the combo touches, not just combos built from one
  // rank alone.
  function cannibalizesABomb(combo, rankCounts) {
    return combo.cards.some(c => rankCounts[c.rank] >= 4);
  }

  function chooseAiPlay(hand, currentCombo, context) {
    const { selfIndex, lastPlayerIndex, levelRank } = context;
    const options = Moves.legalPlays(hand, currentCombo, levelRank);

    if (!currentCombo) {
      if (options.length === 0) return { action: 'pass' };
      // candidateLeads mixes every category/length together, and Combos.compare only
      // supports comparing two combos of the SAME category/length. Comparing raw
      // compareValue avoids that crash, and never leads with a bomb unless a bomb is
      // literally the only selection available (never happens in practice, since a
      // single is always a valid lead whenever the hand is non-empty).
      const nonBombLeads = options.filter(o => !o.isBomb);
      const pool = nonBombLeads.length > 0 ? nonBombLeads : options;
      // Prefer leads that don't cannibalize a same-rank 4+ stack (a bomb
      // in waiting) just because it happens to be the lowest rank held -
      // fall back to allowing it only if every remaining option would.
      const rankCounts = countByRank(hand);
      const bombSafe = pool.filter(o => !cannibalizesABomb(o, rankCounts));
      const finalPool = bombSafe.length > 0 ? bombSafe : pool;
      // Among leads tied for the lowest compareValue (typically several
      // single/pair/triple options built from the same lowest rank), prefer
      // the one that uses the most cards from THAT SAME rank group. Picking
      // the lone single and leaving its same-rank siblings behind as an
      // orphan pair/triple is exactly the "weak spot" this is meant to
      // avoid - clear the whole low group in one lead instead of
      // fragmenting it. This is scoped to single/pair/triple only (not
      // triple_pair/straight/plate, which happen to share the same
      // compareValue as the rank they start on but pull in a SECOND rank -
      // dragging extra cards into the lead was never what "clear the weak
      // spot" meant).
      const minValue = Math.min(...finalPool.map(o => o.compareValue));
      const tier = finalPool.filter(o => o.compareValue === minValue);
      const rankGroupTier = tier.filter(o => o.category === 'single' || o.category === 'pair' || o.category === 'triple');
      const preferPool = rankGroupTier.length > 0 ? rankGroupTier : tier;
      const smallest = preferPool.reduce((a, b) => (b.cards.length > a.cards.length ? b : a));
      return { action: 'play', combo: smallest };
    }

    const partnerIsWinning = lastPlayerIndex !== null && TEAM_OF[lastPlayerIndex] === TEAM_OF[selfIndex];
    if (partnerIsWinning) {
      return { action: 'pass' };
    }

    const nonBombOptions = options.filter(o => !o.isBomb);
    if (nonBombOptions.length > 0) {
      const smallest = nonBombOptions.reduce((a, b) => (Combos.compare(a, b) < 0 ? a : b));
      return { action: 'play', combo: smallest };
    }

    const bombOptions = options.filter(o => o.isBomb);
    if (bombOptions.length > 0 && hand.length <= 6) {
      const smallest = bombOptions.reduce((a, b) => (Combos.compare(a, b) < 0 ? a : b));
      return { action: 'play', combo: smallest };
    }

    return { action: 'pass' };
  }

  const AI = { chooseAiPlay };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
  } else {
    root.GD = root.GD || {};
    root.GD.AI = AI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
