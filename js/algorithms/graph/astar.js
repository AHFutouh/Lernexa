/* ════════════════════════════════════════════════════════════
   Lernexa — A* Pathfinding
   Engine: networkEngine
   Heuristic: Euclidean distance between node positions.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runAstar(opts) {
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

  var hLabel = (opts.heuristic || 'euclidean').toLowerCase();

  /* Functional heuristics computed from the nodes' pixel coordinates, so
     the selector actually changes A*'s behaviour:
       • Euclidean  → straight-line distance √(dx²+dy²)
       • Manhattan  → |dx| + |dy|
       • Diagonal   → Chebyshev distance max(|dx|, |dy|)
     All are admissible on this layout (never overestimate the weighted
     cost), so A* stays optimal while expanding a different frontier. */
  function heuristic(aId, bId) {
    var a = engine.getNode ? engine.getNode(aId) : null;
    var b = engine.getNode ? engine.getNode(bId) : null;
    if (!a || !b) return engine.getDistance(aId, bId);
    var dx = Math.abs(a.x - b.x);
    var dy = Math.abs(a.y - b.y);
    var raw;
    if (hLabel === 'manhattan')      raw = dx + dy;
    else if (hLabel === 'diagonal')  raw = Math.max(dx, dy);
    else                             raw = Math.sqrt(dx * dx + dy * dy);
    /* Scale pixel distance down toward edge-weight units so h stays
       admissible relative to g (edge weights are 1–15). */
    return raw * 0.05;
  }

  var hDisplay = hLabel === 'manhattan' ? 'Manhattan' :
                 hLabel === 'diagonal'  ? 'Diagonal (Chebyshev)' : 'Euclidean';

  onLog('info',
    'A* — Start: <span class="log-val">Node ' + startId + '</span> → ' +
    'Goal: <span class="log-val">Node ' + endId + '</span> | Heuristic: ' + hDisplay
  );
  onLog('info', 'f(n) = g(n) + h(n) — g = edge-weight cost from start, h = Euclidean distance to goal.');
  onVar('start',     startId);
  onVar('goal',      endId);
  onVar('heuristic', hDisplay);
  onVar('open_set',  1);
  onVar('current',   startId);

  var openSet  = [startId];
  var gScore   = {}; gScore[startId]  = 0;
  var fScore   = {}; fScore[startId]  = heuristic(startId, endId);
  var parent   = {}; parent[startId]  = null;
  var closed   = new Set();

  while (openSet.length > 0) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    /* Pick lowest f score */
    openSet.sort(function(a, b) {
      return (fScore[a] !== undefined ? fScore[a] : Infinity) -
             (fScore[b] !== undefined ? fScore[b] : Infinity);
    });
    var current = openSet.shift();

    if (closed.has(current)) continue;
    closed.add(current);

    engine.setNodeState(current, 'visiting');
    onCnt('nodes_visited');
    onVar('current',    current);
    onVar('open_set',   openSet.length);
    onVar('closed_set', closed.size);

    var gCur = gScore[current] !== undefined ? gScore[current] : 0;
    var hCur = heuristic(current, endId);
    onVar('g', gCur.toFixed(1));
    onVar('h', hCur.toFixed(1));
    onVar('f', (gCur + hCur).toFixed(1));

    if (current === endId) {
      var path = [], c = current;
      while (c !== null && c !== undefined) { path.unshift(c); c = parent[c]; }
      engine.highlightPath(path);
      onLog('found',
        '<strong>Goal reached!</strong> Path cost: <span class="log-val">' +
        gCur.toFixed(1) + '</span> | Path: ' + path.join(' &rarr; ')
      );
      onVar('path_length', path.length);
      onVar('path_cost',   gCur.toFixed(1));
      return true;
    }

    await sleep(getDelay());
    engine.setNodeState(current, 'visited');

    var neighbors = engine.getNeighbors(current);
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (closed.has(nb.id)) continue;
      var tentG = gCur + nb.weight;
      var existG = gScore[nb.id] !== undefined ? gScore[nb.id] : Infinity;
      if (tentG < existG) {
        parent[nb.id] = current;
        gScore[nb.id] = tentG;
        fScore[nb.id] = tentG + heuristic(nb.id, endId);
        if (openSet.indexOf(nb.id) === -1) openSet.push(nb.id);
        engine.setEdgeState(current, nb.id, 'visiting');
        onCnt('comparisons');
        if (existG < Infinity) {
          onLog('swap',
            'Better path to Node <span class="log-val">' + nb.id + '</span> — ' +
            'g: ' + existG.toFixed(1) + ' &rarr; <span class="log-val">' + tentG.toFixed(1) + '</span>'
          );
        }
      }
    }
    onLog('compare',
      'Node <span class="log-idx">' + current + '</span> — ' +
      'g=<span class="log-val">' + gCur.toFixed(1) + '</span> ' +
      'open: ' + openSet.length + ', closed: ' + closed.size
    );
  }

  onLog('compare',
    'No path found from Node ' + startId + ' to Node ' + endId + '.'
  );
  return false;
}
