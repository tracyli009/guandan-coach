(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Moves = isNode ? require('./moves.js') : root.GD.Moves;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

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
      const smallest = pool.reduce((a, b) => (a.compareValue <= b.compareValue ? a : b));
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
