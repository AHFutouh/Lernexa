/* ════════════════════════════════════════════════════════════
   Lernexa — Merge Sort
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runMergeSort(opts) {
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

  var bars   = engine ? engine.getBars() : [];
  var values = bars.map(function(b) { return parseInt(b.dataset.value); });
  var n      = values.length;

  onLog('info',
    'Merge Sort — <span class="log-val">' + n + '</span> elements | ' +
    'splits into ' + Math.ceil(Math.log2(n || 1)) + ' levels of sub-arrays'
  );

  await _mergeSortHelper(values, 0, values.length - 1, bars, engine, getDelay, control, onLog, onCnt, onVar);

  if (!control.isAborted) {
    bars.forEach(function(b) { b.classList.add('sorted'); });
    onLog('done', '<i class="fa-solid fa-check"></i> Sorted!');
    return true;
  }
  return false;
}

async function _mergeSortHelper(arr, left, right, bars, engine, getDelay, control, onLog, onCnt, onVar) {
  if (left >= right || control.isAborted) return;
  var mid = Math.floor((left + right) / 2);
  if (onVar) { onVar('left', left); onVar('right', right); onVar('mid', mid); }
  await _mergeSortHelper(arr, left, mid, bars, engine, getDelay, control, onLog, onCnt, onVar);
  await _mergeSortHelper(arr, mid + 1, right, bars, engine, getDelay, control, onLog, onCnt, onVar);
  await _merge(arr, left, mid, right, bars, engine, getDelay, control, onLog, onCnt, onVar);
}

async function _merge(arr, left, mid, right, bars, engine, getDelay, control, onLog, onCnt, onVar) {
  onVar = onVar || function() {};
  var leftArr  = arr.slice(left, mid + 1);
  var rightArr = arr.slice(mid + 1, right + 1);
  var maxH     = engine ? engine.getMaxHeight() : 400;
  /* Normalise bar heights the SAME way barsEngine.generateFromArray does
     (value / max * maxH * 0.92) so merged bars don't jump to a different
     scale for arrays whose max ≠ 100. */
  var maxV     = Math.max.apply(null, arr) || 100;
  function _h(v) { return ((v / maxV) * maxH * 0.92) + 'px'; }
  var i = 0, j = 0, k = left;
  onVar('left', left); onVar('right', right); onVar('mid', mid);

  /* Only log small merges (≤ 12 total elements) to avoid spam */
  var mergeSize = right - left + 1;
  if (mergeSize <= 12) {
    onLog('compare',
      'Merge [<span class="log-val">' + leftArr.join(', ') + '</span>] + ' +
      '[<span class="log-val">' + rightArr.join(', ') + '</span>]'
    );
  } else if (mergeSize >= arr.length) {
    /* Final merge: always log */
    onLog('compare',
      'Final merge — left ends with <span class="log-val">' + leftArr[leftArr.length - 1] + '</span>, ' +
      'right starts with <span class="log-val">' + rightArr[0] + '</span>'
    );
  }
  onCnt('merges');

  while (i < leftArr.length && j < rightArr.length) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return;

    onCnt('comparisons'); onCnt('array_writes');
    onVar('i', i); onVar('j', j); onVar('k', k);
    bars[k].classList.add('merging');
    await sleep(getDelay());

    if (leftArr[i] <= rightArr[j]) {
      arr[k] = leftArr[i];
      /* Log the winning comparison for small merges */
      if (mergeSize <= 8) {
        onLog('info',
          '<span class="log-val">' + leftArr[i] + '</span> ≤ ' +
          '<span class="log-val">' + rightArr[j] + '</span> → place ' +
          '<span class="log-val">' + leftArr[i] + '</span> at [' + k + ']'
        );
      }
      i++;
    } else {
      arr[k] = rightArr[j];
      if (mergeSize <= 8) {
        onLog('swap',
          '<span class="log-val">' + rightArr[j] + '</span> &lt; ' +
          '<span class="log-val">' + leftArr[i] + '</span> → place ' +
          '<span class="log-val">' + rightArr[j] + '</span> at [' + k + ']'
        );
      }
      j++;
    }

    bars[k].style.height = _h(arr[k]);
    bars[k].dataset.value = arr[k];
    bars[k].classList.remove('merging');
    k++;
  }

  while (i < leftArr.length) {
    if (control.isAborted) return;
    arr[k] = leftArr[i++];
    bars[k].style.height = _h(arr[k]);
    bars[k].dataset.value = arr[k];
    onCnt('array_writes');
    onVar('i', i); onVar('k', k);
    k++;
  }

  while (j < rightArr.length) {
    if (control.isAborted) return;
    arr[k] = rightArr[j++];
    bars[k].style.height = _h(arr[k]);
    bars[k].dataset.value = arr[k];
    onCnt('array_writes');
    onVar('j', j); onVar('k', k);
    k++;
  }
}
