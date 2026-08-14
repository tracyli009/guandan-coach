const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const files = ['knowledge.js', 'cards.js', 'hand-organizer.js', 'hand-optimizer.js', 'combos.js', 'moves.js', 'engine.js', 'ai.js', 'coach-realtime.js', 'coach-review.js', 'coach-history.js', 'ui.js'];

function build() {
  const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
  const styles = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const scripts = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n\n');
  const output = template.replace('{{STYLES}}', () => styles).replace('{{SCRIPTS}}', () => scripts);
  fs.writeFileSync(path.join(__dirname, 'guandan.html'), output, 'utf8');
  return output;
}

if (require.main === module) build();
module.exports = { build, files };
