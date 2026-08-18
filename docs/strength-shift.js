// ─────────────────────────────────────────
// 掼蛋强弱转换模块 v1.0  (L3 战略层)
// 依赖：无（纯 JS，无需任何框架）
// 用法：在 index.html 底部引入
//   <script src="strength-shift.js"></script>
// 然后在页面放：
//   <div id="strength-shift-panel"></div>
//
// 理论来源：
//   - AI掼蛋进阶·标准牌局输入格式 v1.0 §19
//     （weak_road_first, power_before_size, endgame_countdown,
//       endgame_focus_threat, bomb_is_tool, bomb_plan_ahead）
//   - 掼蛋组牌五原则（zu_pai_wu_yuanze）
//   - 李旦生「定位→沟通→配合→记算」
//
// 核心思想：
//   强弱转换 ≠ 换打法
//   强弱转换 = 根据【当前局面阶段 + 手牌结构 + 对手威胁】
//              决定此刻应「主攻弱路清障」还是「切换强路制控」
// ─────────────────────────────────────────

(function () {
  'use strict';

  // ── 局面阶段定义 ─────────────────────────────────────────
  //
  // 三个维度决定当前该强还是该弱：
  //   phase      : 游戏阶段（开局 / 中局 / 残局）
  //   myStrength : 己方手牌强弱（强路多 / 均衡 / 弱路多）
  //   threat     : 对手威胁程度（高 / 中 / 低）

  const SHIFT_TABLE = [

    // ── 开局（手里牌多，>15 张） ──────────────────────────

    {
      phase: 'early', myStrength: 'weak_heavy', threat: 'any',
      mode: '先清弱路',
      title: '开局：弱路优先清障',
      reason: '手数多，小牌多，先把弱路出掉才能在中局发力。大牌留着没用，反而是负担。',
      actions: [
        '优先出最小的单张/对子（2–6），每轮都在减少弱路',
        '不要被对手带节奏；主动出弱路而不是跟大牌',
        '炸弹此刻不要轻易用，留着中局/残局控制',
      ],
      principle: '先处理弱路，再炫耀强牌',
      badge: '清弱',
      badgeType: 'weak',
    },
    {
      phase: 'early', myStrength: 'strong_heavy', threat: 'high',
      mode: '开局压制',
      title: '开局：强路压制对手',
      reason: '你的大牌多，对手威胁高，开局就要争夺主动权，不给对手喘息的机会。',
      actions: [
        '用中等强度的牌（J/Q/K）先压制，A 和王留到关键时刻',
        '一旦抢到主动权，立刻出弱路清障',
        '炸弹作为威慑，非必要不用',
      ],
      principle: '先看牌权，再看牌大',
      badge: '压制',
      badgeType: 'strong',
    },
    {
      phase: 'early', myStrength: 'balanced', threat: 'any',
      mode: '均衡开局',
      title: '开局：均衡试探',
      reason: '牌力均衡，先观察对手出牌节奏，判断谁是主打谁是助攻，再决定策略。',
      actions: [
        '出中等牌试探，不急于亮出底牌',
        '观察搭档定位：他主打则你助攻，他助攻则你主打',
        '优先清最难出的那门弱路',
      ],
      principle: '先看搭档，再看自己',
      badge: '试探',
      badgeType: 'neutral',
    },

    // ── 中局（手里 8–15 张） ─────────────────────────────

    {
      phase: 'mid', myStrength: 'weak_heavy', threat: 'high',
      mode: '危机清障',
      title: '中局：对手强 × 己方弱 → 专注清障',
      reason: '对手威胁高而你弱路还多，这是最危险的局面。不要试图硬拼，先把弱路出完再说。',
      actions: [
        '放弃争主动权，专注把弱路一门门清掉',
        '搭档若在领先，让他继续打，你跟出废牌',
        '炸弹只在「弱路实在出不掉」时才动用，炸完立刻出弱路',
      ],
      principle: '先处理弱路，再炫耀强牌',
      badge: '专注清障',
      badgeType: 'weak',
    },
    {
      phase: 'mid', myStrength: 'weak_heavy', threat: 'low',
      mode: '趁机清废',
      title: '中局：对手弱 × 己方弱 → 趁机清废',
      reason: '对手此刻不强，是清废牌的最好窗口。主动出，不要等。',
      actions: [
        '主动领牌，把最难出的弱路放出去',
        '不用大牌压，用中小牌硬出，对手可能接不住',
        '争取在残局前把弱路清干净',
      ],
      principle: '先处理弱路，再炫耀强牌',
      badge: '趁机清废',
      badgeType: 'weak',
    },
    {
      phase: 'mid', myStrength: 'strong_heavy', threat: 'high',
      mode: '强转攻势',
      title: '中局：对手强 × 己方强 → 切换攻势',
      reason: '双方都强，这是决定胜负的关键阶段。此刻要主动出击，争夺主动权。',
      actions: [
        '用强路（J/Q/K 对子/顺子）持续压制',
        '炸弹在对手快出完时果断打出阻断',
        '给搭档留出大牌的出牌机会，不要抢搭档的攻',
      ],
      principle: '先看牌权，再看牌大',
      badge: '攻势',
      badgeType: 'strong',
    },
    {
      phase: 'mid', myStrength: 'strong_heavy', threat: 'low',
      mode: '从容布局',
      title: '中局：对手弱 × 己方强 → 从容布局',
      reason: '你占优势，不需要急躁。有序出牌，让搭档也能顺畅出完。',
      actions: [
        '先出中等强度的牌，A/王留到最后确保出完',
        '给搭档送路，两人各自清好手牌',
        '炸弹留到残局当保险',
      ],
      principle: '炸弹首先是牌权工具',
      badge: '从容',
      badgeType: 'strong',
    },
    {
      phase: 'mid', myStrength: 'balanced', threat: 'high',
      mode: '防守转型',
      title: '中局：对手强 × 己方均衡 → 防守优先',
      reason: '对手威胁高，此刻最重要的是不让对手轻松出完，同时清掉自己的弱路。',
      actions: [
        '有能压制的牌就接，没有就过，不要浪费大牌',
        '优先清弱路，避免残局时手里还有废牌',
        '炸弹用来阻断对手快出完，不是用来抢主动权的',
      ],
      principle: '对手顺时优先打断',
      badge: '防守',
      badgeType: 'defend',
    },
    {
      phase: 'mid', myStrength: 'balanced', threat: 'low',
      mode: '稳步推进',
      title: '中局：对手弱 × 己方均衡 → 稳步推进',
      reason: '局面平稳，按照「弱路先清、强路控场」的节奏推进即可。',
      actions: [
        '弱路出完之前不用大牌',
        '搭档在领先就配合，搭档落后就发力',
        '开始倒推残局：估算对手还有几手牌',
      ],
      principle: '先处理弱路，再炫耀强牌',
      badge: '稳推',
      badgeType: 'neutral',
    },

    // ── 残局（手里 ≤7 张） ───────────────────────────────

    {
      phase: 'end', myStrength: 'any', threat: 'high',
      mode: '残局决战',
      title: '残局：对手威胁高 → 炸弹阻断 + 全力冲刺',
      reason: '残局了，对手快出完是最大威胁。炸弹现在是阻断工具，不再需要省着。',
      actions: [
        '对手快出完时果断打炸弹阻断，哪怕炸弹浪费了也值',
        '炸完之后立刻把剩余手牌一次性出完或最快路径出完',
        '集中防守手牌最少的对手',
      ],
      principle: '残局集中防守最危险的玩家',
      badge: '残局决战',
      badgeType: 'strong',
    },
    {
      phase: 'end', myStrength: 'any', threat: 'low',
      mode: '残局收尾',
      title: '残局：对手威胁低 → 有序收尾',
      reason: '对手威胁不高，按顺序出完即可。炸弹最后用作保险，确保不被卡住。',
      actions: [
        '按「弱路→强路→炸弹」顺序出完',
        '如果剩余都是大牌，考虑什么顺序出最快',
        '炸弹留到最后，万一被接住就炸出去',
      ],
      principle: '剩十张左右开始倒推尾牌',
      badge: '收尾',
      badgeType: 'neutral',
    },
  ];

  // ── 查表逻辑 ─────────────────────────────────────────────

  function lookup(phase, myStrength, threat) {
    return SHIFT_TABLE.find(r =>
      r.phase === phase &&
      (r.myStrength === myStrength || r.myStrength === 'any') &&
      (r.threat === threat || r.threat === 'any')
    ) || SHIFT_TABLE.find(r => r.phase === phase) || SHIFT_TABLE[0];
  }

  // ── 对外 API ─────────────────────────────────────────────

  window.StrengthShift = {
    advise(phase, myStrength, threat) {
      return lookup(phase, myStrength, threat);
    },
  };

  // ── UI ────────────────────────────────────────────────────

  const BADGE_STYLE = {
    weak:    'background:#1a2a0d;border:0.5px solid #5a7a1a;color:#aadd44',
    strong:  'background:#0d1a2a;border:0.5px solid #1a4a7a;color:#4a9aee',
    defend:  'background:#2a0d0d;border:0.5px solid #7a1a1a;color:#ee6a4a',
    neutral: 'background:#1a1a2a;border:0.5px solid #3a3a5a;color:#9a9acc',
  };

  const ssState = { phase: null, myStrength: null, threat: null };

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

  window.ssToggle = function (key, val, btn) {
    ssState[key] = val;
    resetGroup(btn.parentElement);
    activateBtn(btn);
    document.getElementById('ss-error').textContent = '';
  };

  window.ssCalculate = function () {
    const err = document.getElementById('ss-error');
    if (!ssState.phase)      { err.textContent = '请选择当前阶段'; return; }
    if (!ssState.myStrength) { err.textContent = '请选择手牌结构'; return; }
    if (!ssState.threat)     { err.textContent = '请选择对手威胁'; return; }
    err.textContent = '';

    const result = window.StrengthShift.advise(
      ssState.phase, ssState.myStrength, ssState.threat
    );

    const badge = BADGE_STYLE[result.badgeType];
    const actions = result.actions.map(a =>
      `<div style="font-size:12px;color:#cce;margin:4px 0;padding-left:8px;
                   border-left:2px solid #2d5a3d;line-height:1.5">
        ${a}
       </div>`
    ).join('');

    document.getElementById('ss-result').innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:1rem 1.25rem;
            background:#0b2418;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:500;${badge}">
      ${result.badge}
    </span>
    <span style="font-size:14px;font-weight:500;color:#e8f5e9">${result.mode}</span>
  </div>

  <div style="font-size:13px;color:#aac;margin-bottom:12px;line-height:1.6">
    ${result.reason}
  </div>

  <div style="font-size:11px;color:#7ee8a2;margin-bottom:6px">具体行动</div>
  <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:12px">
    ${actions}
  </div>

  <div style="font-size:11px;color:#555;border-top:0.5px solid #2d5a3d;padding-top:8px">
    牌理依据：${result.principle}
  </div>
</div>

<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:0.75rem 1.25rem;
            background:#081a10">
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:6px">强弱转换的本质</div>
  <div style="font-size:12px;color:#888;line-height:1.8">
    强弱转换不是换打法，而是随局面调整<span style="color:#ffcc00">优先级</span><br>
    · 弱路多 → 先清障，大牌是工具不是目标<br>
    · 强路多 → 先控场，弱路伺机而出<br>
    · 残局 → 威胁第一，炸弹不再需要省
  </div>
</div>`;
  };

  function render() {
    const root = document.getElementById('strength-shift-panel');
    if (!root) return;

    root.innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:12px;padding:1.25rem 1.5rem;
            background:#0d2b1d;margin:1rem 0;font-family:sans-serif">

  <div style="font-size:15px;font-weight:500;color:#e8f5e9;margin-bottom:3px">
    强弱转换
  </div>
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:1rem">
    L3 战略层 · 基于「先看牌权，再看牌大」
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">当前阶段</div>
    <div style="display:flex;gap:0" id="ss-phase">
      <button onclick="ssToggle('phase','early',this)" style="${btnBase('8px 0 0 8px')}">开局（>15张）</button>
      <button onclick="ssToggle('phase','mid',this)"   style="${btnBase('0')}">中局（8–15张）</button>
      <button onclick="ssToggle('phase','end',this)"   style="${btnBase('0 8px 8px 0')}">残局（≤7张）</button>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">手牌结构</div>
    <div style="display:flex;gap:0" id="ss-myStrength">
      <button onclick="ssToggle('myStrength','weak_heavy',this)"  style="${btnBase('8px 0 0 8px')}">弱路多</button>
      <button onclick="ssToggle('myStrength','balanced',this)"    style="${btnBase('0')}">均衡</button>
      <button onclick="ssToggle('myStrength','strong_heavy',this)" style="${btnBase('0 8px 8px 0')}">强路多</button>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">对手威胁</div>
    <div style="display:flex;gap:0" id="ss-threat">
      <button onclick="ssToggle('threat','high',this)" style="${btnBase('8px 0 0 8px')}">高（快出完/有大牌）</button>
      <button onclick="ssToggle('threat','low',this)"  style="${btnBase('0 8px 8px 0')}">低（牌多/弱）</button>
    </div>
  </div>

  <div id="ss-error" style="font-size:12px;color:#e87e7e;min-height:16px;margin-bottom:8px"></div>

  <button onclick="ssCalculate()"
          style="width:100%;padding:9px;font-size:13px;font-weight:500;
                 border:0.5px solid #ffcc00;border-radius:8px;background:transparent;
                 color:#ffcc00;cursor:pointer;transition:all .15s"
          onmouseover="this.style.background='rgba(255,204,0,0.08)'"
          onmouseout="this.style.background='transparent'">
    获取策略建议
  </button>

  <div id="ss-result" style="margin-top:1rem"></div>
</div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();
