/* ════════════════════════════════════════════════════════════
   Lernexa — Stack (LIFO)
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runStack(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 700; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  var ops = (opts.algo && opts.algo.input && opts.algo.input.defaultOps) || ['push:10','push:20','push:30','pop'];

  if (engine && typeof engine.reset === 'function') engine.reset();

  onLog('info', 'Stack (LIFO) simulation. ' + ops.length + ' operations to run.');
  onVar('top', -1); onVar('size', 0);

  var size = 0;

  for (var i = 0; i < ops.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var op  = ops[i];
    var col = op.indexOf(':');
    var cmd = col === -1 ? op : op.substring(0, col);
    var val = col === -1 ? null : parseInt(op.substring(col + 1));

    if (cmd === 'push') {
      engine.push(val, true);
      size++;
      onCnt('pushes');
      onVar('top', 0); onVar('size', size);
      onLog('found', '<strong>PUSH</strong> <span class="log-val">' + val + '</span> → Stack size: ' + size);
    } else if (cmd === 'pop') {
      var popped = engine.pop();
      if (popped !== undefined) {
        size--;
        onCnt('pops');
        onVar('top', size > 0 ? 0 : -1); onVar('size', size);
        onLog('swap', '<strong>POP</strong> → removed <span class="log-val">' + popped + '</span>. Stack size: ' + size);
      } else {
        onLog('compare', 'POP: Stack is <strong>empty</strong>. Nothing to pop.');
      }
    } else if (cmd === 'peek') {
      var all = engine.getAll();
      if (all.length) {
        onLog('info', '<strong>PEEK</strong> → top element = <span class="log-val">' + all[0] + '</span> (no removal).');
      } else {
        onLog('compare', 'PEEK: Stack is empty.');
      }
    }

    await sleep(getDelay());
  }

  onLog('done', '<i class="fa-solid fa-check"></i> All operations complete.');
  return true;
}
