/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — 0/1 Knapsack (Dynamic Programming)
   "معضلة اللص" — The Thief's Dilemma
   Premium visualization: gem cards + holographic arrows + backtrack beam
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runKnapsack(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function() { return 200; };
  var onLog    = opts.onLog       || function() {};
  var onCnt    = opts.onCounter   || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  /* ── Inputs ─────────────────────────────────────────────── */
  var items = (opts.algo && opts.algo.input && opts.algo.input.defaultItems)
    || [
         {weight: 2, value: 6},
         {weight: 3, value: 10},
         {weight: 4, value: 12},
         {weight: 1, value: 3},
         {weight: 5, value: 15},
         {weight: 3, value: 9}
       ];
  var W = (opts.algo && opts.algo.input && opts.algo.input.defaultCapacity) || 8;

  /* Clamp to reasonable display size */
  W = Math.min(W, 20);
  var n = Math.min(items.length, 8);
  items = items.slice(0, n);

  onLog('info',
    '0/1 Knapsack <em>"معضلة اللص"</em> — ' +
    '<span class="log-val">' + n + '</span> items, ' +
    'capacity <span class="log-val">' + W + '</span>.');
  onVar('current_item',  '—');
  onVar('current_cap',   '—');
  onVar('leave_value',   '—');
  onVar('take_value',    '—');
  onVar('optimal_value', '—');
  onVar('items_chosen',  '—');

  /* ── Step 1: show gem cards + knapsack bag ──────────────── */
  if (engine && typeof engine.showKnapsackItems === 'function') {
    engine.showKnapsackItems(items, W);
  }

  /* ── Step 2: init 2D DP table ──────────────────────────── */
  var rowLabels = [];
  for (var r = 0; r <= n; r++) {
    rowLabels.push(r === 0 ? '∅' : ('Item ' + r));
  }
  var colLabels = [];
  for (var c = 0; c <= W; c++) {
    colLabels.push(c);
  }

  if (engine && typeof engine.initTable === 'function') {
    engine.initTable(rowLabels, colLabels, 'Knapsack 0/1 — DP Table');
  }

  /* ── Build dp JS array ──────────────────────────────────── */
  var dp = [];
  for (var rr = 0; rr <= n; rr++) {
    dp.push(new Array(W + 1).fill(0));
  }

  /* Seed row 0 — zeros */
  for (var wz = 0; wz <= W; wz++) {
    if (engine && typeof engine.setCellValue === 'function') {
      engine.setCellValue(0, wz, 0, 'default');
    }
  }
  await sleep(getDelay());

  /* ── Step 3: Fill DP table cell by cell ─────────────────── */
  for (var i = 1; i <= n; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var item = items[i - 1];
    var wt   = item.weight;
    onVar('current_item', 'Item ' + i);
    onLog('compare',
      'Item <span class="log-val">' + i + '</span>' +
      ' — weight: <span class="log-val">' + wt + '</span>' +
      ', value: <span class="log-val">' + item.value + '</span>');

    for (var w = 0; w <= W; w++) {
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;

      onCnt('comparisons');
      onVar('current_cap', w);

      /* Mark computing */
      if (engine && typeof engine.setCellValue === 'function') {
        engine.setCellValue(i, w, '?', 'computing');
      }
      await sleep(getDelay() * 0.3);

      /* Show holographic arrows */
      if (engine && typeof engine.showHolographicArrows === 'function') {
        var fromLeave = { row: i - 1, col: w };
        var fromTake  = (wt <= w) ? { row: i - 1, col: w - wt } : null;
        engine.showHolographicArrows(fromLeave, fromTake, { row: i, col: w });
      }

      /* DP recurrence */
      var leaveVal = dp[i - 1][w];
      var takeVal  = -1;
      if (wt <= w) {
        takeVal = dp[i - 1][w - wt] + item.value;
      }
      dp[i][w] = (takeVal > leaveVal) ? takeVal : leaveVal;

      onVar('leave_value', leaveVal);
      onVar('take_value',  takeVal >= 0 ? takeVal : 'n/a');
      if (takeVal > leaveVal) onCnt('updates');

      /* Set final cell state */
      if (engine && typeof engine.setCellValue === 'function') {
        engine.setCellValue(i, w, dp[i][w], 'optimal');
      }
      await sleep(getDelay() * 0.4);
    }

    await sleep(getDelay() * 0.3);
  }

  /* ── Result ─────────────────────────────────────────────── */
  var maxValue = dp[n][W];
  onVar('optimal_value', maxValue);
  onLog('found',
    '<strong>Maximum value: <span class="log-val">' + maxValue + '</span></strong>');

  /* ── Step 4: Backtrack ──────────────────────────────────── */
  onLog('compare', 'Backtracking path through DP table…');

  var chosen    = [];
  var ww        = W;
  var remaining = W;

  for (var ii = n; ii > 0 && ww > 0; ii--) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    if (dp[ii][ww] !== dp[ii - 1][ww]) {
      chosen.push(ii - 1);

      /* Mark chosen cell */
      if (engine && typeof engine.setCellValue === 'function') {
        engine.setCellValue(ii, ww, dp[ii][ww], 'chosen');
      }

      /* Fly item to bag */
      if (engine && typeof engine.flyItemToBag === 'function') {
        engine.flyItemToBag(ii - 1);
      }

      remaining -= items[ii - 1].weight;

      /* Update bag capacity */
      if (engine && typeof engine.updateBagCapacity === 'function') {
        engine.updateBagCapacity(remaining, W);
      }

      ww -= items[ii - 1].weight;

      onLog('found',
        'Chosen: <span class="log-val">Item ' + ii + '</span>' +
        ' (w=' + items[ii - 1].weight + ', v=' + items[ii - 1].value + ')');

      await sleep(getDelay());
    } else {
      /* Mark excluded */
      if (engine && typeof engine.setCellValue === 'function') {
        engine.setCellValue(ii, ww, dp[ii][ww], 'excluded');
      }
    }
  }

  /* Mark non-chosen items as excluded */
  if (engine && typeof engine.markItemChosen === 'function') {
    for (var xi = 0; xi < n; xi++) {
      engine.markItemChosen(xi, chosen.indexOf(xi) !== -1);
    }
  }

  onVar('items_chosen', chosen.length);

  var chosenNames = chosen.map(function(idx) {
    return 'Item ' + (idx + 1);
  }).reverse().join(', ');

  /* ── Step 5: Result banner ──────────────────────────────── */
  if (engine && typeof engine.showResultBanner === 'function') {
    engine.showResultBanner(
      'Optimal Value: ' + dp[n][W],
      'Items chosen: ' + (chosenNames || '—')
    );
  }

  onLog('done',
    '<i class="fa-solid fa-check"></i> Optimal: ' +
    '<span class="log-val">' + maxValue + '</span>. ' +
    'Items: <span class="log-val">' + (chosenNames || 'none') + '</span>.');

  return true;
}
