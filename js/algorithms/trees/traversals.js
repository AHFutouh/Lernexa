/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — Tree Traversals (In-order / Pre-order / Post-order / Level-order)
   Engine: graphEngine
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runTreeTraversals(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 500; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  /* Traversal mode — default 'inorder', can be overridden via customInput */
  var mode = (opts.algo && opts.algo.input && opts.algo.input.defaultMode) || 'inorder';
  if (opts.customInput && opts.customInput.mode) mode = opts.customInput.mode;

  if (!engine) { onLog('compare', 'No engine attached.'); return false; }

  /* Build the default BST into the engine (uses algo.input.defaultValues) */
  engine.buildDefaultBST();

  var root = engine.getRootValue();
  if (root === null || root === undefined) {
    onLog('compare', 'Tree is empty — cannot traverse.');
    return false;
  }

  var modeLabel = {
    inorder:    'In-order  (Left → Root → Right)',
    preorder:   'Pre-order (Root → Left → Right)',
    postorder:  'Post-order (Left → Right → Root)',
    levelorder: 'Level-order (BFS, left→right per level)'
  };

  onLog('info', '<strong>' + (modeLabel[mode] || mode) + '</strong>');
  onVar('mode', mode);
  onVar('visited', 0);
  onVar('order', '');

  var visitedOrder = [];
  var visitCount   = 0;

  /* ── visit helper ── */
  async function visit(val) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return;

    engine.setNodeState(val, 'found');
    visitCount++;
    visitedOrder.push(val);
    onCnt('visits');
    onVar('visited', visitCount);
    onVar('current', val);
    onVar('order', visitedOrder.join(' → '));
    onLog('info', 'Visit <span class="log-val">' + val + '</span> &nbsp;[' + visitedOrder.join(', ') + ']');
    await sleep(getDelay());
    engine.setNodeState(val, 'visited');
  }

  async function approach(val) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (!control.isAborted) engine.setNodeState(val, 'visiting');
    await sleep(getDelay() * 0.3);
  }

  /* ── Traversal implementations ── */
  async function inorder(val) {
    if (val === null || val === undefined || control.isAborted) return;
    await approach(val);
    await inorder(engine.getLeftChild(val));
    await visit(val);
    await inorder(engine.getRightChild(val));
  }

  async function preorder(val) {
    if (val === null || val === undefined || control.isAborted) return;
    await visit(val);
    await preorder(engine.getLeftChild(val));
    await preorder(engine.getRightChild(val));
  }

  async function postorder(val) {
    if (val === null || val === undefined || control.isAborted) return;
    await approach(val);
    await postorder(engine.getLeftChild(val));
    await postorder(engine.getRightChild(val));
    await visit(val);
  }

  async function levelorder(rootVal) {
    if (rootVal === null || rootVal === undefined) return;
    var queue = [rootVal];
    var level = 0;

    while (queue.length > 0 && !control.isAborted) {
      while (control.isPaused && !control.isAborted) { await sleep(60); }
      var levelSize = queue.length;
      level++;
      onVar('level', level);

      for (var i = 0; i < levelSize && !control.isAborted; i++) {
        var v  = queue.shift();
        await visit(v);
        var lc = engine.getLeftChild(v);
        var rc = engine.getRightChild(v);
        if (lc !== null && lc !== undefined) queue.push(lc);
        if (rc !== null && rc !== undefined) queue.push(rc);
      }
    }
  }

  /* ── Dispatch ── */
  switch (mode) {
    case 'inorder':    await inorder(root);    break;
    case 'preorder':   await preorder(root);   break;
    case 'postorder':  await postorder(root);  break;
    case 'levelorder': await levelorder(root); break;
    default:           await inorder(root);
  }

  if (!control.isAborted) {
    onLog('done', '<i class="fa-solid fa-check"></i> Traversal complete: <span class="log-val">' + visitedOrder.join(' → ') + '</span>');
  }
  return !control.isAborted;
}
