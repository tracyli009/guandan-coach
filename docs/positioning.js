// 掼蛋定位引擎 v1.1 dark// ─────────────────────────────────────────
// 掼蛋定位引擎 v1.0
// 依赖：无（纯 JS，无需任何框架）
// 用法：在 index.html 底部 <script src="positioning.js"></script>
// 然后在页面任意位置放 <div id="positioning-panel"></div>
// ─────────────────────────────────────────

(function () {

  // ── 数据表（来自长江商学院讲座·李旦生） ──────────────────

  const POSITION_TABLE = [
    { hands: 'few',  bomb: 'many', big: 'any',  role: '主打',          roleType: 'main',        strategy: '主动进攻', note: '争取打双下',              badge: '主打' },
    { hands: 'few',  bomb: 'few',  big: 'many', role: '搭档弱可主打',  roleType: 'conditional', strategy: '防御偷袭', note: '助攻缺小牌，注意传送',    badge: '条件主打' },
    { hands: 'few',  bomb: 'few',  big: 'few',  role: '搭档弱可主打',  roleType: 'conditional', strategy: '防御偷袭', note: '枪手模型，慎用炸弹',       badge: '条件主打' },
    { hands: 'many', bomb: 'many', big: 'any',  role: '助攻（搭档弱可主打）', roleType: 'support', strategy: '配合进攻', note: '最易定位错误，别抢牌', badge: '助攻' },
    { hands: 'many', bomb: 'few',  big: 'many', role: '助攻',          roleType: 'support',     strategy: '防御配合', note: '防对手传接',               badge: '助攻' },
    { hands: 'many', bomb: 'few',  big: 'few',  role: '助攻',          roleType: 'support',     strategy: '配合',     note: '让过传牌',                 badge: '助攻' },
  ];

  const ADJUSTMENT_TABLE = {
    unknown: { label: '情况不明',   target: '维持初定目标', exec: '执行既定战略' },
    s2w:     { label: '双强 vs 双弱', target: '打双下',     exec: '避免抢牌，一家先走' },
    w2s:     { label: '双弱 vs 双强', target: '防双下',     exec: '打弱放强' },
    one:     { label: '一强一弱',   target: '争头游',       exec: '强主打，弱配合' },
  };

  // ── 查表逻辑 ─────────────────────────────────────────────

  function lookup(hands, bomb, big) {
    return POSITION_TABLE.find(r =>
      r.hands === hands &&
      (r.bomb === bomb || r.bomb === 'any') &&
      (r.big  === big  || r.big  === 'any')
    ) || POSITION_TABLE[POSITION_TABLE.length - 1];
  }

  // ── 对外 API（可供其他模块调用）──────────────────────────

  window.PositioningEngine = {
    /**
     * 计算定位
     * @param {string} hands  'few' | 'many'
     * @param {string} bomb   'many' | 'few'
     * @param {string} big    'many' | 'few'
     * @param {string} situation 'unknown' | 's2w' | 'w2s' | 'one'
     * @returns {{ position, adjustment }}
     */
    calculate(hands, bomb, big, situation = 'unknown') {
      return {
        position:    lookup(hands, bomb, big),
        adjustment:  ADJUSTMENT_TABLE[situation] || ADJUSTMENT_TABLE.unknown,
      };
    },

    /**
     * 从 GameState 自动推断输入
     * gameState = { handCount, bombCount, bigCardCount }
     * handCount  : 手数（整数）
     * bombCount  : 炸弹数（整数）
     * bigCardCount: 大牌数（A/K/Joker 算大牌，整数）
     */
    fromGameState(gameState) {
      const hands = gameState.handCount  <= 7 ? 'few' : 'many';
      const bomb  = gameState.bombCount  >= 1 ? 'many' : 'few';
      const big   = gameState.bigCardCount >= 3 ? 'many' : 'few';
      return { hands, bomb, big };
    },
  };

  // ── UI 渲染 ───────────────────────────────────────────────

  const BADGE_COLOR = {
    main:        'background:#E6F1FB;color:#0C447C',
    support:     'background:#E1F5EE;color:#085041',
    conditional: 'background:#FAEEDA;color:#633806',
  };

  function render() {
    const root = document.getElementById('positioning-panel');
    if (!root) return;

    root.innerHTML = `
<div style="border:0.5px solid var(--border,#ddd);border-radius:12px;padding:1.25rem 1.5rem;background:var(--surface-2,#fff);margin:1rem 0;font-family:sans-serif">

  <div style="font-size:15px;font-weight:500;color:var(--text-primary,#111);margin-bottom:1rem">定位分析</div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:var(--text-secondary,#666);margin-bottom:6px">手数评估</div>
    <div style="display:flex;gap:0" id="pe-hands">
      <button data-val="few"  onclick="peToggle('hands','few',this)"  style="${btnStyle('left')}">手数少（≤7手）</button>
      <button data-val="many" onclick="peToggle('hands','many',this)" style="${btnStyle('right')}">手数多（≥8手）</button>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
    <div>
      <div style="font-size:12px;color:var(--text-secondary,#666);margin-bottom:6px">炸弹</div>
      <div style="display:flex;gap:0" id="pe-bomb">
        <button data-val="many" onclick="peToggle('bomb','many',this)" style="${btnStyle('left')}">有炸弹</button>
        <button data-val="few"  onclick="peToggle('bomb','few',this)"  style="${btnStyle('right')}">无炸弹</button>
      </div>
    </div>
    <div>
      <div style="font-size:12px;color:var(--text-secondary,#666);margin-bottom:6px">大牌</div>
      <div style="display:flex;gap:0" id="pe-big">
        <button data-val="many" onclick="peToggle('big','many',this)" style="${btnStyle('left')}">大牌多</button>
        <button data-val="few"  onclick="peToggle('big','few',this)"  style="${btnStyle('right')}">大牌少</button>
      </div>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:var(--text-secondary,#666);margin-bottom:6px">沟通后局面（可选）</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="pe-situation">
      <button data-val="unknown" onclick="peToggle('situation','unknown',this)" style="${btnStyle('single')}">情况不明</button>
      <button data-val="s2w"     onclick="peToggle('situation','s2w',this)"     style="${btnStyle('single')}">双强 vs 双弱</button>
      <button data-val="w2s"     onclick="peToggle('situation','w2s',this)"     style="${btnStyle('single')}">双弱 vs 双强</button>
      <button data-val="one"     onclick="peToggle('situation','one',this)"     style="${btnStyle('single')}">一强一弱</button>
    </div>
  </div>

  <div id="pe-error" style="font-size:12px;color:#c0392b;min-height:16px;margin-bottom:8px"></div>

  <button onclick="peCalculate()" style="width:100%;padding:9px;font-size:13px;font-weight:500;border:0.5px solid #aaa;border-radius:8px;background:transparent;cursor:pointer">
    计算定位
  </button>

  <div id="pe-result" style="margin-top:1rem"></div>
</div>`;

    // 默认选中"情况不明"
    const btn = root.querySelector('#pe-situation button[data-val="unknown"]');
    if (btn) activateBtn(btn, 'single');
    peState.situation = 'unknown';
  }

  function btnStyle(pos) {
    const radius = pos === 'left'   ? '8px 0 0 8px'
                 : pos === 'right'  ? '0 8px 8px 0'
                 : '8px';
    return `flex:1;padding:7px 6px;font-size:12px;background:var(--surface-1,#f5f5f5);` +
           `border:0.5px solid var(--border,#ddd);color:var(--text-secondary,#555);` +
           `cursor:pointer;border-radius:${radius};transition:all .15s`;
  }

  // ── 全局状态 & 交互 ───────────────────────────────────────

  const peState = { hands: null, bomb: null, big: null, situation: 'unknown' };

  window.peToggle = function (key, val, btn) {
    peState[key] = val;
    const group = btn.closest('[id^="pe-"]');
    group.querySelectorAll('button').forEach(b => {
      b.style.background = 'var(--surface-1,#f5f5f5)';
      b.style.color = 'var(--text-secondary,#555)';
      b.style.borderColor = 'var(--border,#ddd)';
      b.style.fontWeight = '400';
    });
    activateBtn(btn, key === 'situation' ? 'single' : null);
    document.getElementById('pe-error').textContent = '';
  };

  function activateBtn(btn, _) {
    btn.style.background = '#E6F1FB';
    btn.style.color = '#0C447C';
    btn.style.borderColor = '#85B7EB';
    btn.style.fontWeight = '500';
  }

  window.peCalculate = function () {
    const err = document.getElementById('pe-error');
    if (!peState.hands) { err.textContent = '请选择手数评估'; return; }
    if (!peState.bomb)  { err.textContent = '请选择炸弹情况'; return; }
    if (!peState.big)   { err.textContent = '请选择大牌情况'; return; }
    err.textContent = '';

    const { position: p, adjustment: a } = window.PositioningEngine.calculate(
      peState.hands, peState.bomb, peState.big, peState.situation
    );

    document.getElementById('pe-result').innerHTML = `
<div style="border:0.5px solid var(--border,#ddd);border-radius:10px;padding:1rem 1.25rem;background:var(--surface-1,#fafafa);margin-bottom:10px">
  <span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:500;margin-bottom:10px;${BADGE_COLOR[p.roleType]}">${p.badge}</span>
  <div style="font-size:11px;color:var(--text-muted,#999);margin-bottom:3px">初步定位</div>
  <div style="font-size:14px;font-weight:500;color:var(--text-primary,#111);margin-bottom:8px">${p.role}</div>
  <div style="font-size:11px;color:var(--text-muted,#999);margin-bottom:3px">战略选择</div>
  <div style="font-size:14px;font-weight:500;color:var(--text-primary,#111);margin-bottom:6px">${p.strategy}</div>
  <div style="font-size:13px;color:var(--text-secondary,#666)">${p.note}</div>
</div>
<div style="border:0.5px solid var(--border,#ddd);border-radius:10px;padding:1rem 1.25rem;background:var(--surface-1,#fafafa)">
  <div style="font-size:11px;color:var(--text-muted,#999);margin-bottom:8px">沟通后调整 · ${a.label}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div style="background:var(--surface-2,#fff);border:0.5px solid var(--border,#ddd);border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;color:var(--text-muted,#999);margin-bottom:3px">目标调整</div>
      <div style="font-size:13px;font-weight:500;color:var(--text-primary,#111)">${a.target}</div>
    </div>
    <div style="background:var(--surface-2,#fff);border:0.5px solid var(--border,#ddd);border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;color:var(--text-muted,#999);margin-bottom:3px">执行方式</div>
      <div style="font-size:13px;color:var(--text-secondary,#555)">${a.exec}</div>
    </div>
  </div>
</div>`;
  };

  // ── 初始化 ────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();
