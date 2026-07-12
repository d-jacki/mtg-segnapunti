---
name: verify
description: Come verificare a runtime il segnapunti MTG (PWA statica) con headless Chrome
---

# Verifica runtime

App statica senza build. Per osservarla in esecuzione:

1. **Server locale** (il SW richiede http, non file://). Basta un server statico
   sulla cartella del progetto, porta qualsiasi, con `cache-control: no-store`
   per evitare interferenze del service worker tra un run e l'altro.
2. **Partita immediata**: `http://localhost:PORT/index.html?demo4` salta il setup
   e avvia una partita a 4 giocatori (demo2..demo6 per altri conteggi).
3. **Pilotare la UI**: headless Chrome con una pagina harness che carica l'app in
   un iframe same-origin e dispatcha eventi reali:
   - zone vita: `PointerEvent` `pointerdown`/`pointerup` su `.zone.plus/.minus`
     (il tap usa pointer events, non click)
   - tutto il resto (gear, hub, fogli modali): `MouseEvent('click', {bubbles:true})`
   - i valori si leggono da `.p-life`, `.s-val`, `#diceResult`
   - l'harness scrive PASS/FAIL nel proprio DOM; estrarre con
     `chrome --headless --dump-dom --virtual-time-budget=12000 URL | grep -E 'PASS|FAIL'`

Binari: `C:/Program Files/Google/Chrome/Application/chrome.exe` (o Edge in
Program Files (x86)). Usare `--user-data-dir` in una dir temporanea nuova per
evitare la cache del service worker.

## Gotcha

- Su questa macchina `--window-size` in headless NON imposta la viewport
  (resta ~504x664 anche con `--force-device-scale-factor=1`): gli screenshot
  risultano ritagliati a destra. Non è un bug dell'app — controllare il centro
  dell'hub (deve stare a metà di `innerWidth`) prima di concludere che c'è overflow.
- I test logici+DOM stanno in `node tests/run-tests.mjs` (mini-DOM in sandbox vm),
  ma non sostituiscono la verifica nel browser reale.
