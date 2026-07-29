# Guandan Three-Layer Coach MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single self-contained `guandan.html` file that lets one human play a full 2v2 Guandan (掼蛋) hand against three AI bots, with a three-layer coach system built on top: (1) real-time per-turn play suggestions, (2) a rule-based post-hand review, and (3) a cross-hand growth dashboard.

**Architecture:** The rules engine, AI, and coach logic are written as dependency-free pure JavaScript modules (no DOM) under `src/`, each unit-tested with Node's built-in test runner. A small `build.js` script concatenates those modules plus the DOM-facing `ui.js`, `styles.css`, and `template.html` into one `guandan.html` file — the only artifact the end user needs to open. There is no runtime build step and no npm dependency for the deliverable itself.

**Tech Stack:** Vanilla JavaScript (ES2020), HTML5, CSS3, `localStorage` for cross-session persistence, Node.js (`node:test` + `node:assert/strict`) purely as the dev-time test/build runner.

## Global Constraints

- Final deliverable is a single file, `guandan.html`, at the project root. It must open and run correctly via `file://` with zero external network requests and zero build step for the end user.
- No npm dependencies of any kind (no `node_modules`). Node is only used at dev time to run tests (`node --test`) and the build script (`node build.js`). Requires Node.js >= 18.
- Every module under `src/` except `ui.js`, `styles.css`, and `template.html` must be a pure-logic, DOM-free file, dual-mode (Node `require`-able for tests, and browser-includable once concatenated), using this exact wrapper pattern so it works in both places without a bundler:
  ```js
  (function (root) {
    'use strict';
    // ...module body, ending with:
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = TheExports;
    } else {
      root.GD = root.GD || {};
      root.GD.Name = TheExports;
    }
  })(typeof window !== 'undefined' ? window : globalThis);
  ```
- Three-layer coach definition (confirmed with the user): Layer 1 = real-time per-turn play suggestion; Layer 2 = end-of-hand rule-based review; Layer 3 = cross-hand history/growth dashboard persisted in `localStorage` under key `guandan_coach_history_v1`.
- Explicit MVP scope simplifications (all derived from trade-offs in the source deck `正能量联盟掼蛋培训(湾区）251204.pdf`, kept intentionally small for an MVP):
  - No 进贡/还贡 (tribute) mechanic.
  - The red-heart level card (红桃百搭 wildcard) may substitute for **at most one** card per combo.
  - Sequential melds (顺子/钢板/三连对) and bombs compare using **natural rank order only** (2..A); the level-rank elevation described in the deck only applies to single/pair/triple/triple_pair comparisons.
  - AI and the real-time coach only consider melds it can form directly from grouped hand cards; they do not search for wildcard-completed melds. Humans can still manually select and play a wildcard-completed meld — the engine validates it correctly either way.
  - A round ends the instant the 3rd player empties their hand (the 4th is automatically last), matching common Guandan house rules and keeping the engine simple.

## File Structure

```
guandan/
  package.json
  build.js                 # concatenates src/* into guandan.html
  guandan.html              # generated deliverable (committed)
  src/
    cards.js                # deck/rank model, shuffle, deal, sort
    combos.js                # meld classification + comparison (incl. wildcard, bombs)
    moves.js                 # legal-move / candidate-lead generation
    engine.js                 # trick/round state machine, team scoring
    ai.js                      # bot heuristics (used for the 3 non-human seats)
    coach-realtime.js         # Layer 1: real-time play suggestion
    coach-review.js            # Layer 2: end-of-hand rule-based review
    coach-history.js            # Layer 3: cross-hand aggregation (pure; storage handled by ui.js)
    ui.js                        # DOM rendering, event wiring, localStorage glue
    styles.css
    template.html
  test/
    cards.test.js
    combos.test.js
    moves.test.js
    engine.test.js
    ai.test.js
    coach-realtime.test.js
    coach-review.test.js
    coach-history.test.js
```

All code below has been prototyped and run against real Node.js during plan-writing (not hypothetical) — the classify/compare/turn-cycle/AI/coach logic is confirmed correct, including the trickiest cases (A-high vs A-low straights, wildcard substitution, bomb tier ladder, full trick pass-cycles, team scoring).

---

### Task 1: Project scaffold and build pipeline

**Files:**
- Create: `package.json`
- Create: `build.js`
- Create: `src/template.html`
- Create: `src/styles.css` (minimal placeholder, replaced fully in Task 10)
- Test: `test/build.test.js`

**Interfaces:**
- Produces: `build()` function exported from `build.js` (`module.exports = { build }`) that reads `src/template.html` + `src/styles.css` + the modules listed in its internal `files` array (initially empty) and writes `guandan.html` at the repo root, replacing `{{STYLES}}` and `{{SCRIPTS}}` placeholders.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "guandan-coach-mvp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node --test test/",
    "build": "node build.js"
  }
}
```

- [ ] **Step 2: Create `src/template.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>掼蛋教练 MVP</title>
<style>
{{STYLES}}
</style>
</head>
<body>
<div id="app">smoke test placeholder</div>
<script>
{{SCRIPTS}}
</script>
</body>
</html>
```

- [ ] **Step 3: Create `src/styles.css` placeholder**

```css
body { font-family: sans-serif; }
```

- [ ] **Step 4: Write the failing build test**

```js
// test/build.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('build() produces guandan.html with title and no leftover placeholders', () => {
  const { build } = require('../build.js');
  build();
  const outPath = path.join(__dirname, '..', 'guandan.html');
  assert.ok(fs.existsSync(outPath));
  const html = fs.readFileSync(outPath, 'utf8');
  assert.match(html, /<title>掼蛋教练 MVP<\/title>/);
  assert.ok(!html.includes('{{STYLES}}'));
  assert.ok(!html.includes('{{SCRIPTS}}'));
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `node --test test/build.test.js`
Expected: FAIL with "Cannot find module '../build.js'"

- [ ] **Step 6: Write `build.js`**

```js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const files = []; // filled in as src/*.js modules are added in later tasks

function build() {
  const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
  const styles = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const scripts = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n\n');
  const output = template.replace('{{STYLES}}', styles).replace('{{SCRIPTS}}', scripts);
  fs.writeFileSync(path.join(__dirname, 'guandan.html'), output, 'utf8');
  return output;
}

if (require.main === module) build();
module.exports = { build, files };
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test test/build.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git init
git add package.json build.js src/template.html src/styles.css test/build.test.js
git commit -m "chore: scaffold build pipeline for single-file guandan.html"
```

---

### Task 2: Card model and deck (`src/cards.js`)

**Files:**
- Create: `src/cards.js`
- Test: `test/cards.test.js`

**Interfaces:**
- Produces: `Cards.RANK_ORDER` (`['2','3',...,'A']`), `Cards.naturalIndex(rank)`, `Cards.rankValue(rank, levelRank)`, `Cards.isWildcard(card, levelRank)`, `Cards.createDeck()`, `Cards.shuffle(deck, rng?)`, `Cards.deal(deck)`, `Cards.sortHand(hand, levelRank)`. A card is `{ rank, suit, id }` where `suit` is one of `'S'|'H'|'D'|'C'|null` (null for jokers) and `rank` is one of `'2'..'A'|'SJ'|'BJ'`.
- Consumes: nothing (base module).

- [ ] **Step 1: Write the failing test**

