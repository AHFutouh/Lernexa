/* ════════════════════════════════════════════════════════════
   Lernexa — Sieve of Eratosthenes
   Engine: MathEngine  (CSS-grid number cells with neon glow)

   Default N = 100
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runSieve(opts) {
  var engine   = opts.engine;
  var control  = opts.control      || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay     || function () { return 200; };
  var onLog    = opts.onLog        || function () {};
  var onCnt    = opts.onCounter    || function () {};
  var onVar    = opts.onVarUpdate  || function () {};

  /* ── Read N ──────────────────────────────────────────────── */
  var N = (opts.n !== undefined ? opts.n : null)
       || (opts.algo && opts.algo.input && opts.algo.input.defaultN)
       || 100;
  N = Math.max(2, Math.min(500, Math.floor(N)));

  /* Prime colour palette (cycling) */
  var PRIME_COLORS = [
    '#00F0FF', '#B026FF', '#F0883E', '#39D353',
    '#F0D060', '#FF6E6E', '#79C0FF', '#D2A8FF'
  ];
  var colorIdx = 0;

  /* Composite bookkeeping (mirrors engine state) */
  var isComposite = new Array(N + 1).fill(false);

  /* ── Pause / abort helper ────────────────────────────────── */
  async function _check() {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    return control.isAborted;
  }

  /* ── Build sieve grid ────────────────────────────────────── */
  if (engine && typeof engine.buildSieve === 'function') {
    engine.buildSieve(N);
  }

  onLog('info',
    'Sieve of Eratosthenes &mdash; finding all primes up to' +
    ' <span class="log-val">' + N + '</span>');

  onVar('limit', N);
  onVar('current_prime', '—');
  onVar('primes_found', 0);
  onVar('composites_marked', 0);

  await sleep(getDelay());
  if (await _check()) return false;

  var primes    = [];
  var sqrtN     = Math.floor(Math.sqrt(N));
  var compCount = 0;

  /* ── Phase 1: sweep p = 2 … sqrt(N) ─────────────────────── */
  for (var p = 2; p <= sqrtN; p++) {
    if (await _check()) return false;
    if (isComposite[p]) continue;

    /* Found a prime */
    primes.push(p);
    var color = PRIME_COLORS[colorIdx % PRIME_COLORS.length];
    colorIdx++;

    if (engine && typeof engine.markPrime === 'function') {
      engine.markPrime(p, color);
    }

    onLog('found',
      'Prime discovered: <span class="log-val">' + p + '</span>' +
      ' &mdash; sweeping multiples');
    onVar('current_prime', p);
    onVar('primes_found', primes.length);
    onCnt('primes_found');

    await sleep(getDelay() * 0.5);
    if (await _check()) return false;

    /* Sweep multiples via engine (async per-cell delay) */
    var sweepDelay = Math.max(40, Math.floor(getDelay() * 0.3));
    if (engine && typeof engine.sweepMultiples === 'function') {
      await engine.sweepMultiples(p, color, sweepDelay);
    }

    /* Mirror composite state locally (start from p*p for efficiency) */
    for (var m = p * p; m <= N; m += p) {
      if (!isComposite[m]) {
        isComposite[m] = true;
        compCount++;
      }
    }
    /* Also mark 2p…(p-1)*p that engine already swept */
    for (var m2 = 2 * p; m2 < p * p && m2 <= N; m2 += p) {
      if (!isComposite[m2]) {
        isComposite[m2] = true;
        compCount++;
      }
    }

    onVar('composites_marked', compCount);
    onCnt('composites_marked');

    await sleep(getDelay() * 0.3);
    if (await _check()) return false;
  }

  /* ── Phase 2: every still-unmarked number above √N is prime ──
     The key insight, made visible: once we've swept all primes up to
     √N, nothing left can have a smaller factor — so every remaining
     unmarked cell lights up as a prime. Animated (capped) so the reveal
     reads clearly instead of appearing all at once. */
  onLog('compare',
    'Past <span class="log-val">√' + N + ' ≈ ' + sqrtN + '</span> — no new multiples left to strike. ' +
    'Every number still unmarked <strong>must</strong> be prime.');
  await sleep(getDelay());
  if (await _check()) return false;

  for (var q = sqrtN + 1; q <= N; q++) {
    if (await _check()) return false;
    if (isComposite[q]) continue;
    primes.push(q);
    var color2 = PRIME_COLORS[colorIdx % PRIME_COLORS.length];
    colorIdx++;
    if (engine && typeof engine.markPrime === 'function') {
      engine.markPrime(q, color2);
    }
    onCnt('primes_found');
    onVar('current_prime',  q);
    onVar('primes_found',   primes.length);
    /* Brief per-cell pacing, capped so large N stays snappy */
    await sleep(Math.min(getDelay() * 0.2, 60));
  }

  onVar('primes_found', primes.length);
  onVar('current_prime', '—');
  onVar('largest_prime', primes[primes.length - 1] || '—');

  onLog('done',
    '<i class="fa-solid fa-check"></i> Sieve complete! ' +
    '<span class="log-val">' + primes.length + '</span> primes found up to ' + N + '.' +
    ' Largest: <span class="log-val">' + (primes[primes.length - 1] || '—') + '</span>');

  /* ── Final reveal animation ──────────────────────────────── */
  if (engine && typeof engine.finalReveal === 'function') {
    await engine.finalReveal();
  }

  onLog('info',
    '<i class="fa-solid fa-star"></i> Prime constellation revealed!');

  return true;
}
