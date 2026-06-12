/* ════════════════════════════════════════════════════════════
   Lernexa — Binary Search Tree (BST) Operations
   Engine: graphEngine  (SVG tree)
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runBST(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 500; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  /* Default ops from JSON input or hardcoded fallback */
  var ops = (opts.algo && opts.algo.input && opts.algo.input.defaultOps)
    || ['insert:50','insert:30','insert:70','insert:20','insert:40','insert:60','insert:80','search:40','search:90'];

  if (!engine) { onLog('compare', 'No engine attached.'); return false; }

  /* ── Internal BST ── */
  var root = null;
  var size = 0;

  function newNode(v) { return { val: v, left: null, right: null }; }

  function insert(node, v) {
    if (!node) return newNode(v);
    if (v < node.val)      node.left  = insert(node.left,  v);
    else if (v > node.val) node.right = insert(node.right, v);
    return node;
  }

  function treeHeight(node) {
    if (!node) return 0;
    return 1 + Math.max(treeHeight(node.left), treeHeight(node.right));
  }

  /* Returns path of values visited to reach target (or until null) */
  function searchPath(node, v, path) {
    if (!node) return false;
    path.push(node.val);
    if (v === node.val) return true;
    if (v < node.val)  return searchPath(node.left,  v, path);
    return searchPath(node.right, v, path);
  }

  onLog('info', 'BST simulation — <span class="log-val">' + ops.length + '</span> operations.');
  onVar('size', 0);
  onVar('height', 0);

  for (var i = 0; i < ops.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var op  = ops[i];
    var col = op.indexOf(':');
    var cmd = col === -1 ? op : op.substring(0, col);
    var val = col === -1 ? null : parseInt(op.substring(col + 1));

    onVar('current', val);

    if (cmd === 'insert') {
      /* Highlight traversal path first */
      var path = [];
      searchPath(root, val, path);
      for (var p = 0; p < path.length; p++) {
        engine.setNodeState(path[p], 'visiting');
        onCnt('comparisons');
        await sleep(getDelay() * 0.4);
        engine.setNodeState(path[p], 'default');
      }

      root = insert(root, val);
      size++;

      /* Rebuild SVG with updated tree */
      engine.buildBSTFromRoot(root);
      /* Highlight new node */
      engine.setNodeState(val, 'found');
      onCnt('insertions');
      onVar('size', size);
      onVar('height', treeHeight(root));
      onLog('found', '<strong>INSERT</strong> <span class="log-val">' + val + '</span> — BST property maintained. Height: <span class="log-val">' + treeHeight(root) + '</span>');
      await sleep(getDelay());
      engine.setNodeState(val, 'default');

    } else if (cmd === 'search') {
      var sPath = [];
      var found = searchPath(root, val, sPath);
      onLog('info', '<strong>SEARCH</strong> for <span class="log-val">' + val + '</span> — scanning <span class="log-val">' + sPath.length + '</span> node(s).');

      for (var s = 0; s < sPath.length; s++) {
        while (control.isPaused && !control.isAborted) { await sleep(60); }
        if (control.isAborted) return false;
        engine.setNodeState(sPath[s], 'visiting');
        onCnt('comparisons');
        onVar('comparing', sPath[s]);
        await sleep(getDelay());
        engine.setNodeState(sPath[s], sPath[s] === val ? 'found' : 'visited');
        if (sPath[s] !== val) await sleep(getDelay() * 0.3);
      }

      if (found) {
        onCnt('found_count');
        onLog('found', '<strong>FOUND</strong> <span class="log-val">' + val + '</span> in <span class="log-val">' + sPath.length + '</span> comparison(s).');
      } else {
        onLog('compare', '<strong>NOT FOUND:</strong> <span class="log-val">' + val + '</span> — exhausted tree in <span class="log-val">' + sPath.length + '</span> step(s).');
      }
      await sleep(getDelay());
      for (var r = 0; r < sPath.length; r++) engine.setNodeState(sPath[r], 'default');
    }

    await sleep(getDelay() * 0.4);
  }

  onLog('done', '<i class="fa-solid fa-check"></i> BST complete. Size: <span class="log-val">' + size + '</span>, height: <span class="log-val">' + treeHeight(root) + '</span>.');
  return true;
}
