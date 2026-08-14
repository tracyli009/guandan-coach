(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Moves = isNode ? require('./moves.js') : root.GD.Moves;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;
  const HandOptimizer = isNode ? require('./hand-optimizer.js') : root.GD.HandOptimizer;

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

  function chooseAiPlay(hand, currentCombo, context) {
    const { selfIndex, lastPlayerIndex, levelRank } = context;
    const options = Moves.legalPlays(hand, currentCombo, levelRank);

    if (!currentCombo) {
      if (options.length === 0) return { action: 'pass' };
      // Leading defers entirely to the hand-optimizer's chosen 组牌方案
      // (src/hand-optimizer.js) instead of independently re-deriving "the
      // smallest lead" from raw compareValue - that used to be blind to
      // straight/plate/pair_straight structures (compareValue for those is
      // anchored to their TOP card, so a straight starting low would never
      // even tie with a lone low single, let alone win), which let the
      // coach's "理牌" narrative claim a hand was well-organized into
      // straights while recommending a lead that broke one apart.
      const plan = HandOptimizer.choosePlan(hand, levelRank).best.groups;
      // Never voluntarily lead with a bomb the plan formed, unless a bomb
      // is literally the only group left (mirrors the old bomb-avoidance
      // behavior, now expressed against the plan's groups instead of raw
      // legalPlays options).
      const nonBombGroups = plan.filter(g => g.category !== 'bomb');
      const pool = nonBombGroups.length > 0 ? nonBombGroups : plan;
      const sortValue = g => Math.min(...g.cards.map(card => Cards.rankValue(card.rank, levelRank)));
      const minValue = Math.min(...pool.map(sortValue));
      // Among groups tied for the lowest starting rank (e.g. a leftover
      // lone single of rank 3 vs. a pair_straight that also starts at rank
      // 3), prefer whichever uses more cards - clearing more of the hand
      // in one lead over leaving cards fragmented behind.
      const tier = pool.filter(g => sortValue(g) === minValue);
      const chosen = tier.reduce((a, b) => (b.cards.length > a.cards.length ? b : a));
      // Combos.classify() returns only the classification metadata, not the
      // cards themselves (callers are expected to attach them - see how
      // moves.js's candidateLeads does the same Object.assign) - downstream
      // consumers (Engine.playCombo, CoachRealtime.describeCards) need
      // combo.cards to exist.
      const combo = Object.assign({}, Combos.classify(chosen.cards, levelRank), { cards: chosen.cards });
      return { action: 'play', combo };
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
