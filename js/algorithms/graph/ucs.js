/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — Uniform Cost Search (UCS)
   Engine: networkEngine
   Expands the node with lowest cumulative path cost g(n).
   Optimal on positive-weight graphs. Equivalent to Dijkstra
   when stopped at the goal.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runUCS(opts) {
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
    'UCS — Start: <span class="log-val">' + engine.getNodeLabel(startId) + '</span>' +
    ' → Goal: <span class="log-val">' + engine.getNodeLabel(endId) + '</span>'
  );
  onLog('info', 'Expands nodes in order of cumulative path cost g(n). Guaranteed optimal on positive-weight graphs.');

  onVar('start',     engine.getNodeLabel(startId));
  onVar('goal',      engine.getNodeLabel(endId));
  onVar('frontier',  1);
  onVar('explored',  0);
  onVar('current',   engine.getNodeLabel(startId));
  onVar('cost',      '0');

  /* Frontier: min-heap simulated with array + sort */
  var frontier = [{ id: startId, cost: 0 }];
  var explored = new Set();
  var parent   = {};
  var gCost    = {};
  parent[startId] = null;
  gCost[startId]  = 0;

  while (frontier.length > 0) {
    /* Pause / abort checks */
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    /* Pop minimum cost node */
    frontier.sort(function(a, b) { return a.cost - b.cost; });
    var curr = frontier.shift();
    var u    = curr.id;

    /* Skip stale entries */
    if (explored.has(u)) continue;
    explored.add(u);

    engine.setNodeState(u, 'visiting');
    onCnt('nodes_visited');
    onVar('current',  engine.getNodeLabel(u));
    onVar('cost',     gCost[u].toFixed(1));
    onVar('frontier', frontier.length);
    onVar('explored', explored.size);

    /* Goal test */
    if (u === endId) {
      var path = [], c = u;
      while (c !== null && c !== undefined) { path.unshift(c); c = parent[c]; }
      engine.highlightPath(path);
      onLog('found',
        '<strong>Goal reached!</strong> Cost: <span class="log-val">' + gCost[u].toFixed(1) + '</span>' +
        ' | Path: ' + path.map(function(n) { return engine.getNodeLabel(n); }).join(' &rarr; ')
      );
      onVar('path_cost',   gCost[u].toFixed(1));
      onVar('path_length', path.length);
      return true;
    }

    await sleep(getDelay());
    engine.setNodeState(u, 'visited');

    /* Expand neighbors */
    var neighbors = engine.getNeighbors(u);
    for (var i = 0; i < neighbors.length; i++) {
      var nb      = neighbors[i];
      if (explored.has(nb.id)) continue;
      var newCost = gCost[u] + nb.weight;
      if (gCost[nb.id] === undefined || newCost < gCost[nb.id]) {
        gCost[nb.id]  = newCost;
        parent[nb.id] = u;
        frontier.push({ id: nb.id, cost: newCost });
        engine.setEdgeState(u, nb.id, 'visiting');
        onCnt('relaxations');
      }
    }

    onLog('compare',
      'Expand <span class="log-idx">' + engine.getNodeLabel(u) + '</span>' +
      ' g=<span class="log-val">' + gCost[u].toFixed(1) + '</span>' +
      ' frontier: ' + frontier.length
    );
  }

  onLog('compare',
    'No path found from ' + engine.getNodeLabel(startId) +
    ' to ' + engine.getNodeLabel(endId) + '.'
  );
  return false;
}
