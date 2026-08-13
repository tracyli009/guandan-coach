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
    one_lesson_per_hand: '每局只提炼一个最重要训练点'
  };

  const SOURCE = 'AI掼蛋进阶·标准牌局输入格式 v1.0 §19';

  // Returns a short parenthetical citation like
  // "（牌理：搭档顺时少抢牌 —— AI掼蛋进阶·标准牌局输入格式 v1.0 §19）"
  // or '' if the key isn't a known principle (never throws, safe to inline).
  function cite(key) {
    const text = PRINCIPLES[key];
    return text ? `（牌理：${text} —— ${SOURCE}）` : '';
  }

  const Knowledge = { PRINCIPLES, SOURCE, cite };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Knowledge;
  } else {
    root.GD = root.GD || {};
    root.GD.Knowledge = Knowledge;
  }
})(typeof window !== 'undefined' ? window : globalThis);
