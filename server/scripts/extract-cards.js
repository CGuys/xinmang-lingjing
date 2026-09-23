const fs = require('fs');
const path = require('path');

const jsPath = path.resolve(__dirname, '../../assets/tarot/cards-data.js');
const raw = fs.readFileSync(jsPath, 'utf8');

// window.TAROT_DECK = { ... };
const sandbox = {};
const vm = require('vm');
vm.runInNewContext(raw, { window: sandbox });

const deck = sandbox.TAROT_DECK;
if (!deck || !deck.cards) {
  console.error('Failed to extract deck cards');
  process.exit(1);
}

const outPath = path.resolve(__dirname, '../src/data/cards.json');
fs.writeFileSync(outPath, JSON.stringify(deck, null, 2), 'utf8');
console.log(`Successfully extracted ${deck.cards.length} cards to ${outPath}`);
