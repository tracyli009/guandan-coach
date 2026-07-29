(function (root) {
  'use strict';

  const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const SUITS = ['S','H','D','C'];

  function naturalIndex(rank) {
    return RANK_ORDER.indexOf(rank);
  }

  function rankValue(rank, levelRank) {
    if (rank === 'BJ') return 15;
    if (rank === 'SJ') return 14;
    if (rank === levelRank) return 13;
    return naturalIndex(rank);
  }

  function isWildcard(card, levelRank) {
    return card.rank === levelRank && card.suit === 'H';
  }

  function createDeck() {
    const deck = [];
    for (let copy = 0; copy < 2; copy++) {
      for (const rank of RANK_ORDER) {
        for (const suit of SUITS) {
          deck.push({ rank, suit, id: `${rank}${suit}_${copy}` });
        }
      }
      deck.push({ rank: 'SJ', suit: null, id: `SJ_${copy}` });
      deck.push({ rank: 'BJ', suit: null, id: `BJ_${copy}` });
    }
    return deck;
  }

  function shuffle(deck, rng) {
    const arr = deck.slice();
    const random = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function deal(deck) {
    if (deck.length !== 108) throw new Error('deck must have 108 cards');
    const hands = [[], [], [], []];
    for (let i = 0; i < deck.length; i++) {
      hands[i % 4].push(deck[i]);
    }
    return hands;
  }

  function sortHand(hand, levelRank) {
    return hand.slice().sort((a, b) => rankValue(a.rank, levelRank) - rankValue(b.rank, levelRank));
  }

  const Cards = { RANK_ORDER, SUITS, naturalIndex, rankValue, isWildcard, createDeck, shuffle, deal, sortHand };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Cards;
  } else {
    root.GD = root.GD || {};
    root.GD.Cards = Cards;
  }
})(typeof window !== 'undefined' ? window : globalThis);
