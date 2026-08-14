(function (root) {
  'use strict';

  // Curated verbatim from the project's own knowledge base, so the coach's
  // rationale text quotes real source material instead of ad-hoc prose:
  //   - AI掼蛋进阶_标准牌局输入格式_v1.0.md §19 「AI 掼蛋进阶核心原则」
  //   - AI掼蛋教练_KnowledgeBase/00_AI教练使用说明.md 「推理纪律」
  // Keys are stable identifiers used by coach-realtime.js / coach-review.js /
  // coach-history.js to cite a specific principle; the string values are the
  // exact wording from the source documents (not paraphrased).
  const PRINCIPLES = {
    partner_defer: '搭档顺时少抢牌',
    opponent_break: '对手顺时优先打断',
    weak_road_first: '先处理弱路，再炫耀强牌',
    partner_before_self: '先看搭档，再看自己',
    power_before_size: '先看牌权，再看牌大',
    persistent_signal: '连续行为比单次行为更值得读牌',
    absence_not_proof: '"没出过"不等于"没有"',
    bomb_is_tool: '炸弹首先是牌权工具',
    bomb_plan_ahead: '炸之前先想炸后出什么',
    endgame_countdown: '剩十张左右开始倒推尾牌',
    report_enumerate: '报牌后优先枚举可能牌型',
    endgame_focus_threat: '残局集中防守最危险的玩家',
    fact_infer_assume: '明确区分事实、推断和假设',
    conditional_when_uncertain: '信息不足时给条件式建议，不装作确定',
    one_lesson_per_hand: '每局只提炼一个最重要训练点',

    // Added for the hand-organization optimizer (src/hand-optimizer.js).
    // These are NOT from the project's local KB - they were researched from
    // public guandan strategy write-ups (see WEB_SOURCES below) to ground
    // the "有效手数/赘牌惩罚/炸弹价值/逢人配机会价值" scoring terms in real
    // published play principles rather than invented heuristics. Paraphrased
    // in our own words, not reproduced verbatim, to respect the source
    // articles' copyright.
    zu_huo: '能组炸就组，但牌力已强时不必强行组炸，更不要为了拼同花硬拆一个炸弹',
    bu_que: '用逢人配把顺子、连对、钢板补齐，往往比单纯多凑一个炸弹更有利于减少手数',
    bu_qi_pei: '配牌资源不能浪费，盲目跟牌弃配会导致后期无牌可配',
    zu_pai_wu_yuanze: '组牌五原则：最大限度去单化、小炸弹留着比大炸弹能用更多轮、尽量减少轮次、不易先出完时炸弹数量比单个炸弹质量更重要、逢人配的牌尽量保留变化',
    feng_ren_pei_ji_qiao: '逢人配配炸首选四张或同花，忌单独凑成五张；补缺优先用于凑顺子或连对，以减少总手数'
  };

  const SOURCE = 'AI掼蛋进阶·标准牌局输入格式 v1.0 §19';

  // Per-key source override for principles that come from outside the
  // project's local KB (see the block of keys added above). Anything not
  // listed here falls back to SOURCE.
  const WEB_SOURCES = {
    zu_huo: '《掼蛋组牌的原则》gameabc.com（公开攻略，经改写）',
    bu_que: '《掼蛋组牌的原则》gameabc.com（公开攻略，经改写）',
    bu_qi_pei: '《掼蛋组牌的原则》gameabc.com（公开攻略，经改写）',
    zu_pai_wu_yuanze: '掼蛋组牌五原则，公开攻略整理（经改写）',
    feng_ren_pei_ji_qiao: '掼蛋逢人配使用技巧，公开攻略整理（经改写）'
  };

  // Returns a short parenthetical citation like
  // "（牌理：搭档顺时少抢牌 —— AI掼蛋进阶·标准牌局输入格式 v1.0 §19）"
  // or '' if the key isn't a known principle (never throws, safe to inline).
  function cite(key) {
    const text = PRINCIPLES[key];
    if (!text) return '';
    const source = WEB_SOURCES[key] || SOURCE;
    return `（牌理：${text} —— ${source}）`;
  }

  const Knowledge = { PRINCIPLES, SOURCE, WEB_SOURCES, cite };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Knowledge;
  } else {
    root.GD = root.GD || {};
    root.GD.Knowledge = Knowledge;
  }
})(typeof window !== 'undefined' ? window : globalThis);
