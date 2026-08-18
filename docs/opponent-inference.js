// ─────────────────────────────────────────
// 掼蛋对家牌型推断模块 v1.0  (L4 决策层)
// 依赖：无（纯 JS，无需任何框架）
// 用法：在 index.html 底部引入
//   <script src="opponent-inference.js"></script>
// 然后在页面放：
//   <div id="opponent-inference-panel"></div>
//
// 理论来源：
//   - AI掼蛋进阶·标准牌局输入格式 v1.0 §19
//     （report_enumerate, absence_not_proof, fact_infer_assume,
//       conditional_when_uncertain, endgame_countdown,
//       endgame_focus_threat, persistent_signal）
//
// 核心逻辑：
//   三层推断框架
//   事实层  → 已出的牌型（绝对确定）
//   推断层  → 从行为模式推测（有依据的猜测）
//   假设层  → 尚无证据，需要验证
// ─────────────────────────────────────────

(function () {
  'use strict';

  // ── 牌型模板库 ────────────────────────────────────────────
  //
  // 每种「出牌模式」对应的可能剩余牌型推断
  // 输入维度：
  //   handCount   : 对手剩余手数（few ≤5 / mid 6–10 / many ≥11）
  //   playedTypes : 对手已出过的牌型组合（多选）
  //   signals     : 特殊信号（炸弹已出 / 报牌 / 从未出大牌 / 连续 pass）

  const INFERENCE_PATTERNS = [

    // ── 残局推断（≤5手） ─────────────────────────────────

    {
      id: 'endgame_single_threat',
      handCount: 'few',
      signals: ['reported'],   // 已报牌
      title: '对手已报牌 → 立刻枚举剩余牌型',
      confidence: 'high',
      fact: '对手手里牌数极少，已进入报牌状态。',
      infer: [
        '剩余最可能是：1–2 张大单张（A/K）或一组对子/小炸弹',
        '如果他还没出过大牌，大单张可能性极高',
        '如果他之前出过很多顺子类，剩余可能是凑不进去的散牌',
      ],
      assume: '除非他之前完全没用过炸弹，否则剩余炸弹概率较低',
      counter: '用能压住他的最小牌型接住；实在没有就炸弹阻断——不能让他轻松出完',
      principle: '报牌后优先枚举可能牌型',
    },
    {
      id: 'endgame_no_big',
      handCount: 'few',
      signals: ['no_big_played'],  // 从未出过大牌
      title: '残局 × 从未出过大牌 → 藏有大牌或根本没有',
      confidence: 'medium',
      fact: '对手整局都没出过 A/K/王类大牌，且手里剩余牌数少。',
      infer: [
        '可能性1（藏大牌）：手里剩 1–2 张大单张，等最后一击',
        '可能性2（无大牌）：手里都是中小牌，只是出牌机会少或被压住了',
      ],
      assume: '「没出过」不等于「没有」——需要结合五十定律（记牌）验证',
      counter: '查一下 A/K/王的已出张数；如果场上还剩很多，小心他手里有；如果已出得差不多，可以放心',
      principle: '「没出过」不等于「没有」',
    },
    {
      id: 'endgame_consecutive_pass',
      handCount: 'few',
      signals: ['consecutive_pass'],
      title: '残局 × 连续 pass → 手里剩大牌或炸弹',
      confidence: 'high',
      fact: '对手手少但连续不接，说明他无法跟当前牌型。',
      infer: [
        '剩余很可能是不同类型的牌（如剩了单张和炸弹，但跟不上对子）',
        '或者剩余全是比当前桌面小的牌型（被压住了）',
        '如果他之前炸弹已经用过，剩余大概率是大单张',
      ],
      assume: '连续 pass ≠ 没有炸弹；他可能在等更好的时机打炸弹',
      counter: '不要急于出大牌；等他被迫出了一张之后，再判断他的剩余结构',
      principle: '连续行为比单次行为更值得读牌',
    },

    // ── 中局推断（6–10手） ───────────────────────────────

    {
      id: 'mid_bomb_used_early',
      handCount: 'mid',
      signals: ['bomb_used'],
      title: '中局 × 早用炸弹 → 剩余牌力结构偏弱',
      confidence: 'medium',
      fact: '对手在中局就已经打出炸弹，说明他需要靠炸弹维持主动权。',
      infer: [
        '炸弹已经消耗，手里大牌「后劲」减弱',
        '剩余更可能是大量小牌和中等强度牌（需要清路）',
        '如果他炸完之后出的都是小牌，说明他弱路很多',
      ],
      assume: '不排除他手里还有第二颗炸弹；单次炸弹不能断定他已无炸',
      counter: '中等强度的牌此时有机会拿下主导权；不需要立刻用大牌或炸弹回应',
      principle: '炸弹首先是牌权工具',
    },
    {
      id: 'mid_only_singles',
      handCount: 'mid',
      signals: ['only_singles_played'],
      title: '中局 × 只出过单张 → 组合牌型成谜',
      confidence: 'low',
      fact: '对手整局只出过单张，从未出过对子/顺子等组合牌型。',
      infer: [
        '可能性1：手里全是散牌，难以组成组合（牌质差）',
        '可能性2：他在刻意藏组合牌型，等待时机一次性出完',
        '可能性3：桌面一直是别人领牌，他没有机会出自己的牌型',
      ],
      assume: '仅凭「只出过单张」无法判断他手里有没有组合；需要结合他的手数和出牌节奏',
      counter: '如果他手数快速减少却只出单张，警惕他手里有大组合或炸弹待发',
      principle: '明确区分事实、推断和假设',
    },
    {
      id: 'mid_rich_combos',
      handCount: 'mid',
      signals: ['played_straight', 'played_pairs'],
      title: '中局 × 出过顺子+对子 → 手里组合丰富',
      confidence: 'medium',
      fact: '对手已经出过顺子和对子，说明他手里有丰富的组合。',
      infer: [
        '剩余可能仍有 1–2 套组合（顺子或连对）',
        '他出牌效率较高，手数可能下降得比预期快',
        '如果他还从未用过炸弹，可能保留着炸弹收尾',
      ],
      assume: '他手里的组合是否已经出完，需要继续观察；别低估他的剩余手数',
      counter: '用炸弹阻断他的组合牌型出完节奏，比试图用普通牌压住更有效',
      principle: '连续行为比单次行为更值得读牌',
    },

    // ── 开局推断（≥11手） ────────────────────────────────

    {
      id: 'early_aggressive',
      handCount: 'many',
      signals: ['plays_frequently'],
      title: '开局 × 频繁出牌 → 急于清路，弱牌多',
      confidence: 'medium',
      fact: '对手开局就频繁出牌，说明他在主动清弱路。',
      infer: [
        '手里小牌/废牌较多，需要快速清出去',
        '大牌可能不多，或者策略是先清完小牌再用大牌收尾',
      ],
      assume: '频繁出牌不一定意味着牌质差，也可能是激进策略；观察他出的是什么级别的牌',
      counter: '不需要立刻压制，让他多清一些废牌；等他出到大牌时再考虑接',
      principle: '先处理弱路，再炫耀强牌',
    },
    {
      id: 'early_conservative',
      handCount: 'many',
      signals: ['rarely_plays'],
      title: '开局 × 很少出牌（频繁 pass） → 手里可能很强',
      confidence: 'medium',
      fact: '对手开局频繁 pass，即使有机会出也经常不出。',
      infer: [
        '手里可能有大量大牌/炸弹，在等最佳时机',
        '或者他定位是助攻，在刻意配合搭档',
        '也可能手里牌型特殊，跟不上当前桌面牌型',
      ],
      assume: '仅凭 pass 无法判断他究竟是强还是弱，需要结合搭档的行为一起判断',
      counter: '小心他突然发力；如果搭档也在领先，更要提防两人配合形成的压制',
      principle: '明确区分事实、推断和假设',
    },
  ];

  // ── 对外 API ─────────────────────────────────────────────

  window.OpponentInference = {
    /**
     * 推断对手牌型
     * @param {string} handCount   'few' | 'mid' | 'many'
     * @param {string[]} signals   信号数组，可多选
     * @returns {object[]} 匹配的推断模式列表（按相关度排序）
     */
    infer(handCount, signals) {
      const results = INFERENCE_PATTERNS.filter(p => {
        const countMatch = p.handCount === handCount;
        const signalMatch = signals.some(s => p.signals.includes(s));
        return countMatch && signalMatch;
      });
      // 信号匹配越多的排越前
      results.sort((a, b) => {
        const aMatch = signals.filter(s => a.signals.includes(s)).length;
        const bMatch = signals.filter(s => b.signals.includes(s)).length;
        return bMatch - aMatch;
      });
      return results.length > 0 ? results : [{
        id: 'default',
        title: '信息不足，暂无推断',
        confidence: 'low',
        fact: '当前观察到的信号不足以做出有依据的推断。',
        infer: ['继续观察对手的出牌行为，积累更多信号'],
        assume: '在信息不足时，不要做出过于确定的判断',
        counter: '保持默认策略，不要因为猜测对手牌力而改变己方出牌节奏',
        principle: '信息不足时给条件式建议，不装作确定',
      }];
    },
  };

  // ── UI ────────────────────────────────────────────────────

  const CONF_COLOR = {
    high:   { bg: '#0b2418', border: '#1a5a3a', text: '#7ee8a2', label: '高' },
    medium: { bg: '#0d1a2a', border: '#1a4a7a', text: '#4a9aee', label: '中' },
    low:    { bg: '#1a1a0d', border: '#5a5a1a', text: '#cccc44', label: '低' },
  };

  const SIGNAL_OPTIONS = [
    { id: 'reported',           label: '已报牌（手里剩 ≤3 张）' },
    { id: 'no_big_played',      label: '从未出过大牌（A/K/王）' },
    { id: 'consecutive_pass',   label: '连续 pass（≥3 轮）' },
    { id: 'bomb_used',          label: '已打出过炸弹' },
    { id: 'only_singles_played',label: '只出过单张，无组合' },
    { id: 'played_straight',    label: '出过顺子' },
    { id: 'played_pairs',       label: '出过对子/连对' },
    { id: 'plays_frequently',   label: '开局就频繁出牌' },
    { id: 'rarely_plays',       label: '开局频繁 pass' },
  ];

  const oiState = { handCount: null, signals: new Set() };

  function btnBase(radius) {
    return `flex:1;padding:7px 8px;font-size:12px;` +
           `background:#1a3a2a;border:0.5px solid #2d5a3d;` +
           `color:#aaa;cursor:pointer;border-radius:${radius};transition:all .15s`;
  }

  function activateBtn(btn) {
    btn.style.background = '#0b3d2e';
    btn.style.color = '#ffcc00';
    btn.style.borderColor = '#ffcc00';
    btn.style.fontWeight = '500';
  }

  function deactivateBtn(btn) {
    btn.style.background = '#1a3a2a';
    btn.style.color = '#aaa';
    btn.style.borderColor = '#2d5a3d';
    btn.style.fontWeight = '400';
  }

  window.oiSelectCount = function (val, btn) {
    oiState.handCount = val;
    btn.parentElement.querySelectorAll('button').forEach(b => deactivateBtn(b));
    activateBtn(btn);
    document.getElementById('oi-error').textContent = '';
  };

  window.oiToggleSignal = function (val, btn) {
    if (oiState.signals.has(val)) {
      oiState.signals.delete(val);
      deactivateBtn(btn);
    } else {
      oiState.signals.add(val);
      activateBtn(btn);
    }
    document.getElementById('oi-error').textContent = '';
  };

  window.oiCalculate = function () {
    const err = document.getElementById('oi-error');
    if (!oiState.handCount)       { err.textContent = '请选择对手剩余手数'; return; }
    if (oiState.signals.size === 0) { err.textContent = '请至少选择一个观察信号'; return; }
    err.textContent = '';

    const results = window.OpponentInference.infer(
      oiState.handCount, [...oiState.signals]
    );

    const cards = results.map(r => {
      const conf = CONF_COLOR[r.confidence] || CONF_COLOR.low;
      const infers = r.infer.map(i =>
        `<div style="font-size:12px;color:#cce;margin:3px 0;padding-left:8px;
                     border-left:2px solid #2d5a3d;line-height:1.5">${i}</div>`
      ).join('');

      return `
<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:1rem 1.25rem;
            background:#0b2418;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;
                 background:${conf.bg};border:0.5px solid ${conf.border};color:${conf.text}">
      可信度：${conf.label}
    </span>
    <span style="font-size:13px;font-weight:500;color:#e8f5e9">${r.title}</span>
  </div>

  <div style="font-size:11px;color:#7ee8a2;margin-bottom:3px">📌 事实</div>
  <div style="font-size:12px;color:#aac;margin-bottom:8px">${r.fact}</div>

  <div style="font-size:11px;color:#ffcc00;margin-bottom:4px">🔍 推断（有依据）</div>
  <div style="margin-bottom:8px">${infers}</div>

  <div style="font-size:11px;color:#e87e7e;margin-bottom:3px">⚠️ 假设（尚未验证）</div>
  <div style="font-size:12px;color:#888;margin-bottom:10px">${r.assume}</div>

  <div style="font-size:11px;color:#7ee8a2;margin-bottom:3px">💡 建议应对</div>
  <div style="font-size:13px;color:#cce;margin-bottom:10px;line-height:1.5">${r.counter}</div>

  <div style="font-size:11px;color:#444;border-top:0.5px solid #2d5a3d;padding-top:8px">
    牌理依据：${r.principle}
  </div>
</div>`;
    }).join('');

    const discipline = `
<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:0.75rem 1.25rem;
            background:#081a10">
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:6px">推断纪律</div>
  <div style="font-size:12px;color:#888;line-height:1.8">
    · <span style="color:#aac">事实</span>：已出的牌型，100% 确定<br>
    · <span style="color:#ffcc00">推断</span>：从行为模式推测，有依据但非确定<br>
    · <span style="color:#e87e7e">假设</span>：尚无证据，需要继续观察验证<br>
    · 信息不足时，给条件式判断——不装作确定
  </div>
</div>`;

    document.getElementById('oi-result').innerHTML = cards + discipline;
  };

  function render() {
    const root = document.getElementById('opponent-inference-panel');
    if (!root) return;

    const signalBtns = SIGNAL_OPTIONS.map(s =>
      `<button onclick="oiToggleSignal('${s.id}',this)"
               style="padding:7px 10px;font-size:12px;background:#1a3a2a;
                      border:0.5px solid #2d5a3d;color:#aaa;cursor:pointer;
                      border-radius:8px;transition:all .15s;text-align:left">
         ${s.label}
       </button>`
    ).join('');

    root.innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:12px;padding:1.25rem 1.5rem;
            background:#0d2b1d;margin:1rem 0;font-family:sans-serif">

  <div style="font-size:15px;font-weight:500;color:#e8f5e9;margin-bottom:3px">
    对家牌型推断
  </div>
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:1rem">
    L4 决策层 · 三层框架：事实 → 推断 → 假设
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">对手剩余手数</div>
    <div style="display:flex;gap:0" id="oi-count">
      <button onclick="oiSelectCount('few',this)"  style="${btnBase('8px 0 0 8px')}">少（≤5手）</button>
      <button onclick="oiSelectCount('mid',this)"  style="${btnBase('0')}">中（6–10手）</button>
      <button onclick="oiSelectCount('many',this)" style="${btnBase('0 8px 8px 0')}">多（≥11手）</button>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">
      观察到的信号（可多选）
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${signalBtns}
    </div>
  </div>

  <div id="oi-error" style="font-size:12px;color:#e87e7e;min-height:16px;margin-bottom:8px"></div>

  <button onclick="oiCalculate()"
          style="width:100%;padding:9px;font-size:13px;font-weight:500;
                 border:0.5px solid #ffcc00;border-radius:8px;background:transparent;
                 color:#ffcc00;cursor:pointer;transition:all .15s"
          onmouseover="this.style.background='rgba(255,204,0,0.08)'"
          onmouseout="this.style.background='transparent'">
    推断对手牌型
  </button>

  <div id="oi-result" style="margin-top:1rem"></div>
</div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();
