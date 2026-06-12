/* ════════════════════════════════════════════════════════════
   Lernexa — Iterative Deepening DFS (IDS / IDDFS)
   Engine: networkEngine
   Runs DLS repeatedly with depth limit 0, 1, 2, …, maxDepth.
   Memory-efficient like DFS; complete & optimal like BFS.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runIDS(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function() { return 250; };
  var onLog    = opts.onLog       || function() {};
  var onCnt    = opts.onCounter   || function() {};
  var onVar    = opts.onVarUpdate || function() {};
  var maxDepth = (opts.algo && opts.algo.input && opts.algo.input.defaultMaxDepth != null)
                    ? opts.algo.input.defaultMaxDepth
                    : 6;

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
    'IDS — Start: <span class="log-val">' + engine.getNodeLabel(startId) + '</span>' +
    ' → Goal: <span class="log-val">' + engine.getNodeLabel(endId) + '</span>' +
    ' | Max depth: <span class="log-val">' + maxDepth + '</span>'
  );
  onLog('info', 'Combines the memory efficiency of DFS with the completeness of BFS by iterating depth limits.');

  onVar('iteration',     0);
  onVar('depth_limit',   0);
  onVar('total_visited', 0);
  onVar('current',       engine.getNodeLabel(startId));

  var totalVisited = 0;
  var found        = false;

  for (var limit = 0; limit <= maxDepth && !found && !control.isAborted; limit++) {
    engine.reset();
    onVar('iteration',   limit + 1);
    onVar('depth_limit', limit);
    onLog('info',
      '--- Iteration <span class="log-val">' + (limit + 1) + '</span>' +
      ' : depth limit = <span class="log-val">' + limit + '</span> ---'
    );

    var visited = new Set();

    /* Inner DLS — closure captures limit, visited, found */
    async function dls(nodeId, depth) {
      if (control.isAborted || found) return false;
      if (depth > limit)              return false;
      if (visited.has(nodeId))        return false;
      visited.add(nodeId);
      totalVisited++;

      engine.setNodeState(nodeId, 'visiting');
      onCnt('nodes_visited');
      onVar('current',       engine.getNodeLabel(nodeId));
      onVar('total_visited', totalVisited);

      await sleep(getDelay() * 0.6);

      /* Goal test */
      if (nodeId === endId) {
        found = true;
        engine.setNodeState(nodeId, 'found');
        onLog('found',
          '<strong>Goal reached!</strong> At depth limit <span class="log-val">' + limit + '</span>' +
          ' after <span class="log-val">' + totalVisited + '</span> total node visits.'
        );
        onVar('path_depth', depth);
        return true;
      }

      engine.setNodeState(nodeId, 'visited');

      var neighbors = engine.getNeighbors(nodeId);
      for (var i = 0; i < neighbors.length; i++) {
        if (found) return true;
        engine.setEdgeState(nodeId, neighbors[i].id, 'visiting');
        if (await dls(neighbors[i].id, depth + 1)) return true;
      }
      return false;
    }

    await dls(startId, 0);

    /* Brief pause between iterations */
    if (!found && !control.isAborted) {
      await sleep(getDelay() * 0.5);
      onLog('compare',
        'Iteration ' + (limit + 1) + ' complete — goal not found at depth ' + limit + '.'
      );
    }
  }

  if (!found && !control.isAborted) {
    onLog('done',
      'Goal not found within max depth ' + maxDepth + '.'
    );
  }
  return !control.isAborted;
}
