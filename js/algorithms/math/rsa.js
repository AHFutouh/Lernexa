/* ════════════════════════════════════════════════════════════
   Lernexa — RSA Encryption (Educational Simulation)
   Engine: MathEngine  (three-column glassmorphism panels)

   Defaults: p=17, q=19, message=42
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runRSA(opts) {
  var engine   = opts.engine;
  var control  = opts.control      || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay     || function () { return 700; };
  var onLog    = opts.onLog        || function () {};
  var onCnt    = opts.onCounter    || function () {};
  var onVar    = opts.onVarUpdate  || function () {};

  /* ── Read p, q, message ──────────────────────────────────── */
  var p = parseInt(
    (opts.p !== undefined ? opts.p : null) ||
    (opts.algo && opts.algo.input && opts.algo.input.defaultP) ||
    17, 10
  );
  var q = parseInt(
    (opts.q !== undefined ? opts.q : null) ||
    (opts.algo && opts.algo.input && opts.algo.input.defaultQ) ||
    19, 10
  );
  var M = parseInt(
    (opts.msg !== undefined ? opts.msg : null) ||
    (opts.algo && opts.algo.input && opts.algo.input.defaultMessage) ||
    42, 10
  );

  /* Fall back to safe classroom primes */
  var SMALL_PRIMES = [11, 13, 17, 19, 23, 29, 31, 37];
  if (SMALL_PRIMES.indexOf(p) === -1) p = 17;
  if (SMALL_PRIMES.indexOf(q) === -1 || q === p) q = (p === 17 ? 19 : 17);

  /* ── Pause / abort helper ────────────────────────────────── */
  async function _check() {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    return control.isAborted;
  }

  /* ════════════════════════════════════════════════════════════
     STEP 0 — Initialise layout
  ════════════════════════════════════════════════════════════ */
  if (engine && typeof engine.initRSA === 'function') {
    engine.initRSA();
  }

  onLog('info',
    'RSA Encryption &mdash; p=<span class="log-val">' + p + '</span>' +
    ', q=<span class="log-val">' + q + '</span>' +
    ', message M=<span class="log-val">' + M + '</span>');

  await sleep(getDelay());
  if (await _check()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 1 — Key generation
  ════════════════════════════════════════════════════════════ */
  var n   = p * q;
  var phi = (p - 1) * (q - 1);
  var e   = findE(phi);
  var d   = modInverse(e, phi);

  /* Show step-by-step in Key Forge */
  if (engine && typeof engine.showKeyStep === 'function') {
    engine.showKeyStep('p × q', p + ' × ' + q, 'n = ' + n);
    await sleep(getDelay() * 0.5);
    if (await _check()) return false;

    engine.showKeyStep('φ(n)', '(' + p + '-1)×(' + q + '-1)', 'φ = ' + phi);
    await sleep(getDelay() * 0.5);
    if (await _check()) return false;

    engine.showKeyStep('e (coprime with φ)', '', 'e = ' + e);
    await sleep(getDelay() * 0.5);
    if (await _check()) return false;

    engine.showKeyStep('d (mod inverse)', 'e⁻¹ mod φ', 'd = ' + d);
    await sleep(getDelay() * 0.5);
    if (await _check()) return false;
  }

  onLog('compare',
    'n = p × q = <span class="log-val">' + p + '</span> × <span class="log-val">' + q +
    '</span> = <span class="log-val">' + n + '</span>');
  onLog('compare',
    'φ(n) = (p−1)(q−1) = <span class="log-val">' + phi + '</span>');

  /* ════════════════════════════════════════════════════════════
     STEP 2 — Display keypair
  ════════════════════════════════════════════════════════════ */
  if (engine && typeof engine.showPublicKey === 'function') {
    engine.showPublicKey(e, n);
  }

  onLog('found',
    'Public Key (e, n) = (<span class="log-val">' + e + '</span>' +
    ', <span class="log-val">' + n + '</span>) &mdash; shared openly');

  await sleep(getDelay());
  if (await _check()) return false;

  if (engine && typeof engine.showPrivateKey === 'function') {
    engine.showPrivateKey(d, n);
  }

  onLog('compare',
    'Private Key (d, n) = (<span class="log-val">' + d + '</span>' +
    ', <span class="log-val">' + n + '</span>) &mdash; kept secret!');

  onVar('p',   p);
  onVar('q',   q);
  onVar('n',   n);
  onVar('phi', phi);
  onVar('e',   e);
  onVar('d',   d);
  onCnt('computations');

  await sleep(getDelay());
  if (await _check()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 3 — Encryption  (Alice side)
  ════════════════════════════════════════════════════════════ */

  /* Message must be < n */
  if (M >= n) {
    onLog('compare',
      'Warning: M=' + M + ' must be &lt; n=' + n + '. Clamping to ' + (n - 1) + '.');
    M = n - 1;
  }
  if (M < 1) M = 1;

  var C_val = modPow(M, e, n);

  if (engine && typeof engine.showEncryption === 'function') {
    engine.showEncryption(M, e, n, C_val);
  }

  onLog('compare',
    'Alice encrypts: C = ' +
    '<span class="log-val">' + M + '</span>' +
    '<sup><span class="log-val">' + e + '</span></sup>' +
    ' mod <span class="log-val">' + n + '</span>' +
    ' = <span class="log-val">' + C_val + '</span>');

  onVar('M', M);
  onVar('C', C_val);
  onCnt('computations');

  await sleep(getDelay() * 2);
  if (await _check()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 4 — Send (flying packet)
  ════════════════════════════════════════════════════════════ */
  if (engine && typeof engine.sendMessage === 'function') {
    await engine.sendMessage('📦 Ciphertext: ' + C_val);
  }

  onLog('info',
    'Encrypted ciphertext <span class="log-val">' + C_val + '</span>' +
    ' transmitted to Bob&hellip;');

  onCnt('transmissions');

  await sleep(getDelay());
  if (await _check()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 5 — Decryption  (Bob side)
  ════════════════════════════════════════════════════════════ */
  var M2 = modPow(C_val, d, n);

  if (engine && typeof engine.showDecryption === 'function') {
    engine.showDecryption(C_val, d, n, M2);
  }

  onLog('found',
    'Bob decrypts: M = ' +
    '<span class="log-val">' + C_val + '</span>' +
    '<sup><span class="log-val">' + d + '</span></sup>' +
    ' mod <span class="log-val">' + n + '</span>' +
    ' = <span class="log-val">' + M2 + '</span>');

  onVar('M',         M);
  onVar('C',         C_val);
  onVar('decrypted', M2);
  onCnt('computations');

  await sleep(getDelay() * 2);
  if (await _check()) return false;

  /* ── Final verification ──────────────────────────────────── */
  if (M2 === M) {
    onLog('done',
      '<i class="fa-solid fa-check"></i> RSA complete ✓ ' +
      'Original: <span class="log-val">' + M + '</span>' +
      ' = Decrypted: <span class="log-val">' + M2 + '</span>');
  } else {
    onLog('compare',
      'Unexpected mismatch (' + M + ' ≠ ' + M2 + ') — check prime inputs.');
  }

  return true;
}

/* ════════════════════════════════════════════════════════════
   HELPERS (file-scoped, not exported)
════════════════════════════════════════════════════════════ */

/** Fast modular exponentiation — uses BigInt for correctness */
function modPow(base, exp, mod) {
  var result = 1n;
  base = BigInt(base);
  exp  = BigInt(exp);
  mod  = BigInt(mod);
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = result * base % mod;
    exp  = exp / 2n;
    base = base * base % mod;
  }
  return Number(result);
}

/** Extended Euclidean — modular inverse of e mod phi */
function modInverse(e, phi) {
  var old_r = e,   r = phi;
  var old_s = 1,   s = 0;
  while (r !== 0) {
    var q   = Math.floor(old_r / r);
    var tmp_r = r;   r   = old_r - q * r;   old_r = tmp_r;
    var tmp_s = s;   s   = old_s - q * s;   old_s = tmp_s;
  }
  return ((old_s % phi) + phi) % phi;
}

/** GCD via Euclidean */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/** Choose the smallest e coprime with phi */
function findE(phi) {
  var candidates = [65537, 17, 13, 11, 7, 5, 3];
  for (var i = 0; i < candidates.length; i++) {
    var ec = candidates[i];
    if (ec < phi && gcd(ec, phi) === 1) return ec;
  }
  /* Linear fallback */
  for (var ef = 2; ef < phi; ef++) {
    if (gcd(ef, phi) === 1) return ef;
  }
  return 3;
}
