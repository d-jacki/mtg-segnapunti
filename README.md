# Segnapunti MTG

Segnapunti per partite di Magic: The Gathering, pensato per stare al centro del tavolo.
PWA installabile, funziona offline. Live: **https://d-jacki.github.io/mtg-segnapunti/**

## Funzionalità

- **2–6 giocatori**, vita iniziale 20 / 30 / 40 o personalizzata
- Pannelli **capovolti per chi siede di fronte**: ogni giocatore legge i propri punti dal suo lato
- Tap sinistra/destra per −1/+1, **tieni premuto** per andare veloce (dopo un secondo, salti di 5)
- **Danno da comandante** per avversario (letale a 21, scala automaticamente la vita): un chip per avversario sul pannello, tap +1 / pressione lunga −1 — non compare in duello, dove c'è un solo avversario
- Contatori **veleno** (letale a 10), **energia**, **esperienza**, **tassa comandante**
- **Monarca** e **Iniziativa** (esclusivi, passano da un giocatore all'altro)
- Morte automatica: vita ≤ 0, 10 veleno o 21 danni da comandante → teschio
- **Dadi** d4–d20, moneta e "chi inizia?"
- **Ripristina punteggio** (↻ nell'hub): stessi giocatori, tutto azzerato, con conferma
- **Annulla** l'ultima mossa dal menu (fino a 60 mosse)
- **Nuova partita** dal menu torna al setup, che ricorda giocatori, vita, nomi e colori dell'ultima partita
- **Schermo sempre acceso** durante la partita (Wake Lock)
- La partita **si salva da sola**: se chiudi l'app, riprende da dove eri
- Ogni giocatore ha nome e colore mana personalizzabili (⚙ sul pannello); i colori restano sempre diversi, perché i chip del comandante si riconoscono da quelli

## Struttura

- `index.html` — tutta l'app (HTML+CSS+JS in un file, scelta deliberata)
- `manifest.json` + `sw.js` — PWA e offline; incrementare `CACHE_NAME` a ogni modifica
- `tests/run-tests.mjs` — test zero-dipendenze: `node tests/run-tests.mjs`

## Aggiornare

1. Modifica `index.html`
2. Incrementa `CACHE_NAME` in `sw.js`
3. `node tests/run-tests.mjs`
4. commit + push → GitHub Pages si aggiorna in 1-2 minuti

Trucco per il debug: `index.html?demo4` avvia subito una partita di prova a 4 giocatori.
