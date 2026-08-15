// 掼蛋定位引擎 v1.1 dark
(function () {
  'use strict';

  const POSITION_TABLE = [
    { hands:'few',  bomb:'many', big:'any',  role:'主打',               roleType:'main',        strategy:'主动进攻', note:'争取打双下',           badge:'主打' },
    { hands:'few',  bomb:'few',  big:'many', role:'搭档弱可主打',        roleType:'conditional', strategy:'防御偷袭', note:'助攻缺小牌，注意传送', badge:'条件主打' },
    { hands:'few',  bomb:'few',  big:'few',  role:'搭档弱可主打',        roleType:'conditional', strategy:'防御偷袭', note:'枪手模型，慎用炸弹',   badge:'条件主打' },
    { hands:'many', bomb:'many', big:'any',  role:'助攻（搭档弱可主打）',roleType:'support',     strategy:'配合进攻', note:'最易定位错误，别抢牌', badge:'助攻' },
    { hands:'many', bomb:'few',  big:'many', role:'助攻',               roleType:'support',     strategy:'防御配合', note:'防对手传接',            badge:'助攻' },
    { hands:'many', bomb:'few',  big:'few',  role:'助攻',               roleType:'support',     strategy:'配合',     note:'让过传牌',              badge:'助攻' },
  ];

  const ADJUSTMENT_TABLE = {
    unknown: { label:'情况不明',     target:'维持初定目标', exec:'执行既定战略' },
    s2w:     { label:'双强 vs 双弱', target:'打双下',       exec:'避免抢牌，一家先走' },
    w2s:     { label:'双弱 vs 双强', target:'防双下',       exec:'打弱放强' },
    one:     { label:'一强一弱',     target:'争头游',       exec:'强主打，弱配合' },
  };

  function lookup(hands, bomb, big) {
    return POSITION_TABLE.find(r =>
      r.hands === hands &&
      (r.bomb === bomb || r.bomb === 'any') &&
      (r.big  === big  || r.big  === 'any')
    ) || POSITION_TABLE[POSITION_TABLE.length - 1];
  }

  window.PositioningEngine = {
    calculate(hands, bomb, big, situation = 'unknown') {
      return {
        position:   lookup(hands, bomb, big),
        adjustment: ADJUSTMENT_TABLE[situation] || ADJUSTMENT_TABLE.unknown,
      };
    },
    fromGameState(gs) {
      return {
        hands: gs.handCount    <= 7 ? 'few'  : 'many',
        bomb:  gs.bombCount    >= 1 ? 'many' : 'few',
        big:   gs.bigCardCount >= 3 ? 'many' : 'few',
      };
    },
  };

  const STYLE = `
#positioning-panel { margin-top: 14px; }
#positioning-panel .pe-card {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 12px;
  padding: 14px 16px;
  font-family: -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
}
#positioning-panel .pe-title { font-size:14px; font-weight:600; color:#cde8d8; margin-bottom:12px; }
#positioning-panel .pe-label { font-size:11px; color:rgba(205,232,216,.65); margin-bottom:5px; display:block; }
#positioning-panel .pe-group { display:flex; margin-bottom:10px; }
#positioning-panel .pe-grid  { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
#positioning-panel .pe-btn {
  flex:1; padding:7px 4px; font-size:12px;
  background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2);
  color:rgba(205,232,216,.8); cursor:pointer; border-radius:0; transition:all .15s;
}
#positioning-panel .pe-btn:first-child { border-radius:7px 0 0 7px; }
#positioning-panel .pe-btn:last-child  { border-radius:0 7px 7px 0; }
#positioning-panel .pe-btn.solo        { border-radius:7px; }
#positioning-panel .pe-btn.active { background:rgba(255,204,0,.18); border-color:#ffcc00; color:#ffcc00; font-weight:600; }
#positioning-panel .pe-situation-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px; }
#positioning-panel .pe-err { font-size:12px; color:#ff7f7f; min-height:16px; margin-bottom:6px; }
#positioning-panel .pe-submit {
  width:100%; padding:9px; font-size:13px; font-weight:600;
  background:rgba(255,204,0,.15); border:1px solid rgba(255,204,0,.5);
  border-radius:8px; color:#ffcc00; cursor:pointer; transition:background .15s;
}
#positioning-panel .pe-submit:hover { background:rgba(255,204,0,.25); }
#positioning-panel .pe-result { margin-top:12px; }
#positioning-panel .pe-result-card {
  background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
  border-radius:10px; padding:12px 14px; margin-bottom:8px;
}
#positioning-panel .pe-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:600; margin-bottom:10px; }
#positioning-panel .pe-badge.main        { background:rgba(255,204,0,.25); color:#ffcc00; }
#positioning-panel .pe-badge.support     { background:rgba(80,200,120,.2); color:#7ee8a2; }
#positioning-panel .pe-badge.conditional { background:rgba(255,160,50,.2); color:#ffb86c; }
#positioning-panel .pe-rl  { font-size:11px; color:rgba(205,232,216,.5); margin:8px 0 3px; }
#positioning-panel .pe-rv  { font-size:14px; font-weight:600; color:#f2f2f2; margin-bottom:4px; }
#positioning-panel .pe-rn  { font-size:12px; color:rgba(205,232,216,.75); line-height:1.5; }
#positioning-panel .pe-adj-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
#positioning-panel .pe-adj-cell { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:7px; padding:9px 11px; }
#positioning-panel .pe-adj-label { font-size:11px; color:rgba(205,232,216,.5); margin-bottom:3px; }
#positioning-panel .pe-adj-val  { font-size:13px; font-weight:600; color:#f2f2f2; }
#positioning-panel .pe-adj-exec { font-size:12px; color:rgba(205,232,216,.75); margin-top:2px; }
`;

  function injectStyle() {
    if (document.getElementById('pe-style')) return;
    const tag = document.createElement('style');
    tag.id = 'pe-style';
    tag.textContent = STYLE;
    document.head.appendChild(tag);
  }

  const peState = { hands:null, bomb:null, big:null, situation:'unknown' };

  function render() {
    const root = document.getElementById('positioning-panel');
    if (!root) return;
    injectStyle();
    root.innerHTML = `
<div class="pe-card">
  <div class="pe-title">定位分析</div>
  <span class="pe-label">手数评估</span>
  <div class="pe-group" id="pe-hands">
    <button class="pe-btn" data-val="few"  onclick="peToggle('hands','few',this)">手数少（≤7手）</button>
    <button class="pe-btn" data-val="many" onclick="peToggle('hands','many',this)">手数多（≥8手）</button>
  </div>
  <div class="pe-grid">
    <div>
      <span class="pe-label">炸弹</span>
      <div class="pe-group" id="pe-bomb">
        <button class="pe-btn" data-val="many" onclick="peToggle('bomb','many',this)">有炸弹</button>
        <button class="pe-btn" data-val="few"  onclick="peToggle('bomb','few',this)">无炸弹</button>
      </div>
    </div>
    <div>
      <span class="pe-label">大牌</span>
      <div class="pe-group" id="pe-big">
        <button class="pe-btn" data-val="many" onclick="peToggle('big','many',this)">大牌多</button>
        <button class="pe-btn" data-val="few"  onclick="peToggle('big','few',this)">大牌少</button>
      </div>
    </div>
  </div>
  <span class="pe-label">沟通后局面（可选）</span>
  <div class="pe-situation-grid" id="pe-situation">
    <button class="pe-btn solo" data-val="unknown" onclick="peToggle('situation','unknown',this)">情况不明</button>
    <button class="pe-btn solo" data-val="s2w"     onclick="peToggle('situation','s2w',this)">双强 vs 双弱</button>
    <button class="pe-btn solo" data-val="w2s"     onclick="peToggle('situation','w2s',this)">双弱 vs 双强</button>
    <button class="pe-btn solo" data-val="one"     onclick="peToggle('situation','one',this)">一强一弱</button>
  </div>
  <div class="pe-err" id="pe-error"></div>
  <button class="pe-submit" onclick="peCalculate()">计算定位</button>
  <div class="pe-result" id="pe-result"></div>
</div>`;
    const defBtn = root.querySelector('#pe-situation [data-val="unknown"]');
    if (defBtn) defBtn.classList.add('active');
    peState.situation = 'unknown';
  }

  window.peToggle = function(key, val, btn) {
    peState[key] = val;
    btn.closest('[id^="pe-"]').querySelectorAll('.pe-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pe-error').textContent = '';
  };

  window.peCalculate = function() {
    const err = document.getElementById('pe-error');
    if (!peState.hands) { err.textContent = '请选择手数评估'; return; }
    if (!peState.bomb)  { err.textContent = '请选择炸弹情况'; return; }
    if (!peState.big)   { err.textContent = '请选择大牌情况'; return; }
    err.textContent = '';
    const { position:p, adjustment:a } = window.PositioningEngine.calculate(
      peState.hands, peState.bomb, peState.big, peState.situation
    );
    const bc = { main:'main', support:'support', conditional:'conditional' }[p.roleType] || 'support';
    document.getElementById('pe-result').innerHTML = `
<div class="pe-result-card">
  <span class="pe-badge ${bc}">${p.badge}</span>
  <div class="pe-rl">初步定位</div><div class="pe-rv">${p.role}</div>
  <div class="pe-rl">战略选择</div><div class="pe-rv">${p.strategy}</div>
  <div class="pe-rn">${p.note}</div>
</div>
<div class="pe-result-card">
  <div class="pe-rl">沟通后调整 · ${a.label}</div>
  <div class="pe-adj-row">
    <div class="pe-adj-cell"><div class="pe-adj-label">目标调整</div><div class="pe-adj-val">${a.target}</div></div>
    <div class="pe-adj-cell"><div class="pe-adj-label">执行方式</div><div class="pe-adj-exec">${a.exec}</div></div>
  </div>
</div>`;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
