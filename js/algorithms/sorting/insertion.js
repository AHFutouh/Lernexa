/* ════════════════════════════════════════════════════════════
   Lernexa — Insertion Sort
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runInsertionSort(opts) {
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
  onLog('info',
    'Insertion Sort — <span class="log-val">' + n + '</span> elements | ' +
    'grows sorted region from left, inserting one element at a time'
  );
  bars[0].classList.add('sorted');

  for (var i = 1; i < n; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var keyH = bars[i].style.height;
    var keyV = parseInt(bars[i].dataset.value);
    bars[i].classList.add('comparing');
    onVar('i', i); onVar('key', keyV);

    onLog('compare',
      'Key = <span class="log-val">' + keyV + '</span> (index ' + i + ') — ' +
      'scanning sorted region [0..' + (i - 1) + ']'
    );
    await sleep(getDelay());

    var j = i - 1;
    var shifts = 0;
    while (j >= 0 && parseInt(bars[j].dataset.value) > keyV) {
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;

      onVar('j', j);
      onCnt('comparisons'); onCnt('shifts');
      bars[j + 1].style.height   = bars[j].style.height;
      bars[j + 1].dataset.value  = bars[j].dataset.value;
      bars[j].classList.add('comparing');
      await sleep(getDelay() * 0.6);
      bars[j].classList.remove('comparing');
      j--;
      shifts++;
    }
    /* Count the final comparison that ENDED the scan (bars[j] <= key).
       It happens whenever the loop stopped before running off the left
       edge — previously uncounted, slightly undercounting comparisons. */
    if (j >= 0) onCnt('comparisons');

    bars[j + 1].style.height  = keyH;
    bars[j + 1].dataset.value = keyV;
    bars[i].classList.remove('comparing');
    bars[i].classList.add('sorted');

    if (shifts > 0) {
      onLog('swap',
        '<span class="log-val">' + keyV + '</span> shifted ' +
        '<span class="log-val">' + shifts + '</span> place' + (shifts > 1 ? 's' : '') +
        ' left → inserted at index <span class="log-val">' + (j + 1) + '</span>'
      );
    } else {
      onLog('info',
        '<span class="log-val">' + keyV + '</span> already in correct position at index ' +
        '<span class="log-val">' + (j + 1) + '</span> — no shifts needed'
      );
    }

    /* Mark sorted region */
    for (var s = 0; s <= i; s++) bars[s].classList.add('sorted');
  }

  if (!control.isAborted) {
    bars.forEach(function(b) { b.classList.add('sorted'); });
    onLog('done', '<i class="fa-solid fa-check"></i> Sorted!');
    return true;
  }
  return false;
}
