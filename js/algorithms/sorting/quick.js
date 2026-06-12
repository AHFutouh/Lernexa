/* ════════════════════════════════════════════════════════════
   Lernexa — Quick Sort
   Engine: barsEngine
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runQuickSort(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 200; };
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
    'Quick Sort — <span class="log-val">' + n + '</span> elements | ' +
    'pivot strategy: last element | divide & conquer'
  );
  onVar('n', n);

  await _quickSort(bars, 0, n - 1, engine, getDelay, control, onLog, onCnt, onVar);

  if (!control.isAborted) {
    bars.forEach(function(b) { b.classList.add('sorted'); });
    onLog('done', '<i class="fa-solid fa-check"></i> Sorted!');
    return true;
  }
  return false;
}

async function _quickSort(bars, low, high, engine, getDelay, control, onLog, onCnt, onVar) {
  if (low >= high || control.isAborted) return;

  onVar('low', low);
  onVar('high', high);

  var pivotIdx = await _partition(bars, low, high, engine, getDelay, control, onLog, onCnt, onVar);
  if (control.isAborted) return;

  await _quickSort(bars, low, pivotIdx - 1, engine, getDelay, control, onLog, onCnt, onVar);
  await _quickSort(bars, pivotIdx + 1, high, engine, getDelay, control, onLog, onCnt, onVar);
}

async function _partition(bars, low, high, engine, getDelay, control, onLog, onCnt, onVar) {
  var pivotVal = parseInt(bars[high].dataset.value);
  onVar('pivot', pivotVal);
  onCnt('partitions');

  onLog('compare',
    'Partition [' + low + '..' + high + '] — pivot = <span class="log-val">' + pivotVal + '</span> (index ' + high + ')'
  );

  /* Highlight pivot */
  bars[high].classList.add('comparing');

  var i = low - 1;
  onVar('i', i);

  for (var j = low; j < high; j++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return i + 1;

    var jVal = parseInt(bars[j].dataset.value);
    onCnt('comparisons');
    onVar('j', j);

    bars[j].classList.add('comparing');
    await sleep(getDelay() * 0.6);

    if (jVal <= pivotVal) {
      i++;
      onVar('i', i);
      if (i !== j) {
        onLog('swap',
          'bars[<span class="log-val">' + i + '</span>]=' + parseInt(bars[i].dataset.value) +
          ' ↔ bars[<span class="log-val">' + j + '</span>]=' + jVal +
          ' (both ≤ pivot <span class="log-val">' + pivotVal + '</span>)'
        );
        bars[i].classList.add('swapping');
        bars[j].classList.add('swapping');
        await sleep(getDelay() * 0.4);
        engine.swapBars(bars[i], bars[j]);
        onCnt('swaps');
        bars[i].classList.remove('swapping');
        bars[j].classList.remove('swapping');
      }
    }

    bars[j].classList.remove('comparing');
  }

  /* Place pivot in final position */
  var finalPos = i + 1;
  if (finalPos !== high) {
    onLog('found',
      'Pivot <span class="log-val">' + pivotVal + '</span> placed at final index ' +
      '<span class="log-val">' + finalPos + '</span>'
    );
    bars[finalPos].classList.add('swapping');
    bars[high].classList.add('swapping');
    await sleep(getDelay() * 0.5);
    engine.swapBars(bars[finalPos], bars[high]);
    onCnt('swaps');
    bars[finalPos].classList.remove('swapping');
    bars[high].classList.remove('swapping');
  } else {
    onLog('found',
      'Pivot <span class="log-val">' + pivotVal + '</span> already at correct index ' +
      '<span class="log-val">' + finalPos + '</span>'
    );
  }

  bars[high].classList.remove('comparing');
  bars[finalPos].classList.add('sorted');

  return finalPos;
}
