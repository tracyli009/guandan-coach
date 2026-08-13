(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Knowledge = isNode ? require('./knowledge.js') : root.GD.Knowledge;

  const ARCHETYPES = {
    takeover_from_partner: '强势型：习惯以自我为中心指挥牌局' + Knowledge.cite('partner_defer'),
    early_bomb: '急躁型：有勇无谋，炸弹用得太早' + Knowledge.cite('bomb_is_tool'),
    unmatched_suggestion: '磨合型：与教练/搭档的默契仍在建立中',
    passive_pass: '谨慎型：谨小慎微，缺少主动出击的担当'
  };

  function summarizeHistory(records) {
    if (!records || records.length === 0) {
      return { gamesPlayed: 0, averageCooperationScore: 0, patternFrequency: {}, dominantArchetype: null, trend: [] };
    }
    const gamesPlayed = records.length;
    const averageCooperationScore = Math.round(
      records.reduce((sum, r) => sum + r.cooperationScore, 0) / gamesPlayed
    );
    const patternFrequency = {};
    for (const r of records) {
      for (const p of r.patterns) {
        patternFrequency[p.key] = (patternFrequency[p.key] || 0) + 1;
      }
    }
    let dominantArchetype = null;
    const entries = Object.entries(patternFrequency);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      dominantArchetype = ARCHETYPES[entries[0][0]] || null;
    }
    const trend = records.map(r => r.cooperationScore);
    return { gamesPlayed, averageCooperationScore, patternFrequency, dominantArchetype, trend };
  }

  const CoachHistory = { summarizeHistory, ARCHETYPES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachHistory;
  } else {
    root.GD = root.GD || {};
    root.GD.CoachHistory = CoachHistory;
  }
})(typeof window !== 'undefined' ? window : globalThis);
