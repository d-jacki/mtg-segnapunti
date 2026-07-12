// Test zero-dipendenze: estrae lo script da index.html e lo esegue in sandbox vm.
// Include un mini-DOM finto per testare anche il layer UI (fogli modali).
// Uso: node tests/run-tests.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) { console.error('Script non trovato in index.html'); process.exit(1); }

/* ---------- Mini-DOM: il minimo indispensabile per boot() e i fogli ---------- */
function makeEl(id) {
  return {
    id: id || '',
    children: [],
    listeners: {},
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        const on = force === undefined ? !this._set.has(c) : !!force;
        on ? this._set.add(c) : this._set.delete(c);
        return on;
      },
      contains(c) { return this._set.has(c); }
    },
    addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); },
    appendChild(c) { this.children.push(c); },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    // helper di test: dispatch sincrono a tutti i listener registrati
    dispatch(type, event) { (this.listeners[type] || []).slice().forEach(fn => fn(event)); }
  };
}

const IDS = ['setup', 'game', 'board', 'hub', 'sheet', 'overlay', 'toast',
  'countRow', 'lifeRow', 'startBtn', 'undoBtn', 'diceBtn', 'menuBtn'];
const elements = new Map(IDS.map(id => [id, makeEl(id)]));

const sandbox = {
  window: { __TEST__: true },
  document: {
    readyState: 'complete',
    addEventListener() {},
    createElement: () => makeEl(),
    getElementById: id => elements.get(id) || null
  },
  location: { hash: '', search: '' },
  navigator: {},
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(match[1], sandbox);
const L = sandbox.__logic;
const app = sandbox.__app;
if (!L) { console.error('__logic non esposto'); process.exit(1); }
if (!app) { console.error('__app non esposto'); process.exit(1); }

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    failed++;
    console.error('FAIL  ' + name + ' -> ' + e.message);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert fallita'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' atteso ' + b + ', ottenuto ' + a); }

/* ================= Logica pura ================= */

test('newGame crea N giocatori con vita iniziale', () => {
  const s = L.newGame(4, 40);
  eq(s.players.length, 4);
  s.players.forEach(p => eq(p.life, 40));
  eq(s.startLife, 40);
});

test('newGame assegna colori WUBRG unici fino a 5 giocatori', () => {
  const s = L.newGame(5, 40);
  const colors = s.players.map(p => p.color);
  eq(new Set(colors).size, 5);
});

test('applyLife somma e sottrae', () => {
  const s = L.newGame(2, 20);
  L.applyLife(s, 0, -3);
  eq(s.players[0].life, 17);
  L.applyLife(s, 0, 5);
  eq(s.players[0].life, 22);
});

test('applyLife clampa a -99', () => {
  const s = L.newGame(2, 20);
  L.applyLife(s, 0, -500);
  eq(s.players[0].life, -99);
});

test('isDead con vita a 0', () => {
  const s = L.newGame(2, 20);
  L.applyLife(s, 0, -20);
  assert(L.isDead(s.players[0]));
  assert(!L.isDead(s.players[1]));
});

test('veleno letale a 10', () => {
  const s = L.newGame(2, 40);
  L.applyCounter(s, 0, 'poison', 9);
  assert(!L.isDead(s.players[0]));
  L.applyCounter(s, 0, 'poison', 1);
  assert(L.isDead(s.players[0]));
});

test('contatori non scendono sotto zero', () => {
  const s = L.newGame(2, 40);
  L.applyCounter(s, 0, 'energy', -5);
  eq(s.players[0].energy, 0);
});

test('danno da comandante scala la vita', () => {
  const s = L.newGame(4, 40);
  L.applyCmdDmg(s, 0, 2, 1);
  L.applyCmdDmg(s, 0, 2, 1);
  L.applyCmdDmg(s, 0, 2, 1);
  eq(s.players[0].cmd[2], 3);
  eq(s.players[0].life, 37);
});

test('correzione danno comandante restituisce vita e clampa a 0', () => {
  const s = L.newGame(4, 40);
  L.applyCmdDmg(s, 0, 1, 5);
  L.applyCmdDmg(s, 0, 1, -2);
  eq(s.players[0].cmd[1], 3);
  eq(s.players[0].life, 37);
  L.applyCmdDmg(s, 0, 1, -10);
  eq(s.players[0].cmd[1], 0);
  eq(s.players[0].life, 40);
});

test('21 danni da comandante sono letali', () => {
  const s = L.newGame(4, 40);
  L.applyCmdDmg(s, 0, 1, 21);
  assert(L.isDead(s.players[0]));
  eq(L.maxCmdDmg(s.players[0]), 21);
});

test('maxCmdDmg prende il massimo tra piu comandanti (partner)', () => {
  const s = L.newGame(4, 40);
  L.applyCmdDmg(s, 0, 1, 7);
  L.applyCmdDmg(s, 0, 2, 12);
  eq(L.maxCmdDmg(s.players[0]), 12);
});

test('monarca esclusivo e toggle', () => {
  const s = L.newGame(3, 40);
  L.setMonarch(s, 1);
  eq(s.monarch, 1);
  L.setMonarch(s, 2);
  eq(s.monarch, 2);
  L.setMonarch(s, 2);
  eq(s.monarch, null);
});

test('iniziativa esclusiva e toggle', () => {
  const s = L.newGame(3, 40);
  L.setInitiative(s, 0);
  eq(s.initiative, 0);
  L.setInitiative(s, 0);
  eq(s.initiative, null);
});

test('serialize/deserialize round-trip', () => {
  const s = L.newGame(4, 40);
  L.applyLife(s, 2, -7);
  L.applyCmdDmg(s, 3, 0, 4);
  const s2 = L.deserialize(L.serialize(s));
  eq(s2.players[2].life, 33);
  eq(s2.players[3].cmd[0], 4);
});

test('deserialize rifiuta stati non validi', () => {
  let threw = false;
  try { L.deserialize('{"players":[]}'); } catch (e) { threw = true; }
  assert(threw);
});

test('deserialize normalizza salvataggi incompleti', () => {
  const s = L.deserialize('{"players":[{"life":12},{}],"startLife":20}');
  eq(s.players[0].life, 12);
  eq(s.players[1].life, 20, 'vita mancante prende startLife:');
  eq(s.players[0].name, 'Giocatore 1');
  eq(s.players[1].poison, 0);
  assert(s.players[1].cmd && typeof s.players[1].cmd === 'object', 'cmd deve essere un oggetto');
  eq(s.monarch, null);
});

test('chooseStarter restituisce indice valido', () => {
  for (let i = 0; i < 50; i++) {
    const idx = L.chooseStarter(4);
    assert(idx >= 0 && idx < 4, 'indice fuori range: ' + idx);
  }
  eq(L.chooseStarter(4, () => 0.99), 3);
  eq(L.chooseStarter(4, () => 0), 0);
});

/* ================= Layer UI (fogli modali) ================= */

// Simula un click su un elemento con data-act dentro #sheet
const sheet = elements.get('sheet');
const fire = act => sheet.dispatch('click', {
  target: { closest: () => ({ dataset: { act } }) }
});

test('la scheda giocatore applica ogni azione UNA volta sola (no listener duplicati)', () => {
  app.boot();
  app.setState(L.newGame(4, 40));
  app.openPlayerSheet(0);
  fire('ctr:poison:1');
  fire('ctr:poison:1');
  fire('ctr:poison:1');
  eq(app.getState().players[0].poison, 3, 'veleno:');
  fire('cmd:1:1');
  fire('cmd:1:1');
  eq(app.getState().players[0].cmd[1], 2, 'danno comandante:');
  eq(app.getState().players[0].life, 38, 'vita dopo danno comandante:');
});

test('riaprire i fogli non accumula listener su #sheet', () => {
  const before = (sheet.listeners.click || []).length;
  app.openPlayerSheet(1);
  app.closeSheet();
  app.openDiceSheet();
  app.closeSheet();
  app.openPlayerSheet(1);
  eq((sheet.listeners.click || []).length, before, 'listener click su #sheet:');
  fire('ctr:energy:1');
  eq(app.getState().players[1].energy, 1, 'energia:');
});

test('chiudere il foglio disattiva le azioni', () => {
  app.openPlayerSheet(2);
  app.closeSheet();
  fire('ctr:poison:1');
  eq(app.getState().players[2].poison, 0, 'nessuna azione a foglio chiuso:');
});

console.log('\n' + passed + ' passati, ' + failed + ' falliti');
process.exit(failed ? 1 : 0);
