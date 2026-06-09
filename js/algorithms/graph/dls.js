/* ════════════════════════════════════════════════════════════
   Lernexa — Depth-Limited Search (DLS)
   Engine: networkEngine
   DFS with a hard depth cap. Avoids infinite loops in deep
   or cyclic graphs but may miss the goal if limit is too low.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runDLS(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function() { return 300; };
  var onLog    = opts.onLog       || function() {};
  var onCnt    = opts.onCounter   || function() {};
  var onVar    = opts.onVarUpdate || function() {};
  var limit    = (opts.customInput && opts.customInput.depthLimit != null)
                    ? opts.customInput.depthLimit
                    : ((opts.algo && opts.algo.input && opts.algo.input.defaultDepthLimit != null)
                        ? opts.algo.input.defaultDepthLimit
                        : 3);

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
    'DLS — Start: <span class="log-val">' + engine.getNodeLabel(startId) + '</span>' +
    ' → Goal: <span class="log-val">' + engine.getNodeLabel(endId) + '</span>' +
    ' | Depth Limit: <span class="log-val">' + limit + '</span>'
  );
  onLog('info', 'DFS with a maximum depth constraint. Nodes deeper than the limit are ignored.');

  onVar('depth_limit',   limit);
  onVar('current_depth', 0);
  onVar('nodes_visited', 0);
  onVar('current',       engine.getNodeLabel(startId));

  var visitedCount = 0;
  var found        = false;

  async function dls(nodeId, depth, path) {
    /* Pause / abort */
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted || found) return;

    /* Depth check */
    if (depth > limit) {
      onLog('compare',
        'Depth limit reached at <span class="log-idx">' + engine.getNodeLabel(nodeId) + '</span>.'
      );
      return;
    }

    /* Cycle guard is per-PATH, not global: a node reached first on a
       too-deep branch must still be re-expandable on a shorter branch
       within the limit. A shared visited set would wrongly report
       "not found" even when a within-limit path exists. */
    if (path.indexOf(nodeId) !== -1) return;
    visitedCount++;

    engine.setNodeState(nodeId, 'visiting');
    onCnt('nodes_visited');
    onVar('current',       engine.getNodeLabel(nodeId));
    onVar('current_depth', depth);
    onVar('nodes_visited', visitedCount);
    path.push(nodeId);

    onLog('compare',
      'Visit <span class="log-idx">' + engine.getNodeLabel(nodeId) + '</span>' +
      ' depth=<span class="log-val">' + depth + '</span>'
    );

    /* Goal test */
    if (nodeId === endId) {
      found = true;
      engine.highlightPath(path.slice());
      onLog('found',
        '<strong>Goal found!</strong> At depth <span class="log-val">' + depth + '</span>' +
        ' | Path: ' + path.map(function(n) { return engine.getNodeLabel(n); }).join(' &rarr; ')
      );
      onVar('path_length', path.length);
      return;
    }

    await sleep(getDelay());
    engine.setNodeState(nodeId, 'visited');

    /* Recurse into neighbors */
    var neighbors = engine.getNeighbors(nodeId);
    for (var i = 0; i < neighbors.length && !found; i++) {
      engine.setEdgeState(nodeId, neighbors[i].id, 'visiting');
      await dls(neighbors[i].id, depth + 1, path.slice());
    }
  }

  await dls(startId, 0, []);

  if (!found && !control.isAborted) {
    onLog('done',
      'Goal not found within depth limit ' + limit + '. ' +
      'Try increasing the limit or using IDS.'
    );
  }
  return !control.isAborted;
}
