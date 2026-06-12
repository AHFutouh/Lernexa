/* ════════════════════════════════════════════════════════════
   Lernexa — gridEngine.js
   Renders interactive grid for pathfinding & maze algorithms.
   ════════════════════════════════════════════════════════════ */

'use strict';

var GridEngine = (function() {

  var _area     = null;
  var _algo     = null;
  var _rows     = 20;
  var _cols     = 40;
  var _grid     = [];   /* 2D array of {el, state} */
  var _startR   = 5,  _startC = 3;
  var _endR     = 14, _endC  = 36;
  var _drawing  = false;
  var _drawMode = 'wall'; /* 'wall' | 'erase' */

  /* Cell states */
  var CELL = Object.freeze({
    EMPTY: 'empty', WALL: 'wall',
    START: 'start', END: 'end',
    VISITED: 'visited', OPEN: 'open', PATH: 'path'
  });

  /* ── mount ───────────────────────────────────────────── */
  function mount(area, algo) {
    _algo = algo;
    _area = area;
    area.innerHTML = '';

    _rows = (algo.input && algo.input.gridRows) || 20;
    _cols = (algo.input && algo.input.gridCols) || 40;

    /* Responsive adjustment */
    var maxCols = Math.floor(area.clientWidth / 26);
    var maxRows = Math.floor(area.clientHeight / 26);
    _cols = Math.min(_cols, maxCols || _cols);
    _rows = Math.min(_rows, maxRows || _rows);

    /* Clamp start/end */
    _startR = Math.floor(_rows * 0.25); _startC = 3;
    _endR   = Math.floor(_rows * 0.75); _endC   = _cols - 4;

    _buildGrid();
    _bindMazeBtn();
  }

  /* ── Build grid DOM ──────────────────────────────────── */
  function _buildGrid() {
    _area.innerHTML = '';
    _grid = [];

    var wrapper = createElement('div', 'grid-container');
    var table   = document.createElement('table');
    table.className = 'grid-table';
    table.setAttribute('id', 'gridTable');

    for (var r = 0; r < _rows; r++) {
      _grid.push([]);
      var tr = document.createElement('tr');
      for (var c = 0; c < _cols; c++) {
        var td = document.createElement('td');
        td.className = 'grid-cell';
        td.dataset.row = r;
        td.dataset.col = c;

        var state = CELL.EMPTY;
        if (r === _startR && c === _startC) state = CELL.START;
        if (r === _endR   && c === _endC)   state = CELL.END;
        _setCellState(td, state);

        _grid[r].push({ el: td, state: state });
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    wrapper.appendChild(table);
    _area.appendChild(wrapper);
    _bindMouseEvents(wrapper);
  }

  /* ── Mouse events ────────────────────────────────────── */
  function _bindMouseEvents(wrapper) {
    wrapper.addEventListener('mousedown', function(e) {
      var cell = e.target.closest('.grid-cell');
      if (!cell) return;
      e.preventDefault();
      _drawing = true;
      var r = parseInt(cell.dataset.row), c = parseInt(cell.dataset.col);
      _drawMode = _grid[r][c].state === CELL.WALL ? 'erase' : 'wall';
      _handleCell(r, c);
    });

    wrapper.addEventListener('mouseover', function(e) {
      if (!_drawing) return;
      var cell = e.target.closest('.grid-cell');
      if (!cell) return;
      _handleCell(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
    });

    document.addEventListener('mouseup', function() { _drawing = false; });
  }

  function _handleCell(r, c) {
    var obj = _grid[r][c];
    if (obj.state === CELL.START || obj.state === CELL.END) return;
    var newState = _drawMode === 'wall' ? CELL.WALL : CELL.EMPTY;
    _setCellState(obj.el, newState);
    obj.state = newState;
  }

  /* ── Cell state helper ───────────────────────────────── */
  function _setCellState(el, state) {
    el.className = 'grid-cell ' + state;
  }

  /* ── Public: get cell data ───────────────────────────── */
  function getCell(r, c) { return _grid[r] ? _grid[r][c] : null; }
  function getStart()     { return { row: _startR, col: _startC }; }
  function getEnd()       { return { row: _endR,   col: _endC }; }
  function getRows()      { return _rows; }
  function getCols()      { return _cols; }

  /* ── Public: reposition start / end ─────────────────── */
  function setStartCell(r, c) {
    r = parseInt(r); c = parseInt(c);
    if (isNaN(r) || isNaN(c) || r < 0 || r >= _rows || c < 0 || c >= _cols) return;
    if (_grid[r][c].state === CELL.WALL || _grid[r][c].state === CELL.END) return;
    _setCellState(_grid[_startR][_startC].el, CELL.EMPTY);
    _grid[_startR][_startC].state = CELL.EMPTY;
    _startR = r; _startC = c;
    _setCellState(_grid[r][c].el, CELL.START);
    _grid[r][c].state = CELL.START;
  }

  function setEndCell(r, c) {
    r = parseInt(r); c = parseInt(c);
    if (isNaN(r) || isNaN(c) || r < 0 || r >= _rows || c < 0 || c >= _cols) return;
    if (_grid[r][c].state === CELL.WALL || _grid[r][c].state === CELL.START) return;
    _setCellState(_grid[_endR][_endC].el, CELL.EMPTY);
    _grid[_endR][_endC].state = CELL.EMPTY;
    _endR = r; _endC = c;
    _setCellState(_grid[r][c].el, CELL.END);
    _grid[r][c].state = CELL.END;
  }

  /* ── Public: set cell state (from algorithm) ─────────── */
  function setCellState(r, c, state) {
    var obj = _grid[r] ? _grid[r][c] : null;
    if (!obj) return;
    if (obj.state === CELL.START || obj.state === CELL.END) return;
    _setCellState(obj.el, state);
    obj.state = state;
  }

  /* ── Public: getStartCell / getEndCell (returns {row,col,type}) ── */
  function getStartCell() { return { row: _startR, col: _startC, type: CELL.START }; }
  function getEndCell()   { return { row: _endR,   col: _endC,   type: CELL.END };   }

  /* ── Public: getNeighbours (4-dir, skip walls) ───────── */
  function getNeighbours(r, c) {
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    var result = [];
    for (var d = 0; d < DIRS.length; d++) {
      var nr = r + DIRS[d][0];
      var nc = c + DIRS[d][1];
      if (nr < 0 || nr >= _rows || nc < 0 || nc >= _cols) continue;
      var obj = _grid[nr][nc];
      if (obj && obj.state !== CELL.WALL) {
        result.push({ row: nr, col: nc, type: obj.state });
      }
    }
    return result;
  }

  /* ── clearGrid / clearPath ───────────────────────────── */
  function clearGrid() {
    for (var r = 0; r < _rows; r++) {
      for (var c = 0; c < _cols; c++) {
        var s = (r === _startR && c === _startC) ? CELL.START
              : (r === _endR   && c === _endC)   ? CELL.END
              : CELL.EMPTY;
        _setCellState(_grid[r][c].el, s);
        _grid[r][c].state = s;
      }
    }
  }

  function clearPath() {
    for (var r = 0; r < _rows; r++) {
      for (var c = 0; c < _cols; c++) {
        var s = _grid[r][c].state;
        if (s === CELL.VISITED || s === CELL.OPEN || s === CELL.PATH) {
          _setCellState(_grid[r][c].el, CELL.EMPTY);
          _grid[r][c].state = CELL.EMPTY;
        }
      }
    }
  }

  /* ── Maze button binding ─────────────────────────────── */
  function _bindMazeBtn() {
    var btn = byId('btnGenMaze');
    if (btn) {
      /* Remove old listener, add fresh */
      btn.onclick = function() { generateMaze(); };
    }
    var clearBtn = byId('btnClearGrid');
    if (clearBtn) { clearBtn.onclick = function() { clearGrid(); }; }
  }

  /* ── Generate maze (Recursive Backtracker) ───────────── */
  function generateMaze() {
    /* Fill all cells with walls */
    for (var r = 0; r < _rows; r++) {
      for (var c = 0; c < _cols; c++) {
        _setCellState(_grid[r][c].el, CELL.WALL);
        _grid[r][c].state = CELL.WALL;
      }
    }

    /* Carve passages using DFS on odd cells only */
    var sr = 1, sc = 1;
    _carve(sr, sc);

    /* Restore start/end */
    _setCellState(_grid[_startR][_startC].el, CELL.START);
    _grid[_startR][_startC].state = CELL.START;
    _setCellState(_grid[_endR][_endC].el, CELL.END);
    _grid[_endR][_endC].state = CELL.END;
  }

  function _carve(r, c) {
    var DIRS = [[-2,0],[2,0],[0,-2],[0,2]];
    DIRS = shuffleArray(DIRS);

    _setCellState(_grid[r][c].el, CELL.EMPTY);
    _grid[r][c].state = CELL.EMPTY;

    for (var i = 0; i < DIRS.length; i++) {
      var nr = r + DIRS[i][0];
      var nc = c + DIRS[i][1];
      var mr = r + DIRS[i][0] / 2;
      var mc = c + DIRS[i][1] / 2;
      if (nr >= 0 && nr < _rows && nc >= 0 && nc < _cols && _grid[nr][nc].state === CELL.WALL) {
        _setCellState(_grid[mr][mc].el, CELL.EMPTY);
        _grid[mr][mc].state = CELL.EMPTY;
        _carve(nr, nc);
      }
    }
  }

  /* ── applySnapshot ───────────────────────────────────── */
  function applySnapshot(snap) { /* not used for grid — algorithms call setCellState directly */ }

  /* ── reset ───────────────────────────────────────────── */
  function reset() { clearGrid(); }

  return {
    mount: mount,
    getCell: getCell,
    getStart: getStart,
    getEnd: getEnd,
    getStartCell: getStartCell,
    getEndCell: getEndCell,
    setStartCell: setStartCell,
    setEndCell: setEndCell,
    getNeighbours: getNeighbours,
    getRows: getRows,
    getCols: getCols,
    setCellState: setCellState,
    CELL: CELL,           /* export the frozen object directly */
    clearGrid: clearGrid,
    clearPath: clearPath,
    generateMaze: generateMaze,
    fillWalls: function() { /* alias used by maze.js */
      for (var r = 0; r < _rows; r++)
        for (var c = 0; c < _cols; c++) {
          _setCellState(_grid[r][c].el, CELL.WALL);
          _grid[r][c].state = CELL.WALL;
        }
    },
    applySnapshot: applySnapshot,
    reset: reset
  };

})();