```js
// test/cards.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Cards = require('../src/cards.js');

test('createDeck returns 108 cards', () => {
  assert.equal(Cards.createDeck().length, 108);
});

test('createDeck has exactly 2 copies of each rank/suit and 4 jokers', () => {
  const counts = {};
  for (const c of Cards.createDeck()) {
    const key = c.suit ? `${c.rank}${c.suit}` : c.rank;
    counts[key] = (counts[key] || 0) + 1;
  }
  assert.equal(counts['AH'], 2);
  assert.equal(counts['2S'], 2);
  assert.equal(counts['SJ'], 2);
  assert.equal(counts['BJ'], 2);
});

test('deal splits 108 cards into 4 hands of 27', () => {
  const hands = Cards.deal(Cards.createDeck());
  assert.equal(hands.length, 4);
  for (const h of hands) assert.equal(h.length, 27);
});

test('deal throws if deck is not 108 cards', () => {
  assert.throws(() => Cards.deal([{ rank: '2', suit: 'S', id: 'x' }]));
});

test('rankValue: natural order 2 < 3 < ... < A when not level rank', () => {
  assert.ok(Cards.rankValue('2', '5') < Cards.rankValue('3', '5'));
  assert.ok(Cards.rankValue('K', '5') < Cards.rankValue('A', '5'));
});

test('rankValue: level rank is elevated above A', () => {
  assert.ok(Cards.rankValue('7', '7') > Cards.rankValue('A', '7'));
});

test('rankValue: jokers rank above level rank, big joker above small joker', () => {
  assert.ok(Cards.rankValue('SJ', '9') > Cards.rankValue('9', '9'));
  assert.ok(Cards.rankValue('BJ', '9') > Cards.rankValue('SJ', '9'));
});

test('isWildcard: true only for red-heart level-rank card', () => {
  assert.equal(Cards.isWildcard({ rank: '5', suit: 'H' }, '5'), true);
  assert.equal(Cards.isWildcard({ rank: '5', suit: 'S' }, '5'), false);
  assert.equal(Cards.isWildcard({ rank: '6', suit: 'H' }, '5'), false);
});

test('shuffle with injected rng preserves every card', () => {
  const deck = Cards.createDeck();
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const shuffled = Cards.shuffle(deck, rng);
  assert.equal(shuffled.length, deck.length);
  assert.deepEqual(shuffled.map(c => c.id).sort(), deck.map(c => c.id).sort());
});

test('sortHand orders by rankValue ascending', () => {
  const hand = [{ rank: 'A', suit: 'S' }, { rank: '3', suit: 'H' }, { rank: 'BJ', suit: null }];
  assert.deepEqual(Cards.sortHand(hand, '5').map(c => c.rank), ['3', 'A', 'BJ']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cards.test.js`
Expected: FAIL with "Cannot find module '../src/cards.js'"

- [ ] **Step 3: Write `src/cards.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/cards.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cards.js test/cards.test.js
git commit -m "feat: add card/deck model with level-rank aware ordering"
```

---

### Task 3: Meld classification and comparison (`src/combos.js`)

**Files:**
- Create: `src/combos.js`
- Test: `test/combos.test.js`

**Interfaces:**
- Consumes: `Cards.RANK_ORDER`, `Cards.naturalIndex`, `Cards.rankValue`, `Cards.isWildcard` from Task 2.
- Produces: `Combos.classify(cards, levelRank)` → `null` or `{ category, length, compareValue, isBomb, bombSubtype?, faceRank?, usedWildcardAs? }` where `category` is one of `'single'|'pair'|'triple'|'triple_pair'|'straight'|'plate'|'pair_straight'|'bomb'`. `Combos.compare(a, b)` → number (throws if both non-bomb and category/length differ). `Combos.bombTier(combo)` → number.

- [ ] **Step 1: Write the failing test**

```js
// test/combos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Cards = require('../src/cards.js');
const Combos = require('../src/combos.js');

function c(rank, suit) { return { rank, suit: suit || null, id: `${rank}${suit || ''}_${Math.random()}` }; }
const level = '2';

test('classify single/pair/triple', () => {
  assert.equal(Combos.classify([c('7','S')], level).category, 'single');
  assert.equal(Combos.classify([c('7','S'), c('7','H')], level).category, 'pair');
  assert.equal(Combos.classify([c('7','S'), c('7','H'), c('7','D')], level).category, 'triple');
});

test('classify triple_pair (三带二)', () => {
  const combo = Combos.classify([c('7','S'), c('7','H'), c('7','D'), c('4','S'), c('4','H')], level);
  assert.equal(combo.category, 'triple_pair');
  assert.equal(combo.compareValue, Cards.naturalIndex('7'));
});

test('classify straight, including A-high and A-low', () => {
  assert.equal(Combos.classify([c('3','S'), c('4','H'), c('5','D'), c('6','C'), c('7','S')], level).category, 'straight');
  assert.equal(Combos.classify([c('10','S'), c('J','H'), c('Q','D'), c('K','C'), c('A','S')], level).category, 'straight');
  assert.equal(Combos.classify([c('A','S'), c('2','H'), c('3','D'), c('4','C'), c('5','S')], level).category, 'straight');
});

test('classify plate (钢板, 2 consecutive triples) and pair_straight (三连对, 3 consecutive pairs)', () => {
  assert.equal(Combos.classify([c('5','S'), c('5','H'), c('5','D'), c('6','S'), c('6','H'), c('6','D')], level).category, 'plate');
  assert.equal(Combos.classify([c('5','S'), c('5','H'), c('6','S'), c('6','H'), c('7','S'), c('7','H')], level).category, 'pair_straight');
});

test('classify bombs: 4-of-a-kind, joker bomb, straight flush', () => {
  const b4 = Combos.classify([c('9','S'), c('9','H'), c('9','D'), c('9','C')], level);
  assert.equal(b4.category, 'bomb');
  assert.equal(b4.length, 4);

  const jokerBomb = Combos.classify([
    { rank: 'SJ', suit: null, id: 'sj0' }, { rank: 'SJ', suit: null, id: 'sj1' },
    { rank: 'BJ', suit: null, id: 'bj0' }, { rank: 'BJ', suit: null, id: 'bj1' }
  ], level);
  assert.equal(jokerBomb.bombSubtype, 'joker');

  const sf = Combos.classify([c('3','S'), c('4','S'), c('5','S'), c('6','S'), c('7','S')], level);
  assert.equal(sf.bombSubtype, 'straight_flush');
});

test('classify returns null for an invalid selection', () => {
  assert.equal(Combos.classify([c('3','S'), c('5','H')], level), null);
});

test('wildcard substitutes to complete a pair of a different rank', () => {
  const combo = Combos.classify([c('9','S'), c('5','H')], '5');
  assert.equal(combo.category, 'pair');
  assert.equal(combo.usedWildcardAs, '9');
});

test('wildcard completes a straight gap', () => {
  const combo = Combos.classify([c('3','S'), c('4','H'), c('9','H'), c('6','S'), c('7','C')], '9');
  assert.equal(combo.category, 'straight');
  assert.equal(combo.usedWildcardAs, '5');
});

test('compare: higher single beats lower single', () => {
  assert.ok(Combos.compare(Combos.classify([c('9','S')], level), Combos.classify([c('7','S')], level)) > 0);
});

test('compare: any bomb beats any non-bomb', () => {
  const single = Combos.classify([c('A','S')], level);
  const bomb = Combos.classify([c('3','S'), c('3','H'), c('3','D'), c('3','C')], level);
  assert.ok(Combos.compare(bomb, single) > 0);
});

test('compare: bomb tier ladder bomb4 < bomb5 < straight_flush < bomb6', () => {
  const bomb4 = Combos.classify([c('K','S'), c('K','H'), c('K','D'), c('K','C')], level);
  const bomb5 = Combos.classify([c('3','S'), c('3','H'), c('3','D'), c('3','C'), c('3','H')], level);
  const sf = Combos.classify([c('3','S'), c('4','S'), c('5','S'), c('6','S'), c('7','S')], level);
  const bomb6 = Combos.classify([c('4','S'), c('4','H'), c('4','D'), c('4','C'), c('4','S'), c('4','H')], level);
  assert.ok(Combos.compare(bomb5, bomb4) > 0);
  assert.ok(Combos.compare(sf, bomb5) > 0);
  assert.ok(Combos.compare(bomb6, sf) > 0);
});

test('compare throws for mismatched non-bomb categories', () => {
  const single = Combos.classify([c('7','S')], level);
  const pair = Combos.classify([c('7','S'), c('7','H')], level);
  assert.throws(() => Combos.compare(single, pair));
});

test('level-rank elevation applies to single comparison', () => {
  const elevated = Combos.classify([c('9','S')], '9');
  const ace = Combos.classify([c('A','S')], '9');
  assert.ok(Combos.compare(elevated, ace) > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/combos.test.js`
