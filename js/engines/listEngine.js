/* ════════════════════════════════════════════════════════════
   Lernexa — listEngine.js
   Visual engine for Stack, Queue, and Linked List algorithms.
   Adapts layout based on algo type:
     Stack         → vertical pile, top at top
     Queue         → horizontal flow, front→rear
     Linked List   → horizontal chain with pointer arrows
   ════════════════════════════════════════════════════════════ */

'use strict';

var ListEngine = (function() {

  var _area  = null;
  var _algo  = null;
  var _items = [];   /* [{ value, state, label? }] */

  /* ── helpers ─────────────────────────────────────────── */
  function _isStack()  { return _algo && (_algo.id === 'stack'); }
  function _isQueue()  { return _algo && (_algo.id === 'queue'); }
  function _isList()   { return _algo && (_algo.id === 'linked-list-singly' || _algo.id === 'linked-list-doubly'); }
  function _isDoubly() { return _algo && _algo.id === 'linked-list-doubly'; }

  /* ── mount ───────────────────────────────────────────── */
  function mount(area, algo) {
    _algo  = algo;
    _area  = area;
    _items = [];
    area.innerHTML = '';
    _render();
  }

  /* ══════════════════════════════════════════════════════
     RENDER — dispatches to correct layout
  ══════════════════════════════════════════════════════ */
  function _render() {
    if (!_area) return;
    _area.innerHTML = '';

    if (_items.length === 0) {
      _renderEmpty();
      return;
    }

    if (_isStack())       _renderStack();
    else if (_isQueue())  _renderQueue();
    else                  _renderLinkedList();
  }

  /* ── Empty state — premium ───────────────────────────── */
  function _renderEmpty() {
    var wrap = createElement('div', 'list-empty-state');
    var icon = _isStack() ? 'fa-layer-group' : _isQueue() ? 'fa-list-ol' : 'fa-link';
    var label = _isStack() ? 'Stack' : _isQueue() ? 'Queue' : 'Linked List';
    wrap.innerHTML =
      '<div class="list-empty-icon"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="list-empty-title">' + label + ' is empty</div>' +
      '<div class="list-empty-hint">Use the controls below to add elements,<br>or press <strong>Play</strong> for the auto-demo.</div>';
    _area.appendChild(wrap);
  }

  /* ══════════════════════════════════════════════════════
     STACK — vertical pile, index 0 = top
  ══════════════════════════════════════════════════════ */
  function _renderStack() {
    var outer = createElement('div', 'list-stack-outer');

    /* header */
    var header = createElement('div', 'list-stack-header');
    header.innerHTML = '<i class="fa-solid fa-layer-group"></i> Stack &nbsp;·&nbsp; LIFO';
    outer.appendChild(header);

    /* item cells (0 = top) */
    var pile = createElement('div', 'list-stack-pile');

    for (var i = 0; i < _items.length; i++) {
      var item  = _items[i];
      var row   = createElement('div', 'list-stack-row');

      /* label column */
      var lbl = createElement('div', 'list-stack-lbl');
      if (i === 0) {
        lbl.innerHTML = '<span class="list-pos-label top">TOP</span>';
      }
      row.appendChild(lbl);

      /* cell */
      var cell = createElement('div', 'list-cell list-stack-cell');
      cell.textContent = String(item.value);
      if (item.state) cell.classList.add(item.state);
      row.appendChild(cell);

      /* index */
      var idx = createElement('div', 'list-stack-idx', '[' + i + ']');
      row.appendChild(idx);

      pile.appendChild(row);
    }

    /* bottom boundary */
    var floor = createElement('div', 'list-stack-floor');
    floor.innerHTML = '<i class="fa-solid fa-minus"></i><i class="fa-solid fa-minus"></i><i class="fa-solid fa-minus"></i>';
    pile.appendChild(floor);

    outer.appendChild(pile);

    /* size badge */
    var info = createElement('div', 'list-stack-info');
    info.innerHTML = 'Size: <span class="list-info-val">' + _items.length + '</span>';
    outer.appendChild(info);

    _area.appendChild(outer);
  }

  /* ══════════════════════════════════════════════════════
     QUEUE — horizontal flow, 0 = front
  ══════════════════════════════════════════════════════ */
  function _renderQueue() {
    var outer = createElement('div', 'list-queue-outer');

    /* header */
    var header = createElement('div', 'list-queue-header');
    header.innerHTML = '<i class="fa-solid fa-list-ol"></i> Queue &nbsp;·&nbsp; FIFO';
    outer.appendChild(header);

    var flow = createElement('div', 'list-queue-flow');

    /* dequeue arrow on left */
    var leftArrow = createElement('div', 'list-queue-side-label');
    leftArrow.innerHTML = '<i class="fa-solid fa-arrow-right" style="color:var(--accent-red)"></i><span>DEQUEUE</span>';
    flow.appendChild(leftArrow);

    for (var i = 0; i < _items.length; i++) {
      var item = _items[i];
      var wrap = createElement('div', 'list-queue-cell-wrap');

      /* position label */
      var posLbl = createElement('div', 'list-queue-pos');
      if (i === 0)                  posLbl.innerHTML = '<span class="list-pos-label front">FRONT</span>';
      else if (i === _items.length - 1) posLbl.innerHTML = '<span class="list-pos-label rear">REAR</span>';
      else                          posLbl.innerHTML = '&nbsp;';
      wrap.appendChild(posLbl);

      var cell = createElement('div', 'list-cell list-queue-cell');
      cell.textContent = String(item.value);
      if (item.state) cell.classList.add(item.state);
      wrap.appendChild(cell);

      /* index */
      var idxLbl = createElement('div', 'list-queue-idx', '[' + i + ']');
      wrap.appendChild(idxLbl);

      flow.appendChild(wrap);

      /* arrow between cells */
      if (i < _items.length - 1) {
        var arr = createElement('div', 'list-queue-arrow', '→');
        flow.appendChild(arr);
      }
    }

    /* enqueue arrow on right */
    var rightArrow = createElement('div', 'list-queue-side-label');
    rightArrow.innerHTML = '<span>ENQUEUE</span><i class="fa-solid fa-arrow-right" style="color:var(--accent-green)"></i>';
    flow.appendChild(rightArrow);

    outer.appendChild(flow);

    /* size info */
    var info = createElement('div', 'list-queue-info');
    info.innerHTML =
      'Front: <span class="list-info-val">' + _items[0].value + '</span>' +
      ' &nbsp;|&nbsp; Rear: <span class="list-info-val">' + _items[_items.length-1].value + '</span>' +
      ' &nbsp;|&nbsp; Size: <span class="list-info-val">' + _items.length + '</span>';
    outer.appendChild(info);

    _area.appendChild(outer);
  }

  /* ══════════════════════════════════════════════════════
     LINKED LIST — premium horizontal chain, split-card nodes
  ══════════════════════════════════════════════════════ */
  function _renderLinkedList() {
    var doubly = _isDoubly();
    var outer  = createElement('div', 'list-ll-outer');

    /* header */
    var header = createElement('div', 'list-ll-header');
    header.innerHTML = doubly
      ? '<i class="fa-solid fa-arrows-left-right"></i> Doubly Linked List'
      : '<i class="fa-solid fa-link"></i> Singly Linked List';
    outer.appendChild(header);

    /* scroll wrapper */
    var scroll = createElement('div', 'll-chain-scroll');
    var chain  = createElement('div', 'll-chain');

    /* NULL head (doubly only — left side) */
    if (doubly) {
      var nullHead = createElement('div', 'll-null-node');
      var nullHeadBox = createElement('div', 'll-null-box');
      nullHeadBox.textContent = 'NULL';
      nullHead.appendChild(nullHeadBox);
      chain.appendChild(nullHead);

      /* arrow from NULL head → first node */
      var arrowToFirst = _makeArrowWrap(doubly, true);
      chain.appendChild(arrowToFirst);
    }

    for (var i = 0; i < _items.length; i++) {
      var item = _items[i];

      /* node group */
      var group = createElement('div', 'll-node-group');

      /* HEAD / TAIL label above node */
      if (i === 0) {
        var headLabel = createElement('div', 'll-head-label');
        headLabel.innerHTML = '<span class="ll-head-arrow">↓</span><span>HEAD</span>';
        group.appendChild(headLabel);
      } else if (i === _items.length - 1) {
        var tailLabel = createElement('div', 'll-tail-label');
        tailLabel.textContent = 'TAIL';
        group.appendChild(tailLabel);
      } else {
        var spacer = createElement('div', 'll-node-spacer');
        group.appendChild(spacer);
      }

      /* the split-card node */
      var nodeEl = createElement('div', 'll-node');
      if (item.state) nodeEl.classList.add(item.state);

      if (doubly) {
        /* prev cell (left) */
        var prevCell = createElement('div', 'll-prev-cell');
        if (i === 0) prevCell.classList.add('null-ptr');
        var prevIcon = createElement('span', 'll-ptr-icon');
        prevIcon.textContent = '←';
        prevCell.appendChild(prevIcon);
        nodeEl.appendChild(prevCell);
      }

      /* data cell (center/left for singly) */
      var dataCell = createElement('div', 'll-data-cell');
      dataCell.textContent = String(item.value);
      nodeEl.appendChild(dataCell);

      /* next pointer cell (right) */
      var ptrCell = createElement('div', 'll-ptr-cell');
      var isLastNode = (i === _items.length - 1);
      if (isLastNode) ptrCell.classList.add('null-ptr');
      var ptrIcon = createElement('span', 'll-ptr-icon');
      ptrIcon.textContent = '→';
      ptrCell.appendChild(ptrIcon);
      nodeEl.appendChild(ptrCell);

      group.appendChild(nodeEl);

      /* index label below */
      var idxLbl = createElement('div', 'll-node-idx');
      idxLbl.textContent = '[' + i + ']';
      group.appendChild(idxLbl);

      chain.appendChild(group);

      /* arrow between nodes (not after the last one) */
      if (i < _items.length - 1) {
        var arrowWrap = _makeArrowWrap(doubly, false);
        chain.appendChild(arrowWrap);
      }
    }

    /* NULL terminus (right side) */
    var nullTail = createElement('div', 'll-null-node');
    var nullTailBox = createElement('div', 'll-null-box');
    nullTailBox.textContent = 'NULL';
    nullTail.appendChild(nullTailBox);
    chain.appendChild(nullTail);

    scroll.appendChild(chain);
    outer.appendChild(scroll);

    /* info bar */
    var info = createElement('div', 'list-ll-info');
    info.innerHTML =
      'Head: <span class="list-info-val">' + _items[0].value + '</span>' +
      ' &nbsp;|&nbsp; Tail: <span class="list-info-val">' + _items[_items.length - 1].value + '</span>' +
      ' &nbsp;|&nbsp; Length: <span class="list-info-val">' + _items.length + '</span>';
    outer.appendChild(info);

    _area.appendChild(outer);
  }

  /* builds a glowing arrow wrapper between nodes */
  function _makeArrowWrap(doubly, isPrevArrow) {
    var wrap = createElement('div', 'll-arrow-wrap');

    if (!doubly) {
      /* singly: one forward arrow */
      var single = createElement('div', 'll-arrow-single');
      var line   = createElement('div', 'll-arrow-line');
      var head   = createElement('div', 'll-arrow-head');
      single.appendChild(line);
      single.appendChild(head);
      wrap.appendChild(single);
    } else {
      /* doubly: two rows — next (blue) on top, prev (purple) below */
      var dbl = createElement('div', 'll-arrow-double');

      /* next forward arrow */
      var nextRow = createElement('div', 'll-arrow-single ll-arrow-next');
      var nextLine = createElement('div', 'll-arrow-line');
      var nextHead = createElement('div', 'll-arrow-head');
      nextRow.appendChild(nextLine);
      nextRow.appendChild(nextHead);
      dbl.appendChild(nextRow);

      /* prev backward arrow */
      var prevRow = createElement('div', 'll-arrow-single ll-arrow-prev');
      var prevHead2 = createElement('div', 'll-arrow-head');
      var prevLine2 = createElement('div', 'll-arrow-line');
      prevRow.appendChild(prevHead2);
      prevRow.appendChild(prevLine2);
      dbl.appendChild(prevRow);

      wrap.appendChild(dbl);
    }

    return wrap;
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API — Stack
  ══════════════════════════════════════════════════════ */
  function push(value, highlight) {
    _items.unshift({ value: value, state: highlight ? 'pushed' : '' });
    _render();
    if (highlight) {
      setTimeout(function() {
        if (_items[0]) { _items[0].state = ''; _render(); }
      }, 500);
    }
  }

  function pop() {
    if (!_items.length) return undefined;
    var val = _items[0].value;
    _items[0].state = 'popped';
    _render();
    setTimeout(function() {
      _items.shift();
      _render();
    }, 450);
    return val;
  }

  /* ── Queue ───────────────────────────────────────────── */
  function enqueue(value) {
    _items.push({ value: value, state: 'pushed' });
    _render();
    setTimeout(function() {
      if (_items[_items.length - 1]) { _items[_items.length - 1].state = ''; _render(); }
    }, 500);
  }

  function dequeue() {
    if (!_items.length) return undefined;
    var val = _items[0].value;
    _items[0].state = 'popped';
    _render();
    setTimeout(function() {
      _items.shift();
      _render();
    }, 450);
    return val;
  }

  /* ── Linked List ─────────────────────────────────────── */
  function insertHead(value) {
    _items.unshift({ value: value, state: 'inserting' });
    _render();
    setTimeout(function() { if (_items[0]) { _items[0].state = ''; _render(); } }, 500);
  }

  function insertTail(value) {
    _items.push({ value: value, state: 'inserting' });
    _render();
    setTimeout(function() {
      var last = _items[_items.length - 1];
      if (last) { last.state = ''; _render(); }
    }, 500);
  }

  function deleteNode(value) {
    for (var i = 0; i < _items.length; i++) {
      if (_items[i].value === value) {
        _items[i].state = 'deleting';
        _render();
        var capturedIdx = i;
        setTimeout(function() {
          _items.splice(capturedIdx, 1);
          _render();
        }, 450);
        return true;
      }
    }
    return false;
  }

  /* ── insertAt(value, index) ──────────────────────────── */
  function insertAt(value, index) {
    var clampedIdx = Math.max(0, Math.min(index, _items.length));
    _items.splice(clampedIdx, 0, { value: value, state: 'inserting' });
    _render();
    setTimeout(function() {
      if (_items[clampedIdx]) { _items[clampedIdx].state = ''; _render(); }
    }, 500);
  }

  /* ── searchNode(value, found) ────────────────────────── */
  function searchNode(value, found) {
    for (var i = 0; i < _items.length; i++) {
      _items[i].state = (_items[i].value === value) ? (found ? 'found-ok' : 'not-found-anim') : '';
    }
    _render();
    /* Reset highlight after 1.5s */
    setTimeout(function() {
      for (var j = 0; j < _items.length; j++) _items[j].state = '';
      _render();
    }, 1500);
  }

  function highlight(value) {
    for (var i = 0; i < _items.length; i++) {
      _items[i].state = (_items[i].value === value) ? 'highlighted' : '';
    }
    _render();
    setTimeout(function() {
      for (var j = 0; j < _items.length; j++) _items[j].state = '';
      _render();
    }, 1200);
  }

  /* ── traverseHighlight(upToIdx, delayMs) ─────────────── */
  function traverseHighlight(upToIdx, delayMs) {
    for (var i = 0; i <= upToIdx && i < _items.length; i++) {
      (function(idx, delay) {
        setTimeout(function() {
          for (var j = 0; j < _items.length; j++) {
            _items[j].state = (j === idx) ? 'traversing' : (j < idx ? '' : '');
          }
          _render();
          if (idx === upToIdx) {
            setTimeout(function() {
              for (var k = 0; k < _items.length; k++) _items[k].state = '';
              _render();
            }, 500);
          }
        }, delay);
      })(i, i * delayMs);
    }
  }

  /* ── Getters ─────────────────────────────────────────── */
  function getAll() {
    return _items.map(function(it) { return it.value; });
  }

  function applySnapshot(snap) {
    if (snap && snap.items !== undefined) { _items = snap.items.slice(); _render(); }
  }

  function captureState() {
    return { items: _items.map(function(it) { return { value: it.value, state: it.state }; }) };
  }

  /* restoreState — replays a captured snapshot (step-back / step-forward). */
  function restoreState(state) { applySnapshot(state); }

  function reset() {
    _items = [];
    _render();
  }

  return {
    mount: mount,
    push: push, pop: pop,
    enqueue: enqueue, dequeue: dequeue,
    insertHead: insertHead, insertTail: insertTail, insertAt: insertAt,
    deleteNode: deleteNode,
    highlight: highlight, searchNode: searchNode,
    traverseHighlight: traverseHighlight,
    getAll: getAll,
    applySnapshot: applySnapshot,
    captureState: captureState,
    restoreState: restoreState,
    reset: reset
  };

})();
