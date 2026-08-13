(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const AI = isNode ? require('./ai.js') : root.GD.AI;
  const Knowledge = isNode ? require('./knowledge.js') : root.GD.Knowledge;

  const CATEGORY_LABEL = {
    single: '单张', pair: '对子', triple: '三同张', triple_pair: '三带二',
    straight: '顺子', plate: '钢板', pair_straight: '三连对', bomb: '炸弹'
  };

  const SUIT_SYMBOL = { S: '♠️', H: '♥️', D: '♦️', C: '♣️' };

  function describeCombo(combo) {
    if (!combo) return '过牌';
    return CATEGORY_LABEL[combo.category] || combo.category;
  }

  function cardFace(card) {
    if (card.rank === 'SJ') return '小王';
    if (card.rank === 'BJ') return '大王';
    return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
  }

  // Names the actual card(s) a combo is made of, e.g. "8♥️" or "8♥️8♣️8♦️".
  // "单张" alone only says the shape (one card); a player holding several
  // copies of every rank (no rank appears exactly once) has no way to tell
  // which physical card is meant without this - that ambiguity is exactly
  // what prompted this function to exist.
  function describeCards(combo) {
    if (!combo || !combo.cards) return '';
    return combo.cards.map(cardFace).join('');
  }

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

  function suggestPlay(hand, currentCombo, context) {
    const decision = AI.chooseAiPlay(hand, currentCombo, context);
    const { lastPlayerIndex, selfIndex } = context;
    const partnerIsWinning = !!(currentCombo && lastPlayerIndex !== null && TEAM_OF[lastPlayerIndex] === TEAM_OF[selfIndex]);

    if (decision.action === 'pass') {
      const rationale = partnerIsWinning
        ? '搭档正在领先，不接对门的牌，除非你能跑掉——建议过牌配合搭档。' + Knowledge.cite('partner_defer')
        : '手上没有合适的牌可以拿下，且保留炸弹更有价值——建议过牌。' + Knowledge.cite('bomb_is_tool');
      return { action: 'pass', rationale };
    }

    const label = describeCombo(decision.combo);
    const cards = describeCards(decision.combo);
    let rationale;
    if (!currentCombo) {
      // Leading a fresh trick: there is no existing combo to "beat", so the
      // rationale must not claim to be taking one (that was the bug -
      // this branch used to reuse the follow-up wording verbatim).
      rationale = decision.combo.isBomb
        ? `手上暂时没有更小的牌可以先出，只能用炸弹（${label}：${cards}）开局，出完之后要尽快找机会重新组织牌型。` + Knowledge.cite('bomb_plan_ahead')
        : `这是新的一墩，由你领出——先出手上最小的${label}（${cards}），把大牌留到后面再用。` + Knowledge.cite('weak_road_first');
    } else {
      rationale = decision.combo.isBomb
        ? `手数已经不多，此时开炸弹（${label}：${cards}）夺回主动权是合理的。` + Knowledge.cite('bomb_plan_ahead')
        : `用最小的${label}（${cards}）拿下当前墩，既能压制对手又不浪费大牌，建议出这手牌。` + Knowledge.cite('weak_road_first');
    }
    return { action: 'play', combo: decision.combo, rationale };
  }

  const CoachRealtime = { suggestPlay, describeCombo, describeCards };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachRealtime;
  } else {
    root.GD = root.GD || {};
    root.GD.CoachRealtime = CoachRealtime;
  }
})(typeof window !== 'undefined' ? window : globalThis);
