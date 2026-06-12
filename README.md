# Lernexa

**Lost in Logic? Watch How.** Lernexa is an interactive algorithm visualizer
that shows you the *steps* — not just the start and the end. Play, pause, step
forward and back, change the speed, and feed in your own input while a live
dashboard tracks every comparison, swap, and variable as the algorithm runs.

**36 Algorithms · 8 Categories · Zero Setup**

> 🔗 **Live demo:** _TODO: add deployed URL_
> 📦 **Source:** https://github.com/AHFutouh/Lernexa

<!-- TODO: add screenshots — e.g. docs/screenshots/workspace.png, catalog.png -->

---

## What's inside

36 algorithms across 8 categories, each with a purpose-built visualization:

| Category | Count | Examples |
|---|---|---|
| Graph | 9 | BFS, DFS, A\*, Dijkstra, UCS, DLS, IDS, Greedy, Maze Generation |
| Data Structures | 7 | Stack, Queue, Linked Lists, Infix→Postfix/Prefix, Postfix Eval |
| Sorting | 6 | Bubble, Selection, Insertion, Merge, Quick, Heap |
| Searching | 3 | Linear, Binary, Interpolation |
| Dynamic Programming | 3 | 0/1 Knapsack, Fractional Knapsack, Coin Change |
| Machine Learning | 3 | K-Means, K-Nearest Neighbors, Linear Regression |
| Mathematics | 3 | Euclidean GCD, Sieve of Eratosthenes, RSA |
| Trees | 2 | Binary Search Tree, Tree Traversals |

### Features

- **Step-through playback** — play / pause / speed control, plus true
  step-back / step-forward that rewinds the *picture and the dashboard*
  (counters + variable watcher) to any recorded frame.
- **Live dashboard** — per-algorithm counters (comparisons, swaps, …) and a
  variable watcher, declared in data and updated through a callback contract.
- **Custom input** — type your own array / target / expression / numbers, or
  generate edge-case inputs (reversed, nearly-sorted, few-unique, …).
- **Interactive structures** — build a stack/queue/linked-list/BST by hand.
- **Provably-optimal A\*** — edge weights are proportional to geometric
  distance, so the Euclidean heuristic is admissible and A\* matches Dijkstra.

---

## Run it locally

The app is **100% static** — no build step, no bundler, no runtime
dependencies. The only externally-loaded assets are Google Fonts and Font
Awesome (icons), both via CDN.

Because the pages fetch `data/algorithms.json` over XHR, **opening
`index.html` directly via `file://` will not work in Chrome** (it blocks local
XHR). Serve the folder over HTTP instead — any static server works:

```bash
# Python (bundled on most machines)
python3 -m http.server 8000

# or Node
npx serve .

# or VS Code: the "Live Server" extension
```

Then open <http://localhost:8000/>.

---

## Architecture

Lernexa is **data-driven**. A single file, `data/algorithms.json`, is the
source of truth: it declares every algorithm's metadata, default input,
complexity, the **counters** and **variables** its dashboard shows, and which
**engine** renders it.

Three layers, cleanly separated:

```
data/algorithms.json   ── declares algorithms (metadata + dashboard contract)
        │
js/core/router.js      ── reads ?algo=<id>, validates, boots the workspace
js/pages/workspace.js  ── the orchestrator: wires controls → engine → dashboard
        │
js/engines/*.js (×9)   ── rendering only (DOM/SVG/Canvas), zero algorithm logic
js/algorithms/**/*.js  ── pure runners: the algorithm logic, zero DOM
```

**The nine engines** (`bars`, `memory`, `grid`, `canvas`, `graph`, `network`,
`list`, `math`, `dp`) each own one visual idiom and expose a small API
(`mount`, `reset`, and — where time-travel is supported — `captureState` /
`restoreState`). Engines never contain algorithm logic.

**The callback contract.** A runner is a single async function that receives an
`opts` object and never touches the DOM. It drives the UI purely through
callbacks:

```js
async function runX(opts) {
  var engine   = opts.engine;       // the rendering engine for this algorithm
  var control  = opts.control;      // { isPaused, isAborted } — cooperative
  var getDelay = opts.getDelay;     // await sleep(getDelay()) between frames
  var onLog    = opts.onLog;        // (type, htmlMessage)  → step log
  var onCnt    = opts.onCounter;    // (key [, by])         → bump a counter
  var onVar    = opts.onVarUpdate;  // (name, value)        → variable watcher
  var onStep   = opts.onStep;       // (snapshot)           → optional engine hook

  // opts also carries parsed input: array, target, k, arraySize,
  // heuristic, customInput, and the full algo record (opts.algo).

  // ... do work, calling onCnt/onVar/onLog and awaiting sleep(getDelay()) ...
  return true;   // true = finished, false = aborted (respect control.isAborted)
}
```

`getDelay()` is also where the workspace snapshots a frame, so each `await
sleep(getDelay())` becomes a rewindable step. The counter/variable **keys** a
runner emits must match the `counters` / `variables` arrays declared for it in
`algorithms.json` — that contract is what the headless tests lock down.

### Add an algorithm

The data-driven design means a new algorithm is mostly **data + one function**:

1. **Declare it** — add one entry to `data/algorithms.json` (`id`, `name`,
   `category`, `engine`, `input`, complexity, `variables`, `counters`).
2. **Write the runner** — add `js/algorithms/<category>/<name>.js` exporting
   `async function runX(opts)` (the contract above).
3. **Register it** — two one-liners: add the runner to the `RUNNERS` map in
   `js/pages/workspace.js` (`_getRunner`), and add its `<script>` tag to
   `workspace.html`.

Reuse an existing engine and you write **no rendering code at all**.

---

## Tech stack

- Vanilla **HTML / CSS / JavaScript** — no framework, no build step.
- Zero runtime dependencies (Google Fonts + Font Awesome are the only CDN
  assets, both presentational).
- **Dev tooling only:** Node-based tests (`tests/`) using Node's built-in
  `vm`/`fs` — see [`tests/README.md`](tests/README.md). `node_modules` is
  git-ignored; the app ships without it.

```bash
npm test     # headless correctness + operation-count regression tests
```

---

## Project layout

```
index.html · catalog.html · workspace.html
css/        base/ · components/ · pages/
data/       algorithms.json        (the source of truth)
js/
  core/     utils.js · router.js · fetcher.js
  engines/  9 rendering engines
  algorithms/  36 runners, grouped by category
  pages/    workspace.js · catalog.js
tests/      logic.test.js · counts.baseline.json · README.md
```

---

## Credits

Built as an ITI (Information Technology Institute) Work-Based Project.

- **Program:** ITI · Sphinx
- _TODO: add ITI / Sphinx logos under `assets/`_

## License

MIT — see `LICENSE`.
