(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;

  const RANK_ORDER = Cards.RANK_ORDER;

  function naturalSeqIndexForStraight(rank, position) {
    if (rank === 'A' && position === 'low') return -1;
    return Cards.naturalIndex(rank);
  }

  function groupByRank(cards) {
    const map = new Map();
    for (const c of cards) {
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank).push(c);
    }
    return map;
  }

  function tryStraightLike(cards, runLength, groupSize) {
    const groups = groupByRank(cards);
    const ranks = [...groups.keys()];
    if (ranks.some(r => r === 'SJ' || r === 'BJ')) return null;
    if (ranks.length !== runLength) return null;
    for (const r of ranks) {
      if (groups.get(r).length !== groupSize) return null;
    }
    for (const position of ['low', 'high']) {
      const indices = ranks.map(r => naturalSeqIndexForStraight(r, position)).sort((a, b) => a - b);
      let consecutive = true;
      for (let i = 1; i < indices.length; i++) {
        if (indices[i] !== indices[i - 1] + 1) { consecutive = false; break; }
      }
      if (consecutive) return { topIndex: indices[indices.length - 1] };
    }
    return null;
  }

  function classifyPlain(cards) {
    const n = cards.length;
    const groups = groupByRank(cards);
    const rankList = [...groups.keys()];

    if (n === 1) {
      return { category: 'single', length: 1, faceRank: cards[0].rank, isBomb: false };
    }
    if (n === 2 && rankList.length === 1) {
      return { category: 'pair', length: 2, faceRank: rankList[0], isBomb: false };
    }
    if (n === 3 && rankList.length === 1) {
      return { category: 'triple', length: 3, faceRank: rankList[0], isBomb: false };
    }
    if (n === 4 && rankList.length === 1) {
      return { category: 'bomb', length: 4, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
    }
    if (n === 4) {
      const jokerCount = cards.filter(c => c.rank === 'SJ' || c.rank === 'BJ').length;
      if (jokerCount === 4) {
        return { category: 'bomb', length: 4, compareValue: 0, isBomb: true, bombSubtype: 'joker' };
      }
    }
    if (n === 5 && rankList.length === 2) {
      const triple = rankList.find(r => groups.get(r).length === 3);
      const pair = rankList.find(r => groups.get(r).length === 2);
      if (triple && pair) {
        return { category: 'triple_pair', length: 5, faceRank: triple, isBomb: false };
      }
    }
    if (n === 5) {
      const straight = tryStraightLike(cards, 5, 1);
      if (straight) {
        const suits = new Set(cards.map(c => c.suit));
        if (suits.size === 1) {
          return { category: 'bomb', length: 5, compareValue: straight.topIndex, isBomb: true, bombSubtype: 'straight_flush' };
        }
        return { category: 'straight', length: 5, compareValue: straight.topIndex, isBomb: false };
      }
    }
    if (n === 5 && rankList.length === 1) {
      return { category: 'bomb', length: 5, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
    }
    if (n === 6) {
      const plate = tryStraightLike(cards, 2, 3);
      if (plate) return { category: 'plate', length: 6, compareValue: plate.topIndex, isBomb: false };
      const pairStraight = tryStraightLike(cards, 3, 2);
      if (pairStraight) return { category: 'pair_straight', length: 6, compareValue: pairStraight.topIndex, isBomb: false };
      if (rankList.length === 1) {
        return { category: 'bomb', length: 6, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
      }
    }
    if ((n === 7 || n === 8) && rankList.length === 1) {
      return { category: 'bomb', length: n, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
    }
    return null;
  }

  function finalizeCompareValue(result, levelRank) {
    if (result.compareValue !== undefined) return result;
    return Object.assign({}, result, { compareValue: Cards.rankValue(result.faceRank, levelRank) });
  }

  const BOMB_TIER = { 4: 1, 5: 2, straight_flush: 3, 6: 4, 7: 5, 8: 6, joker: 7 };

  function bombTier(combo) {
    if (combo.bombSubtype === 'joker') return BOMB_TIER.joker;
    if (combo.bombSubtype === 'straight_flush') return BOMB_TIER.straight_flush;
    return BOMB_TIER[combo.length];
  }

  function classify(cards, levelRank) {
    if (!cards || cards.length === 0) return null;
    const direct = classifyPlain(cards);
    if (direct) return finalizeCompareValue(direct, levelRank);

    const wildcards = cards.filter(c => Cards.isWildcard(c, levelRank));
    if (wildcards.length === 0) return null;

    for (const wc of wildcards) {
      const others = cards.filter(c => c.id !== wc.id);
      for (const substituteRank of RANK_ORDER) {
        if (substituteRank === levelRank) continue;
        const substituted = others.concat([{ rank: substituteRank, suit: wc.suit, id: wc.id }]);
        const result = classifyPlain(substituted);
        if (result) {
          return Object.assign({}, finalizeCompareValue(result, levelRank), { usedWildcardAs: substituteRank });
        }
      }
    }
    return null;
  }

  function compare(a, b) {
    if (!a.isBomb && !b.isBomb) {
      if (a.category !== b.category || a.length !== b.length) {
        throw new Error('cannot compare combos of different category/length');
      }
      return a.compareValue - b.compareValue;
    }
    if (a.isBomb && !b.isBomb) return 1;
    if (!a.isBomb && b.isBomb) return -1;
    const tierA = bombTier(a);
    const tierB = bombTier(b);
    if (tierA !== tierB) return tierA - tierB;
    return a.compareValue - b.compareValue;
  }

  const Combos = { classify, compare, bombTier };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Combos;
  } else {
    root.GD = root.GD || {};
    root.GD.Combos = Combos;
  }
})(typeof window !== 'undefined' ? window : globalThis);
