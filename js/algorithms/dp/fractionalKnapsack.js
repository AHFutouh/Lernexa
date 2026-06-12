/* ════════════════════════════════════════════════════════════
   Lernexa — Fractional Knapsack (Greedy)
   "السائل الذهبي" — Liquid Gold
   Premium visualization: glass vials + sort animation + pour + laser cut
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runFractionalKnapsack(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function() { return 350; };
  var onLog    = opts.onLog       || function() {};
  var onCnt    = opts.onCounter   || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  /* ── Inputs ─────────────────────────────────────────────── */
  var items = (opts.algo && opts.algo.input && opts.algo.input.defaultItems)
    || [
         {weight: 4, value: 12},
         {weight: 10, value: 40},
         {weight: 3, value: 18},
         {weight: 6, value: 24},
         {weight: 5, value: 15}
       ];
  var capacity = (opts.algo && opts.algo.input && opts.algo.input.defaultCapacity) || 14;
  var n = items.length;

  onLog('info',
    'Fractional Knapsack <em>"السائل الذهبي"</em> — ' +
    '<span class="log-val">' + n + '</span> vials, ' +
    'capacity <span class="log-val">' + capacity + '</span>.');
  onVar('ratio',       '—');
  onVar('weight_left', capacity);
  onVar('total_value', 0);

  /* ── Step 1: show vials ─────────────────────────────────── */
  if (engine && typeof engine.showVials === 'function') {
    engine.showVials(items);
  }

  /* ── Step 2: compute ratios ─────────────────────────────── */
  var indexed = [];
  for (var k = 0; k < n; k++) {
    indexed.push({
      origIdx: k,
      weight:  items[k].weight,
      value:   items[k].value,
      ratio:   items[k].value / items[k].weight
    });
  }

  onLog('compare', 'Computing value/weight ratios…');
  for (var i = 0; i < indexed.length; i++) {
    onLog('info',
      '  Item ' + (indexed[i].origIdx + 1) +
      ' → V/W = <span class="log-val">' + indexed[i].ratio.toFixed(2) + '</span>' +
      ' (v=' + indexed[i].value + ', w=' + indexed[i].weight + ')');
    onCnt('choices');
  }

  /* ── Step 3: sort by V/W descending ────────────────────── */
  indexed.sort(function(a, b) { return b.ratio - a.ratio; });

  onLog('compare', 'Sorting vials by ratio — highest first…');

  var sortedIndices = indexed.map(function(it) { return it.origIdx; });
  if (engine && typeof engine.sortVials === 'function') {
    engine.sortVials(sortedIndices);
  }

  /* Wait for sort animation */
  await sleep(getDelay() * 1.5);

  /* ── Step 4: greedy selection — pour phase ──────────────── */
  var remaining  = capacity;
  var totalVal   = 0;

  for (var j = 0; j < indexed.length; j++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;
    if (remaining <= 0) break;

    var cur = indexed[j];
    onVar('ratio',       cur.ratio.toFixed(2));
    onVar('weight_left', remaining.toFixed(1));
    onCnt('choices');

    if (remaining >= cur.weight) {
      /* Take the whole item */
      remaining -= cur.weight;
      totalVal  += cur.value;

      onLog('found',
        '<strong>Take ALL</strong> of Item ' +
        '<span class="log-val">' + (cur.origIdx + 1) + '</span>' +
        ' (ratio=' + cur.ratio.toFixed(2) + ')' +
        ' +' + cur.value + ', cap left: <span class="log-val">' + remaining.toFixed(1) + '</span>');

      if (engine && typeof engine.pourVial === 'function') {
        engine.pourVial(cur.origIdx, 1.0, totalVal, capacity);
      }

      /* Legacy compat */
      if (engine && typeof engine.addGreedyStep === 'function') {
        engine.addGreedyStep(
          '100% Item '+(cur.origIdx+1),
          'w='+cur.weight+' v='+cur.value+' remaining='+remaining.toFixed(1),
          cur.value.toFixed(2),
          'take-all'
        );
      }

    } else {
      /* Take a fraction */
      var fraction = remaining / cur.weight;
      var gained   = fraction * cur.value;
      totalVal    += gained;

      onLog('swap',
        '<strong>Laser-cut & pour ' +
        '<span class="log-val">' + (fraction * 100).toFixed(1) + '%</span></strong>' +
        ' of Item ' + (cur.origIdx + 1) +
        ' → +' + gained.toFixed(2));

      if (engine && typeof engine.cutVial === 'function') {
        engine.cutVial(cur.origIdx, fraction);
      }
      await sleep(500);

      if (engine && typeof engine.pourVial === 'function') {
        engine.pourVial(cur.origIdx, fraction, totalVal, capacity);
      }

      /* Legacy compat */
      if (engine && typeof engine.addGreedyStep === 'function') {
        engine.addGreedyStep(
          (fraction*100).toFixed(1)+'% Item '+(cur.origIdx+1),
          'fraction='+fraction.toFixed(3)+' gained='+gained.toFixed(2),
          gained.toFixed(2),
          'take-partial'
        );
      }

      remaining = 0;
    }

    onVar('total_value', totalVal.toFixed(2));
    await sleep(getDelay());
  }

  /* ── Step 5: Result banner ──────────────────────────────── */
  onVar('total_value', totalVal.toFixed(2));

  if (engine && typeof engine.showResultBanner === 'function') {
    engine.showResultBanner(
      'Max Value: ' + totalVal.toFixed(2),
      'Greedy by V/W ratio'
    );
  }

  onLog('done',
    '<i class="fa-solid fa-check"></i> Max value: ' +
    '<span class="log-val">' + totalVal.toFixed(2) + '</span>' +
    ' (greedy, always optimal for fractional knapsack).');

  return true;
}
