/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — Selection Sort
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runSelectionSort(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 300; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  if (opts.array && engine && typeof engine.generateFromArray === 'function') {
    engine.generateFromArray(opts.array);
  } else if (engine && typeof engine.generateBars === 'function') {
    engine.generateBars(opts.arraySize || 30);
  }

  var bars = engine ? engine.getBars() : [];
  var n    = bars.length;
  onLog('info', 'Selection Sort started. Array size: <span class="log-val">' + n + '</span>.');

  for (var i = 0; i < n - 1; i++) {
    var minIdx = i;
    bars[i].classList.add('comparing');
    onVar('i', i); onVar('min_idx', minIdx);

    for (var j = i + 1; j < n; j++) {
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;

      onVar('j', j);
      onCnt('comparisons');
      bars[j].classList.add('comparing');
      await sleep(getDelay());

      if (parseInt(bars[j].dataset.value) < parseInt(bars[minIdx].dataset.value)) {
        if (minIdx !== i) bars[minIdx].classList.remove('comparing');
        minIdx = j;
        onVar('min_idx', minIdx);
        onLog('compare', 'New minimum found at index <span class="log-idx">' + j + '</span> (value <span class="log-val">' + bars[j].dataset.value + '</span>).');
      } else {
        bars[j].classList.remove('comparing');
      }
    }

    if (minIdx !== i) {
      bars[i].classList.replace('comparing', 'swapping');
      bars[minIdx].classList.replace('comparing', 'swapping');
      await sleep(getDelay() * 0.5);
      engine.swapBars(bars[i], bars[minIdx]);
      onCnt('swaps');
      bars[i].classList.remove('swapping');
      bars[minIdx].classList.remove('swapping');
      onLog('swap', 'Swap index <span class="log-idx">' + i + '</span> ↔ <span class="log-idx">' + minIdx + '</span>.');
    } else {
      bars[i].classList.remove('comparing');
    }

    bars[i].classList.add('sorted');
  }

  if (!control.isAborted) {
    bars.forEach(function(b) { b.classList.add('sorted'); });
    onLog('done', '<i class="fa-solid fa-check"></i> Sorted!');
    return true;
  }
  return false;
}