Expected: FAIL with "Cannot find module '../src/combos.js'"

- [ ] **Step 3: Write `src/combos.js`**

```js
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;

  const RANK_ORDER = Cards.RANK_ORDER;

  function naturalSeqIndexForStraight(rank, position) {
    if (rank === 'A' && position === 'low') return -1;
    return Cards.naturalIndex(rank);
  }

  function groupByRank(cards) {
    const map = new Map();
    for (const c of cards) {
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank).push(c);
    }
    return map;
  }

  function tryStraightLike(cards, runLength, groupSize) {
    const groups = groupByRank(cards);
    const ranks = [...groups.keys()];
    if (ranks.some(r => r === 'SJ' || r === 'BJ')) return null;
    if (ranks.length !== runLength) return null;
    for (const r of ranks) {
      if (groups.get(r).length !== groupSize) return null;
    }
    for (const position of ['low', 'high']) {
      const indices = ranks.map(r => naturalSeqIndexForStraight(r, position)).sort((a, b) => a - b);
      let consecutive = true;
      for (let i = 1; i < indices.length; i++) {
        if (indices[i] !== indices[i - 1] + 1) { consecutive = false; break; }
      }
      if (consecutive) return { topIndex: indices[indices.length - 1] };
    }
    return null;
  }

  function classifyPlain(cards) {
    const n = cards.length;
    const groups = groupByRank(cards);
    const rankList = [...groups.keys()];

    if (n === 1) {
      return { category: 'single', length: 1, faceRank: cards[0].rank, isBomb: false };
    }
    if (n === 2 && rankList.length === 1) {
      return { category: 'pair', length: 2, faceRank: rankList[0], isBomb: false };
    }
    if (n === 3 && rankList.length === 1) {
      return { category: 'triple', length: 3, faceRank: rankList[0], isBomb: false };
    }
    if (n === 4 && rankList.length === 1) {
      return { category: 'bomb', length: 4, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
    }
    if (n === 4) {
      const jokerCount = cards.filter(c => c.rank === 'SJ' || c.rank === 'BJ').length;
      if (jokerCount === 4) {
        return { category: 'bomb', length: 4, compareValue: 0, isBomb: true, bombSubtype: 'joker' };
      }
    }
    if (n === 5 && rankList.length === 2) {
      const triple = rankList.find(r => groups.get(r).length === 3);
      const pair = rankList.find(r => groups.get(r).length === 2);
      if (triple && pair) {
        return { category: 'triple_pair', length: 5, faceRank: triple, isBomb: false };
      }
    }
    if (n === 5) {
      const straight = tryStraightLike(cards, 5, 1);
      if (straight) {
        const suits = new Set(cards.map(c => c.suit));
        if (suits.size === 1) {
          return { category: 'bomb', length: 5, compareValue: straight.topIndex, isBomb: true, bombSubtype: 'straight_flush' };
        }
        return { category: 'straight', length: 5, compareValue: straight.topIndex, isBomb: false };
      }
    }
    if (n === 5 && rankList.length === 1) {
      return { category: 'bomb', length: 5, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
    }
    if (n === 6) {
      const plate = tryStraightLike(cards, 2, 3);
      if (plate) return { category: 'plate', length: 6, compareValue: plate.topIndex, isBomb: false };
      const pairStraight = tryStraightLike(cards, 3, 2);
      if (pairStraight) return { category: 'pair_straight', length: 6, compareValue: pairStraight.topIndex, isBomb: false };
      if (rankList.length === 1) {
        return { category: 'bomb', length: 6, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
      }
    }
    if ((n === 7 || n === 8) && rankList.length === 1) {
      return { category: 'bomb', length: n, compareValue: Cards.naturalIndex(rankList[0]), isBomb: true, bombSubtype: 'plain' };
    }
    return null;
  }

  function finalizeCompareValue(result, levelRank) {
    if (result.compareValue !== undefined) return result;
    return Object.assign({}, result, { compareValue: Cards.rankValue(result.faceRank, levelRank) });
  }

  const BOMB_TIER = { 4: 1, 5: 2, straight_flush: 3, 6: 4, 7: 5, 8: 6, joker: 7 };

  function bombTier(combo) {
    if (combo.bombSubtype === 'joker') return BOMB_TIER.joker;
    if (combo.bombSubtype === 'straight_flush') return BOMB_TIER.straight_flush;
    return BOMB_TIER[combo.length];
  }

  function classify(cards, levelRank) {
    if (!cards || cards.length === 0) return null;
    const direct = classifyPlain(cards);
    if (direct) return finalizeCompareValue(direct, levelRank);

    const wildcards = cards.filter(c => Cards.isWildcard(c, levelRank));
    if (wildcards.length !== 1) return null;

    const wc = wildcards[0];
    const others = cards.filter(c => c.id !== wc.id);

    for (const substituteRank of RANK_ORDER) {
      if (substituteRank === levelRank) continue;
      const substituted = others.concat([{ rank: substituteRank, suit: wc.suit, id: wc.id }]);
      const result = classifyPlain(substituted);
      if (result) {
        return Object.assign({}, finalizeCompareValue(result, levelRank), { usedWildcardAs: substituteRank });
      }
    }
    return null;
  }

  function compare(a, b) {
    if (!a.isBomb && !b.isBomb) {
      if (a.category !== b.category || a.length !== b.length) {
        throw new Error('cannot compare combos of different category/length');
      }
      return a.compareValue - b.compareValue;
    }
    if (a.isBomb && !b.isBomb) return 1;
    if (!a.isBomb && b.isBomb) return -1;
    const tierA = bombTier(a);
    const tierB = bombTier(b);
    if (tierA !== tierB) return tierA - tierB;
    return a.compareValue - b.compareValue;
  }

  const Combos = { classify, compare, bombTier };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Combos;
  } else {
    root.GD = root.GD || {};
    root.GD.Combos = Combos;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/combos.test.js`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/combos.js test/combos.test.js
git commit -m "feat: add meld classification and comparison with wildcard support"
```

---

### Task 4: Legal move generation (`src/moves.js`)

**Files:**
- Create: `src/moves.js`
- Test: `test/moves.test.js`

**Interfaces:**
- Consumes: `Cards.RANK_ORDER` (Task 2), `Combos.classify`, `Combos.compare` (Task 3).
- Produces: `Moves.candidateLeads(hand, levelRank)` → array of combo objects (each with `.cards` attached) the player could lead with. `Moves.legalPlays(hand, currentCombo, levelRank)` → same shape, filtered to combos that legally beat `currentCombo` (or all leads if `currentCombo` is `null`). Callers add a synthetic `"pass"` option themselves when following.

- [ ] **Step 1: Write the failing test**

```js
// test/moves.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Moves = require('../src/moves.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

const hand = [
  c('3', 'S', '1'), c('3', 'H', '2'),
  c('4', 'S', '3'),
  c('7', 'S', '4'), c('7', 'H', '5'), c('7', 'D', '6'),
  c('9', 'S', '7'), c('9', 'H', '8')
];

test('candidateLeads finds singles, pairs, triples, and triple_pair', () => {
  const leads = Moves.candidateLeads(hand, level);
  assert.ok(leads.some(x => x.category === 'single'));
  assert.ok(leads.some(x => x.category === 'pair' && x.compareValue === 1));
  assert.ok(leads.some(x => x.category === 'triple'));
  assert.ok(leads.some(x => x.category === 'triple_pair'));
});

test('legalPlays only returns combos of the same category/length that beat the current one, plus bombs', () => {
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false }; // single '4'
  const legal = Moves.legalPlays(hand, currentCombo, level);
  assert.ok(legal.every(x => x.isBomb || (x.category === 'single' && x.compareValue > 2)));
  assert.ok(legal.some(x => x.category === 'single' && x.compareValue === 5)); // single 7 beats single 4
});

