/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — Maze Generation (Recursive Backtracker DFS)
   Engine: gridEngine
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runMazeGeneration(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function() { return 60; };
  var onLog    = opts.onLog    || function() {};
  var onCnt    = opts.onCounter  || function() {};
  var onVar    = opts.onVarUpdate || function() {};

  if (!engine) { onLog('compare', 'No engine attached.'); return false; }

  /* reset grid to all walls */
  if (typeof engine.fillWalls === 'function') {
    engine.fillWalls();
  } else if (typeof engine.reset === 'function') {
    engine.reset();
  }

  var CELL = engine.CELL;   /* plain frozen object from gridEngine */

  /* grid dimensions (odd × odd for the carving algorithm) */
  var rows = engine.getRows ? engine.getRows() : 21;
  var cols = engine.getCols ? engine.getCols() : 39;

  /* make sure we work with odd dimensions */
  var rMax = rows % 2 === 0 ? rows - 1 : rows;
  var cMax = cols % 2 === 0 ? cols - 1 : cols;

  onLog('info', 'Maze Generation — Recursive Backtracker (DFS) on a ' + rMax + '×' + cMax + ' grid.');
  onVar('algorithm', 'Recursive Backtracker');
  onVar('rows', rMax);
  onVar('cols', cMax);

  /* visited set — we carve from odd-row/col "cells" */
  var visited  = new Set();
  var cellsGen = 0;

  /* start carving from top-left odd cell */
  var startR = 1, startC = 1;
  engine.setCellState(startR, startC, CELL.EMPTY);
  visited.add(startR + ',' + startC);

  var stack = [{ r: startR, c: startC }];
  onVar('stack_depth', 1);
  onVar('cells_carved', 0);

  var DIRS = [
    { dr: -2, dc:  0 },
    { dr:  2, dc:  0 },
    { dr:  0, dc: -2 },
    { dr:  0, dc:  2 }
  ];

  while (stack.length > 0) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var top = stack[stack.length - 1];

    /* collect unvisited neighbours 2 steps away */
    var shuffled = _mazeShuffled(DIRS);
    var moved    = false;

    for (var d = 0; d < shuffled.length; d++) {
      var nr = top.r + shuffled[d].dr;
      var nc = top.c + shuffled[d].dc;

      if (nr >= 1 && nr < rMax && nc >= 1 && nc < cMax && !visited.has(nr + ',' + nc)) {
        /* carve wall between current and neighbour */
        var wr = top.r + shuffled[d].dr / 2;
        var wc = top.c + shuffled[d].dc / 2;
        engine.setCellState(wr, wc, CELL.EMPTY);
        engine.setCellState(nr, nc, CELL.EMPTY);

        visited.add(nr + ',' + nc);
        stack.push({ r: nr, c: nc });

        cellsGen++;
        onCnt('cells_carved');
        onVar('cells_carved', cellsGen);
        onVar('stack_depth', stack.length);
        onVar('current', '(' + nr + ',' + nc + ')');

        moved = true;
        await sleep(getDelay());
        break;
      }
    }

    if (!moved) {
      stack.pop();
      onVar('stack_depth', stack.length);
      onCnt('backtracks');
    }
  }

  /* place start/end markers */
  engine.setCellState(1, 1, CELL.START);
  engine.setCellState(rMax - 2, cMax - 2, CELL.END);

  onLog('done', '<i class="fa-solid fa-check"></i> Maze complete! <span class="log-val">' + cellsGen + '</span> passages carved. Run BFS or A* to find a path!');
  return true;
}

/* ── helper: Fisher-Yates shuffle returning new array ── */
function _mazeShuffled(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
