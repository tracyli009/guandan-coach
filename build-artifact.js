// One-off helper (not part of the tested project pipeline) that assembles
// an Artifact-publishable variant: same styles/scripts as build.js, but
// without the outer <!DOCTYPE>/<html>/<head>/<body> wrapper tags, since the
// Artifact host supplies its own document skeleton.
const fs = require('fs');
const path = require('path');
const { files } = require('./build.js');

const SRC = path.join(__dirname, 'src');
const styles = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
const scripts = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n\n');

const output = `<title>掼蛋教练 MVP</title>
<style>
${styles}
</style>
<div id="app">
  <header>
    <h1>掼蛋教练 MVP</h1>
    <div id="levelIndicator"></div>
  </header>
  <section id="table">
    <div class="seat" id="seat-2">
      <h3>对家 (北)</h3>
      <div class="handCount" id="count-2"></div>
      <div class="playedCards" id="played-2"></div>
    </div>
    <div class="middle-row">
      <div class="seat" id="seat-1">
        <h3>右家 (东)</h3>
        <div class="handCount" id="count-1"></div>
        <div class="playedCards" id="played-1"></div>
      </div>
      <div id="trickArea"></div>
      <div class="seat" id="seat-3">
        <h3>左家 (西)</h3>
        <div class="handCount" id="count-3"></div>
        <div class="playedCards" id="played-3"></div>
      </div>
    </div>
    <div class="seat" id="seat-0">
      <h3>你 (南)</h3>
      <div class="playedCards" id="played-0"></div>
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
${scripts}
</script>
`;

fs.writeFileSync(path.join(__dirname, 'guandan-artifact.html'), output, 'utf8');
console.log('Wrote guandan-artifact.html (' + output.length + ' bytes)');
