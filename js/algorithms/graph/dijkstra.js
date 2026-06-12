/* ════════════════════════════════════════════════════════════
   Lernexa — Dijkstra's Algorithm
   Engine: networkEngine
   Finds the shortest weighted path between two nodes.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runDijkstra(opts) {
  var engine   = opts.engine;
  var control  = opts.control   || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay  || function() { return 250; };
  var onLog    = opts.onLog     || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  if (!engine || !engine.getStartNode) { onLog('compare', 'Graph engine not ready.'); return false; }
  engine.reset();

  var startId = engine.getStartNode();
  var endId   = engine.getEndNode();

  if (startId === null || endId === null) {
    onLog('compare', 'Set start and end nodes first, then press Play.');
    return false;
  }

  onLog('info',
    'Dijkstra — Start: <span class="log-val">Node ' + startId + '</span> → ' +
    'Goal: <span class="log-val">Node ' + endId + '</span> | ' +
    'Guarantees shortest weighted path (non-negative weights).'
  );
  onVar('start',   startId);
  onVar('goal',    endId);
  onVar('current', startId);

  var dist    = {}; dist[startId]    = 0;
  var parent  = {}; parent[startId] = null;
  var visited = new Set();

  /* Priority queue as sorted array: [{ id, dist }] */
  var pq = [{ id: startId, dist: 0 }];

  onVar('dist_start',   0);
  onVar('pq_size',      1);
  onVar('visited',      0);

  while (pq.length > 0) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    /* Extract minimum-distance node */
    pq.sort(function(a, b) { return a.dist - b.dist; });
    var cur = pq.shift();
    var u   = cur.id;

    if (visited.has(u)) continue;
    visited.add(u);

    engine.setNodeState(u, 'visiting');
    onCnt('nodes_visited');
    onVar('current',      u);
    onVar('dist_current', (dist[u] || 0).toFixed(1));
    onVar('pq_size',      pq.length);
    onVar('visited',      visited.size);

    if (u === endId) {
      /* Reconstruct path */
      var path = [], c = u;
      while (c !== null && c !== undefined) { path.unshift(c); c = parent[c]; }
      engine.highlightPath(path);
      onLog('found',
        '<strong>Shortest path found!</strong> Cost: <span class="log-val">' +
        (dist[endId] || 0).toFixed(1) + '</span> — ' +
        path.join(' &rarr; ')
      );
      onVar('path_cost',   (dist[endId] || 0).toFixed(1));
      onVar('path_length', path.length);
      return true;
    }

    await sleep(getDelay());
    engine.setNodeState(u, 'visited');

    var neighbors = engine.getNeighbors(u);
    for (var i = 0; i < neighbors.length; i++) {
      var nb  = neighbors[i];
      var alt = (dist[u] || 0) + nb.weight;
      var old = dist[nb.id] !== undefined ? dist[nb.id] : Infinity;

      if (alt < old) {
        dist[nb.id]   = alt;
        parent[nb.id] = u;
        pq.push({ id: nb.id, dist: alt });
        engine.setEdgeState(u, nb.id, 'visiting');
        onCnt('comparisons');
        if (old < Infinity) {
          onLog('swap',
            'Relax Node <span class="log-val">' + nb.id + '</span>: ' +
            old.toFixed(1) + ' &rarr; <span class="log-val">' + alt.toFixed(1) + '</span>'
          );
        }
      }
    }
    onLog('compare',
      'Relaxed edges from Node <span class="log-idx">' + u + '</span> — ' +
      'dist: <span class="log-val">' + (dist[u] || 0).toFixed(1) + '</span>'
    );
  }

  onLog('compare',
    'No path from Node ' + startId + ' to Node ' + endId + '.'
  );
  return false;
}
