// ─────────────────────────────────────────
// 掼蛋记牌算牌模块 v1.0
// 依赖：无（纯 JS）
// 用法：在 index.html 底部，engine.js 之后引入
//   <script src="card-tracker.js"></script>
// 然后在需要分析的地方调用：
//   const info = CardTracker.analyze(state.history, state.levelRank);
// ─────────────────────────────────────────
(function (root) {
  'use strict';

  // 每个点数在两副牌里共有几张（大小王各2张，其他各8张）
  const TOTAL_COUNT = {
    '2':8,'3':8,'4':8,'5':8,'6':8,'7':8,'8':8,
    '9':8,'10':8,'J':8,'Q':8,'K':8,'A':8,
    'SJ':2,'BJ':2
  };

  // 五十定律关键点数：5和10是任何5张顺子的必须牌
  // （顺子跨度是5张连续，5和10分别是最中间的"枢纽"点）
  const KEY_RANKS = ['5', '10'];

  // ── 核心分析函数 ─────────────────────────────────────────

  /**
   * 分析当前局面的已出牌情况
   * @param {Array} history  state.history（engine.js 维护的出牌记录）
   * @param {string} levelRank  当前级牌（如 '2'）
   * @param {number} selfIndex  自己的座位号（0-3），用于排除自己的手牌
   * @returns {Object} 分析结果
   */
  function analyze(history, levelRank, selfIndex) {
    // 1. 统计已出牌
    const played = {};
    for (const rank of Object.keys(TOTAL_COUNT)) played[rank] = 0;

    for (const entry of history) {
      if (!entry.cards || entry.cards.length === 0) continue;
      for (const card of entry.cards) {
        if (played[card.rank] !== undefined) {
          played[card.rank]++;
        }
      }
    }

    // 2. 推算剩余张数（场上其他三家手里 + 还没出的）
    const remaining = {};
    for (const rank of Object.keys(TOTAL_COUNT)) {
      remaining[rank] = Math.max(0, TOTAL_COUNT[rank] - played[rank]);
    }

    // 3. 五十定律分析
    const keyCards = {};
    for (const rank of KEY_RANKS) {
      const total = TOTAL_COUNT[rank];
      const playedCount = played[rank] || 0;
      const left = remaining[rank];
      keyCards[rank] = {
        total,
        played: playedCount,
        left,
        exhausted: left === 0,  // 全出完了
        scarce: left <= 2,      // 稀缺（≤2张）
      };
    }

    // 顺子可能性：5和10都还有牌，外面才可能存在完整顺子
    const straightPossible = !keyCards['5'].exhausted && !keyCards['10'].exhausted;

    // 4. 孤张定律：出现过一次的单张，大概率不是顺子的一部分
    //    （因为顺子需要连续5个点数各至少1张，孤张意味着那条路断了）
    const loneRanks = [];
    const NATURAL_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    for (const rank of NATURAL_ORDER) {
      if (played[rank] > 0 && played[rank] % 2 === 1) {
        // 奇数张已出 → 至少有一张是单独出的，不在对子/炸弹里
        loneRanks.push(rank);
      }
    }

    // 5. 各家出牌行为分析（牌语初步读取）
    const playerBehavior = analyzePlayerBehavior(history, selfIndex);

    // 6. 生成威胁提示
    const threats = buildThreats(keyCards, straightPossible, playerBehavior, levelRank);

    // 7. 生成简洁的记牌摘要（供 coach-realtime.js 显示）
    const summary = buildSummary(keyCards, straightPossible, remaining, levelRank);

    return {
      played,
      remaining,
      keyCards,
      straightPossible,
      loneRanks,
      playerBehavior,
      threats,
      summary,
    };
  }

  // ── 各家行为分析（牌语初步读取） ────────────────────────

  function analyzePlayerBehavior(history, selfIndex) {
    // 统计每个玩家的行为模式
    const behavior = { 0:{plays:0,passes:0,bombs:0,passStreak:0,maxPassStreak:0},
                       1:{plays:0,passes:0,bombs:0,passStreak:0,maxPassStreak:0},
                       2:{plays:0,passes:0,bombs:0,passStreak:0,maxPassStreak:0},
                       3:{plays:0,passes:0,bombs:0,passStreak:0,maxPassStreak:0} };

    for (const entry of history) {
      const p = entry.playerIndex;
      if (entry.combo === null) {
        // 过牌
        behavior[p].passes++;
        behavior[p].passStreak++;
        behavior[p].maxPassStreak = Math.max(behavior[p].maxPassStreak, behavior[p].passStreak);
      } else {
        behavior[p].plays++;
        behavior[p].passStreak = 0;
        if (entry.combo.isBomb) behavior[p].bombs++;
      }
    }

    // 推断各家牌力信号
    const signals = {};
    for (const seat of [0,1,2,3]) {
      const b = behavior[seat];
      const total = b.plays + b.passes;
      if (total === 0) { signals[seat] = 'unknown'; continue; }

      const passRate = b.passes / total;
      if (b.maxPassStreak >= 3) {
        signals[seat] = 'likely_weak';   // 连续过牌 → 可能手数少或在配合
      } else if (passRate < 0.2 && b.plays >= 3) {
        signals[seat] = 'likely_strong'; // 很少过牌 → 可能牌力强
      } else if (b.bombs >= 2) {
        signals[seat] = 'has_bombs';     // 已出2炸以上
      } else {
        signals[seat] = 'normal';
      }
    }

    return { behavior, signals };
  }

  // ── 威胁提示生成 ──────────────────────────────────────────

  function analyzePlayerBehaviorThreats(playerBehavior, selfIndex) {
    const items = [];
    const partnerIndex = (selfIndex + 2) % 4;
    const { signals } = playerBehavior;

    for (const seat of [0,1,2,3]) {
      if (seat === selfIndex) continue;
      const label = seat === partnerIndex ? '对家' : seat === (selfIndex+1)%4 ? '右家' : '左家';
      if (signals[seat] === 'likely_strong') {
        items.push(`${label}出牌积极，牌力可能较强`);
      } else if (signals[seat] === 'has_bombs') {
        items.push(`${label}已用2个以上炸弹`);
      } else if (signals[seat] === 'likely_weak') {
        items.push(`${label}连续让牌，可能手数不多或在配合`);
      }
    }
    return items;
  }

  function buildThreats(keyCards, straightPossible, playerBehavior, levelRank) {
    const items = [];

    if (keyCards['5'].exhausted) {
      items.push('5已全部出完，外面不可能再有完整顺子');
    } else if (keyCards['5'].scarce) {
      items.push(`5只剩${keyCards['5'].left}张，顺子机会有限`);
    }

    if (keyCards['10'].exhausted) {
      items.push('10已全部出完，外面不可能再有完整顺子');
    } else if (keyCards['10'].scarce) {
      items.push(`10只剩${keyCards['10'].left}张，顺子机会有限`);
    }

    if (!straightPossible) {
      items.push('五十定律：外面已无法组成完整顺子');
    }

    return items;
  }

  // ── 记牌摘要（供教练面板显示） ───────────────────────────

  function buildSummary(keyCards, straightPossible, remaining, levelRank) {
    const parts = [];

    // 关键牌状态
    const fiveStatus  = keyCards['5'].exhausted  ? '已出完' : `剩${keyCards['5'].left}张`;
    const tenStatus   = keyCards['10'].exhausted ? '已出完' : `剩${keyCards['10'].left}张`;
    parts.push(`五十定律：5（${fiveStatus}）· 10（${tenStatus}）`);

    if (!straightPossible) {
      parts.push('外面无法再组完整顺子');
    } else {
      parts.push('外面仍可能有顺子');
    }

    // 高价值牌剩余
    const aLeft = remaining['A'] || 0;
    const kLeft = remaining['K'] || 0;
    if (aLeft === 0) parts.push('A已全出');
    else if (aLeft <= 2) parts.push(`A只剩${aLeft}张`);
    if (kLeft <= 2) parts.push(`K只剩${kLeft}张`);

    return parts.join('。') + '。';
  }

  // ── 对外 API ─────────────────────────────────────────────

  const CardTracker = { analyze, KEY_RANKS, TOTAL_COUNT };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardTracker;
  } else {
    root.GD = root.GD || {};
    root.GD.CardTracker = CardTracker;
  }

})(typeof window !== 'undefined' ? window : globalThis);
