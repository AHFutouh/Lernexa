/* ════════════════════════════════════════════════════════════
   Lernexa — Greedy Best-First Search
   Engine: networkEngine
   Expands the node with the lowest heuristic h(n) —
   Euclidean pixel distance from the node to the goal.
   Fast but NOT guaranteed to find the optimal path.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runGreedy(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function() { return 250; };
  var onLog    = opts.onLog       || function() {};
  var onCnt    = opts.onCounter   || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  if (!engine || !engine.getStartNode) {
    onLog('compare', 'Graph engine not ready.');
    return false;
  }
  engine.reset();

  var startId = engine.getStartNode();
  var endId   = engine.getEndNode();

  if (startId === null || endId === null) {
    onLog('compare', 'Set start and end nodes first, then press Play.');
    return false;
  }

  onLog('info',
    'Greedy Best-First — Start: <span class="log-val">' + engine.getNodeLabel(startId) + '</span>' +
    ' → Goal: <span class="log-val">' + engine.getNodeLabel(endId) + '</span>'
  );
  onLog('info', 'Uses f(n) = h(n) only (Euclidean heuristic). Fast but NOT guaranteed optimal.');

  /* Heuristic: pixel distance to goal */
  function h(id) { return engine.getDistance(id, endId); }

  onVar('start',     engine.getNodeLabel(startId));
  onVar('goal',      engine.getNodeLabel(endId));
  onVar('open_set',  1);
  onVar('closed_set', 0);
  onVar('current',   engine.getNodeLabel(startId));
  onVar('h',         h(startId).toFixed(1));

  var openSet = [startId];
  var closed  = new Set();
  var parent  = {};
  parent[startId] = null;

  while (openSet.length > 0) {
    /* Pause / abort */
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    /* Pick node with lowest h(n) */
    openSet.sort(function(a, b) { return h(a) - h(b); });
    var u = openSet.shift();

    /* Skip if already fully processed */
    if (closed.has(u)) continue;
    closed.add(u);

    engine.setNodeState(u, 'visiting');
    onCnt('nodes_visited');
    onVar('current',    engine.getNodeLabel(u));
    onVar('h',          h(u).toFixed(1));
    onVar('open_set',   openSet.length);
    onVar('closed_set', closed.size);

    /* Goal test */
    if (u === endId) {
      var path = [], c = u;
      while (c !== null && c !== undefined) { path.unshift(c); c = parent[c]; }
      engine.highlightPath(path);
      onLog('found',
        '<strong>Goal reached!</strong>' +
        ' Path: ' + path.map(function(n) { return engine.getNodeLabel(n); }).join(' &rarr; ') +
        ' (length: ' + path.length + ', may not be optimal)'
      );
      onVar('path_length', path.length);
      return true;
    }

    await sleep(getDelay());
    engine.setNodeState(u, 'visited');

    /* Expand neighbors */
    var neighbors = engine.getNeighbors(u);
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (!closed.has(nb.id)) {
        /* Greedy does not update parent if already in open — first found wins */
        if (parent[nb.id] === undefined) {
          parent[nb.id] = u;
        }
        openSet.push(nb.id);
        engine.setEdgeState(u, nb.id, 'visiting');
        onCnt('comparisons');
      }
    }

    onLog('compare',
      'Expand <span class="log-idx">' + engine.getNodeLabel(u) + '</span>' +
      ' h=<span class="log-val">' + h(u).toFixed(1) + '</span>' +
      ' open: ' + openSet.length
    );
  }

  onLog('compare',
    'No path found from ' + engine.getNodeLabel(startId) +
    ' to ' + engine.getNodeLabel(endId) + '.'
  );
  return false;
}
