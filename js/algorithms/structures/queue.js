/* ════════════════════════════════════════════════════════════
   Lernexa — Queue (FIFO)
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runQueue(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 700; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  var ops = (opts.algo && opts.algo.input && opts.algo.input.defaultOps) || ['enqueue:10','enqueue:20','enqueue:30','dequeue'];

  if (engine && typeof engine.reset === 'function') engine.reset();

  onLog('info', 'Queue (FIFO) simulation. ' + ops.length + ' operations.');
  onVar('front', -1); onVar('rear', -1); onVar('size', 0);

  var size = 0;

  for (var i = 0; i < ops.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var op  = ops[i];
    var col = op.indexOf(':');
    var cmd = col === -1 ? op : op.substring(0, col);
    var val = col === -1 ? null : parseInt(op.substring(col + 1));

    if (cmd === 'enqueue') {
      engine.enqueue(val);
      size++;
      onCnt('enqueues');
      onVar('rear', size - 1); onVar('size', size);
      onLog('found', '<strong>ENQUEUE</strong> <span class="log-val">' + val + '</span> at rear. Size: ' + size);
    } else if (cmd === 'dequeue') {
      var removed = engine.dequeue();
      if (removed !== undefined) {
        size--;
        onCnt('dequeues');
        onVar('front', 0); onVar('size', size);
        onLog('swap', '<strong>DEQUEUE</strong> → removed <span class="log-val">' + removed + '</span> from front. Size: ' + size);
      } else {
        onLog('compare', 'DEQUEUE: Queue is empty.');
      }
    }

    await sleep(getDelay());
  }

  onLog('done', '<i class="fa-solid fa-check"></i> All operations complete.');
  return true;
}
