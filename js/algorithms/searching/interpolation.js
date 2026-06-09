/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — Interpolation Search
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runInterpolationSearch(opts) {
  var array    = opts.array  || [10,20,30,40,50,60,70,80,90,100];
  var target   = opts.target !== undefined ? opts.target : 70;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 500; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};
  var onStep   = opts.onStep   || function() {};

  array = sortedCopy(array);
  if (opts.engine && typeof opts.engine.updateArray === 'function') opts.engine.updateArray(array);

  if (opts.engine && opts.engine.showTarget) opts.engine.showTarget(target, true);
  if (opts.engine && opts.engine.showFormula) opts.engine.showFormula();

  onLog('info', 'Interpolation Search started. Target = <span class="log-val">' + target + '</span>.');

  var low = 0, high = array.length - 1, step = 0;
  onVar('low', low); onVar('high', high); onVar('pos', '—'); onVar('pos_value', '—');
  await sleep(getDelay());

  while (low <= high && target >= array[low] && target <= array[high]) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    step++;

    /* Interpolation formula */
    var range = array[high] - array[low];
    var pos = range === 0
      ? low
      : low + Math.floor(((target - array[low]) / range) * (high - low));

    if (opts.engine && opts.engine.showFormulaCalc) opts.engine.showFormulaCalc(target, array[low], array[high], low, high, pos);
    if (opts.engine && opts.engine.setPosProbe) opts.engine.setPosProbe(pos);

    onCnt('comparisons'); onCnt('steps');
    onVar('low', low); onVar('high', high); onVar('pos', pos); onVar('pos_value', array[pos]);

    onStep({ type: 'COMPARE', left: low, right: high, pos: pos, target: target, array: array });

    onLog('compare',
      'Step <span class="log-idx">' + step + '</span>: pos = <span class="log-idx">' + pos +
      '</span>, arr[pos] = <span class="log-val">' + array[pos] + '</span>.'
    );

    await sleep(getDelay());
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    if (array[pos] === target) {
      onStep({ type: 'FOUND', pos: pos, foundIndex: pos, target: target, array: array });
      onLog('found',
        '<i class="fa-solid fa-check"></i> Found at index <span class="log-idx">' + pos + '</span> in <span class="log-val">' + step + '</span> step(s).'
      );
      await sleep(getDelay());
      return true;
    } else if (array[pos] < target) {
      low = pos + 1;
      if (opts.engine && opts.engine.eliminateRange) opts.engine.eliminateRange(0, pos);
      onVar('low', low);
      onLog('move', 'arr[pos] &lt; target. Move low → <span class="log-idx">' + low + '</span>.');
    } else {
      high = pos - 1;
      if (opts.engine && opts.engine.eliminateRange) opts.engine.eliminateRange(pos, array.length - 1);
      onVar('high', high);
      onLog('move', 'arr[pos] &gt; target. Move high → <span class="log-idx">' + high + '</span>.');
    }
    await sleep(getDelay());
  }

  onStep({ type: 'NOT_FOUND', target: target, array: array });
  onLog('done', '<i class="fa-solid fa-xmark"></i> Target not found after <span class="log-val">' + step + '</span> step(s).');
  return true;
}
