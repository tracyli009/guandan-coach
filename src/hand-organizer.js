(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;

  const SUIT_SYMBOL = { S: '♠️', H: '♥️', D: '♦️', C: '♣️' };
  function cardFace(card) {
    if (card.rank === 'SJ') return '小王';
    if (card.rank === 'BJ') return '大王';
    return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
  }

  // J and above are treated as "strong holds" per KB 01_核心牌理.md 弱路管理:
  // "强牌通常不需要太多照顾。真正拖死一手牌的是低单张、小对子、孤三张" - the
  // concern that section raises is specifically about LOW groups, not high
  // ones, so that is the line this module draws too. The current level
  // rank is also treated as strong regardless of its face value, since it
  // outranks every non-wildcard card of the same suit at the table.
  const STRONG_RANKS = new Set(['J', 'Q', 'K', 'A']);

  function isStrongRank(rank, levelRank) {
    return STRONG_RANKS.has(rank) || rank === levelRank;
  }

  function groupByRank(hand) {
    const map = new Map();
    for (const c of hand) {
      if (c.rank === 'SJ' || c.rank === 'BJ') continue;
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank).push(c);
    }
    return map;
  }

  function byNaturalRank(a, b) {
    return Cards.naturalIndex(a.rank) - Cards.naturalIndex(b.rank);
  }

  // Basic classification only: group same-rank cards, then bucket each
  // group as a bomb-in-waiting (4+), a weak path that should be cleared
  // early (low rank, 1-3 copies), or a strong hold worth keeping for later
  // control (J/Q/K/A or the level rank, plus the joker pair). This does
  // NOT sequence which weak path to clear first or predict how many tricks
  // it will take to run out - that is future work, out of scope here.
  function analyzeHand(hand, levelRank) {
    const groups = groupByRank(hand);
    const jokers = hand.filter(c => c.rank === 'SJ' || c.rank === 'BJ');

    const weakGroups = [];
    const strongGroups = [];
    const bombGroups = [];

    for (const [rank, cards] of groups) {
      if (cards.length >= 4) {
        bombGroups.push({ rank, cards });
      } else if (isStrongRank(rank, levelRank)) {
        strongGroups.push({ rank, cards });
      } else {
        weakGroups.push({ rank, cards });
      }
    }

    weakGroups.sort(byNaturalRank);
    strongGroups.sort(byNaturalRank);
    bombGroups.sort(byNaturalRank);

    return { weakGroups, strongGroups, bombGroups, jokerPair: jokers.length >= 2 };
  }

  // A short, single-sentence structure summary meant to be prepended to an
  // existing play/pass rationale - not a replacement for it. Kept to plain
  // rank lists (no card faces) so it reads as an overview, not a repeat of
  // the specific-card naming the play rationale already does.
  function summarize(analysis) {
    const { weakGroups, strongGroups, bombGroups, jokerPair } = analysis;
    const parts = [];

    if (weakGroups.length > 0) {
      const ranks = weakGroups.map(g => g.rank).join('、');
      parts.push(`${weakGroups.length}门弱路待清理（${ranks}）`);
    } else {
      parts.push('暂无明显弱路');
    }

    if (bombGroups.length > 0) {
      const ranks = bombGroups.map(g => g.rank).join('、');
      parts.push(`${bombGroups.length}组待命炸弹（${ranks}）`);
    }

    const strongLabels = strongGroups.map(g => g.rank);
    if (jokerPair) strongLabels.push('王');
    if (strongLabels.length > 0) {
      parts.push(`${strongLabels.length}组强张可留到后面（${strongLabels.join('、')}）`);
    }

    return `理牌：${parts.join('，')}。`;
  }

  const HandOrganizer = { analyzeHand, summarize, cardFace };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandOrganizer;
  } else {
    root.GD = root.GD || {};
    root.GD.HandOrganizer = HandOrganizer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
