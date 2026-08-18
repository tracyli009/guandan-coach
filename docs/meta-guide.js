// ─────────────────────────────────────────
// 掼蛋元指导层 v1.0  (L0 道｜元指导层)
// 依赖：无（纯 JS，无需任何框架）
// 用法：在 index.html 底部引入
//   <script src="meta-guide.js"></script>
// 然后在页面放：
//   <div id="meta-guide-panel"></div>
//
// 哲学来源：
//   - 《道德经》（老子）：无为、上善若水、知常、损之又损、
//                         柔弱胜刚强、知止
//   - 《孙子兵法》（孙武）：知己知彼、虚实、势、奇正、形、庙算
//
// 设计原则：
//   L0 不是查表工具，是思维框架。
//   先展示完整哲学地图，再提供「此刻该用哪个思想」的快速查询。
// ─────────────────────────────────────────

(function () {
  'use strict';

  // ── 哲学概念库 ────────────────────────────────────────────

  const TAO_CONCEPTS = [
    {
      id: 'wu_wei',
      char: '无为',
      source: '《道德经》第三章',
      original: '为学日益，为道日损。损之又损，以至於無為。無為而無不為。',
      guandan: '不强求主动权',
      explanation: '搭档在领先时，主动 pass 就是最高明的出牌。不出手，不等于没有力量——无为是在等最合适的时机发力，而不是什么都不做。强行出牌夺主动权，反而可能破坏搭档的节奏。',
      trigger: '搭档正在领先 / 手里没有合适的牌型跟出',
      mapTo: 'L3 搭档配合 · 过牌时机',
    },
    {
      id: 'shang_shan',
      char: '上善若水',
      source: '《道德经》第八章',
      original: '上善若水。水善利萬物而不爭，處衆人之所惡，故幾於道。',
      guandan: '随形就势，灵活应对',
      explanation: '水没有固定的形状，遇方则方，遇圆则圆。掼蛋里的强者不执着于某一种打法——对手出单张就接单张，出顺子就用顺子压，炸弹也是工具而不是执念。没有最好的打法，只有最适合当前局面的打法。',
      trigger: '桌面牌型被动改变 / 需要跟随对手节奏',
      mapTo: 'L2 候选打法 · L3 强弱转换',
    },
    {
      id: 'zhi_chang',
      char: '知常',
      source: '《道德经》第十六章',
      original: '致虛極，守靜篤。萬物並作，吾以觀復。夫物芸芸，各復歸其根。歸根曰靜，是謂復命。復命曰常，知常曰明。',
      guandan: '认识规律，不被表象迷惑',
      explanation: '牌局有其内在规律：大牌总会被出完，弱路总会暴露，炸弹的作用随局面变化。「知常」是指不被对手一两次的异常出牌动摇判断，也不因一时的顺势而轻敌。回到规律本身：他现在 pass，不代表他没有大牌。',
      trigger: '对手有异常行为 / 不确定是否被骗',
      mapTo: 'L3 牌语解读 · 推断纪律',
    },
    {
      id: 'sun_sun',
      char: '损之又损',
      source: '《道德经》第四十八章',
      original: '為學日益，為道日損。損之又損，以至於無為。',
      guandan: '不断减少废牌和手数',
      explanation: '组牌的最高境界是「损」——每一次出牌都在减少手里的负担。不是出大牌，而是出掉最难出的那张废牌。去单化、清弱路、减少手数，这是掼蛋里的「为道」。越少越好，直到剩下的每一张牌都能出掉。',
      trigger: '手里废牌多 / 开局组牌阶段',
      mapTo: 'L2 组牌优化 · 去单化原则',
    },
    {
      id: 'rou_ruo',
      char: '柔弱胜刚强',
      source: '《道德经》第七十八章',
      original: '天下莫柔弱於水，而攻堅強者莫之能勝。',
      guandan: '小牌制大牌，弱路打通道',
      explanation: '小牌看似无用，却能打通道路。一张3的单张出去，换来的是搭档大牌的出手机会。「柔」不是软弱，是策略——用最小的牌消耗对手的注意力，让真正的力量留到关键时刻。弱路是柔，炸弹是刚；先柔后刚，方为正道。',
      trigger: '需要给搭档送路 / 手里弱路多',
      mapTo: 'L2 传牌接牌 · L3 搭档配合',
    },
    {
      id: 'zhi_zhi',
      char: '知止',
      source: '《道德经》第四十四章',
      original: '知足者富。強行者有志。不失其所者久。死而不亡者壽。知足者富，知止不殆。',
      guandan: '知道什么时候不该出牌',
      explanation: '贪是掼蛋最大的敌人。抢了搭档的攻，用炸弹盖了对手一张废牌，把A出在了错误的时机——这些都是「不知止」。知道什么时候该停手，比知道什么时候该出手更难，也更重要。',
      trigger: '想用炸弹但局面不紧张 / 想抢主动权但搭档在领先',
      mapTo: 'L4 实时建议 · 过牌判断',
    },
  ];

  const SUNZI_CONCEPTS = [
    {
      id: 'zhi_bi',
      char: '知己知彼',
      source: '《孙子兵法·谋攻篇》',
      original: '知彼知己，百戰不殆；不知彼而知己，一勝一負；不知彼不知己，每戰必殆。',
      guandan: '定位自己 + 推断对手',
      explanation: '开局第一件事：知道自己是主打还是助攻（知己），推断对手的牌力和定位（知彼）。定位引擎解决知己，牌语解读和对家推断解决知彼。两者都清楚了，才能制定正确的策略；只知己不知彼，胜负各半。',
      trigger: '开局定位阶段 / 不确定对手牌力',
      mapTo: 'L3 定位引擎 · L4 对家推断',
    },
    {
      id: 'xu_shi',
      char: '虚实',
      source: '《孙子兵法·虚实篇》',
      original: '兵形象水，水之形，避高而趨下；兵之形，避實而擊虛。',
      guandan: '藏大牌/炸弹，示弱待机',
      explanation: '炸弹不亮出来，就是「虚」——让对手摸不清你的底牌。连续 pass，让对手以为你没有大牌，等他松懈的时候一炸制胜，这是「击虚」。同样，不要在对手强势时硬碰，找他的弱点（弱路多、搭档失联）再出击。',
      trigger: '手里有炸弹/大牌 / 对手正在强势',
      mapTo: 'L3 牌语解读 · 炸弹使用判断',
    },
    {
      id: 'shi',
      char: '势',
      source: '《孙子兵法·兵势篇》',
      original: '激水之疾，至於漂石者，勢也；鷙鳥之疾，至於毀折者，節也。',
      guandan: '局面强弱转换的时机',
      explanation: '「势」是局面的动能。当己方双强对手双弱，势在我方，此时要快速出牌，让优势转化为胜势；当势在对手，不要硬撑，等待势的转移。强弱转换模块就是在判断当前的「势」在谁手里，以及如何顺势或转势。',
      trigger: '局面发生明显变化 / 需要判断现在该主动还是被动',
      mapTo: 'L3 强弱转换',
    },
    {
      id: 'qi_zheng',
      char: '奇正',
      source: '《孙子兵法·兵势篇》',
      original: '凡戰者，以正合，以奇勝。奇正之變，不可勝窮也。',
      guandan: '常规打法 vs 出人意料的打法',
      explanation: '「正」是按定位打：主打出大牌，助攻配合传路。「奇」是出人意料：手里有顺子却出散牌迷惑对手，或在对手最放松时突然用炸弹换主动权。奇正相生——先让对手习惯你的「正」，再用「奇」打破他的预期。',
      trigger: '常规打法被对手预判 / 需要打乱对手节奏',
      mapTo: 'L2 候选打法 · L4 实时建议',
    },
    {
      id: 'xing',
      char: '形',
      source: '《孙子兵法·军形篇》',
      original: '昔之善戰者，先為不可勝，以待敵之可勝。不可勝在己，可勝在敵。',
      guandan: '让对手看不清你的真实牌力',
      explanation: '「形」是你呈现给对手的样子。连续出小牌让对手以为你很弱，等他放松警惕；藏好炸弹让他以为你没有制衡手段。「先为不可胜」——先把自己的弱路清干净，让对手找不到攻击你的机会，再等对手暴露弱点。',
      trigger: '需要隐藏牌力 / 不想被对手读牌',
      mapTo: 'L3 牌语解读（反向使用）',
    },
    {
      id: 'miao_suan',
      char: '庙算',
      source: '《孙子兵法·始计篇》',
      original: '夫未戰而廟算勝者，得算多也；未戰而廟算不勝者，得算少也。多算勝，少算敗。',
      guandan: '开局前的组牌计算',
      explanation: '发牌后的第一个动作不是出牌，而是「庙算」：分析手牌结构，判断强弱路，估算手数，选择组牌方案。算得越清楚，后面越主动。组牌优化模块就是庙算的工具——在第一张牌出去之前，胜负已经有了初步的答案。',
      trigger: '发牌后 / 开局组牌阶段',
      mapTo: 'L2 组牌优化 · 手数评估',
    },
  ];

  // ── 局面→思想快速查询表 ──────────────────────────────────

  const SITUATION_MAP = [
    {
      id: 'sit_open',
      situation: '刚发完牌，在想怎么组牌',
      concepts: ['miao_suan', 'sun_sun', 'zhi_bi'],
      advice: '先庙算（评估手牌结构），再损之又损（最大化去单化），最后确认知己（我是主打还是助攻）。',
    },
    {
      id: 'sit_partner_winning',
      situation: '搭档正在领先，我要不要接牌',
      concepts: ['wu_wei', 'zhi_zhi', 'rou_ruo'],
      advice: '无为——搭档顺时过牌配合。知止——不要抢搭档的攻。柔弱胜刚强——出小牌给搭档送路，而不是硬上大牌。',
    },
    {
      id: 'sit_opponent_strong',
      situation: '对手很强，感觉很被动',
      concepts: ['xu_shi', 'shi', 'shang_shan'],
      advice: '虚实——把炸弹藏好，等对手松懈。势——此刻势不在我，等待转换时机，不硬拼。上善若水——随形应对，灵活跟牌，不执着于反压。',
    },
    {
      id: 'sit_opp_unreadable',
      situation: '读不懂对手的出牌意图',
      concepts: ['zhi_chang', 'zhi_bi', 'xing'],
      advice: '知常——回到规律本身，不被表象迷惑。知己知彼——用牌语解读和对家推断分析他的行为。同时想想「形」——他会不会也在故意示弱？',
    },
    {
      id: 'sit_many_waste',
      situation: '手里废牌太多，出不掉',
      concepts: ['sun_sun', 'rou_ruo', 'wu_wei'],
      advice: '损之又损——每轮都要出掉至少一张废牌，哪怕很小。柔弱胜刚强——废牌是打通搭档道路的工具，不是负担。无为——不要强行出大牌，先把废牌清完。',
    },
    {
      id: 'sit_endgame',
      situation: '残局，对手快出完了',
      concepts: ['shi', 'qi_zheng', 'zhi_zhi'],
      advice: '势——残局的势最关键，对手手少就是势强，要用炸弹阻断。奇正——此时出其不意比按部就班更重要，可以反常规用炸弹阻断。知止——炸弹该用就用，不要再省了。',
    },
    {
      id: 'sit_hide_cards',
      situation: '想藏好我的大牌/炸弹，不被读牌',
      concepts: ['xing', 'xu_shi', 'qi_zheng'],
      advice: '形——先为不可胜，让对手摸不清你的底牌。虚实——示弱，连续出小牌让对手误判。奇正——在对手最放松时用「奇」打破他的预期。',
    },
    {
      id: 'sit_switch_mode',
      situation: '局面从被动变成主动，该怎么切换',
      concepts: ['shi', 'shang_shan', 'zhi_chang'],
      advice: '势——识别势的转移，果断切换为主动出击。上善若水——随形就势，不要固守之前的被动打法。知常——局面转换是正常规律，不要因为突然领先而轻敌。',
    },
  ];

  // ── 对外 API ─────────────────────────────────────────────

  window.MetaGuide = {
    getTao()     { return TAO_CONCEPTS; },
    getSunzi()   { return SUNZI_CONCEPTS; },
    getAll()     { return [...TAO_CONCEPTS, ...SUNZI_CONCEPTS]; },
    getSituations() { return SITUATION_MAP; },

    findById(id) {
      return [...TAO_CONCEPTS, ...SUNZI_CONCEPTS].find(c => c.id === id);
    },

    queryBySituation(situationId) {
      const sit = SITUATION_MAP.find(s => s.id === situationId);
      if (!sit) return null;
      return {
        ...sit,
        conceptDetails: sit.concepts.map(id => this.findById(id)).filter(Boolean),
      };
    },
  };

  // ── UI ────────────────────────────────────────────────────

  const TAO_COLOR   = { bg: '#1a0d2a', border: '#5a1a7a', accent: '#cc88ff', dim: '#9a5acc' };
  const SUNZI_COLOR = { bg: '#0d1a0d', border: '#1a5a1a', accent: '#88ddaa', dim: '#5a9a6a' };

  let mgState = { view: 'framework', situationId: null };

  function renderFramework() {
    const taoCards = TAO_CONCEPTS.map(c => conceptCard(c, TAO_COLOR, '道')).join('');
    const sunziCards = SUNZI_CONCEPTS.map(c => conceptCard(c, SUNZI_COLOR, '兵')).join('');

    return `
<div style="margin-bottom:16px">
  <div style="font-size:12px;color:#cc88ff;font-weight:500;margin-bottom:8px;
              letter-spacing:2px">── 《道德经》· 老子 ──</div>
  <div style="display:flex;flex-direction:column;gap:8px">${taoCards}</div>
</div>
<div>
  <div style="font-size:12px;color:#88ddaa;font-weight:500;margin-bottom:8px;
              letter-spacing:2px">── 《孙子兵法》· 孙武 ──</div>
  <div style="display:flex;flex-direction:column;gap:8px">${sunziCards}</div>
</div>`;
  }

  function conceptCard(c, color, tag) {
    return `
<div style="border:0.5px solid ${color.border};border-radius:10px;padding:0.9rem 1.1rem;
            background:${color.bg};cursor:pointer;transition:all .15s"
     onclick="mgExpandConcept('${c.id}',this)">
  <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
    <span style="font-size:18px;font-weight:500;color:${color.accent}">${c.char}</span>
    <span style="font-size:11px;color:${color.dim}">${c.source}</span>
    <span style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:12px;
                 background:${color.border};color:${color.accent}">${c.mapTo.split('·')[0].trim()}</span>
  </div>
  <div style="font-size:12px;color:#aac;margin-bottom:4px">
    掼蛋应用：<span style="color:#e8f5e9">${c.guandan}</span>
  </div>
  <div id="mg-detail-${c.id}" style="display:none;margin-top:8px">
    <div style="font-size:11px;color:${color.dim};font-style:italic;
                margin-bottom:6px;line-height:1.6;border-left:2px solid ${color.border};
                padding-left:8px">${c.original}</div>
    <div style="font-size:12px;color:#cce;line-height:1.7;margin-bottom:6px">
      ${c.explanation}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div style="background:#081a10;border:0.5px solid #2d5a3d;border-radius:6px;padding:7px 10px">
        <div style="font-size:10px;color:#7ee8a2;margin-bottom:3px">触发时机</div>
        <div style="font-size:11px;color:#aac">${c.trigger}</div>
      </div>
      <div style="background:#081a10;border:0.5px solid #2d5a3d;border-radius:6px;padding:7px 10px">
        <div style="font-size:10px;color:#7ee8a2;margin-bottom:3px">对应模块</div>
        <div style="font-size:11px;color:#aac">${c.mapTo}</div>
      </div>
    </div>
  </div>
</div>`;
  }

  function renderQuery() {
    const sitBtns = SITUATION_MAP.map(s => `
<button onclick="mgSelectSit('${s.id}',this)"
        style="text-align:left;padding:9px 12px;font-size:12px;
               background:#1a3a2a;border:0.5px solid #2d5a3d;
               color:#aaa;cursor:pointer;border-radius:8px;
               line-height:1.5;transition:all .15s;width:100%">
  ${s.situation}
</button>`).join('');

    return `
<div style="margin-bottom:12px">
  <div style="font-size:12px;color:#7ee8a2;margin-bottom:8px">当前局面是？</div>
  <div style="display:flex;flex-direction:column;gap:6px">${sitBtns}</div>
</div>
<div id="mg-query-result"></div>`;
  }

  window.mgExpandConcept = function (id, card) {
    const detail = document.getElementById('mg-detail-' + id);
    if (!detail) return;
    const isOpen = detail.style.display !== 'none';
    detail.style.display = isOpen ? 'none' : 'block';
  };

  window.mgSelectSit = function (id, btn) {
    document.querySelectorAll('#mg-sit-list button').forEach(b => {
      b.style.background = '#1a3a2a';
      b.style.color = '#aaa';
      b.style.borderColor = '#2d5a3d';
      b.style.fontWeight = '400';
    });
    btn.style.background = '#0b3d2e';
    btn.style.color = '#ffcc00';
    btn.style.borderColor = '#ffcc00';
    btn.style.fontWeight = '500';

    const result = window.MetaGuide.queryBySituation(id);
    if (!result) return;

    const tags = result.conceptDetails.map(c => {
      const isTao = TAO_CONCEPTS.find(t => t.id === c.id);
      const col = isTao ? TAO_COLOR : SUNZI_COLOR;
      return `<span style="padding:3px 10px;border-radius:20px;font-size:12px;
                            background:${col.bg};border:0.5px solid ${col.border};
                            color:${col.accent}">${c.char}</span>`;
    }).join('');

    const details = result.conceptDetails.map(c => {
      const isTao = TAO_CONCEPTS.find(t => t.id === c.id);
      const col = isTao ? TAO_COLOR : SUNZI_COLOR;
      const src = isTao ? '道' : '兵';
      return `
<div style="border:0.5px solid ${col.border};border-radius:8px;padding:10px 12px;
            background:${col.bg};margin-bottom:6px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="font-size:15px;font-weight:500;color:${col.accent}">${c.char}</span>
    <span style="font-size:10px;color:${col.dim}">${c.source}</span>
  </div>
  <div style="font-size:12px;color:#cce;line-height:1.6">${c.explanation}</div>
</div>`;
    }).join('');

    document.getElementById('mg-query-result').innerHTML = `
<div style="border:0.5px solid #2d5a3d;border-radius:10px;padding:1rem 1.25rem;
            background:#0b2418;margin-top:4px">
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${tags}</div>
  <div style="font-size:13px;color:#e8f5e9;line-height:1.7;margin-bottom:12px">
    ${result.advice}
  </div>
  <div style="font-size:11px;color:#7ee8a2;margin-bottom:8px">概念详解</div>
  ${details}
</div>`;
  };

  window.mgSwitchView = function (view, btn) {
    mgState.view = view;
    document.querySelectorAll('.mg-tab').forEach(b => {
      b.style.background = '#1a3a2a';
      b.style.color = '#aaa';
      b.style.borderColor = '#2d5a3d';
      b.style.fontWeight = '400';
    });
    btn.style.background = '#0b3d2e';
    btn.style.color = '#ffcc00';
    btn.style.borderColor = '#ffcc00';
    btn.style.fontWeight = '500';
    document.getElementById('mg-body').innerHTML =
      view === 'framework' ? renderFramework() : renderQuery();
    if (view === 'query') {
      document.getElementById('mg-sit-list') &&
        (document.getElementById('mg-sit-list').id = 'mg-sit-list');
      // 给 sit list 加 id
      const btns = document.querySelectorAll('#mg-body button[onclick^="mgSelectSit"]');
      if (btns.length > 0 && btns[0].parentElement) {
        btns[0].parentElement.id = 'mg-sit-list';
      }
    }
  };

  function render() {
    const root = document.getElementById('meta-guide-panel');
    if (!root) return;

    root.innerHTML = `
<div style="border:0.5px solid #5a3a7a;border-radius:12px;padding:1.25rem 1.5rem;
            background:#0d0d1d;margin:1rem 0;font-family:sans-serif">

  <div style="font-size:15px;font-weight:500;color:#e8d5ff;margin-bottom:3px">
    元指导层
  </div>
  <div style="font-size:11px;color:#cc88ff;margin-bottom:4px">
    L0 道｜以《道德经》观势 · 以《孙子兵法》制胜
  </div>
  <div style="font-size:11px;color:#888;margin-bottom:1rem;font-style:italic">
    以《道德经》观势，以规则为边界，以技术为手段，以战略为方向，以决策赢得牌局。
  </div>

  <div style="display:flex;gap:0;margin-bottom:1.25rem">
    <button class="mg-tab" onclick="mgSwitchView('framework',this)"
            style="flex:1;padding:8px;font-size:12px;font-weight:500;
                   background:#0b3d2e;border:0.5px solid #ffcc00;
                   color:#ffcc00;cursor:pointer;border-radius:8px 0 0 8px;transition:all .15s">
      哲学框架
    </button>
    <button class="mg-tab" onclick="mgSwitchView('query',this)"
            style="flex:1;padding:8px;font-size:12px;
                   background:#1a3a2a;border:0.5px solid #2d5a3d;
                   color:#aaa;cursor:pointer;border-radius:0 8px 8px 0;transition:all .15s">
      此刻该用哪个思想？
    </button>
  </div>

  <div id="mg-body">${renderFramework()}</div>
</div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();
