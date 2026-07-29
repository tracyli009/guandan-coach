(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;

  function groupByRank(hand) {
    const map = new Map();
    for (const c of hand) {
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank).push(c);
    }
    return map;
  }

  function candidateLeads(hand, levelRank) {
    const candidates = [];
    const groups = groupByRank(hand);
    const ranks = [...groups.keys()];

    for (const r of ranks) candidates.push([groups.get(r)[0]]);
    for (const r of ranks) if (groups.get(r).length >= 2) candidates.push(groups.get(r).slice(0, 2));
    for (const r of ranks) if (groups.get(r).length >= 3) candidates.push(groups.get(r).slice(0, 3));

    for (const r of ranks) {
      if (groups.get(r).length >= 3) {
        for (const r2 of ranks) {
          if (r2 !== r && groups.get(r2).length >= 2) {
            candidates.push(groups.get(r).slice(0, 3).concat(groups.get(r2).slice(0, 2)));
          }
        }
      }
    }

    const naturalRanks = Cards.RANK_ORDER;
    for (let start = 0; start + 5 <= naturalRanks.length; start++) {
      const windowRanks = naturalRanks.slice(start, start + 5);
      if (windowRanks.every(r => groups.has(r))) {
        candidates.push(windowRanks.map(r => groups.get(r)[0]));
      }
    }
    for (let start = 0; start + 2 <= naturalRanks.length; start++) {
      const windowRanks = naturalRanks.slice(start, start + 2);
      if (windowRanks.every(r => groups.has(r) && groups.get(r).length >= 3)) {
        candidates.push(windowRanks.flatMap(r => groups.get(r).slice(0, 3)));
      }
    }
    for (let start = 0; start + 3 <= naturalRanks.length; start++) {
      const windowRanks = naturalRanks.slice(start, start + 3);
      if (windowRanks.every(r => groups.has(r) && groups.get(r).length >= 2)) {
        candidates.push(windowRanks.flatMap(r => groups.get(r).slice(0, 2)));
      }
    }
    for (const r of ranks) {
      for (let size = 4; size <= Math.min(8, groups.get(r).length); size++) {
        candidates.push(groups.get(r).slice(0, size));
      }
    }
    const sj = hand.filter(c => c.rank === 'SJ');
    const bj = hand.filter(c => c.rank === 'BJ');
    if (sj.length >= 2 && bj.length >= 2) candidates.push([sj[0], sj[1], bj[0], bj[1]]);

    const classified = [];
    for (const cardsSel of candidates) {
      const combo = Combos.classify(cardsSel, levelRank);
      if (combo) classified.push(Object.assign({}, combo, { cards: cardsSel }));
    }
    return classified;
  }

  function legalPlays(hand, currentCombo, levelRank) {
    const leads = candidateLeads(hand, levelRank);
    if (!currentCombo) return leads;
    return leads.filter(combo => {
      if (combo.isBomb) {
        if (!currentCombo.isBomb) return true;
        return Combos.compare(combo, currentCombo) > 0;
      }
      if (currentCombo.isBomb) return false;
      if (combo.category !== currentCombo.category || combo.length !== currentCombo.length) return false;
      return Combos.compare(combo, currentCombo) > 0;
    });
  }

  const Moves = { candidateLeads, legalPlays };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Moves;
  } else {
    root.GD = root.GD || {};
    root.GD.Moves = Moves;
  }
})(typeof window !== 'undefined' ? window : globalThis);
