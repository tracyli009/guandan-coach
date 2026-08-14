/* UI_BOUNDARY */
(function () {
  'use strict';
  const { Engine, Cards, Combos, Moves, AI, CoachRealtime, CoachReview, CoachHistory, HandOptimizer } = window.GD;

  const HISTORY_KEY = 'guandan_coach_history_v1';
  const SUIT_SYMBOL = { S: '♠️', H: '♥️', D: '♦️', C: '♣️' };
  const SEAT_LABEL = { 1: '右家', 2: '对家', 3: '左家' };

  let state = null;
  let selectedIds = new Set();
  let moveLog = [];
  let trickPlays = { 0: null, 1: null, 2: null, 3: null };
  const levelRank = '2';
  const BOT_MOVE_DELAY_MS = 1500;

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(r => r && typeof r.cooperationScore === 'number' && Array.isArray(r.patterns));
    } catch (e) {
      return [];
    }
  }

  function saveHistoryRecord(record) {
    const history = loadHistory();
    history.push(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function cardLabel(card) {
    if (card.rank === 'SJ') return '小王';
    if (card.rank === 'BJ') return '大王';
    return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
  }

  function currentLegalNonBombCheck() {
    return Moves.legalPlays(state.hands[0], state.currentCombo, levelRank).some(c => !c.isBomb);
  }

  function currentSuggestion() {
    return CoachRealtime.suggestPlay(state.hands[0], state.currentCombo, {
      selfIndex: 0, lastPlayerIndex: state.lastPlayerIndex, levelRank
    });
  }

  function recordTrickAction(seat, cards, isPass) {
    if (state.currentCombo) {
      trickPlays[seat] = { cards: cards ? cards.slice() : [], isPass: !!isPass };
    } else {
      trickPlays = { 0: null, 1: null, 2: null, 3: null };
    }
  }

  function renderPlayedCards(seat) {
    const el = document.getElementById(`played-${seat}`);
    const entry = trickPlays[seat];
    if (!entry) { el.textContent = ''; return; }
    el.textContent = entry.isPass ? '过' : entry.cards.map(cardLabel).join(' ');
  }

  // Groups the player's own hand by the hand-optimizer's chosen 组牌方案
  // (see src/hand-optimizer.js) instead of one flat row - cards belonging
  // to the same group (a same-rank set, or a straight/plate/pair_straight
  // run) sit together in their own box, with the boxes ordered left-to-
  // right by rank. Selection state and click behavior are unchanged; this
  // only changes how the same cards are laid out and labeled.
  function groupSortValue(group) {
    return Math.min(...group.cards.map(c => Cards.rankValue(c.rank, levelRank)));
  }

  function renderHand() {
    const handDiv = document.getElementById('hand-0');
    handDiv.innerHTML = '';
    if (state.hands[0].length === 0) return;
    const plan = HandOptimizer.choosePlan(state.hands[0], levelRank).best.groups;
    const orderedGroups = plan.slice().sort((a, b) => groupSortValue(a) - groupSortValue(b));
    for (const group of orderedGroups) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'hand-group';
      const labelDiv = document.createElement('div');
      labelDiv.className = 'group-label';
      labelDiv.textContent = HandOptimizer.describeGroup(group);
      groupDiv.appendChild(labelDiv);
      const cardsDiv = document.createElement('div');
      cardsDiv.className = 'group-cards';
      for (const card of group.cards) {
        const btn = document.createElement('button');
        btn.className = 'card' + (selectedIds.has(card.id) ? ' selected' : '');
        btn.textContent = cardLabel(card);
        btn.onclick = () => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id); else selectedIds.add(card.id);
          render();
        };
        cardsDiv.appendChild(btn);
      }
      groupDiv.appendChild(cardsDiv);
      handDiv.appendChild(groupDiv);
    }
  }

  function render() {
    document.getElementById('levelIndicator').textContent = `当前级牌：${levelRank}`;
    [1, 2, 3].forEach(seat => {
      document.getElementById(`count-${seat}`).textContent = `剩余 ${state.hands[seat].length} 张`;
    });

    renderHand();

    [0, 1, 2, 3].forEach(renderPlayedCards);

    const trickEl = document.getElementById('trickArea');
    trickEl.textContent = state.currentCombo
      ? `本墩需要压过：${CoachRealtime.describeCombo(state.currentCombo)}`
      : '（新的一墩，等待出牌）';

    const coachEl = document.getElementById('coachSuggestion');
    coachEl.textContent = state.currentTurn === 0 ? currentSuggestion().rationale : '等待其他玩家出牌…';

    renderHistoryPanel();
  }

  function renderHistoryPanel() {
    const summary = CoachHistory.summarizeHistory(loadHistory());
    const el = document.getElementById('historyContent');
    if (summary.gamesPlayed === 0) {
      el.textContent = '还没有历史记录，打完一局后这里会显示你的成长趋势。';
      return;
    }
    el.innerHTML = `
      <p>已完成 ${Number(summary.gamesPlayed)} 局，平均配合分 ${Number(summary.averageCooperationScore)}</p>
      <p>${summary.dominantArchetype ? '主要风格：' + summary.dominantArchetype : ''}</p>
      <p>配合分趋势：${summary.trend.map(Number).join(' → ')}</p>
    `;
  }

  function buildMoveLogEntry(action, combo) {
    const suggestion = currentSuggestion();
    const matched = action === suggestion.action &&
      (action === 'pass' || (combo && suggestion.combo &&
        combo.category === suggestion.combo.category && combo.compareValue === suggestion.combo.compareValue));
    return {
      action,
      partnerWasWinning: !!(state.currentCombo && state.lastPlayerIndex !== null && Engine.TEAM_OF[state.lastPlayerIndex] === Engine.TEAM_OF[0]),
      comboCategory: combo ? combo.category : null,
      comboIsBomb: combo ? combo.isBomb : false,
      handSizeBefore: state.hands[0].length,
      matchedSuggestion: matched,
      hadBeatingOptionNonBomb: currentLegalNonBombCheck()
    };
  }

  function onPlay() {
    if (state.currentTurn !== 0) return;
    const cards = state.hands[0].filter(c => selectedIds.has(c.id));
    if (cards.length === 0) return;
    const combo = Combos.classify(cards, levelRank);
    if (!combo) { alert('这不是一手合法的牌型'); return; }
    const entry = buildMoveLogEntry('play', combo);
    const result = Engine.playCombo(state, 0, cards);
    if (result.error) { alert(result.error); return; }
    moveLog.push(entry);
    recordTrickAction(0, cards, false);
    selectedIds = new Set();
    afterTurn(result.roundOver);
  }

  function onPass() {
    if (state.currentTurn !== 0) return;
    if (!state.currentCombo) { alert('领出方不能过牌'); return; }
    const entry = buildMoveLogEntry('pass', null);
    const result = Engine.pass(state, 0);
    if (result.error) { alert(result.error); return; }
    moveLog.push(entry);
    recordTrickAction(0, [], true);
    afterTurn(false);
  }

  function afterTurn(roundOver) {
    render();
    if (roundOver) finishRound(); else maybeRunBotTurn();
  }

  function maybeRunBotTurn() {
    if (state.currentTurn === null || state.currentTurn === 0) return;
    setTimeout(() => {
      const seat = state.currentTurn;
      const decision = AI.chooseAiPlay(state.hands[seat], state.currentCombo, {
        selfIndex: seat, lastPlayerIndex: state.lastPlayerIndex, levelRank
      });
      const result = decision.action === 'pass'
        ? Engine.pass(state, seat)
        : Engine.playCombo(state, seat, decision.combo.cards);
      if (result.error) { console.error('bot move rejected:', result.error); return; }
      recordTrickAction(seat, decision.action === 'pass' ? [] : decision.combo.cards, decision.action === 'pass');
      render();
      if (result.roundOver) finishRound(); else maybeRunBotTurn();
    }, BOT_MOVE_DELAY_MS);
  }

  function finishRound() {
    const review = CoachReview.reviewHand(moveLog);
    const gain = Engine.teamLevelGain(state.finishedOrder);
    const winnerLabel = gain.team === Engine.TEAM_OF[0] ? '你这边获胜' : '对方获胜';
    document.getElementById('reviewModal').classList.remove('hidden');
    const patternHtml = review.patterns.length
      ? '<ul>' + review.patterns.map(p => `<li>${p.label}（出现 ${p.count} 次）</li>`).join('') + '</ul>'
      : '<p>本局没有发现明显的配合问题，继续保持！</p>';
    document.getElementById('reviewContent').innerHTML = `
      <p>${winnerLabel}，本局升 ${gain.gain} 级</p>
      <p>配合分：${review.cooperationScore}</p>
      ${patternHtml}
    `;
    saveHistoryRecord(review);
    renderHistoryPanel();
  }

  function startNewHand() {
    state = Engine.startRound(levelRank, Math.random);
    selectedIds = new Set();
    moveLog = [];
    trickPlays = { 0: null, 1: null, 2: null, 3: null };
    render();
    maybeRunBotTurn();
  }

  document.getElementById('btnPlay').onclick = onPlay;
  document.getElementById('btnPass').onclick = onPass;
  document.getElementById('btnCloseReview').onclick = () => {
    document.getElementById('reviewModal').classList.add('hidden');
    startNewHand();
  };
  document.getElementById('btnNextHand').onclick = () => {
    document.getElementById('reviewModal').classList.add('hidden');
    startNewHand();
  };

  startNewHand();
})();
