/* ════════════════════════════════════════════════════════════
   Lernexa — Linear Search
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runLinearSearch(opts) {
  var array    = opts.array  || [4, 7, 2, 19, 1, 13, 8, 6, 11, 5];
  var target   = opts.target !== undefined ? opts.target : 13;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 400; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};
  var onStep   = opts.onStep   || function() {};

  if (opts.engine && typeof opts.engine.updateArray === 'function') {
    opts.engine.updateArray(array);
  }

  if (opts.engine && opts.engine.showTarget) opts.engine.showTarget(target, false);

  onLog('info', 'Linear Search started. Target = <span class="log-val">' + target + '</span>. ' +
    'Scanning <span class="log-val">' + array.length + '</span> elements left to right.');

  onVar('i', 0); onVar('current', '—'); onVar('target', target);
  await sleep(getDelay());

  for (var i = 0; i < array.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    onCnt('comparisons'); onCnt('accesses');
    onVar('i', i); onVar('current', array[i]);

    onStep({ type: 'COMPARE', current: i, target: target, array: array });

    onLog('compare',
      'Index <span class="log-idx">' + i + '</span>: arr[i] = <span class="log-val">' + array[i] + '</span> vs target <span class="log-val">' + target + '</span>.'
    );

    await sleep(getDelay());

    if (array[i] === target) {
      onStep({ type: 'FOUND', current: i, foundIndex: i, target: target, array: array });
      onLog('found',
        '<i class="fa-solid fa-check"></i> Found! ' +
        'Target <span class="log-val">' + target + '</span> at index <span class="log-idx">' + i + '</span>.'
      );
      await sleep(getDelay() * 1.5);
      return true;
    }

    if (opts.engine && opts.engine.flashMismatch) opts.engine.flashMismatch(i);
  }

  onStep({ type: 'NOT_FOUND', target: target, array: array });
  onLog('done',
    '<i class="fa-solid fa-xmark"></i> Target <span class="log-val">' + target +
    '</span> not found after <span class="log-val">' + array.length + '</span> comparisons.'
  );
  return true;
}
