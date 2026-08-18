// ─────────────────────────────────────────
// 掼蛋牌语解读模块 v1.0  (L3 战略层)
// 依赖：无（纯 JS，无需任何框架）
// 用法：在 index.html 底部引入
//   <script src="signal-reader.js"></script>
// 然后在页面放：
//   <div id="signal-reader-panel"></div>
//
// 理论来源：
//   - AI掼蛋进阶·标准牌局输入格式 v1.0 §19（persistent_signal,
//     absence_not_proof, fact_infer_assume, conditional_when_uncertain,
//     opponent_break, report_enumerate, endgame_focus_threat）
// ─────────────────────────────────────────

(function () {
  'use strict';

  // ── 行为信号库 ────────────────────────────────────────────
  //
  // 每条信号：
  //   actor    : 'opponent'（对手）| 'partner'（搭档）| 'any'
  //   behavior : 行为描述（供 UI 展示）
  //   once     : 单次观察时的解读
  //   repeat   : 连续观察时的解读（persistent_signal 原则）
  //   counter  : 建议应对
  //   principle: 引用的牌理原则 key
  //   confidence_once   : 单次可信度（'low'|'medium'|'high'）
  //   confidence_repeat : 连续可信度

  const SIGNALS = [

    // ── 对手行为 ──────────────────────────────────────────

    {
      id: 'opp_small_single',
      actor: 'opponent',
      behavior: '对手连续出小单张',
      once: '可能在试探你们的反应，也可能只是在清废牌。',
      repeat: '很可能手里小牌很多，整体牌力偏弱，正在努力清路。主动权不在他那边。',
      counter: '不必急着接，让他多出几张废牌；若搭档不需要主动权，可暂时放行。',
      principle: '对手顺时优先打断',
      confidence_once: 'low',
      confidence_repeat: 'high',
    },
    {
      id: 'opp_sudden_stop',
      actor: 'opponent',
      behavior: '对手突然停止出牌（连续 pass）',
      once: '可能在等搭档接牌，也可能手里没有合适的牌型跟出。',
      repeat: '大概率手里剩下的都是大牌或炸弹，在等待合适时机一击制胜。',
      counter: '小心对手藏着炸弹或大牌；主动权在你这边时，尽量用小牌把路铺开，不要轻易出大牌。',
      principle: '连续行为比单次行为更值得读牌',
      confidence_once: 'low',
      confidence_repeat: 'high',
    },
    {
      id: 'opp_no_big',
      actor: 'opponent',
      behavior: '对手从未出过大牌（A/K/王）',
      once: '可能还没机会出，也可能根本没有大牌。',
      repeat: '「没出过」不等于「没有」——他可能在藏，也可能真的缺大牌。需要结合已出牌记录判断。',
      counter: '结合记牌（五十定律）推算剩余大牌张数，再决定是否需要防守。',
      principle: '「没出过」不等于「没有」',
      confidence_once: 'low',
      confidence_repeat: 'medium',
    },
    {
      id: 'opp_report',
      actor: 'opponent',
      behavior: '对手已报牌（手里剩少量牌）',
      once: '优先枚举他剩余的可能牌型：单张？对子？顺子？炸弹？',
      repeat: '已报牌的对手是当前最危险的威胁，需要集中防守。',
      counter: '残局集中防守他：有能压制的牌型就接，没有就用炸弹阻断，让搭档抢先出完。',
      principle: '残局集中防守最危险的玩家',
      confidence_once: 'high',
      confidence_repeat: 'high',
    },
    {
      id: 'opp_bomb_early',
      actor: 'opponent',
      behavior: '对手早早打出炸弹',
      once: '他可能急于夺主动权，说明手里可能有很多小牌需要清，炸弹是他清路的工具。',
      repeat: '多次早炸说明他手里炸弹数量不少，但整体牌力结构可能偏弱（靠炸弹撑场面）。',
      counter: '不要被炸弹吓到；炸弹首先是牌权工具，他炸完之后仍需出完剩余牌，观察他后续出牌判断真实牌力。',
      principle: '炸弹首先是牌权工具',
      confidence_once: 'medium',
      confidence_repeat: 'medium',
    },

    // ── 搭档行为 ──────────────────────────────────────────

    {
      id: 'partner_let_pass',
      actor: 'partner',
      behavior: '搭档主动让牌（有牌不接）',
      once: '可能在给你机会出牌，也可能手里的牌不适合这个牌型。',
      repeat: '搭档在刻意配合你，把主动权交给你——他认为你的牌更适合出击，或他在执行助攻定位。',
      counter: '抓住机会出你手里最难出的弱路，不要浪费搭档让出的空间。',
      principle: '先看搭档，再看自己',
      confidence_once: 'low',
      confidence_repeat: 'high',
    },
    {
      id: 'partner_small_out',
      actor: 'partner',
      behavior: '搭档出小牌打头',
      once: '可能在测试场面，也可能手里小牌多需要清路。',
      repeat: '搭档正在清弱路，手里大牌可能较多但需要先出完小牌——他可能是主打，你应配合接棒。',
      counter: '如果你是助攻，接过来继续出小牌配合；如果你是主打，等搭档清完路后再发力。',
      principle: '先处理弱路，再炫耀强牌',
      confidence_once: 'low',
      confidence_repeat: 'medium',
    },
    {
      id: 'partner_big_hold',
      actor: 'partner',
      behavior: '搭档手里明显还有大牌（从未出过大牌）',
      once: '可能在等合适时机，也可能暂时出不了这个牌型。',
      repeat: '搭档在蓄力——他攒着大牌等关键时刻用。你应该配合他打通道路，给他创造出大牌的机会。',
      counter: '你先出小牌清路；让搭档的大牌发挥最大价值，别抢他的出牌节奏。',
      principle: '搭档顺时少抢牌',
      confidence_once: 'low',
      confidence_repeat: 'medium',
    },
  ];

  // ── 对外 API ─────────────────────────────────────────────

  window.SignalReader = {
    /**
     * 获取指定 id 的信号解读
     * @param {string} id  信号 id
     * @param {boolean} isRepeat  是否连续观察（true = 多次，false = 单次）
     * @returns {object} 信号对象 + 当前解读文本 + 当前可信度
     */
    read(id, isRepeat = false) {
      const sig = SIGNALS.find(s => s.id === id);
      if (!sig) return null;
      return {
        ...sig,
        interpretation: isRepeat ? sig.repeat : sig.once,
        confidence: isRepeat ? sig.confidence_repeat : sig.confidence_once,
      };
    },

    byActor(actor) {
      return SIGNALS.filter(s => s.actor === actor || s.actor === 'any');
    },

    all() { return SIGNALS; },
  };

  // ── UI ────────────────────────────────────────────────────

  const CONF_LABEL = { low: '低', medium: '中', high: '高' };
  const CONF_COLOR = {
    low:    { bg: '#1a1a0d', border: '#5a5a1a', text: '#cccc44' },
    medium: { bg: '#0d1a2a', border: '#1a4a7a', text: '#4a9aee' },
    high:   { bg: '#0b2418', border: '#1a5a3a', text: '#7ee8a2' },
  };

  const ACTOR_LABEL = { opponent: '对手行为', partner: '搭档行为' };

  const peState = { actor: null, signalId: null, isRepeat: false };

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

  function resetGroup(group) {
    group.querySelectorAll('button').forEach(b => {
      b.style.background = '#1a3a2a';
      b.style.color = '#aaa';
      b.style.borderColor = '#2d5a3d';
      b.style.fontWeight = '400';
    });
  }

  window.srSelectActor = function (actor, btn) {
    peState.actor = actor;
    peState.signalId = null;
    const g = btn.parentElement;
    resetGroup(g);
    activateBtn(btn);
    document.getElementById('sr-error').textContent = '';
    renderSignalList(actor);
  };

  window.srSelectSignal = function (id, btn) {
    peState.signalId = id;
    const g = document.getElementById('sr-signal-group');
    resetGroup(g);
    activateBtn(btn);
    document.getElementById('sr-error').textContent = '';
  };

  window.srToggleRepeat = function (val, btn) {
    peState.isRepeat = val;
    const g = btn.parentElement;
    resetGroup(g);
    activateBtn(btn);
  };

  window.srCalculate = function () {
    const err = document.getElementById('sr-error');
    if (!peState.actor)    { err.textContent = '请先选择观察对象'; return; }
    if (!peState.signalId) { err.textContent = '请选择观察到的行为'; return; }
    err.textContent = '';

    const result = window.SignalReader.read(peState.signalId, peState.isRepeat);
    if (!result) return;

    const conf = CONF_COLOR[result.confidence];
    const confLabel = CONF_LABEL[result.confidence];

    document.getElementById('sr-result').innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:1rem 1.25rem;
            background:#0b2418;margin-bottom:8px">

  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;
                 background:${conf.bg};border:0.5px solid ${conf.border};color:${conf.text}">
      可信度：${confLabel}
    </span>
    <span style="font-size:12px;color:#7ee8a2">
      ${peState.isRepeat ? '连续行为解读' : '单次行为解读'}
    </span>
  </div>

  <div style="font-size:11px;color:#7ee8a2;margin-bottom:4px">信号解读</div>
  <div style="font-size:14px;color:#e8f5e9;margin-bottom:12px;line-height:1.6">
    ${result.interpretation}
  </div>

  <div style="font-size:11px;color:#ffcc00;margin-bottom:4px">建议应对</div>
  <div style="font-size:13px;color:#cce;margin-bottom:12px;line-height:1.6">
    ${result.counter}
  </div>

  <div style="font-size:11px;color:#555;border-top:0.5px solid #2d5a3d;padding-top:8px">
    牌理依据：${result.principle}
  </div>
</div>

<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:0.75rem 1.25rem;
            background:#081a10">
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:6px">⚠️ 读牌纪律</div>
  <div style="font-size:12px;color:#888;line-height:1.7">
    · 单次行为可信度低，不要过度解读<br>
    · 「没出过」≠「没有」——结合记牌再判断<br>
    · 明确区分：<span style="color:#aac">事实</span>（已出的牌）· 
      <span style="color:#ffcc00">推断</span>（从行为推测）· 
      <span style="color:#e87e7e">假设</span>（尚未验证）
  </div>
</div>`;
  };

  function renderSignalList(actor) {
    const signals = window.SignalReader.byActor(actor);
    const container = document.getElementById('sr-signal-container');
    container.innerHTML = `
<div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">
  观察到的行为
</div>
<div id="sr-signal-group" style="display:flex;flex-direction:column;gap:6px">
  ${signals.map(s => `
  <button onclick="srSelectSignal('${s.id}', this)"
          style="text-align:left;padding:9px 12px;font-size:12px;
                 background:#1a3a2a;border:0.5px solid #2d5a3d;
                 color:#aaa;cursor:pointer;border-radius:8px;line-height:1.5;transition:all .15s">
    ${s.behavior}
  </button>`).join('')}
</div>`;
  }

  function render() {
    const root = document.getElementById('signal-reader-panel');
    if (!root) return;

    root.innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:12px;padding:1.25rem 1.5rem;
            background:#0d2b1d;margin:1rem 0;font-family:sans-serif">

  <div style="font-size:15px;font-weight:500;color:#e8f5e9;margin-bottom:3px">
    牌语解读
  </div>
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:1rem">
    L3 战略层 · 基于「连续行为比单次行为更值得读牌」
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">观察对象</div>
    <div style="display:flex;gap:0" id="sr-actor-group">
      <button onclick="srSelectActor('opponent',this)"
              style="${btnBase('8px 0 0 8px')}">对手</button>
      <button onclick="srSelectActor('partner',this)"
              style="${btnBase('0 8px 8px 0')}">搭档</button>
    </div>
  </div>

  <div id="sr-signal-container" style="margin-bottom:12px"></div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">观察次数</div>
    <div style="display:flex;gap:0" id="sr-repeat-group">
      <button onclick="srToggleRepeat(false,this)"
              style="${btnBase('8px 0 0 8px')} background:#0b3d2e;color:#ffcc00;border-color:#ffcc00;font-weight:500">
        单次
      </button>
      <button onclick="srToggleRepeat(true,this)"
              style="${btnBase('0 8px 8px 0')}">
        连续多次
      </button>
    </div>
  </div>

  <div id="sr-error" style="font-size:12px;color:#e87e7e;min-height:16px;margin-bottom:8px"></div>

  <button onclick="srCalculate()"
          style="width:100%;padding:9px;font-size:13px;font-weight:500;
                 border:0.5px solid #ffcc00;border-radius:8px;background:transparent;
                 color:#ffcc00;cursor:pointer;transition:all .15s"
          onmouseover="this.style.background='rgba(255,204,0,0.08)'"
          onmouseout="this.style.background='transparent'">
    解读牌语
  </button>

  <div id="sr-result" style="margin-top:1rem"></div>
</div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();
