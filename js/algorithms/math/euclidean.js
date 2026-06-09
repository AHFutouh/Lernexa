/* ════════════════════════════════════════════════════════════
   Lernexa — Euclidean Algorithm (GCD)
   Engine: MathEngine  (animated rectangle bars)

   Defaults: A=252, B=105  →  GCD = 21
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runEuclidean(opts) {
  var engine   = opts.engine;
  var control  = opts.control      || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay     || function () { return 600; };
  var onLog    = opts.onLog        || function () {};
  var onCnt    = opts.onCounter    || function () {};
  var onVar    = opts.onVarUpdate  || function () {};

  /* ── Read A and B ────────────────────────────────────────── */
  var A, B;

  if (opts.customA !== undefined && opts.customB !== undefined) {
    A = parseInt(opts.customA, 10);
    B = parseInt(opts.customB, 10);
  } else if (opts.array && opts.array.length >= 2) {
    A = Math.abs(parseInt(opts.array[0], 10));
    B = Math.abs(parseInt(opts.array[1], 10));
  } else {
    A = (opts.algo && opts.algo.input && opts.algo.input.defaultA) || 252;
    B = (opts.algo && opts.algo.input && opts.algo.input.defaultB) || 105;
  }

  /* Sanitise — positive integers only */
  A = Math.abs(Math.floor(A)) || 252;
  B = Math.abs(Math.floor(B)) || 105;

  /* Ensure A ≥ B */
  if (B > A) { var tmp = A; A = B; B = tmp; }

  /* ── Pause / abort helper ────────────────────────────────── */
  async function _check() {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    return control.isAborted;
  }

  /* ── Initialise engine ───────────────────────────────────── */
  if (engine && typeof engine.initEuclidean === 'function') {
    engine.initEuclidean(A, B);
  }

  onLog('info',
    'GCD(<span class="log-val">' + A + '</span>, <span class="log-val">' + B + '</span>)' +
    ' &mdash; starting Euclidean Algorithm');

  onVar('a', A);
  onVar('b', B);
  onVar('remainder', '—');
  onVar('gcd', '—');
  onVar('steps', 0);

  var origA = A;
  var origB = B;
  var steps = 0;

  /* ── Main loop ───────────────────────────────────────────── */
  while (B > 0) {
    if (await _check()) return false;

    var remainder = A % B;

    onLog('compare',
      'GCD(<span class="log-val">' + A + '</span>, <span class="log-val">' + B + '</span>)' +
      ' = GCD(<span class="log-val">' + B + '</span>, <span class="log-val">' + remainder + '</span>)');

    if (engine && typeof engine.stepEuclidean === 'function') {
      engine.stepEuclidean(A, B, remainder, steps + 1);
    }

    await sleep(getDelay());
    if (await _check()) return false;

    /* Advance */
    A = B;
    B = remainder;
    steps++;

    onVar('a', A);
    onVar('b', B);
    onVar('remainder', remainder);
    onVar('steps', steps);
    onCnt('iterations');
  }

  /* ── A is now the GCD ────────────────────────────────────── */
  if (engine && typeof engine.highlightGCD === 'function') {
    engine.highlightGCD(A);
  }

  onVar('gcd', A);

  onLog('found',
    '<strong>GCD(' + origA + ', ' + origB + ')' +
    ' = <span class="log-val">' + A + '</span></strong>' +
    ' &mdash; found in <span class="log-val">' + steps + '</span> step(s).');

  onLog('done',
    '<i class="fa-solid fa-check"></i> Euclidean Algorithm complete. GCD = ' +
    '<span class="log-val">' + A + '</span> ✓');

  return true;
}
