/* ════════════════════════════════════════════════════════════
   Lernexa — Bubble Sort
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runBubbleSort(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 300; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  /* Prepare bars */
  if (opts.array && engine && typeof engine.generateFromArray === 'function') {
    engine.generateFromArray(opts.array);
  } else if (engine && typeof engine.generateBars === 'function') {
    engine.generateBars(opts.arraySize || 30);
  }

  var bars = engine ? engine.getBars() : [];
  var n    = bars.length;

  onLog('info', 'Bubble Sort started. Array size: <span class="log-val">' + n + '</span>.');

  for (var i = 0; i < n - 1; i++) {
    var swapped = false;
    onVar('i', i);

    for (var j = 0; j < n - i - 1; j++) {
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;

      onVar('j', j);
      onCnt('comparisons'); onCnt('array_accesses', 2);

      bars[j].classList.add('comparing');
      bars[j + 1].classList.add('comparing');

      var a = parseInt(bars[j].dataset.value);
      var b = parseInt(bars[j + 1].dataset.value);

      await sleep(getDelay());

      if (a > b) {
        bars[j].classList.replace('comparing', 'swapping');
        bars[j + 1].classList.replace('comparing', 'swapping');
        await sleep(getDelay() * 0.4);

        engine.swapBars(bars[j], bars[j + 1]);
        onCnt('swaps');
        onVar('swapped', 'true');
        swapped = true;

        onLog('swap',
          'i=<span class="log-idx">' + i + '</span>, j=<span class="log-idx">' + j + '</span>: ' +
          'Swap <span class="log-val">' + a + '</span> ↔ <span class="log-val">' + b + '</span>.'
        );
      }

      bars[j].classList.remove('comparing', 'swapping');
      bars[j + 1].classList.remove('comparing', 'swapping');
    }

    bars[n - 1 - i].classList.add('sorted');
    onCnt('passes');
    onVar('swapped', swapped ? 'true' : 'false');

    if (!swapped) {
      onLog('found', 'No swaps in pass ' + (i + 1) + ' — early exit (array already sorted).');
      break;
    }
  }

  if (!control.isAborted) {
    bars.forEach(function(b) { b.classList.add('sorted'); });
    onLog('done', '<i class="fa-solid fa-check"></i> Sorted!');
    return true;
  }
  return false;
}
