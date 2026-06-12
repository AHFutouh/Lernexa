/* ════════════════════════════════════════════════════════════
   Lernexa — Grid A* (maze pathfinding)
   A* over gridEngine cells using the Manhattan heuristic, which is
   admissible on a 4-neighbour unit-cost grid ⇒ A* returns a shortest
   path while exploring far fewer cells than BFS.
   Triggered by the "A*" button after a maze is generated.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runGridAstar(opts) {
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
  function h(r, c)        { return Math.abs(r - end.row) + Math.abs(c - end.col); }

  onLog('info', 'A* on the grid — f = g + h with the Manhattan heuristic (admissible on a 4-neighbour grid ⇒ the path is shortest, with less exploration than BFS).');

  var open   = [{ row: start.row, col: start.col }];
  var g      = {}; g[key(start.row, start.col)] = 0;
  var f      = {}; f[key(start.row, start.col)] = h(start.row, start.col);
  var parent = {};
  var closed = {};
  var found = false, explored = 0;

  while (open.length > 0) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    /* Pick the open cell with the lowest f */
    open.sort(function (a, b) { return f[key(a.row, a.col)] - f[key(b.row, b.col)]; });
    var cur = open.shift();
    var ck  = key(cur.row, cur.col);
    if (closed[ck]) continue;
    closed[ck] = true;
    explored++;

    paint(cur.row, cur.col, CELL.VISITED);
    onVar('current', cur.row + ',' + cur.col);

    if (isEnd(cur.row, cur.col)) { found = true; break; }

    await sleep(getDelay());

    var nbrs = engine.getNeighbours(cur.row, cur.col);
    for (var i = 0; i < nbrs.length; i++) {
      var nb = nbrs[i], nk = key(nb.row, nb.col);
      if (closed[nk]) continue;
      var tentG = g[ck] + 1;
      if (g[nk] === undefined || tentG < g[nk]) {
        parent[nk] = { row: cur.row, col: cur.col };
        g[nk] = tentG;
        f[nk] = tentG + h(nb.row, nb.col);
        paint(nb.row, nb.col, CELL.OPEN);
        open.push({ row: nb.row, col: nb.col });
      }
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

  onLog('done', '<i class="fa-solid fa-check"></i> A* shortest path — <span class="log-val">' +
    path.length + '</span> cells long, <span class="log-val">' + explored + '</span> cells explored.');
  return true;
}
