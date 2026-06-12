/* ════════════════════════════════════════════════════════════
   Lernexa — Breadth-First Search (BFS)
   Engine: networkEngine
   Guarantees shortest path (by hop count) in an unweighted graph.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runBFS(opts) {
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
    'BFS — Start: <span class="log-val">Node ' + startId + '</span> → ' +
    'Goal: <span class="log-val">Node ' + endId + '</span>'
  );
  onVar('start',      startId);
  onVar('goal',       endId);
  onVar('queue_size', 1);
  onVar('visited',    0);
  onVar('current',    startId);

  var queue   = [startId];
  var visited = new Set([startId]);
  var parent  = {};
  parent[startId] = null;

  while (queue.length > 0) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var current = queue.shift();
    engine.setNodeState(current, 'visiting');
    onCnt('nodes_visited');
    onVar('current',    current);
    onVar('queue_size', queue.length);
    onVar('visited',    visited.size);

    if (current === endId) {
      /* Trace shortest path */
      var path = [], c = current;
      while (c !== null && c !== undefined) { path.unshift(c); c = parent[c]; }
      engine.highlightPath(path);
      onLog('found',
        '<strong>Goal reached!</strong> Path: <span class="log-val">' +
        path.join(' &rarr; ') + '</span> (length: ' + path.length + ')'
      );
      onVar('path_length', path.length);
      return true;
    }

    await sleep(getDelay());
    engine.setNodeState(current, 'visited');

    var neighbors = engine.getNeighbors(current);
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i].id;
      if (!visited.has(nb)) {
        visited.add(nb);
        parent[nb] = current;
        queue.push(nb);
        engine.setEdgeState(current, nb, 'visiting');
        onCnt('comparisons');
      }
    }
    onLog('compare',
      'Expanded Node <span class="log-idx">' + current + '</span> — ' +
      'queue: [<span class="log-val">' + queue.join(', ') + '</span>]'
    );
  }

  onLog('compare',
    'No path found from Node ' + startId + ' to Node ' + endId + '.'
  );
  return false;
}
