/* ════════════════════════════════════════════════════════════
   Lernexa — Coin Change (DP — Minimum Coins)
   "صراف الآلي الذكي" — The Smart ATM
   Premium visualization: 3D coin tokens + arc arrows + 1D DP array
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runCoinChange(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function() { return 150; };
  var onLog    = opts.onLog       || function() {};
  var onCnt    = opts.onCounter   || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  /* ── Inputs ─────────────────────────────────────────────── */
  var coins  = (opts.algo && opts.algo.input && opts.algo.input.defaultCoins)
    || [1, 5, 10, 25];
  var amount = (opts.algo && opts.algo.input && opts.algo.input.defaultAmount)
    || 36;

  /* Keep display width manageable */
  var displayAmount = Math.min(amount, 40);

  onLog('info',
    'Coin Change <em>"صراف الآلي الذكي"</em> — ' +
    'coins: [<span class="log-val">' + coins.join(', ') + '</span>], ' +
    'target: <span class="log-val">' + displayAmount + '</span>');
  onVar('amount_left', displayAmount);
  onVar('min_coins',   '—');
  onVar('last_coin',   '—');

  /* ── Step 1: show coin tokens ───────────────────────────── */
  if (engine && typeof engine.showCoins === 'function') {
    engine.showCoins(coins);
  }

  /* ── Step 2: show 1D DP array — all ∞ except [0]=0 ─────── */
  if (engine && typeof engine.show1DArray === 'function') {
    engine.show1DArray(displayAmount, Infinity);
  }

  /* ── Initialize DP ──────────────────────────────────────── */
  var INF  = displayAmount + 1;
  var dp   = new Array(displayAmount + 1).fill(INF);
  var from = new Array(displayAmount + 1).fill(-1);
  dp[0]    = 0;

  /* Seed cell 0 */
  if (engine && typeof engine.set1DCell === 'function') {
    engine.set1DCell(0, 0, 'state-zero');
  }

  onLog('compare', 'Base: dp[0] = 0  (0 coins needed for amount 0)');
  await sleep(getDelay() * 1.5);

  /* ── Step 3: fill DP array ──────────────────────────────── */
  for (var ci = 0; ci < coins.length; ci++) {
    var coin = coins[ci];

    /* Activate this coin */
    if (engine && typeof engine.activateCoin === 'function') {
      engine.activateCoin(coin, true);
    }

    onLog('compare', 'Trying coin <span class="log-val">' + coin + '</span>…');

    for (var a = coin; a <= displayAmount; a++) {
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;

      onVar('amount_left', a);
      onCnt('updates');

      /* Mark computing */
      if (engine && typeof engine.set1DCell === 'function') {
        engine.set1DCell(a, '?', 'state-computing');
      }
      await sleep(getDelay() * 0.2);

      /* Draw arc */
      if (engine && typeof engine.drawArc === 'function') {
        engine.drawArc(a - coin, a, 'var(--accent-blue)');
      }
      /* Respect the speed slider instead of a hardcoded 400ms, which
         made this demo crawl even at 2×. */
      await sleep(getDelay());

      /* DP recurrence */
      if (dp[a - coin] + 1 < dp[a]) {
        dp[a]   = dp[a - coin] + 1;
        from[a] = coin;
        onVar('last_coin', coin);

        if (engine && typeof engine.set1DCell === 'function') {
          engine.set1DCell(a, dp[a], 'state-computing');
        }
      }
    }

    /* Finalize all cells for this coin pass */
    for (var fa = coin; fa <= displayAmount; fa++) {
      var displayVal = dp[fa] >= INF ? '∞' : dp[fa];
      var cellState  = dp[fa] >= INF ? '' : 'state-optimal';
      if (engine && typeof engine.set1DCell === 'function') {
        engine.set1DCell(fa, displayVal, cellState);
      }
    }

    /* Deactivate coin */
    if (engine && typeof engine.activateCoin === 'function') {
      engine.activateCoin(coin, false);
    }

    await sleep(getDelay() * 0.5);
  }

  /* ── Result ─────────────────────────────────────────────── */
  if (dp[displayAmount] >= INF) {
    onLog('compare',
      'No solution: cannot make <span class="log-val">' + displayAmount +
      '</span> with coins [' + coins.join(', ') + '].');
    if (engine && typeof engine.showResultBanner === 'function') {
      engine.showResultBanner(
        'No Solution',
        'Amount ' + displayAmount + ' is not reachable with these coins.'
      );
    }
    return true;
  }

  onVar('min_coins', dp[displayAmount]);

  onLog('found',
    '<strong>Minimum coins: <span class="log-val">' + dp[displayAmount] + '</span></strong>' +
    ' to make amount <span class="log-val">' + displayAmount + '</span>');

  /* ── Step 4: traceback — mark minimum-coin path ─────────── */
  var used = [];
  var cur  = displayAmount;
  while (cur > 0 && from[cur] !== -1) {
    used.push(from[cur]);
    onCnt('coin_uses');

    if (engine && typeof engine.set1DCell === 'function') {
      engine.set1DCell(cur, dp[cur], 'state-chosen');
    }
    if (engine && typeof engine.activateCoin === 'function') {
      engine.activateCoin(from[cur], true);
    }

    cur -= from[cur];
    await sleep(getDelay() * 0.7);
  }

  /* Deactivate all coins */
  for (var di = 0; di < coins.length; di++) {
    if (engine && typeof engine.activateCoin === 'function') {
      engine.activateCoin(coins[di], false);
    }
  }

  /* Tally */
  var usageMap = {};
  for (var ui = 0; ui < used.length; ui++) {
    usageMap[used[ui]] = (usageMap[used[ui]] || 0) + 1;
  }
  var usageParts = [];
  for (var uk in usageMap) {
    if (usageMap.hasOwnProperty(uk)) {
      usageParts.push(usageMap[uk] + ' × ' + uk);
    }
  }

  /* ── Step 5: Result banner ──────────────────────────────── */
  if (engine && typeof engine.showResultBanner === 'function') {
    engine.showResultBanner(
      'Min Coins: ' + dp[displayAmount],
      'Amount: ' + displayAmount
    );
  }

  onLog('done',
    '<i class="fa-solid fa-check"></i> Coins used: ' +
    '<span class="log-val">[' + used.join(' + ') + '] = ' + displayAmount + '</span>');

  return true;
}
