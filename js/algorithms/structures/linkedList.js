/* ════════════════════════════════════════════════════════════
   Lernexa — Linked List (Singly & Doubly)
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runLinkedList(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 800; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  var ops = (opts.algo && opts.algo.input && opts.algo.input.defaultOps) || ['insert_head:10','insert_head:20','insert_tail:30','delete:20','search:30'];

  if (engine && typeof engine.reset === 'function') engine.reset();
  onLog('info', 'Singly Linked List simulation. ' + ops.length + ' operations.');

  for (var i = 0; i < ops.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var op  = ops[i];
    var col = op.indexOf(':');
    var cmd = col === -1 ? op : op.substring(0, col);
    var val = col === -1 ? null : parseInt(op.substring(col + 1));

    onVar('current', val);

    if (cmd === 'insert_head') {
      engine.insertHead(val);
      onCnt('insertions');
      onVar('head', val);
      onLog('found', '<strong>INSERT HEAD</strong> <span class="log-val">' + val + '</span> → O(1) operation.');
    } else if (cmd === 'insert_tail') {
      /* traverse animation: highlight nodes one-by-one up to current tail */
      var currentLen = engine.getAll().length;
      if (currentLen > 0 && typeof engine.traverseHighlight === 'function') {
        var traverseDelay = Math.max(120, Math.floor(getDelay() / Math.max(currentLen, 1)));
        engine.traverseHighlight(currentLen - 1, traverseDelay);
        /* wait for traverse to finish before inserting */
        await sleep(currentLen * traverseDelay + 300);
      }
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;
      engine.insertTail(val);
      onCnt('insertions'); onCnt('traversals');
      onVar('tail', val);
      onLog('compare', '<strong>INSERT TAIL</strong> <span class="log-val">' + val + '</span> → traversed to end, O(n).');
    } else if (cmd === 'delete') {
      /* traverse animation: scan to find the node */
      var allVals = engine.getAll();
      var deleteTargetIdx = -1;
      for (var d = 0; d < allVals.length; d++) {
        if (allVals[d] === val) { deleteTargetIdx = d; break; }
      }
      if (deleteTargetIdx >= 0 && typeof engine.traverseHighlight === 'function') {
        var delTraverseDelay = Math.max(120, Math.floor(getDelay() / Math.max(deleteTargetIdx + 1, 1)));
        engine.traverseHighlight(deleteTargetIdx, delTraverseDelay);
        await sleep((deleteTargetIdx + 1) * delTraverseDelay + 300);
      }
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;
      var deleted = engine.deleteNode(val);
      if (deleted) {
        onCnt('deletions'); onCnt('traversals');
        onLog('swap', '<strong>DELETE</strong> node with value <span class="log-val">' + val + '</span>.');
      } else {
        onLog('compare', 'DELETE: Value <span class="log-val">' + val + '</span> not found.');
      }
    } else if (cmd === 'search') {
      /* traverse animation: scan all nodes */
      var searchVals = engine.getAll();
      var searchTargetIdx = searchVals.length - 1;
      for (var s = 0; s < searchVals.length; s++) {
        if (searchVals[s] === val) { searchTargetIdx = s; break; }
      }
      if (typeof engine.traverseHighlight === 'function') {
        var searchDelay = Math.max(120, Math.floor(getDelay() / Math.max(searchTargetIdx + 1, 1)));
        engine.traverseHighlight(searchTargetIdx, searchDelay);
        await sleep((searchTargetIdx + 1) * searchDelay + 300);
      }
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      if (control.isAborted) return false;
      engine.highlight(val);
      onCnt('traversals');
      onLog('info', '<strong>SEARCH</strong> for <span class="log-val">' + val + '</span> — linear scan O(n), found at index ' + searchTargetIdx + '.');
    }

    await sleep(getDelay());
  }

  onLog('done', '<i class="fa-solid fa-check"></i> All operations complete.');
  return true;
}

async function runDoublyLinkedList(opts) {
  /* Reuses same engine, just different label */
  opts.onLog && opts.onLog('info', 'Doubly Linked List — same operations, bidirectional pointers.');
  return runLinkedList(opts);
}
