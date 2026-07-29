(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

  function startRound(levelRank, rng) {
    const deck = Cards.shuffle(Cards.createDeck(), rng);
    const hands = Cards.deal(deck).map(h => Cards.sortHand(h, levelRank));
    return {
      levelRank, hands, currentLeader: 0, currentTurn: 0, currentCombo: null,
      lastPlayerIndex: null, passStreak: 0, finishedOrder: [], history: []
    };
  }

  function isFinished(state, playerIndex) {
    return state.finishedOrder.includes(playerIndex);
  }

  function nextActivePlayer(state, fromIndex) {
    let idx = fromIndex;
    for (let i = 0; i < 4; i++) {
      idx = (idx + 1) % 4;
      if (!isFinished(state, idx)) return idx;
    }
    return null;
  }

  function activePlayerCount(state) {
    return 4 - state.finishedOrder.length;
  }

  function playCombo(state, playerIndex, cards) {
    if (playerIndex !== state.currentTurn) return { error: 'not your turn' };
    if (isFinished(state, playerIndex)) return { error: 'player already finished' };
    const hand = state.hands[playerIndex];
    const handIds = new Set(hand.map(c => c.id));
    if (!cards.every(c => handIds.has(c.id))) return { error: 'cards not in hand' };

    const combo = Combos.classify(cards, state.levelRank);
    if (!combo) return { error: 'invalid combo' };

    if (state.currentCombo) {
      const cur = state.currentCombo;
      const beatsBomb = combo.isBomb && !cur.isBomb;
      const sameCategory = combo.category === cur.category && combo.length === cur.length;
      const beatsSameCategory = sameCategory && Combos.compare(combo, cur) > 0;
      const beatsHigherBomb = combo.isBomb && cur.isBomb && Combos.compare(combo, cur) > 0;
      if (!beatsBomb && !beatsSameCategory && !beatsHigherBomb) {
        return { error: 'combo does not beat current combo' };
      }
    }

    state.hands[playerIndex] = hand.filter(c => !cards.some(pc => pc.id === c.id));
    state.currentCombo = combo;
    state.lastPlayerIndex = playerIndex;
    state.passStreak = 0;
    state.history.push({ playerIndex, cards, combo });

    if (state.hands[playerIndex].length === 0) {
      state.finishedOrder.push(playerIndex);
    }

    advanceTurnAfterPlay(state);
    return { ok: true, roundOver: state.finishedOrder.length >= 3 };
  }

  function pass(state, playerIndex) {
    if (playerIndex !== state.currentTurn) return { error: 'not your turn' };
    if (!state.currentCombo) return { error: 'cannot pass when leading' };
    state.passStreak++;
    state.history.push({ playerIndex, cards: [], combo: null });
    advanceTurnAfterPass(state);
    return { ok: true };
  }

  function advanceTurnAfterPlay(state) {
    if (state.finishedOrder.length >= 3) { state.currentTurn = null; return; }
    const remainingOthers = activePlayerCount(state) - (isFinished(state, state.lastPlayerIndex) ? 0 : 1);
    if (remainingOthers <= 0) {
      state.currentCombo = null;
      state.passStreak = 0;
      state.currentLeader = isFinished(state, state.lastPlayerIndex)
        ? nextActivePlayer(state, state.lastPlayerIndex)
        : state.lastPlayerIndex;
      state.currentTurn = state.currentLeader;
      return;
    }
    state.currentTurn = nextActivePlayer(state, state.lastPlayerIndex);
  }

  function advanceTurnAfterPass(state) {
    const remainingOthers = activePlayerCount(state) - (isFinished(state, state.lastPlayerIndex) ? 0 : 1);
    if (state.passStreak >= remainingOthers) {
      state.currentCombo = null;
      state.passStreak = 0;
      state.currentLeader = isFinished(state, state.lastPlayerIndex)
        ? nextActivePlayer(state, state.lastPlayerIndex)
        : state.lastPlayerIndex;
      state.currentTurn = state.currentLeader;
      return;
    }
    state.currentTurn = nextActivePlayer(state, state.currentTurn);
  }

  function teamLevelGain(finishedOrder) {
    const teams = finishedOrder.map(p => TEAM_OF[p]);
    const winningTeam = teams[0];
    const idx = teams.indexOf(winningTeam, 1);
    if (idx === 1) return { team: winningTeam, gain: 3 };
    if (idx === 2) return { team: winningTeam, gain: 2 };
    return { team: winningTeam, gain: 1 };
  }

  const Engine = { TEAM_OF, startRound, playCombo, pass, isFinished, nextActivePlayer, teamLevelGain };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
  } else {
    root.GD = root.GD || {};
    root.GD.Engine = Engine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
