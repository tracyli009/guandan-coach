(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;
  const Knowledge = isNode ? require('./knowledge.js') : root.GD.Knowledge;

  const RANK_ORDER = Cards.RANK_ORDER;
  const STRONG_RANKS = new Set(['J', 'Q', 'K', 'A']);

  function isStrongRank(rank, levelRank) {
    return STRONG_RANKS.has(rank) || rank === levelRank;
  }

  const CATEGORY_LABEL = {
    single: '单张', pair: '对子', triple: '三同张', triple_pair: '三带二',
    straight: '顺子', plate: '钢板', pair_straight: '三连对', bomb: '炸弹'
  };

  function groupByRank(cards) {
    const map = new Map();
    for (const c of cards) {
      if (c.rank === 'SJ' || c.rank === 'BJ') continue;
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank).push(c);
    }
    return map;
  }

  function makeGroup(category, cards, rank) {
    return { category, cards: cards.slice(), rank };
  }

  // Jokers only bomb together as a full 4 (2 small + 2 big). Short of that,
  // two jokers of the SAME face (2 small or 2 big) are still a legal pair -
  // classifyPlain() in combos.js requires matching rank, and 'SJ'/'BJ' are
  // themselves ranks - so a same-face joker pair must not be reported as
  // two lone singles, which would wrongly flag it as 2 dead cards instead
  // of one strong pair.
  function classifyJokers(jokers) {
    const groups = [];
    const sj = jokers.filter(j => j.rank === 'SJ');
    const bj = jokers.filter(j => j.rank === 'BJ');
    if (sj.length === 2 && bj.length === 2) {
      groups.push(makeGroup('bomb', jokers, 'joker'));
      return groups;
    }
    if (sj.length === 2) groups.push(makeGroup('pair', sj, 'SJ'));
    else for (const j of sj) groups.push(makeGroup('single', [j], j.rank));
    if (bj.length === 2) groups.push(makeGroup('pair', bj, 'BJ'));
    else for (const j of bj) groups.push(makeGroup('single', [j], j.rank));
    return groups;
  }

  // ---- plan builders ------------------------------------------------
  //
  // A "plan" is a full partition of the hand into non-overlapping groups.
  // This is NOT an exhaustive search over every possible partition (that
  // search space is combinatorially huge for a ~27-card hand) - it is two
  // deliberately different greedy heuristics, each reflecting a real
  // published strategy, scored and compared. See choosePlan().

  // Strategy "保炸优先" (bombs first): any rank with 4+ copies becomes a
  // bomb immediately and is never broken up for anything else; remaining
  // ranks are then packed into straight-like structures, and whatever's
  // left over is grouped by leftover count.
  function buildBombFirstPlan(hand) {
    const groups = groupByRank(hand);
    const jokers = hand.filter(c => c.rank === 'SJ' || c.rank === 'BJ');
    const plan = [];
    const remaining = new Map();
    for (const [rank, cards] of groups) {
      if (cards.length >= 4) {
        plan.push(makeGroup('bomb', cards, rank));
      } else {
        remaining.set(rank, cards.slice());
      }
    }
    plan.push(...classifyJokers(jokers));
    consumeStraightLikeStructures(remaining, plan);
    flushRemainingByCount(remaining, plan);
    return plan;
  }

  // Strategy "去单化优先" (eliminate singles first): per the researched
  // "组牌五原则" (最大限度去单化 - maximize elimination of lone singles),
  // straight/plate/pair_straight structures are built FIRST across every
  // rank - including ranks that have 4+ copies - even if that means a
  // would-be bomb only contributes 1-2 cards to a run and never fully
  // forms. Only after that pass does any still-4+-count leftover become a
  // bomb. This intentionally trades bomb formation for fewer lone singles,
  // so it can lose to buildBombFirstPlan in scoring when the traded bomb
  // was worth more than the singles it saved - that comparison is exactly
  // the point of generating both plans.
  function buildDeGoSingleFirstPlan(hand) {
    const groups = groupByRank(hand);
    const jokers = hand.filter(c => c.rank === 'SJ' || c.rank === 'BJ');
    const remaining = new Map();
    for (const [rank, cards] of groups) remaining.set(rank, cards.slice());
    const plan = [];
    consumeStraightLikeStructures(remaining, plan);
    for (const [rank, cards] of remaining) {
      if (cards.length >= 4) {
        plan.push(makeGroup('bomb', cards, rank));
        remaining.set(rank, []);
      }
    }
    plan.push(...classifyJokers(jokers));
    flushRemainingByCount(remaining, plan);
    return plan;
  }

  // Greedy scan for 5-run straights (1 card/rank), 2-run plates (3
  // cards/rank), and 3-run pair_straights (2 cards/rank) across consecutive
  // natural ranks (level-rank/joker wildcarding is NOT modeled here - see
  // the module-level caveat in choosePlan's explanation). Mutates
  // `remaining` in place and appends found groups to `plan`.
  function consumeStraightLikeStructures(remaining, plan) {
    tryRuns(remaining, plan, 5, 1, 'straight');
    tryRuns(remaining, plan, 2, 3, 'plate');
    tryRuns(remaining, plan, 3, 2, 'pair_straight');
  }

  function tryRuns(remaining, plan, runLength, perRankNeeded, category) {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (let start = 0; start + runLength <= RANK_ORDER.length; start++) {
        const window = RANK_ORDER.slice(start, start + runLength);
        if (window.every(r => (remaining.get(r) || []).length >= perRankNeeded)) {
          const cards = window.flatMap(r => remaining.get(r).splice(0, perRankNeeded));
          plan.push(makeGroup(category, cards, window.join('-')));
          progressed = true;
        }
      }
    }
  }

  function flushRemainingByCount(remaining, plan) {
    for (const [rank, cards] of remaining) {
      if (cards.length === 0) continue;
      const category = cards.length === 1 ? 'single' : cards.length === 2 ? 'pair' : cards.length === 3 ? 'triple' : 'bomb';
      plan.push(makeGroup(category, cards, rank));
    }
  }

  // ---- scoring --------------------------------------------------------
  //
  // Hand Score = -W1*有效手数 - W2*赘牌惩罚 + W3*控制力 + W4*炸弹价值
  //              + W5*牌型灵活性 + W6*逢人配机会价值
  // Each weight/term is a deliberately simple, explainable proxy - not a
  // learned or exhaustively-tuned model. "尾牌质量" (endgame tail quality)
  // is folded into 赘牌惩罚 in this version: a plan that still has a weak
  // lone single sitting in it IS the risk of a bad tail card, since nothing
  // here reorders when groups get played - modeling actual play order is
  // future work, not in scope for this pass.
  const WEIGHTS = {
    effectiveMoves: 3,
    deadCardPenalty: 2,
    controlPower: 1,
    bombValue: 1.5,
    shapeFlexibility: 0.5,
    wildcardValue: 1
  };

  const BOMB_TIER_WEIGHT = { 4: 1, 5: 2, straight_flush: 3, 6: 4, 7: 5, 8: 6, joker: 7 };

  function isWeakSingle(group, levelRank) {
    if (group.category !== 'single') return false;
    const rank = group.cards[0].rank;
    if (rank === 'SJ' || rank === 'BJ') return false;
    return !isStrongRank(rank, levelRank);
  }

  function bombTierKey(group) {
    if (group.rank === 'joker') return 'joker';
    return group.cards.length;
  }

  function scorePlan(plan, hand, levelRank) {
    const effectiveMoves = plan.length;

    const deadCardPenalty = plan.filter(g => isWeakSingle(g, levelRank)).length;

    const controlPower = plan.filter(g => {
      const bigStructure = ['triple', 'straight', 'plate', 'pair_straight', 'triple_pair', 'bomb'].includes(g.category);
      const strongRank = typeof g.rank === 'string' &&
        (isStrongRank(g.rank, levelRank) || g.rank === 'SJ' || g.rank === 'BJ' || g.rank === 'joker');
      return bigStructure || strongRank;
    }).length;

    // Deliberately rewards bomb COUNT more than any single bomb's tier -
    // "组牌五原则": 炸弹数量比质量更重要 (when you're not likely to go out
    // first). Each bomb gets a flat count bonus plus a small tier bump.
    const bombValue = plan.filter(g => g.category === 'bomb').reduce((sum, g) => {
      return sum + 2 + (BOMB_TIER_WEIGHT[bombTierKey(g)] || 1) * 0.3;
    }, 0);

    const shapeFlexibility = new Set(plan.map(g => g.category)).size;

    // "逢人配机会价值": whichever group ended up holding the wildcard (the
    // level-rank red-heart card), reward it if that group is a bomb or a
    // multi-rank structure (the wildcard is doing real work), penalize it
    // if it was left stranded in a lone single (wasted - 违背"绝不弃配").
    const wildcard = hand.find(c => Cards.isWildcard(c, levelRank));
    let wildcardValue = 0;
    if (wildcard) {
      const home = plan.find(g => g.cards.includes(wildcard));
      if (home) {
        if (['bomb', 'straight', 'plate', 'pair_straight', 'triple_pair'].includes(home.category)) {
          wildcardValue = 2;
        } else if (home.category === 'single') {
          wildcardValue = -1;
        }
      }
    }

    const total =
      -WEIGHTS.effectiveMoves * effectiveMoves +
      -WEIGHTS.deadCardPenalty * deadCardPenalty +
      WEIGHTS.controlPower * controlPower +
      WEIGHTS.bombValue * bombValue +
      WEIGHTS.shapeFlexibility * shapeFlexibility +
      WEIGHTS.wildcardValue * wildcardValue;

    return {
      total,
      breakdown: { effectiveMoves, deadCardPenalty, controlPower, bombValue, shapeFlexibility, wildcardValue }
    };
  }

  function generatePlans(hand, levelRank) {
    const builders = [
      { label: '保炸优先', build: buildBombFirstPlan },
      { label: '去单化优先', build: buildDeGoSingleFirstPlan }
    ];
    return builders.map(({ label, build }) => {
      const groups = build(hand, levelRank);
      const scored = scorePlan(groups, hand, levelRank);
      return { label, groups, score: scored.total, breakdown: scored.breakdown };
    });
  }

  // Broader than isWeakSingle() above (which is scoped tightly for the
  // dead-card scoring term): here, ANY low-rank single/pair/triple that
  // isn't part of a bigger structure counts as a 弱路, matching the KB
  // domain concept "低单张、小对子、孤三张" - a whole un-organized low
  // triple is still a weak spot even though it isn't a lone card.
  function isFragmentedLowGroup(group, levelRank) {
    if (['straight', 'plate', 'pair_straight', 'triple_pair', 'bomb'].includes(group.category)) return false;
    const rank = group.rank;
    if (rank === 'SJ' || rank === 'BJ') return false;
    return !isStrongRank(rank, levelRank);
  }

  // A 理牌 narrative grounded in the ACTUAL chosen partition, so it can
  // never contradict the plan explanation that follows it - e.g. if the
  // plan absorbed ranks 4-8 into a straight, they must not still be listed
  // as 5 separate "weak paths" the way a naive per-rank count would.
  function summarizePlan(plan, levelRank) {
    const weakGroups = plan.filter(g => isFragmentedLowGroup(g, levelRank));
    const bombGroups = plan.filter(g => g.category === 'bomb');
    const organizedCount = plan.length - weakGroups.length - bombGroups.length;

    const parts = [];
    if (weakGroups.length > 0) {
      const ranks = weakGroups.map(g => g.rank).join('、');
      parts.push(`${weakGroups.length}门弱路待清理（${ranks}）`);
    } else {
      parts.push('没有明显弱路');
    }
    if (bombGroups.length > 0) {
      const ranks = bombGroups.map(g => (g.rank === 'joker' ? '王' : g.rank)).join('、');
      parts.push(`${bombGroups.length}组待命炸弹（${ranks}）`);
    }
    if (organizedCount > 0) {
      parts.push(`${organizedCount}组已经组织好的强张/大牌型`);
    }
    return `理牌：${parts.join('，')}。`;
  }

  function describeGroup(group) {
    const label = CATEGORY_LABEL[group.category] || group.category;
    const rankLabel = group.rank === 'joker' ? '王' : String(group.rank).replace(/-/g, '~');
    return `${label}(${rankLabel})`;
  }

  function describePlan(plan) {
    return plan.map(describeGroup).join('、');
  }

  // Compares the top-scoring plan against the runner-up and explains the
  // pick in terms of whichever score components actually differ, so the
  // explanation reflects the real reason instead of a generic "higher
  // score" statement.
  function explainChoice(plans) {
    const sorted = plans.slice().sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const runnerUp = sorted[1];
    if (!runnerUp) return `采用「${best.label}」方案。`;

    const bd = best.breakdown, rd = runnerUp.breakdown;
    const reasons = [];
    if (bd.effectiveMoves !== rd.effectiveMoves) {
      reasons.push(bd.effectiveMoves < rd.effectiveMoves
        ? `手数更少（${bd.effectiveMoves}轮 vs ${rd.effectiveMoves}轮）`
        : `手数虽多${bd.effectiveMoves}轮，但其他方面更优`);
    }
    if (bd.deadCardPenalty !== rd.deadCardPenalty) {
      reasons.push(`弱单张更少（${bd.deadCardPenalty} vs ${rd.deadCardPenalty}）`);
    }
    if (bd.bombValue !== rd.bombValue) {
      reasons.push(bd.bombValue > rd.bombValue ? '保留的炸弹价值更高' : '炸弹价值稍低但整体更优');
    }
    if (bd.wildcardValue !== rd.wildcardValue) {
      reasons.push(bd.wildcardValue > rd.wildcardValue ? '逢人配用在了刀刃上' : '逢人配用法稍逊但整体更优');
    }
    const reasonText = reasons.length > 0 ? reasons.join('，') : '综合得分更高';
    return `推荐「${best.label}」方案（${reasonText}），优于「${runnerUp.label}」方案。` +
      Knowledge.cite('zu_pai_wu_yuanze');
  }

  function choosePlan(hand, levelRank) {
    const plans = generatePlans(hand, levelRank);
    const sorted = plans.slice().sort((a, b) => b.score - a.score);
    return {
      best: sorted[0],
      alternatives: sorted.slice(1),
      explanation: explainChoice(plans)
    };
  }

  const HandOptimizer = {
    generatePlans, scorePlan, choosePlan, describePlan, describeGroup, summarizePlan,
    buildBombFirstPlan, buildDeGoSingleFirstPlan
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandOptimizer;
  } else {
    root.GD = root.GD || {};
    root.GD.HandOptimizer = HandOptimizer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
