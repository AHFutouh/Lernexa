/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — Binary Search
   Pure algorithm engine. Zero DOM access.
   Communicates via opts.onStep callback pattern.
   ════════════════════════════════════════════════════════════ */

'use strict';

var BS_STEP = Object.freeze({
  INIT:       'INIT',
  COMPARE:    'COMPARE',
  MOVE_LEFT:  'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  FOUND:      'FOUND',
  NOT_FOUND:  'NOT_FOUND'
});

/**
 * runBinarySearch(opts) → Promise<boolean>
 *
 * opts.array     {number[]} — sorted ascending
 * opts.target    {number}
 * opts.engine    {MemoryEngine}
 * opts.control   { isPaused, isAborted }
 * opts.getDelay  () → ms
 * opts.onLog     (type, msg) → void
 * opts.onCounter (key, by) → void
 * opts.onVarUpdate (name, value) → void
 * opts.onStep    (snapshot) → void
 */
async function runBinarySearch(opts) {
  var array    = opts.array  || [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  var target   = opts.target !== undefined ? opts.target : 23;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 400; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};
  var onStep   = opts.onStep   || function() {};

  /* Ensure sorted */
  array = sortedCopy(array);

  var left  = 0;
  var right = array.length - 1;
  var step  = 0;

  /* Re-render engine with possibly-sorted array */
  if (opts.engine && typeof opts.engine.updateArray === 'function') {
    opts.engine.updateArray(array);
  }

  if (opts.engine && opts.engine.showTarget) opts.engine.showTarget(target, true);

  /* Visual sort sweep */
  if (opts.engine && opts.engine.getCells) {
    var cells = opts.engine.getCells();
    /* Flash all cells as sorting */
    for (var si = 0; si < cells.length; si++) {
      cells[si].classList.add('sorting');
    }
    await sleep(180);
    /* Reveal as sorted one by one */
    for (var si2 = 0; si2 < cells.length; si2++) {
      cells[si2].classList.remove('sorting');
      cells[si2].classList.add('sorted-reveal');
      await sleep(28);
    }
    await sleep(220);
    for (var si3 = 0; si3 < cells.length; si3++) {
      cells[si3].classList.remove('sorted-reveal');
    }
  }

  onLog('info', 'Binary Search started. Target = <span class="log-val">' + target + '</span>. ' +
    'Array has <span class="log-val">' + array.length + '</span> elements.');

  onStep({ type: BS_STEP.INIT, left: left, right: right, mid: null, target: target, array: array });
  onVar('left', left); onVar('right', right); onVar('mid', '—'); onVar('mid_value', '—');
  await sleep(getDelay());

  /* ── Main loop ── */
  while (left <= right) {

    /* Pause / abort check */
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    step++;
    var mid = Math.floor((left + right) / 2);
    var midVal = array[mid];

    onCnt('comparisons'); onCnt('accesses'); onCnt('steps');
    onVar('left', left); onVar('right', right); onVar('mid', mid); onVar('mid_value', midVal);

    onStep({ type: BS_STEP.COMPARE, left: left, right: right, mid: mid, target: target, array: array });

    onLog('compare',
      'Step <span class="log-idx">' + step + '</span>: ' +
      'L=<span class="log-idx">' + left + '</span>, ' +
      'M=<span class="log-idx">' + mid + '</span>, ' +
      'R=<span class="log-idx">' + right + '</span>. ' +
      'arr[M] = <span class="log-val">' + midVal + '</span> vs target <span class="log-val">' + target + '</span>.'
    );

    await sleep(getDelay());
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    if (midVal === target) {
      /* ── FOUND ── */
      onStep({ type: BS_STEP.FOUND, left: left, right: right, mid: mid, foundIndex: mid, target: target, array: array });
      onVar('left', left); onVar('right', right); onVar('mid', mid); onVar('mid_value', midVal);
      onLog('found',
        '<i class="fa-solid fa-check"></i> Found! ' +
        'Target <span class="log-val">' + target + '</span> is at index <span class="log-idx">' + mid + '</span>. ' +
        'Took <span class="log-val">' + step + '</span> step' + (step !== 1 ? 's' : '') + '.'
      );
      await sleep(getDelay() * 1.5);
      return true;

    } else if (midVal < target) {
      /* ── MOVE LEFT (advance left pointer) ── */
      left = mid + 1;
      if (opts.engine && opts.engine.eliminateRange) opts.engine.eliminateRange(0, mid);
      onStep({ type: BS_STEP.MOVE_LEFT, left: left, right: right, mid: mid, target: target, array: array });
      onVar('left', left);
      onLog('move',
        'arr[M] = <span class="log-val">' + midVal + '</span> &lt; target. ' +
        'Move <span class="log-val">L</span> → <span class="log-idx">' + left + '</span>.'
      );
    } else {
      /* ── MOVE RIGHT (retreat right pointer) ── */
      right = mid - 1;
      if (opts.engine && opts.engine.eliminateRange) opts.engine.eliminateRange(mid, array.length - 1);
      onStep({ type: BS_STEP.MOVE_RIGHT, left: left, right: right, mid: mid, target: target, array: array });
      onVar('right', right);
      onLog('move',
        'arr[M] = <span class="log-val">' + midVal + '</span> &gt; target. ' +
        'Move <span class="log-val">R</span> → <span class="log-idx">' + right + '</span>.'
      );
    }

    await sleep(getDelay());
  }

  /* ── NOT FOUND ── */
  onStep({ type: BS_STEP.NOT_FOUND, left: left, right: right, mid: null, target: target, array: array });
  onVar('left', left); onVar('right', right);
  onLog('done',
    '<i class="fa-solid fa-xmark"></i> Not found. ' +
    'Target <span class="log-val">' + target + '</span> is not in the array. ' +
    'Took <span class="log-val">' + step + '</span> step' + (step !== 1 ? 's' : '') + '.'
  );
  await sleep(getDelay());
  return true;
}
