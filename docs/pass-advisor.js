// ─────────────────────────────────────────
// 掼蛋传牌/接牌顾问 v1.0  (L2 技术层)
// 依赖：无（纯 JS，无需任何框架）
// 用法：在 index.html 底部引入
//   <script src="pass-advisor.js"></script>
// 然后在页面放：
//   <div id="pass-advisor-panel"></div>
//
// 理论来源：
//   - 李旦生「定位→沟通→配合→记算」框架（长江商学院讲座）
//   - 吴晓伟掼蛋方法论（传牌原则）
//   - 掼蛋「枪手模型」与「传接牌」规则
// ─────────────────────────────────────────

(function () {
  'use strict';

  // ── 核心决策规则表 ───────────────────────────────────────
  //
  // 传牌方向由以下三个维度决定：
  //   myRole    : 'main'（主打）| 'support'（助攻）| 'unknown'
  //   partnerRole: 同上
  //   situation : 局面（同 positioning.js 的 situation）
  //
  // 传牌原则（按优先级排序）：
  //   P1  主打传「小牌/废牌」→ 让自己跑得更快
  //   P2  助攻传「通道牌」→ 给主打送路（顺子缺口、对子配组）
  //   P3  双方均弱时，传「大牌」给较强的一方抵挡对手
  //   P4  不确定时，传「最好出掉的单张」（不破坏整体组合）

  const PASS_RULES = [
    {
      id: 'main_pass_trash',
      condition: s => s.myRole === 'main',
      priority: 1,
      title: '传废牌给搭档',
      desc: '你是主打，把散牌/小单张传给搭档，保持自己的进攻连贯性。',
      targets: ['小单张（3-6）', '不成组合的散牌'],
      avoid: ['顺子缺口牌', '炸弹用牌'],
      badge: '主打传废',
      badgeType: 'main',
    },
    {
      id: 'support_pass_channel',
      condition: s => s.myRole === 'support' && s.partnerRole === 'main',
      priority: 1,
      title: '传通道牌给主打',
      desc: '搭档是主打，优先传能帮助主打「跑牌」的过渡牌：顺子缺口、低对或三张。',
      targets: ['顺子缺口补位牌', '低对（2–6对）', '三张组'],
      avoid: ['大牌（A/K）', '自己手里的炸弹用牌'],
      badge: '助攻送路',
      badgeType: 'support',
    },
    {
      id: 'both_weak_pass_big',
      condition: s => s.situation === 'w2s',
      priority: 2,
      title: '双弱局面：传大牌给较强的',
      desc: '己方双弱，优先把大牌集中到相对较强的一方，尝试争头游/二游，避免双下。',
      targets: ['A、K、大对子', '能接手的最大单张'],
      avoid: ['小废牌（对手接不住没用）'],
      badge: '集中大牌',
      badgeType: 'defend',
    },
    {
      id: 'both_strong_pass_trash',
      condition: s => s.situation === 's2w',
      priority: 2,
      title: '双强局面：快速清废牌',
      desc: '己方占优，两人各自跑，互传废牌加速出完。不需要「给通道」，各打各的弱点。',
      targets: ['最难出的散牌', '不成套的单张'],
      avoid: ['通道牌（自己需要用）'],
      badge: '各自清废',
      badgeType: 'main',
    },
    {
      id: 'default_pass',
      condition: _ => true,   // 兜底规则
      priority: 9,
      title: '传最易出掉的牌',
      desc: '局面不明时，传「对自己组合破坏最小」的牌：不破顺子、不拆炸弹，挑单张里最小的。',
      targets: ['最小的不成组单张'],
      avoid: ['顺子内部牌', '炸弹配件'],
      badge: '兜底策略',
      badgeType: 'default',
    },
  ];

  // ── 接牌规则 ──────────────────────────────────────────────
  //
  // 接牌 = 搭档传过来后，你该怎么用这张牌
  // receive_as_channel : 把收到的牌融入自己的组合
  // receive_as_pass    : 无法融入 → 继续往下传或留作单打

  const RECEIVE_RULES = [
    {
      id: 'receive_into_straight',
      title: '融入顺子',
      desc: '如果收到的牌恰好填补你手里的顺子缺口，优先补入顺子——这是最高价值的接法。',
      signal: '手里有顺子缺口',
      action: '补入缺口，顺子完整后伺机出击',
    },
    {
      id: 'receive_pair',
      title: '凑对子/三张',
      desc: '收到的牌与手里已有1张同点数？凑成对子或三张，提升出牌效率。',
      signal: '手里有同点单张',
      action: '凑对 → 考虑作为跟牌或顺子配件',
    },
    {
      id: 'receive_single_play',
      title: '作为单张出击',
      desc: '牌无法融入任何组合时，留作「硬攻」用的单张，或在对手出单时直接盖上。',
      signal: '牌无法融入现有组合',
      action: '单独出或等待对手出单张时盖上',
    },
    {
      id: 'receive_relay',
      title: '再次中转传牌',
      desc: '你也不需要这张牌，且搭档更需要？可以在自己得到出牌权后再传给搭档。',
      signal: '己方定位是助攻且搭档手数少',
      action: '找机会将牌送回给主打方',
    },
  ];

  // ── 对外 API ─────────────────────────────────────────────

  window.PassAdvisor = {
    /**
     * 建议传牌策略
     * @param {object} state
     *   myRole      : 'main' | 'support' | 'unknown'
     *   partnerRole : 'main' | 'support' | 'unknown'
     *   situation   : 'unknown' | 's2w' | 'w2s' | 'one'
     * @returns {{ rule, receiveRules }}
     */
    advise(state) {
      const matched = PASS_RULES
        .filter(r => r.condition(state))
        .sort((a, b) => a.priority - b.priority);
      return {
        rule: matched[0] || PASS_RULES[PASS_RULES.length - 1],
        receiveRules: RECEIVE_RULES,
      };
    },
  };

  // ── 样式常量 ─────────────────────────────────────────────

  const BADGE_STYLE = {
    main:    'background:#E6F1FB;color:#0C447C',
    support: 'background:#E1F5EE;color:#085041',
    defend:  'background:#FAE8E8;color:#8B1A1A',
    default: 'background:#F3F0FA;color:#4A3880',
  };

  // ── UI 渲染 ───────────────────────────────────────────────

  function btnStyle(pos) {
    const radius = pos === 'left'  ? '8px 0 0 8px'
                 : pos === 'right' ? '0 8px 8px 0'
                 : '8px';
    return `flex:1;padding:7px 6px;font-size:12px;` +
           `background:var(--surface-1,#1a3a2a);` +
           `border:0.5px solid var(--border,#2d5a3d);` +
           `color:var(--text-secondary,#aaa);` +
           `cursor:pointer;border-radius:${radius};transition:all .15s`;
  }

  function activateBtn(btn) {
    btn.style.background = '#0b3d2e';
    btn.style.color = '#ffcc00';
    btn.style.borderColor = '#ffcc00';
    btn.style.fontWeight = '600';
  }

  function resetGroup(group) {
    group.querySelectorAll('button').forEach(b => {
      b.style.background = 'var(--surface-1,#1a3a2a)';
      b.style.color = 'var(--text-secondary,#aaa)';
      b.style.borderColor = 'var(--border,#2d5a3d)';
      b.style.fontWeight = '400';
    });
  }

  const paState = { myRole: null, partnerRole: null, situation: 'unknown' };

  window.paToggle = function (key, val, btn) {
    paState[key] = val;
    const group = btn.closest('[id^="pa-"]');
    resetGroup(group);
    activateBtn(btn);
    document.getElementById('pa-error').textContent = '';
  };

  window.paCalculate = function () {
    const err = document.getElementById('pa-error');
    if (!paState.myRole)      { err.textContent = '请选择你的定位'; return; }
    if (!paState.partnerRole) { err.textContent = '请选择搭档定位'; return; }
    err.textContent = '';

    const { rule, receiveRules } = window.PassAdvisor.advise(paState);

    // 传牌结果卡片
    const passCard = `
<div style="border:0.5px solid var(--border,#2d5a3d);border-radius:10px;padding:1rem 1.25rem;
            background:var(--surface-1,#0f2d1e);margin-bottom:10px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;
                 ${BADGE_STYLE[rule.badgeType]}">${rule.badge}</span>
    <span style="font-size:14px;font-weight:600;color:#e8f5e9">${rule.title}</span>
  </div>
  <p style="font-size:13px;color:#aac;margin:0 0 10px">${rule.desc}</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div style="background:#0b2418;border:0.5px solid #2d5a3d;border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;color:#7ee8a2;margin-bottom:5px">✅ 优先传</div>
      ${rule.targets.map(t => `<div style="font-size:12px;color:#cce;margin:2px 0">· ${t}</div>`).join('')}
    </div>
    <div style="background:#0b2418;border:0.5px solid #5a2d2d;border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;color:#e87e7e;margin-bottom:5px">❌ 避免传</div>
      ${rule.avoid.map(t => `<div style="font-size:12px;color:#cce;margin:2px 0">· ${t}</div>`).join('')}
    </div>
  </div>
</div>`;

    // 接牌指南（折叠）
    const receiveItems = receiveRules.map(r => `
<div style="border:0.5px solid #2d5a3d;border-radius:8px;padding:10px 12px;margin-bottom:6px;background:#0b2418">
  <div style="font-size:12px;font-weight:600;color:#ffcc00;margin-bottom:3px">${r.title}</div>
  <div style="font-size:12px;color:#aac;margin-bottom:4px">${r.desc}</div>
  <div style="font-size:11px;color:#7ee8a2">🎯 ${r.action}</div>
</div>`).join('');

    const receiveCard = `
<details style="border:0.5px solid var(--border,#2d5a3d);border-radius:10px;
                background:var(--surface-1,#0f2d1e);overflow:hidden">
  <summary style="padding:0.9rem 1.25rem;font-size:13px;font-weight:500;color:#e8f5e9;
                  cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px">
    <span style="font-size:16px">📥</span> 接牌指南（点击展开）
  </summary>
  <div style="padding:0 1.25rem 1rem">${receiveItems}</div>
</details>`;

    document.getElementById('pa-result').innerHTML = passCard + receiveCard;
  };

  // ── 主渲染 ────────────────────────────────────────────────

  function render() {
    const root = document.getElementById('pass-advisor-panel');
    if (!root) return;

    root.innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:12px;padding:1.25rem 1.5rem;
            background:#0d2b1d;margin:1rem 0;font-family:sans-serif">

  <div style="font-size:15px;font-weight:600;color:#e8f5e9;margin-bottom:4px">
    传牌 / 接牌顾问
  </div>
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:1rem">
    L2 技术层 · 配合模块 · 基于李旦生「定位→沟通→配合→记算」
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">你的定位</div>
    <div style="display:flex;gap:0" id="pa-myRole">
      <button data-val="main"    onclick="paToggle('myRole','main',this)"    style="${btnStyle('left')}">主打</button>
      <button data-val="support" onclick="paToggle('myRole','support',this)" style="${btnStyle('center')}">助攻</button>
      <button data-val="unknown" onclick="paToggle('myRole','unknown',this)" style="${btnStyle('right')}">不确定</button>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">搭档定位</div>
    <div style="display:flex;gap:0" id="pa-partnerRole">
      <button data-val="main"    onclick="paToggle('partnerRole','main',this)"    style="${btnStyle('left')}">主打</button>
      <button data-val="support" onclick="paToggle('partnerRole','support',this)" style="${btnStyle('center')}">助攻</button>
      <button data-val="unknown" onclick="paToggle('partnerRole','unknown',this)" style="${btnStyle('right')}">不确定</button>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#7ee8a2;margin-bottom:6px">局面（选填）</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="pa-situation">
      <button data-val="unknown" onclick="paToggle('situation','unknown',this)" style="${btnStyle('single')}">情况不明</button>
      <button data-val="s2w"     onclick="paToggle('situation','s2w',this)"     style="${btnStyle('single')}">双强 vs 双弱</button>
      <button data-val="w2s"     onclick="paToggle('situation','w2s',this)"     style="${btnStyle('single')}">双弱 vs 双强</button>
      <button data-val="one"     onclick="paToggle('situation','one',this)"     style="${btnStyle('single')}">一强一弱</button>
    </div>
  </div>

  <div id="pa-error" style="font-size:12px;color:#e87e7e;min-height:16px;margin-bottom:8px"></div>

  <button onclick="paCalculate()" style="width:100%;padding:9px;font-size:13px;font-weight:500;
          border:0.5px solid #ffcc00;border-radius:8px;background:transparent;
          color:#ffcc00;cursor:pointer;transition:all .15s"
    onmouseover="this.style.background='rgba(255,204,0,0.08)'"
    onmouseout="this.style.background='transparent'">
    获取传牌建议
  </button>

  <div id="pa-result" style="margin-top:1rem"></div>
</div>`;

    // 默认选中"情况不明"
    const btn = root.querySelector('#pa-situation button[data-val="unknown"]');
    if (btn) activateBtn(btn);
  }

  // ── 初始化 ────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();
