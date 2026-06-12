/* ════════════════════════════════════════════════════════════
   Lernexa — Heap Sort
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runHeapSort(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 250; };
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
  onLog('info',
    'Heap Sort — <span class="log-val">' + n + '</span> elements | ' +
    'Phase 1: build max-heap from index <span class="log-val">' + (Math.floor(n / 2) - 1) + '</span> down to 0'
  );
  onVar('n', n);

  /* ── Phase 1: Build Max-Heap ── */
  for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;
    await _heapify(bars, n, i, engine, getDelay, control, onLog, onCnt, onVar);
  }

  var rootVal = parseInt(bars[0].dataset.value);
  onLog('found',
    'Max-heap built — root (maximum) = <span class="log-val">' + rootVal + '</span> | ' +
    'Phase 2: extract max repeatedly'
  );

  /* ── Phase 2: Extract elements ── */
  var extracted = 0;
  for (var j = n - 1; j > 0; j--) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var extractedVal = parseInt(bars[0].dataset.value);
    extracted++;

    /* Log every extraction or every 5th for large arrays */
    if (n <= 15 || extracted % 5 === 1 || j === 1) {
      onLog('swap',
        'Extract max <span class="log-val">' + extractedVal + '</span> → place at index ' +
        '<span class="log-val">' + j + '</span> | ' +
        extracted + ' of ' + (n - 1) + ' extractions'
      );
    }

    bars[0].classList.add('swapping');
    bars[j].classList.add('swapping');
    await sleep(getDelay() * 0.5);
    engine.swapBars(bars[0], bars[j]);
    onCnt('swaps');
    bars[0].classList.remove('swapping');
    bars[j].classList.add('sorted');
    bars[j].classList.remove('swapping');

    await _heapify(bars, j, 0, engine, getDelay, control, onLog, onCnt, onVar);
  }

  if (!control.isAborted) {
    bars[0].classList.add('sorted');
    bars.forEach(function(b) { b.classList.add('sorted'); });
    onLog('done',
      '<i class="fa-solid fa-check"></i> Sorted — ' +
      '<span class="log-val">' + extracted + '</span> extractions, minimum = ' +
      '<span class="log-val">' + parseInt(bars[0].dataset.value) + '</span>'
    );
    return true;
  }
  return false;
}

async function _heapify(bars, n, i, engine, getDelay, control, onLog, onCnt, onVar) {
  var largest = i;
  var left    = 2 * i + 1;
  var right   = 2 * i + 2;

  onVar('root', i); onVar('left', left); onVar('right', right);

  if (left < n) {
    onCnt('comparisons');
    if (parseInt(bars[left].dataset.value) > parseInt(bars[largest].dataset.value)) largest = left;
  }
  if (right < n) {
    onCnt('comparisons');
    if (parseInt(bars[right].dataset.value) > parseInt(bars[largest].dataset.value)) largest = right;
  }

  if (largest !== i) {
    var iVal = parseInt(bars[i].dataset.value);
    var lVal = parseInt(bars[largest].dataset.value);
    onVar('largest', largest);

    bars[i].classList.add('comparing');
    bars[largest].classList.add('comparing');
    await sleep(getDelay() * 0.6);

    /* Log heapify swap with actual values */
    onLog('compare',
      'Heapify: <span class="log-val">' + lVal + '</span> (i=' + largest + ') > ' +
      '<span class="log-val">' + iVal + '</span> (i=' + i + ') → swap'
    );

    engine.swapBars(bars[i], bars[largest]);
    onCnt('swaps');
    bars[i].classList.remove('comparing');
    bars[largest].classList.remove('comparing');
    await _heapify(bars, n, largest, engine, getDelay, control, onLog, onCnt, onVar);
  }
}
