/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — memoryEngine.js
   Premium search visualization engine.
   Renders memory blocks with per-cell pointer slots above each cell.
   ════════════════════════════════════════════════════════════ */

var MemoryEngine = (function() {

  var _area         = null;
  var _algo         = null;
  var _array        = [];
  var _cells        = [];      /* DOM elements for each cell */
  var _ptrSlots     = [];      /* DOM elements for pointer slots ABOVE each cell */
  var _formulaPanel = null;    /* for interpolation formula */

  /* ── mount ───────────────────────────────────────────── */
  function mount(area, algo) {
    _algo = algo;
    _area = area;
    area.innerHTML = '';

    /* Resolve initial array */
    var arrayInput = byId('arrayInput');
    if (arrayInput && arrayInput.value.trim()) {
      var parsed = parseNumberArray(arrayInput.value);
      if (parsed) {
        _array = (algo.input && algo.input.requireSorted) ? sortedCopy(parsed) : parsed;
      } else {
        _array = (algo.input && algo.input.defaultArray) ? algo.input.defaultArray.slice() : [1,2,3,4,5];
      }
    } else {
      _array = (algo.input && algo.input.defaultArray) ? algo.input.defaultArray.slice() : [1,2,3,4,5];
    }

    _render();
  }

  /* ── Internal render ─────────────────────────────────── */
  function _render() {
    if (!_area) return;
    _area.innerHTML = '';
    _cells    = [];
    _ptrSlots = [];
    _formulaPanel = null;

    var wrapper = createElement('div', 'memory-container');

    /* Target badge */
    var targetBadge = createElement('div', 'mem-target-badge');
    targetBadge.setAttribute('id', 'memTargetBadge');
    targetBadge.style.display = 'none';
    wrapper.appendChild(targetBadge);

    /* Sorted badge */
    var sortedBadge = createElement('div', 'mem-sorted-badge');
    sortedBadge.setAttribute('id', 'memSortedBadge');
    sortedBadge.textContent = 'Sorted';
    sortedBadge.style.display = 'none';
    wrapper.appendChild(sortedBadge);

    /* Label */
    var lbl = createElement('div', 'memory-label', 'Array · ' + _array.length + ' elements');
    wrapper.appendChild(lbl);

    /* Blocks scroll outer */
    var outer = createElement('div', 'memory-blocks-outer');
    var blocksRow = createElement('div', 'memory-blocks');

    for (var i = 0; i < _array.length; i++) {
      var block = createElement('div', 'mem-block');

      /* Pointer slot ABOVE the cell */
      var ptrSlot = createElement('div', 'mem-ptr-slot');
      ptrSlot.setAttribute('id', 'mem-ptr-slot-' + i);

      /* The glass card cell */
      var cell = createElement('div', 'mem-cell', String(_array[i]));
      cell.setAttribute('id', 'mem-cell-' + i);
      cell.dataset.index = i;
      cell.dataset.value = _array[i];

      /* Index label below */
      var idx = createElement('div', 'mem-idx', '[' + i + ']');

      block.appendChild(ptrSlot);
      block.appendChild(cell);
      block.appendChild(idx);
      blocksRow.appendChild(block);

      _cells.push(cell);
      _ptrSlots.push(ptrSlot);
    }

    outer.appendChild(blocksRow);
    wrapper.appendChild(outer);

    /* Formula panel (hidden initially) */
    var formulaPanel = createElement('div', 'mem-formula-panel');
    formulaPanel.setAttribute('id', 'memFormulaPanel');
    formulaPanel.style.display = 'none';
    wrapper.appendChild(formulaPanel);

    _area.appendChild(wrapper);
  }

  /* ── showTarget ──────────────────────────────────────── */
  function showTarget(target, sorted) {
    var badge = byId('memTargetBadge');
    if (badge) {
      badge.innerHTML = '<span class="badge-label">Target</span><span class="badge-value">' + target + '</span>';
      badge.style.display = 'flex';
    }
    var sb = byId('memSortedBadge');
    if (sb) { sb.style.display = sorted ? 'flex' : 'none'; }
  }

  /* ── flashMismatch ───────────────────────────────────── */
  function flashMismatch(i) {
    if (!_cells[i]) return;
    _cells[i].classList.add('mismatch');
    setTimeout(function() {
      if (_cells[i]) _cells[i].classList.remove('mismatch');
    }, 450);
  }

  /* ── eliminateRange ──────────────────────────────────── */
  function eliminateRange(from, to) {
    var start = Math.max(0, Math.min(from, to));
    var end   = Math.min(_cells.length - 1, Math.max(from, to));
    for (var i = start; i <= end; i++) {
      (function(idx, delay) {
        setTimeout(function() {
          if (_cells[idx]) _cells[idx].classList.add('excluded');
        }, delay);
      })(i, (i - start) * 25);
    }
  }

  /* ── setPosProbe ─────────────────────────────────────── */
  function setPosProbe(pos) {
    for (var i = 0; i < _cells.length; i++) _cells[i].classList.remove('pos-probe');
    if (_cells[pos]) _cells[pos].classList.add('pos-probe');
  }

  /* ── showFormula ─────────────────────────────────────── */
  function showFormula() {
    var panel = byId('memFormulaPanel');
    if (!panel) return;
    _formulaPanel = panel;
    panel.innerHTML =
      '<div class="fml-title">Interpolation Formula</div>' +
      '<div class="fml-body">' +
        '<span class="fml-var fml-pos" id="fml-pos">pos</span>' +
        ' = <span class="fml-var fml-low" id="fml-low">low</span>' +
        ' + ⌊ (' +
          '<span class="fml-var fml-target" id="fml-target">target</span>' +
          ' − arr[<span class="fml-var fml-low2" id="fml-low2">low</span>]' +
        ') × (' +
          '<span class="fml-var fml-high" id="fml-high">high</span>' +
          ' − <span class="fml-var fml-low3" id="fml-low3">low</span>' +
        ') ÷ (' +
          'arr[<span class="fml-var fml-high2" id="fml-high2">high</span>]' +
          ' − arr[<span class="fml-var fml-low4" id="fml-low4">low</span>]' +
        ') ⌋' +
      '</div>';
    panel.style.display = 'block';
  }

  /* ── showFormulaCalc ─────────────────────────────────── */
  function showFormulaCalc(target, arrLow, arrHigh, low, high, pos) {
    function sub(id, val) {
      var el = byId(id);
      if (!el) return;
      el.textContent = val;
      el.classList.add('lit');
      setTimeout(function() { if (el) el.classList.remove('lit'); }, 400);
    }
    sub('fml-pos',    pos);
    sub('fml-low',    low);
    sub('fml-low2',   arrLow);
    sub('fml-low3',   low);
    sub('fml-low4',   arrLow);
    sub('fml-high',   high);
    sub('fml-high2',  arrHigh);
    sub('fml-target', target);
  }

  /* ── applySnapshot ───────────────────────────────────── */
  function applySnapshot(snap) {
    /* 1. Clear all cells */
    for (var i = 0; i < _cells.length; i++) _cells[i].className = 'mem-cell';
    /* 2. Clear all pointer slots */
    for (var j = 0; j < _ptrSlots.length; j++) {
      _ptrSlots[j].innerHTML = '';
      _ptrSlots[j].className = 'mem-ptr-slot';
    }
    if (!snap) return;

    var left  = snap.left  !== undefined ? snap.left  : 0;
    var right = snap.right !== undefined ? snap.right : _cells.length - 1;

    /* Dim out-of-range */
    for (var k = 0; k < _cells.length; k++) {
      if (k < left || k > right) _cells[k].classList.add('excluded');
    }

    /* Bounds markers */
    if (snap.left !== undefined && _cells[left])  _cells[left].classList.add('left-bound');
    if (snap.right !== undefined && _cells[right]) _cells[right].classList.add('right-bound');

    /* Mid */
    if (snap.mid !== null && snap.mid !== undefined && _cells[snap.mid]) {
      _cells[snap.mid].classList.add('mid');
    }

    /* Pos probe (interpolation) */
    if (snap.pos !== undefined && snap.pos !== null && _cells[snap.pos]) {
      _cells[snap.pos].classList.add('pos-probe');
    }

    /* Current (linear) */
    if (snap.current !== undefined && snap.current !== null && _cells[snap.current]) {
      _cells[snap.current].classList.add('active');
    }

    /* Found */
    if (snap.type === 'FOUND' && snap.foundIndex !== undefined) {
      for (var f = 0; f < _cells.length; f++) _cells[f].className = 'mem-cell excluded';
      if (_cells[snap.foundIndex]) { _cells[snap.foundIndex].className = 'mem-cell found'; }
    }

    /* Not found */
    if (snap.type === 'NOT_FOUND') {
      for (var nf = 0; nf < _cells.length; nf++) _cells[nf].classList.add('not-found-dim');
    }

    /* Pointers — render above cells */
    _setPtr(snap.left,    'L',   'ptr-L');
    _setPtr(snap.right,   'R',   'ptr-R');
    _setPtr(snap.mid,     'M',   'ptr-M');
    if (snap.pos     !== undefined) _setPtr(snap.pos,     'pos', 'ptr-pos');
    if (snap.current !== undefined) _setPtr(snap.current, 'i',   'ptr-i');
  }

  /* ── _setPtr ─────────────────────────────────────────── */
  function _setPtr(idx, label, cls) {
    if (idx === null || idx === undefined || idx < 0 || idx >= _ptrSlots.length) return;
    var slot = _ptrSlots[idx];
    if (!slot) return;
    var badge = document.createElement('div');
    badge.className = 'mem-ptr-badge ' + cls;
    badge.innerHTML = '<span class="ptr-label">' + label + '</span><span class="ptr-arrow-down">▼</span>';
    slot.appendChild(badge);
  }

  /* ── captureState ────────────────────────────────────── */
  function captureState() {
    return {
      cells: _cells.map(function(c) { return c.className; }),
      ptrs:  _ptrSlots.map(function(s) { return { cls: s.className, html: s.innerHTML }; })
    };
  }

  /* ── restoreState ────────────────────────────────────── */
  function restoreState(state) {
    if (!state) return;
    for (var i = 0; i < _cells.length && i < state.cells.length; i++) {
      _cells[i].className = state.cells[i];
    }
    for (var j = 0; j < _ptrSlots.length && j < state.ptrs.length; j++) {
      _ptrSlots[j].className = state.ptrs[j].cls;
      _ptrSlots[j].innerHTML = state.ptrs[j].html;
    }
  }

  /* ── reset ───────────────────────────────────────────── */
  function reset() {
    if (_algo) mount(_area, _algo);
  }

  /* ── updateArray ─────────────────────────────────────── */
  function updateArray(arr) {
    _array = arr;
    _render();
  }

  /* ── Public API ──────────────────────────────────────── */
  return {
    mount:           mount,
    applySnapshot:   applySnapshot,
    captureState:    captureState,
    restoreState:    restoreState,
    reset:           reset,
    updateArray:     updateArray,
    showTarget:      showTarget,
    flashMismatch:   flashMismatch,
    eliminateRange:  eliminateRange,
    setPosProbe:     setPosProbe,
    showFormula:     showFormula,
    showFormulaCalc: showFormulaCalc,
    getCells:        function() { return _cells; },
    getArray:        function() { return _array.slice(); }
  };

})();