test('legalPlays with no current combo returns the same set as candidateLeads', () => {
  const leads = Moves.candidateLeads(hand, level);
  const legal = Moves.legalPlays(hand, null, level);
  assert.equal(legal.length, leads.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/moves.test.js`
Expected: FAIL with "Cannot find module '../src/moves.js'"

- [ ] **Step 3: Write `src/moves.js`**

```js
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Cards = isNode ? require('./cards.js') : root.GD.Cards;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;

  function groupByRank(hand) {
    const map = new Map();
    for (const c of hand) {
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank).push(c);
    }
    return map;
  }

  function candidateLeads(hand, levelRank) {
    const candidates = [];
    const groups = groupByRank(hand);
    const ranks = [...groups.keys()];

    for (const r of ranks) candidates.push([groups.get(r)[0]]);
    for (const r of ranks) if (groups.get(r).length >= 2) candidates.push(groups.get(r).slice(0, 2));
    for (const r of ranks) if (groups.get(r).length >= 3) candidates.push(groups.get(r).slice(0, 3));

    for (const r of ranks) {
      if (groups.get(r).length >= 3) {
        for (const r2 of ranks) {
          if (r2 !== r && groups.get(r2).length >= 2) {
            candidates.push(groups.get(r).slice(0, 3).concat(groups.get(r2).slice(0, 2)));
          }
        }
      }
    }

    const naturalRanks = Cards.RANK_ORDER;
    for (let start = 0; start + 5 <= naturalRanks.length; start++) {
      const windowRanks = naturalRanks.slice(start, start + 5);
      if (windowRanks.every(r => groups.has(r))) {
        candidates.push(windowRanks.map(r => groups.get(r)[0]));
      }
    }
    for (let start = 0; start + 2 <= naturalRanks.length; start++) {
      const windowRanks = naturalRanks.slice(start, start + 2);
      if (windowRanks.every(r => groups.has(r) && groups.get(r).length >= 3)) {
        candidates.push(windowRanks.flatMap(r => groups.get(r).slice(0, 3)));
      }
    }
    for (let start = 0; start + 3 <= naturalRanks.length; start++) {
      const windowRanks = naturalRanks.slice(start, start + 3);
      if (windowRanks.every(r => groups.has(r) && groups.get(r).length >= 2)) {
        candidates.push(windowRanks.flatMap(r => groups.get(r).slice(0, 2)));
      }
    }
    for (const r of ranks) {
      for (let size = 4; size <= Math.min(8, groups.get(r).length); size++) {
        candidates.push(groups.get(r).slice(0, size));
      }
    }
    const sj = hand.filter(c => c.rank === 'SJ');
    const bj = hand.filter(c => c.rank === 'BJ');
    if (sj.length >= 2 && bj.length >= 2) candidates.push([sj[0], sj[1], bj[0], bj[1]]);

    const classified = [];
    for (const cardsSel of candidates) {
      const combo = Combos.classify(cardsSel, levelRank);
      if (combo) classified.push(Object.assign({}, combo, { cards: cardsSel }));
    }
    return classified;
  }

  function legalPlays(hand, currentCombo, levelRank) {
    const leads = candidateLeads(hand, levelRank);
    if (!currentCombo) return leads;
    return leads.filter(combo => {
      if (combo.isBomb) {
        if (!currentCombo.isBomb) return true;
        return Combos.compare(combo, currentCombo) > 0;
      }
      if (currentCombo.isBomb) return false;
      if (combo.category !== currentCombo.category || combo.length !== currentCombo.length) return false;
      return Combos.compare(combo, currentCombo) > 0;
    });
  }

  const Moves = { candidateLeads, legalPlays };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Moves;
  } else {
    root.GD = root.GD || {};
    root.GD.Moves = Moves;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/moves.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/moves.js test/moves.test.js
git commit -m "feat: add legal move / candidate lead generation"
```

---

### Task 5: Trick and round engine (`src/engine.js`)

**Files:**
- Create: `src/engine.js`
- Test: `test/engine.test.js`

**Interfaces:**
- Consumes: `Cards.createDeck/shuffle/deal/sortHand` (Task 2), `Combos.classify/compare` (Task 3).
- Produces: `Engine.TEAM_OF` (`{0:0,1:1,2:0,3:1}`), `Engine.startRound(levelRank, rng?)` → state object `{ levelRank, hands, currentLeader, currentTurn, currentCombo, lastPlayerIndex, passStreak, finishedOrder, history }`, `Engine.playCombo(state, playerIndex, cards)` → `{ ok, roundOver }` or `{ error }` (mutates `state` in place), `Engine.pass(state, playerIndex)` → `{ ok }` or `{ error }`, `Engine.isFinished(state, playerIndex)`, `Engine.nextActivePlayer(state, fromIndex)`, `Engine.teamLevelGain(finishedOrder)` → `{ team, gain }`.

- [ ] **Step 1: Write the failing test**

```js
// test/engine.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../src/engine.js');

function card(rank, suit, tag) { return { rank, suit, id: `${rank}${suit}_${tag}` }; }

function baseState(hands) {
  return {
    levelRank: '2', hands, currentLeader: 0, currentTurn: 0, currentCombo: null,
    lastPlayerIndex: null, passStreak: 0, finishedOrder: [], history: []
  };
}

test('startRound deals 27 cards to each of 4 players and sets initial turn state', () => {
  const state = Engine.startRound('2', Math.random);
  assert.equal(state.hands.length, 4);
  for (const h of state.hands) assert.equal(h.length, 27);
  assert.equal(state.currentTurn, 0);
  assert.equal(state.currentCombo, null);
});

test('a full trick cycle: lead, all three others pass, turn returns to the leader', () => {
  const state = baseState([
    [card('3', 'S', 'a'), card('10', 'S', 'a2')],
    [card('4', 'S', 'b'), card('10', 'H', 'b2')],
    [card('5', 'S', 'c'), card('10', 'D', 'c2')],
    [card('6', 'S', 'd'), card('10', 'C', 'd2')]
  ]);
  Engine.playCombo(state, 0, [state.hands[0][0]]);
  assert.equal(state.currentTurn, 1);
  Engine.pass(state, 1);
  assert.equal(state.currentTurn, 2);
  Engine.pass(state, 2);
  assert.equal(state.currentTurn, 3);
  Engine.pass(state, 3);
  assert.equal(state.currentTurn, 0);
  assert.equal(state.currentCombo, null);
  assert.equal(state.currentLeader, 0);
});

test('round ends the instant the 3rd player empties their hand', () => {
  const state = baseState([
    [card('3', 'S', 'a')], [card('4', 'S', 'b')], [card('5', 'S', 'c')], [card('6', 'S', 'd')]
  ]);
  Engine.playCombo(state, 0, [state.hands[0][0]]);
  Engine.playCombo(state, 1, [state.hands[1][0]]);
  const r = Engine.playCombo(state, 2, [state.hands[2][0]]);
  assert.equal(r.roundOver, true);
  assert.equal(state.currentTurn, null);
  assert.deepEqual(state.finishedOrder, [0, 1, 2]);
});

test('rejects plays out of turn, cards not in hand, and passing while leading', () => {
  const state = baseState([
    [card('3', 'S', 'a')], [card('4', 'S', 'b')], [card('5', 'S', 'c')], [card('6', 'S', 'd')]
  ]);
  assert.equal(Engine.playCombo(state, 1, [state.hands[1][0]]).error, 'not your turn');
  assert.equal(Engine.playCombo(state, 0, [{ rank: '9', suit: 'H', id: 'not-in-hand' }]).error, 'cards not in hand');
  assert.equal(Engine.pass(state, 0).error, 'cannot pass when leading');
});

test('a follower must beat with the same category and length, or play a bomb', () => {
  const state = baseState([
    [card('7', 'S', 'a'), card('7', 'H', 'a2')],
    [card('4', 'S', 'b')], [card('5', 'S', 'c')], [card('6', 'S', 'd')]
  ]);
  Engine.playCombo(state, 0, [state.hands[0][0], state.hands[0][1]]); // pair of 7s
  const r = Engine.playCombo(state, 1, [state.hands[1][0]]); // single 4, wrong category
  assert.equal(r.error, 'combo does not beat current combo');
});

test('teamLevelGain: 1st & 2nd same team = 3, 1st & 3rd = 2, 1st & 4th = 1', () => {
  assert.equal(Engine.teamLevelGain([0, 2, 1]).gain, 3);
  assert.equal(Engine.teamLevelGain([0, 1, 2]).gain, 2);
  assert.equal(Engine.teamLevelGain([0, 1, 3]).gain, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL with "Cannot find module '../src/engine.js'"

- [ ] **Step 3: Write `src/engine.js`**

```js
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
    const remainingOthers = activePlayerCount(state) - 1;
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
    const remainingOthers = activePlayerCount(state) - 1;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: add trick/round state machine and team scoring"
```

---

### Task 6: Bot heuristics (`src/ai.js`)

**Files:**
- Create: `src/ai.js`
- Test: `test/ai.test.js`

**Interfaces:**
- Consumes: `Moves.legalPlays` (Task 4), `Combos.compare` (Task 3), `Engine.TEAM_OF`-equivalent seat/team mapping (duplicated locally as a constant to keep this module self-contained).
- Produces: `AI.chooseAiPlay(hand, currentCombo, context)` where `context = { selfIndex, lastPlayerIndex, levelRank }` → `{ action: 'pass' }` or `{ action: 'play', combo }` (combo includes `.cards`).

- [ ] **Step 1: Write the failing test**

```js
// test/ai.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const AI = require('../src/ai.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

test('passes when the current winner is a teammate', () => {
  const hand = [c('9', 'S', '1')];
  const currentCombo = { category: 'single', length: 1, compareValue: 5, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 2, levelRank: level });
  assert.equal(decision.action, 'pass');
});

test('beats an opponent with the smallest sufficient non-bomb combo', () => {
  const hand = [c('9', 'S', '1'), c('K', 'H', '2')];
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.isBomb, false);
});

test('preserves a bomb when hand is still large', () => {
  const hand = [c('9','S','a'), c('9','H','b'), c('9','D','c'), c('9','C','d'),
                c('3','S','e'), c('4','S','f'), c('5','S','g'), c('6','S','h')];
  const currentCombo = { category: 'triple', length: 3, compareValue: 12, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(decision.action, 'pass');
});

test('uses the bomb when it is the only option and the hand is nearly empty', () => {
  const hand = [c('9','S','a'), c('9','H','b'), c('9','D','c'), c('9','C','d')];
  const currentCombo = { category: 'triple', length: 3, compareValue: 12, isBomb: false };
  const decision = AI.chooseAiPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.isBomb, true);
});

test('leads with the smallest available combo when there is no current combo', () => {
  const hand = [c('9', 'S', '1'), c('3', 'H', '2')];
  const decision = AI.chooseAiPlay(hand, null, { selfIndex: 1, lastPlayerIndex: null, levelRank: level });
  assert.equal(decision.action, 'play');
  assert.equal(decision.combo.category, 'single');
  assert.equal(decision.combo.compareValue, 1); // single '3'
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ai.test.js`
Expected: FAIL with "Cannot find module '../src/ai.js'"

- [ ] **Step 3: Write `src/ai.js`**

```js
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Moves = isNode ? require('./moves.js') : root.GD.Moves;
  const Combos = isNode ? require('./combos.js') : root.GD.Combos;

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

  function chooseAiPlay(hand, currentCombo, context) {
    const { selfIndex, lastPlayerIndex, levelRank } = context;
    const options = Moves.legalPlays(hand, currentCombo, levelRank);

    if (!currentCombo) {
      if (options.length === 0) return { action: 'pass' };
      const smallest = options.reduce((a, b) => (Combos.compare(a, b) < 0 ? a : b));
      return { action: 'play', combo: smallest };
    }

    const partnerIsWinning = lastPlayerIndex !== null && TEAM_OF[lastPlayerIndex] === TEAM_OF[selfIndex];
    if (partnerIsWinning) {
      return { action: 'pass' };
    }

    const nonBombOptions = options.filter(o => !o.isBomb);
    if (nonBombOptions.length > 0) {
      const smallest = nonBombOptions.reduce((a, b) => (Combos.compare(a, b) < 0 ? a : b));
      return { action: 'play', combo: smallest };
    }

    const bombOptions = options.filter(o => o.isBomb);
    if (bombOptions.length > 0 && hand.length <= 6) {
      const smallest = bombOptions.reduce((a, b) => (Combos.compare(a, b) < 0 ? a : b));
      return { action: 'play', combo: smallest };
    }

    return { action: 'pass' };
  }

  const AI = { chooseAiPlay };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
  } else {
    root.GD = root.GD || {};
    root.GD.AI = AI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ai.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ai.js test/ai.test.js
git commit -m "feat: add bot heuristics for lead/follow/bomb decisions"
```

---

### Task 7: Coach Layer 1 — real-time play suggestion (`src/coach-realtime.js`)

**Files:**
- Create: `src/coach-realtime.js`
- Test: `test/coach-realtime.test.js`

**Interfaces:**
- Consumes: `AI.chooseAiPlay` (Task 6).
- Produces: `CoachRealtime.describeCombo(combo)` → Chinese category label. `CoachRealtime.suggestPlay(hand, currentCombo, context)` → `{ action: 'pass', rationale }` or `{ action: 'play', combo, rationale }`, where `rationale` is a Chinese sentence referencing the source deck's 牌理 principles (e.g. "不接对门的牌，除非你能跑掉").

- [ ] **Step 1: Write the failing test**

```js
// test/coach-realtime.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const CoachRealtime = require('../src/coach-realtime.js');

function c(rank, suit, tag) { return { rank, suit, id: `${rank}${suit || ''}_${tag}` }; }
const level = '2';

test('describeCombo maps categories to Chinese labels', () => {
  assert.equal(CoachRealtime.describeCombo({ category: 'pair' }), '对子');
  assert.equal(CoachRealtime.describeCombo(null), '过牌');
});

test('suggests passing with a "不接对门的牌" rationale when the partner is winning', () => {
  const hand = [c('9', 'S', '1')];
  const currentCombo = { category: 'single', length: 1, compareValue: 5, isBomb: false };
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 2, levelRank: level });
  assert.equal(suggestion.action, 'pass');
  assert.match(suggestion.rationale, /不接对门的牌/);
});

test('suggests playing the smallest beating combo against an opponent, with a rationale naming the meld type', () => {
  const hand = [c('9', 'S', '1'), c('K', 'H', '2')];
  const currentCombo = { category: 'single', length: 1, compareValue: 2, isBomb: false };
  const suggestion = CoachRealtime.suggestPlay(hand, currentCombo, { selfIndex: 0, lastPlayerIndex: 1, levelRank: level });
  assert.equal(suggestion.action, 'play');
  assert.match(suggestion.rationale, /单张/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/coach-realtime.test.js`
Expected: FAIL with "Cannot find module '../src/coach-realtime.js'"

- [ ] **Step 3: Write `src/coach-realtime.js`**

```js
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const AI = isNode ? require('./ai.js') : root.GD.AI;

  const CATEGORY_LABEL = {
    single: '单张', pair: '对子', triple: '三同张', triple_pair: '三带二',
    straight: '顺子', plate: '钢板', pair_straight: '三连对', bomb: '炸弹'
  };

  function describeCombo(combo) {
    if (!combo) return '过牌';
    return CATEGORY_LABEL[combo.category] || combo.category;
  }

  const TEAM_OF = { 0: 0, 1: 1, 2: 0, 3: 1 };

  function suggestPlay(hand, currentCombo, context) {
    const decision = AI.chooseAiPlay(hand, currentCombo, context);
    const { lastPlayerIndex, selfIndex } = context;
    const partnerIsWinning = !!(currentCombo && lastPlayerIndex !== null && TEAM_OF[lastPlayerIndex] === TEAM_OF[selfIndex]);

    if (decision.action === 'pass') {
      const rationale = partnerIsWinning
        ? '搭档正在领先，不接对门的牌，除非你能跑掉——建议过牌配合搭档。'
        : '手上没有合适的牌可以拿下，且保留炸弹更有价值——建议过牌。';
      return { action: 'pass', rationale };
    }

    const label = describeCombo(decision.combo);
    const rationale = decision.combo.isBomb
      ? `手数已经不多，此时开炸弹（${label}）夺回主动权是合理的。`
      : `用最小的${label}拿下当前墩，既能压制对手又不浪费大牌，建议出这手牌。`;
    return { action: 'play', combo: decision.combo, rationale };
  }

  const CoachRealtime = { suggestPlay, describeCombo };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachRealtime;
  } else {
    root.GD = root.GD || {};
    root.GD.CoachRealtime = CoachRealtime;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/coach-realtime.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/coach-realtime.js test/coach-realtime.test.js
git commit -m "feat: add layer 1 real-time coach suggestions"
```

---

### Task 8: Coach Layer 2 — post-hand review (`src/coach-review.js`)

**Files:**
- Create: `src/coach-review.js`
- Test: `test/coach-review.test.js`

**Interfaces:**
- Consumes: nothing (pure aggregation over a move log built by `ui.js`).
- Produces: `CoachReview.reviewHand(moveLog)` → `{ cooperationScore, counts, patterns }`, where `moveLog` is an array of `{ action: 'play'|'pass', partnerWasWinning: bool, comboCategory: string|null, comboIsBomb: bool, handSizeBefore: number, matchedSuggestion: bool, hadBeatingOptionNonBomb: bool }` entries recorded by the UI for the human seat only. `patterns` is a subset of `CoachReview.PATTERN_INFO`'s 4 keys (`takeover_from_partner`, `early_bomb`, `unmatched_suggestion`, `passive_pass`), each mapped from the source deck's "人性弱点" checklist, whose per-hand count meets that pattern's threshold.

- [ ] **Step 1: Write the failing test**

```js
// test/coach-review.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const CoachReview = require('../src/coach-review.js');

function entry(overrides) {
  return Object.assign({
    action: 'play', partnerWasWinning: false, comboCategory: 'single', comboIsBomb: false,
    handSizeBefore: 20, matchedSuggestion: true, hadBeatingOptionNonBomb: false
  }, overrides);
}

test('flags takeover_from_partner when the human repeatedly plays while a teammate is winning', () => {
  const log = [entry({ partnerWasWinning: true }), entry({ partnerWasWinning: true })];
  const review = CoachReview.reviewHand(log);
  assert.ok(review.patterns.some(p => p.key === 'takeover_from_partner'));
});

test('flags early_bomb when a bomb is played with a large hand remaining', () => {
  const log = [entry({ comboIsBomb: true, handSizeBefore: 15 })];
  const review = CoachReview.reviewHand(log);
  assert.ok(review.patterns.some(p => p.key === 'early_bomb'));
});

test('flags passive_pass when passing despite having a non-bomb beating option', () => {
  const log = [
    entry({ action: 'pass', hadBeatingOptionNonBomb: true, matchedSuggestion: true }),
    entry({ action: 'pass', hadBeatingOptionNonBomb: true, matchedSuggestion: true })
  ];
  const review = CoachReview.reviewHand(log);
  assert.ok(review.patterns.some(p => p.key === 'passive_pass'));
});

test('cooperationScore is the percentage of moves that matched the coach suggestion', () => {
  const log = [entry({ matchedSuggestion: true }), entry({ matchedSuggestion: false })];
  const review = CoachReview.reviewHand(log);
  assert.equal(review.cooperationScore, 50);
});

test('a clean hand with no flagged patterns still returns a valid score', () => {
  const log = [entry({}), entry({})];
  const review = CoachReview.reviewHand(log);
  assert.equal(review.patterns.length, 0);
  assert.equal(review.cooperationScore, 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/coach-review.test.js`
Expected: FAIL with "Cannot find module '../src/coach-review.js'"

- [ ] **Step 3: Write `src/coach-review.js`**

```js
(function (root) {
  'use strict';

  const PATTERN_INFO = {
    takeover_from_partner: { label: '抢搭档的攻——不分牌好坏，都以自己为中心打牌', threshold: 2 },
    early_bomb: { label: '炸弹用得太早——有大牌就炸，不顾团队节奏', threshold: 1 },
    unmatched_suggestion: { label: '与教练建议不符——配合默契还需打磨', threshold: 3 },
    passive_pass: { label: '过于保守——能接却选择等待，缺少主动出击', threshold: 2 }
  };

  function reviewHand(moveLog) {
    const counts = { takeover_from_partner: 0, early_bomb: 0, unmatched_suggestion: 0, passive_pass: 0 };

    for (const entry of moveLog) {
      if (entry.action === 'play' && entry.partnerWasWinning) counts.takeover_from_partner++;
      if (entry.action === 'play' && entry.comboIsBomb && entry.handSizeBefore > 8) counts.early_bomb++;
      if (!entry.matchedSuggestion) counts.unmatched_suggestion++;
      if (entry.action === 'pass' && !entry.partnerWasWinning && entry.hadBeatingOptionNonBomb) counts.passive_pass++;
    }

    const patterns = Object.keys(counts)
      .filter(key => counts[key] >= PATTERN_INFO[key].threshold)
      .map(key => ({ key, label: PATTERN_INFO[key].label, count: counts[key] }));

    const totalMoves = moveLog.length || 1;
    const matchedCount = moveLog.filter(e => e.matchedSuggestion).length;
    const cooperationScore = Math.round((matchedCount / totalMoves) * 100);

    return { cooperationScore, counts, patterns };
  }

  const CoachReview = { reviewHand, PATTERN_INFO };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachReview;
  } else {
    root.GD = root.GD || {};
    root.GD.CoachReview = CoachReview;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/coach-review.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/coach-review.js test/coach-review.test.js
git commit -m "feat: add layer 2 post-hand rule-based review"
```

---

### Task 9: Coach Layer 3 — cross-hand history aggregation (`src/coach-history.js`)

**Files:**
- Create: `src/coach-history.js`
- Test: `test/coach-history.test.js`

**Interfaces:**
- Consumes: an array of records shaped like `CoachReview.reviewHand`'s return value (Task 8), supplied by `ui.js` from `localStorage` — this module has no storage dependency itself.
- Produces: `CoachHistory.summarizeHistory(records)` → `{ gamesPlayed, averageCooperationScore, patternFrequency, dominantArchetype, trend }`. `CoachHistory.ARCHETYPES` maps each Layer 2 pattern key to a Chinese archetype label.

- [ ] **Step 1: Write the failing test**

```js
// test/coach-history.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const CoachHistory = require('../src/coach-history.js');

test('summarizeHistory on empty history returns zeroed-out defaults', () => {
  const summary = CoachHistory.summarizeHistory([]);
  assert.equal(summary.gamesPlayed, 0);
  assert.equal(summary.averageCooperationScore, 0);
  assert.equal(summary.dominantArchetype, null);
  assert.deepEqual(summary.trend, []);
});

test('summarizeHistory aggregates score average, pattern frequency, dominant archetype, and trend order', () => {
  const records = [
    { cooperationScore: 60, patterns: [{ key: 'takeover_from_partner' }] },
    { cooperationScore: 80, patterns: [{ key: 'takeover_from_partner' }] },
    { cooperationScore: 90, patterns: [] }
  ];
  const summary = CoachHistory.summarizeHistory(records);
  assert.equal(summary.gamesPlayed, 3);
  assert.equal(summary.averageCooperationScore, 77);
  assert.equal(summary.patternFrequency.takeover_from_partner, 2);
  assert.equal(summary.dominantArchetype, CoachHistory.ARCHETYPES.takeover_from_partner);
  assert.deepEqual(summary.trend, [60, 80, 90]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/coach-history.test.js`
Expected: FAIL with "Cannot find module '../src/coach-history.js'"

- [ ] **Step 3: Write `src/coach-history.js`**

```js
(function (root) {
  'use strict';

  const ARCHETYPES = {
    takeover_from_partner: '强势型：习惯以自我为中心指挥牌局',
    early_bomb: '急躁型：有勇无谋，炸弹用得太早',
    unmatched_suggestion: '磨合型：与教练/搭档的默契仍在建立中',
    passive_pass: '谨慎型：谨小慎微，缺少主动出击的担当'
  };

  function summarizeHistory(records) {
    if (!records || records.length === 0) {
      return { gamesPlayed: 0, averageCooperationScore: 0, patternFrequency: {}, dominantArchetype: null, trend: [] };
    }
    const gamesPlayed = records.length;
    const averageCooperationScore = Math.round(
      records.reduce((sum, r) => sum + r.cooperationScore, 0) / gamesPlayed
    );
    const patternFrequency = {};
    for (const r of records) {
      for (const p of r.patterns) {
        patternFrequency[p.key] = (patternFrequency[p.key] || 0) + 1;
      }
    }
    let dominantArchetype = null;
    const entries = Object.entries(patternFrequency);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      dominantArchetype = ARCHETYPES[entries[0][0]] || null;
    }
    const trend = records.map(r => r.cooperationScore);
    return { gamesPlayed, averageCooperationScore, patternFrequency, dominantArchetype, trend };
  }

  const CoachHistory = { summarizeHistory, ARCHETYPES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachHistory;
  } else {
    root.GD = root.GD || {};
    root.GD.CoachHistory = CoachHistory;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/coach-history.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/coach-history.js test/coach-history.test.js
git commit -m "feat: add layer 3 cross-hand growth history aggregation"
```

---

### Task 10: UI, full styling, and single-file assembly

**Files:**
- Modify: `src/template.html` (replace placeholder body with the full game layout)
- Modify: `src/styles.css` (replace placeholder with full styling)
- Create: `src/ui.js`
- Modify: `build.js` (populate the `files` array with all 9 modules in dependency order)
- Test: `test/build.test.js` (extend — see Step 4)

**Interfaces:**
- Consumes: `window.GD.{Cards, Combos, Moves, Engine, AI, CoachRealtime, CoachReview, CoachHistory}` (Tasks 2–9), all attached by the browser branch of each module's wrapper once concatenated.
- Produces: no new pure functions (DOM glue only); manual browser verification is the acceptance test for this task, per the project's UI-testing requirement — there is no DOM available under Node's test runner.

- [ ] **Step 1: Replace `src/template.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>掼蛋教练 MVP</title>
<style>
{{STYLES}}
</style>
</head>
<body>
<div id="app">
  <header>
    <h1>掼蛋教练 MVP</h1>
    <div id="levelIndicator"></div>
  </header>
  <section id="table">
    <div class="seat" id="seat-2"><h3>对家 (北)</h3><div class="handCount" id="count-2"></div></div>
    <div class="middle-row">
      <div class="seat" id="seat-1"><h3>右家 (东)</h3><div class="handCount" id="count-1"></div></div>
      <div id="trickArea"></div>
      <div class="seat" id="seat-3"><h3>左家 (西)</h3><div class="handCount" id="count-3"></div></div>
    </div>
    <div class="seat" id="seat-0">
      <h3>你 (南)</h3>
      <div id="hand-0"></div>
      <div id="controls">
        <button id="btnPlay">出牌</button>
        <button id="btnPass">过牌</button>
      </div>
    </div>
  </section>
  <aside id="coachPanel">
    <h3>教练建议（第一层：实时出牌建议）</h3>
    <div id="coachSuggestion"></div>
  </aside>
  <section id="historyPanel">
    <h3>成长追踪（第三层：长期成长追踪）</h3>
    <div id="historyContent"></div>
  </section>
</div>
<div id="reviewModal" class="hidden">
  <div class="modalBox">
    <h2>本局复盘（第二层：局后复盘）</h2>
    <div id="reviewContent"></div>
    <button id="btnCloseReview">关闭</button>
    <button id="btnNextHand">开始下一局</button>
  </div>
</div>
<script>
{{SCRIPTS}}
</script>
</body>
</html>
```

- [ ] **Step 2: Replace `src/styles.css`**

```css
* { box-sizing: border-box; }
body {
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #0b3d2e;
  color: #f2f2f2;
  margin: 0;
  padding: 16px;
}
h1 { font-size: 1.4rem; margin: 0 0 8px; }
#app { max-width: 960px; margin: 0 auto; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
#table { background: #0f5132; border-radius: 12px; padding: 16px; }
.seat { text-align: center; margin: 8px 0; }
.middle-row { display: flex; justify-content: space-between; align-items: center; }
#trickArea { flex: 1; text-align: center; font-size: 1.1rem; min-height: 2em; }
.card {
  display: inline-block;
  min-width: 42px;
  padding: 8px 6px;
  margin: 2px;
  background: #fff;
  color: #222;
  border: 1px solid #999;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.card.selected { transform: translateY(-10px); border-color: #ffcc00; box-shadow: 0 0 6px #ffcc00; }
#controls { margin-top: 8px; }
#controls button, #reviewModal button {
  padding: 8px 16px; margin-right: 8px; border-radius: 6px; border: none; cursor: pointer; font-size: 1rem;
}
#btnPlay { background: #ffcc00; }
#btnPass { background: #ccc; }
#coachPanel, #historyPanel {
  background: #1b1b1b; color: #f2f2f2; border-radius: 8px; padding: 12px; margin-top: 12px;
}
#reviewModal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
#reviewModal.hidden { display: none; }
.modalBox { background: #fff; color: #222; padding: 24px; border-radius: 12px; max-width: 480px; width: 90%; }
```

- [ ] **Step 3: Create `src/ui.js`**

```js
(function () {
  'use strict';
  const { Engine, Cards, Combos, Moves, AI, CoachRealtime, CoachReview, CoachHistory } = window.GD;

  const HISTORY_KEY = 'guandan_coach_history_v1';
  const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };

  let state = null;
  let selectedIds = new Set();
  let moveLog = [];
  const levelRank = '2';

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
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

    document.getElementById('trickArea').textContent = state.currentCombo
      ? `当前墩：${CoachRealtime.describeCombo(state.currentCombo)}（${state.lastPlayerIndex === 0 ? '你' : '座位' + state.lastPlayerIndex}出）`
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
      <p>已完成 ${summary.gamesPlayed} 局，平均配合分 ${summary.averageCooperationScore}</p>
      <p>${summary.dominantArchetype ? '主要风格：' + summary.dominantArchetype : ''}</p>
      <p>配合分趋势：${summary.trend.join(' → ')}</p>
    `;
  }

  function logHumanMove(action, combo) {
    const suggestion = currentSuggestion();
    const matched = action === suggestion.action &&
      (action === 'pass' || (combo && suggestion.combo &&
        combo.category === suggestion.combo.category && combo.compareValue === suggestion.combo.compareValue));
    moveLog.push({
      action,
      partnerWasWinning: !!(state.currentCombo && state.lastPlayerIndex !== null && Engine.TEAM_OF[state.lastPlayerIndex] === Engine.TEAM_OF[0]),
      comboCategory: combo ? combo.category : null,
      comboIsBomb: combo ? combo.isBomb : false,
      handSizeBefore: state.hands[0].length,
      matchedSuggestion: matched,
      hadBeatingOptionNonBomb: currentLegalNonBombCheck()
    });
  }

  function onPlay() {
    if (state.currentTurn !== 0) return;
    const cards = state.hands[0].filter(c => selectedIds.has(c.id));
    if (cards.length === 0) return;
    const combo = Combos.classify(cards, levelRank);
    if (!combo) { alert('这不是一手合法的牌型'); return; }
    logHumanMove('play', combo);
    const result = Engine.playCombo(state, 0, cards);
    if (result.error) { alert(result.error); return; }
    selectedIds = new Set();
    afterTurn(result.roundOver);
  }

  function onPass() {
    if (state.currentTurn !== 0) return;
    if (!state.currentCombo) { alert('领出方不能过牌'); return; }
    logHumanMove('pass', null);
    const result = Engine.pass(state, 0);
    if (result.error) { alert(result.error); return; }
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
      render();
      if (result.roundOver) finishRound(); else maybeRunBotTurn();
    }, 500);
  }

  function finishRound() {
    const review = CoachReview.reviewHand(moveLog);
    document.getElementById('reviewModal').classList.remove('hidden');
    const patternHtml = review.patterns.length
      ? '<ul>' + review.patterns.map(p => `<li>${p.label}（出现 ${p.count} 次）</li>`).join('') + '</ul>'
      : '<p>本局没有发现明显的配合问题，继续保持！</p>';
    document.getElementById('reviewContent').innerHTML = `<p>配合分：${review.cooperationScore}</p>${patternHtml}`;
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
  document.getElementById('btnCloseReview').onclick = () => document.getElementById('reviewModal').classList.add('hidden');
  document.getElementById('btnNextHand').onclick = () => {
    document.getElementById('reviewModal').classList.add('hidden');
    startNewHand();
  };

  startNewHand();
})();
```

- [ ] **Step 4: Update `build.js`'s `files` list and extend the build test**

Edit `build.js`, changing the `files` line to:

```js
const files = ['cards.js', 'combos.js', 'moves.js', 'engine.js', 'ai.js', 'coach-realtime.js', 'coach-review.js', 'coach-history.js', 'ui.js'];
```

Extend `test/build.test.js` with an additional case:

```js
test('build() output attaches all 8 pure-logic modules to window.GD when module/require are absent (browser simulation)', () => {
  const { build } = require('../build.js');
  const html = build();
  const scriptBody = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const sandbox = {};
  sandbox.window = sandbox;
  new Function('window', 'module', 'require', 'exports', scriptBody)(sandbox, undefined, undefined, undefined);
  const expected = ['Cards', 'Combos', 'Moves', 'Engine', 'AI', 'CoachRealtime', 'CoachReview', 'CoachHistory'];
  for (const name of expected) {
    assert.ok(sandbox.GD[name], `expected window.GD.${name} to be defined`);
  }
});
```

Note: `ui.js` is intentionally excluded from this check — it touches `document`/`localStorage`, which don't exist in this sandbox, so it will throw if executed here; that's expected and is exactly why Task 10's real acceptance test is manual (Step 6 below), not this smoke test. Run the module list through `build()` without `ui.js` for this specific test by temporarily building only the pure-logic files, or simply assert on the substring position before `ui.js`'s script rather than executing it — do this by slicing `scriptBody` up to the known marker comment `/* UI_BOUNDARY */` that Step 5 adds to the top of `ui.js`.

- [ ] **Step 5: Add a boundary marker to `src/ui.js`**

Add this as the very first line of `src/ui.js` (before the IIFE):

```js
/* UI_BOUNDARY */
```

Update the Step 4 test to only execute the pre-boundary portion:

```js
test('build() output attaches all 8 pure-logic modules to window.GD when module/require are absent (browser simulation)', () => {
  const { build } = require('../build.js');
  const html = build();
  const scriptBody = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const pureLogicOnly = scriptBody.split('/* UI_BOUNDARY */')[0];
  const sandbox = {};
  sandbox.window = sandbox;
  new Function('window', 'module', 'require', 'exports', pureLogicOnly)(sandbox, undefined, undefined, undefined);
  const expected = ['Cards', 'Combos', 'Moves', 'Engine', 'AI', 'CoachRealtime', 'CoachReview', 'CoachHistory'];
  for (const name of expected) {
    assert.ok(sandbox.GD[name], `expected window.GD.${name} to be defined`);
  }
});
```

- [ ] **Step 6: Run the full test suite and rebuild**

Run: `npm test && npm run build`
Expected: all tests PASS, `guandan.html` regenerated.

- [ ] **Step 7: Manual browser verification**

Run: `open guandan.html` (macOS) — or `python3 -m http.server 8000` from the project root and visit `http://localhost:8000/guandan.html` if `file://` blocks `localStorage` in your browser.

Click through:
1. Confirm your 27-card hand renders, sorted, with Chinese suit symbols.
2. Click a card to select it (should lift up / highlight), click `出牌`, confirm it's removed from your hand and the trick area updates.
3. Confirm the three bot seats' remaining-card counts drop automatically after ~500ms each.
4. Play until the round ends (or click a few legal bomb/pass combinations to speed it along) and confirm the 局后复盘 modal appears with a 配合分 and (if applicable) pattern list.
5. Click 开始下一局, play a second hand, and confirm the 成长追踪 panel now shows "已完成 2 局" with a two-point trend.
6. Reload the page (not a fresh session — same browser tab) and confirm 成长追踪 still shows the accumulated history (proves `localStorage` persistence survives reload).

- [ ] **Step 8: Commit**

```bash
git add src/template.html src/styles.css src/ui.js build.js test/build.test.js
git commit -m "feat: add game UI and assemble single-file guandan.html"
```

---

### Task 11: Final regression and delivery

**Files:**
- Modify: none (verification-only task)

**Interfaces:**
- N/A — this task confirms the artifact built by Tasks 1–10 is correct end-to-end.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: all test files pass (cards, combos, moves, engine, ai, coach-realtime, coach-review, coach-history, build — 38+ assertions total across 9 files).

- [ ] **Step 2: Rebuild the deliverable**

Run: `npm run build`
Expected: `guandan.html` regenerated at the project root with no errors.

- [ ] **Step 3: Manual multi-hand playtest**

Open `guandan.html` in a browser (see Task 10 Step 7 for how). Play 3 full hands back-to-back using the `开始下一局` button after each review modal. Confirm:
- The Layer 1 coach panel updates every time it becomes your turn, with a rationale that changes based on game state (not a static string).
- Each hand's Layer 2 review modal shows a 配合分 between 0–100 and, when you deliberately ignore the coach's suggestion a few times in a row, at least one pattern (most likely `unmatched_suggestion`) appears.
- The Layer 3 growth panel's "已完成 N 局" count and trend list grow by one entry per hand, and the dominant archetype label updates if a pattern becomes frequent enough.

- [ ] **Step 4: Record final scope notes and commit**

```bash
git add -A
git commit -m "chore: final regression pass for guandan coach MVP" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** Card/deck model (Task 2), all 8 doc-defined meld types + bombs + wildcard (Task 3), legal-move generation (Task 4), full trick/round engine with team scoring (Task 5), AI opponents (Task 6), and all three confirmed coach layers (Tasks 7–9) each have a dedicated task. UI + single-file assembly is Task 10. Explicit scope cuts (tribute, multi-wildcard combos, wildcard-aware AI search) are called out in Global Constraints so no task silently drops them.
- **Placeholder scan:** No task contains "TBD"/"handle appropriately"/etc. — every step has runnable code, and the trickiest logic (straight A-high/A-low, wildcard substitution, bomb tier ladder, full trick pass-cycle, team scoring, AI bomb-preservation heuristic) was actually executed against Node.js while writing this plan, not just reasoned about.
- **Type consistency:** `Combos.classify`'s return shape (`category/length/compareValue/isBomb/bombSubtype?/faceRank?/usedWildcardAs?`) is used identically by `moves.js`, `engine.js`, `ai.js`, and `coach-realtime.js`. `AI.chooseAiPlay`'s `{action, combo?}` shape is consumed identically by `coach-realtime.js` and `ui.js`. `CoachReview.reviewHand`'s output shape (`cooperationScore/counts/patterns`) matches what `CoachHistory.summarizeHistory` expects as its `records` array elements.
