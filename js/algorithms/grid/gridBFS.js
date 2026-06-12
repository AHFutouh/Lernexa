/* ════════════════════════════════════════════════════════════
   Lernexa — Grid BFS (maze pathfinding)
   Runs breadth-first search over gridEngine cells. BFS on an
   unweighted grid is guaranteed to find a shortest path (in cells).
   Triggered by the "BFS" button after a maze is generated.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runGridBFS(opts) {
  var engine   = opts.engine;
  var control  = opts.control     || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay    || function () { return 60; };
  var onLog    = opts.onLog       || function () {};
  var onVar    = opts.onVarUpdate || function () {};

  if (!engine || typeof engine.getNeighbours !== 'function') {
    onLog('compare', 'Grid engine not ready — generate a maze first.');
    return false;
  }
  if (typeof engine.clearPath === 'function') engine.clearPath();

  var CELL  = engine.CELL || { VISITED: 'visited', OPEN: 'open', PATH: 'path' };
  var start = engine.getStart();
  var end   = engine.getEnd();

  function key(r, c)      { return r + '-' + c; }
  function isStart(r, c)  { return r === start.row && c === start.col; }
  function isEnd(r, c)    { return r === end.row   && c === end.col; }
  function paint(r, c, s) { if (!isStart(r, c) && !isEnd(r, c)) engine.setCellState(r, c, s); }

  onLog('info', 'BFS on the grid — explores level by level, so the first time it reaches the goal it has found a <strong>shortest</strong> path.');

  var queue   = [{ row: start.row, col: start.col }];
  var visited = {}; visited[key(start.row, start.col)] = true;
  var parent  = {};
  var found = false, explored = 0;

  while (queue.length > 0) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var cur = queue.shift();
    explored++;
    paint(cur.row, cur.col, CELL.VISITED);
    onVar('current', cur.row + ',' + cur.col);

    if (isEnd(cur.row, cur.col)) { found = true; break; }

    await sleep(getDelay());

    var nbrs = engine.getNeighbours(cur.row, cur.col);
    for (var i = 0; i < nbrs.length; i++) {
      var nb = nbrs[i], k = key(nb.row, nb.col);
      if (visited[k]) continue;
      visited[k] = true;
      parent[k]  = { row: cur.row, col: cur.col };
      paint(nb.row, nb.col, CELL.OPEN);
      queue.push({ row: nb.row, col: nb.col });
    }
  }

  if (!found) {
    onLog('compare', 'No path to the goal — the walls block every route.');
    return true;
  }

  /* Reconstruct + draw the path */
  var path = [], node = { row: end.row, col: end.col };
  while (node) { path.unshift(node); node = parent[key(node.row, node.col)]; }
  for (var pi = 0; pi < path.length; pi++) {
    if (control.isAborted) return false;
    paint(path[pi].row, path[pi].col, CELL.PATH);
    await sleep(getDelay() * 0.5);
  }

  onLog('done', '<i class="fa-solid fa-check"></i> BFS shortest path — <span class="log-val">' +
    path.length + '</span> cells long, <span class="log-val">' + explored + '</span> cells explored.');
  return true;
}
