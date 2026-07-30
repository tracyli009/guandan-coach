/* UI_BOUNDARY */
(function () {
  'use strict';
  const { Engine, Combos, Moves, AI, CoachRealtime, CoachReview, CoachHistory } = window.GD;

  const HISTORY_KEY = 'guandan_coach_history_v1';
  const SUIT_SYMBOL = { S: '♠️', H: '♥️', D: '♦️', C: '♣️' };
  const SEAT_LABEL = { 1: '右家', 2: '对家', 3: '左家' };

  let state = null;
  let selectedIds = new Set();
  let moveLog = [];
  const levelRank = '2';

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

  function render() {
    document.getElementById('levelIndicator').textContent = `当前级牌：${levelRank}`;
    [1, 2, 3].forEach(seat => {
      document.getElementById(`count-${seat}`).textContent = `剩余 ${state.hands[seat].length} 张`;
    });

    const handDiv = document.getElementById('hand-0');
    handDiv.innerHTML = '';
    for (const card of state.hands[0]) {
      const btn = document.createElement('button');
      btn.className = 'card' + (selectedIds.has(card.id) ? ' selected' : '');
      btn.textContent = cardLabel(card);
      btn.onclick = () => {
        if (selectedIds.has(card.id)) selectedIds.delete(card.id); else selectedIds.add(card.id);
        render();
      };
      handDiv.appendChild(btn);
    }

    const trickEl = document.getElementById('trickArea');
    if (state.currentCombo) {
      const lastPlay = state.history.length > 0 ? state.history[state.history.length - 1] : null;
      const cardsLabel = lastPlay && lastPlay.cards && lastPlay.cards.length > 0
        ? lastPlay.cards.map(cardLabel).join(' ')
        : CoachRealtime.describeCombo(state.currentCombo);
      const seatLabel = state.lastPlayerIndex === 0 ? '你' : (SEAT_LABEL[state.lastPlayerIndex] || ('座位' + state.lastPlayerIndex));
      trickEl.textContent = `当前墩：${cardsLabel}（${seatLabel}出）`;
    } else {
      trickEl.textContent = '（新的一墩，等待出牌）';
    }

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
      render();
      if (result.roundOver) finishRound(); else maybeRunBotTurn();
    }, 500);
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
