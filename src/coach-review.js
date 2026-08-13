(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Knowledge = isNode ? require('./knowledge.js') : root.GD.Knowledge;

  const PATTERN_INFO = {
    takeover_from_partner: { label: '抢搭档的攻——不分牌好坏，都以自己为中心打牌' + Knowledge.cite('partner_defer'), threshold: 2 },
    early_bomb: { label: '炸弹用得太早——有大牌就炸，不顾团队节奏' + Knowledge.cite('bomb_is_tool'), threshold: 1 },
    unmatched_suggestion: { label: '与教练建议不符——配合默契还需打磨', threshold: 3 },
    passive_pass: { label: '过于保守——能接却选择等待，缺少主动出击', threshold: 2 }
  };

  function reviewHand(moveLog) {
    const counts = { takeover_from_partner: 0, early_bomb: 0, unmatched_suggestion: 0, passive_pass: 0 };

    for (const entry of moveLog) {
      if (entry.action === 'play' && entry.partnerWasWinning) counts.takeover_from_partner++;
      if (entry.action === 'play' && entry.comboIsBomb && entry.handSizeBefore > 8) counts.early_bomb++;
      if (!entry.matchedSuggestion) counts.unmatched_suggestion++;
      if (entry.action === 'pass' && !entry.partnerWasWinning && entry.hadBeatingOptionNonBomb) counts.passive_pass++;
    }

    const patterns = Object.keys(counts)
      .filter(key => counts[key] >= PATTERN_INFO[key].threshold)
      .map(key => ({ key, label: PATTERN_INFO[key].label, count: counts[key] }));

    const totalMoves = moveLog.length || 1;
    const matchedCount = moveLog.filter(e => e.matchedSuggestion).length;
    const cooperationScore = Math.round((matchedCount / totalMoves) * 100);

    return { cooperationScore, counts, patterns };
  }

  const CoachReview = { reviewHand, PATTERN_INFO };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachReview;
  } else {
    root.GD = root.GD || {};
    root.GD.CoachReview = CoachReview;
  }
})(typeof window !== 'undefined' ? window : globalThis);
