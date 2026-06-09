/* ════════════════════════════════════════════════════════════
   Lernexa — Depth-First Search (DFS)
   Engine: networkEngine
   Explores as deep as possible before backtracking.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runDFS(opts) {
  var engine   = opts.engine;
  var control  = opts.control   || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay  || function() { return 300; };
  var onLog    = opts.onLog     || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  if (!engine || !engine.getStartNode) { onLog('compare', 'No network engine attached.'); return false; }
  engine.reset();

  var startId = engine.getStartNode();
  var endId   = engine.getEndNode();

  if (startId === null || endId === null) {
    onLog('compare', 'Set start and end nodes first, then press Play.');
    return false;
  }

  onLog('info',
    'DFS — Start: <span class="log-val">Node ' + startId + '</span> → ' +
    'Goal: <span class="log-val">Node ' + endId + '</span>'
  );
  onVar('start',      startId);
  onVar('goal',       endId);
  onVar('stack_size', 1);
  onVar('visited',    0);
  onVar('current',    startId);

  /* Stack holds {id, par} pairs so a node's parent is recorded at the
     moment it is actually popped/visited — not when first discovered.
     This keeps the reconstructed path consistent with the real DFS
     traversal order (the previous discovery-time assignment could draw a
     parent edge DFS never traversed). */
  var stack   = [{ id: startId, par: null }];
  var visited = new Set();
  var parent  = {};
  var found = false;

  while (stack.length > 0 && !found) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var frame   = stack.pop();
    var current = frame.id;
    if (visited.has(current)) continue;
    visited.add(current);
    parent[current] = frame.par;

    engine.setNodeState(current, 'visiting');
    onCnt('nodes_visited');
    onVar('current',    current);
    onVar('stack_size', stack.length);
    onVar('visited',    visited.size);

    if (current === endId) {
      var path = [], c = current;
      while (c !== null && c !== undefined) { path.unshift(c); c = parent[c]; }
      engine.highlightPath(path);
      onLog('found',
        '<strong>Goal reached!</strong> Path: <span class="log-val">' +
        path.join(' &rarr; ') + '</span> (length: ' + path.length + ', may not be shortest)'
      );
      onVar('path_length', path.length);
      found = true;
      break;
    }

    await sleep(getDelay());
    engine.setNodeState(current, 'visited');

    var neighbors = engine.getNeighbors(current);
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i].id;
      if (!visited.has(nb)) {
        stack.push({ id: nb, par: current });
        engine.setEdgeState(current, nb, 'visiting');
        onCnt('comparisons');
      }
    }
    onLog('compare',
      'Visiting Node <span class="log-idx">' + current + '</span> — ' +
      'stack depth: <span class="log-val">' + stack.length + '</span>'
    );
  }

  if (!found) {
    onLog('compare',
      'No path found from Node ' + startId + ' to Node ' + endId + '.'
    );
  }
  return found;
}
