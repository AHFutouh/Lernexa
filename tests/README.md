# Lernexa — Tests

Dev-only. **The app itself stays zero-dependency** — these tests use nothing
but Node's built-in `vm`/`fs` modules. No `npm install` is required for C1.

## Run

```bash
npm test          # or: node tests/logic.test.js
```

## What `logic.test.js` does

Each algorithm runner is loaded in an isolated `vm` sandbox and driven against
a **stub engine** and **capturing callbacks** (`onCounter` / `onVarUpdate` /
`onStep` / `onLog`). No browser, no DOM, deterministic timing.

It asserts:

- **Sorts** (bubble, selection, insertion, merge, quick, heap) — output is a
  sorted permutation of the input.
- **Searches** (linear, binary, interpolation) — correct found index for a
  present target; `NOT_FOUND` for an absent one.
- **Euclidean** — `GCD(56, 98) = 14`.
- **0/1 Knapsack** — optimal value equals an independent brute-force solver on
  the *effective* (clamped) inputs.
- **RSA** — decrypted message round-trips to the original.
- **Operation counts** on a fixed 30-element input, locked against
  `counts.baseline.json` (the layer that catches counter regressions — e.g.
  the old counter-key bug — automatically).

## Reconciling with the printed report

Two deliberate hooks for the frozen report:

1. **`FIXED30`** (top of `logic.test.js`) — replace with the *exact* 30-element
   array used for the report's **Table 4.3**, then re-capture
   `counts.baseline.json`, to make this an exact lock against the printed
   figures. Until then the baseline reflects this repo's reproducible input.

2. **Knapsack capacity clamp** — `dp/knapsack.js` does `W = Math.min(W, 20)` to
   keep the DP table on screen, so the default capacity-50 problem actually
   solves at capacity 20 (optimum **100**, not the classic **220**). The test
   asserts against the brute-force optimum of the *clamped* inputs so it is
   always correct. **Confirm this matches the report**: if the report states
   220 for capacity 50, the clamp needs revisiting (and, per the freeze rule,
   the code — not the report — would change).
