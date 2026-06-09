/* ════════════════════════════════════════════════════════════
   Lernexa — workspace.js
   The Orchestrator. Wires the entire workspace page.
   Binds controls → engines → dashboard.
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   WORKSPACE STATE
   Single mutable object. Never scatter state.
══════════════════════════════════════════════════════════ */
var WS = {
  algo:      null,    /* current AlgoData object from algorithms.json */
  engine:    null,    /* current engine reference */
  speed:     4,       /* 1–8 → 0.25× … 2× */
  isRunning: false,
  isPaused:  false,
  control:   { isPaused: false, isAborted: false },
  counters:  {},      /* { key: number } — live counters */
  heuristic: 'manhattan', /* for A* */
  runToken:  0,       /* increments on every fresh run — guards Reset→Play race */

  /* ── Step history ──────────────────────────────────────── */
  steps:     [],      /* array of engine state snapshots */
  stepIndex: -1,      /* pointer into steps[] */
  MAX_STEPS: 200      /* bounded snapshot buffer */
};

/* ══════════════════════════════════════════════════════════
   WORKSPACE CONTROLLER
   Public API consumed by router.js
══════════════════════════════════════════════════════════ */
var WorkspaceController = (function() {

  /* ── init (called by router after validation) ────────── */
  function init(algo) {
    WS.algo = algo;
    /* Single source of truth for speed: read the slider so the thumb,
       fill, label and actual delay all agree on first load. */
    var _spd = byId('speedSlider');
    WS.speed = _spd ? (parseInt(_spd.value) || 4) : 4;
    WS.isRunning = false;
    WS.isPaused  = false;
    WS.heuristic = 'manhattan';
    WS.control   = { isPaused: false, isAborted: false };

    _setupTitle(algo);
    _setupDifficulty(algo);
    _buildSidebar(algo);
    _buildCounters(algo);
    _buildVarWatcher(algo);
    _setupControls(algo);
    _setupTreeExtras(algo);
    _setupTabs();
    _setupLogToggle();
    _setupKeyboard();
    _loadEngine(algo);

    /* Populate description */
    var descEl = byId('dashDesc');
    if (descEl && algo.description) descEl.textContent = algo.description;

    /* Populate tags */
    var tagsEl = byId('algoTags');
    if (tagsEl && algo.tags) {
      tagsEl.innerHTML = '';
      for (var ti = 0; ti < algo.tags.length; ti++) {
        var tag = document.createElement('span');
        tag.className = 'algo-tag';
        tag.textContent = algo.tags[ti];
        tagsEl.appendChild(tag);
      }
    }

    /* Populate complexity strip */
    var tc = algo.timeComplexity || {};
    setText('cmpxBest',  tc.best    || '—');
    setText('cmpxAvg',   tc.average || '—');
    setText('cmpxWorst', tc.worst   || '—');
    setText('cmpxSpace', algo.spaceComplexity || '—');

    /* Category label */
    setText('wsAlgoCat', algo.categoryLabel || '');
    setText('wsAlgoCatBadge', algo.categoryLabel || '');

    log('info', 'Ready. Press <strong>Play</strong> to start ' + algo.name + '.');
  }

  /* ── Title & difficulty ──────────────────────────────── */
  function _setupTitle(algo) {
    document.title = algo.name + ' — Lernexa';
    setText('wsAlgoName', algo.name);
    var diffEl = byId('wsAlgoDiff');
    if (diffEl) {
      diffEl.textContent = _capFirst(algo.difficulty);
      diffEl.className = 'difficulty-badge ' + algo.difficulty;
    }
  }

  /* ── Sidebar ─────────────────────────────────────────── */
  function _buildSidebar(currentAlgo) {
    AlgorithmData.load(function(data) {
      var list = byId('sidebarList');
      if (!list) return;
      list.innerHTML = '';

      /* Group by category */
      var groups = {};
      var order  = [];
      for (var i = 0; i < data.length; i++) {
        var a = data[i];
        if (!groups[a.category]) {
          groups[a.category] = { label: a.categoryLabel, items: [] };
          order.push(a.category);
        }
        groups[a.category].items.push(a);
      }

      for (var k = 0; k < order.length; k++) {
        var catId = order[k];
        var group = groups[catId];
        var catDiv = createElement('div', 'sidebar-cat-header', group.label);
        list.appendChild(catDiv);

        for (var j = 0; j < group.items.length; j++) {
          var item = group.items[j];
          var a = document.createElement('a');
          a.className = 'sidebar-algo-item' + (item.id === currentAlgo.id ? ' active' : '');
          a.href = 'workspace.html?algo=' + item.id;
          a.innerHTML =
            '<i class="fa-solid ' + (item.icon || 'fa-code') + '"></i>' +
            '<span class="sidebar-algo-name">' + item.name + '</span>';
          list.appendChild(a);
        }
      }
    });

    /* Sidebar toggle */
    var toggleBtn = byId('sidebarToggle');
    var sidebar   = byId('wsSidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        toggleBtn.innerHTML = sidebar.classList.contains('collapsed')
          ? '<i class="fa-solid fa-angles-right"></i>'
          : '<i class="fa-solid fa-angles-left"></i>';
      });
    }
  }

  /* ── Build live counters ─────────────────────────────── */
  function _buildCounters(algo) {
    var grid = byId('countersGrid');
    if (!grid || !algo.counters) return;
    grid.innerHTML = '';
    WS.counters = {};

    for (var i = 0; i < algo.counters.length; i++) {
      var key  = algo.counters[i];
      var label = key.replace(/_/g, ' ');
      WS.counters[key] = 0;

      var div = createElement('div', 'counter-item');
      div.setAttribute('id', 'counter-box-' + key);
      div.innerHTML =
        '<span class="counter-value" id="counter-val-' + key + '">0</span>' +
        '<span class="counter-label">' + label + '</span>';
      grid.appendChild(div);
    }
  }

  /* ── Build variable watcher rows from algo.variables ─── */
  function _buildVarWatcher(algo) {
    var tbody = byId('varWatcherBody');
    if (!tbody || !algo.variables) return;
    tbody.innerHTML = '';
    for (var i = 0; i < algo.variables.length; i++) {
      var name = algo.variables[i];
      var tr = document.createElement('tr');
      tr.setAttribute('id', 'vw-row-' + name);
      tr.innerHTML =
        '<td>' + name + '</td>' +
        '<td id="vw-' + name + '">—</td>';
      tbody.appendChild(tr);
    }
  }

  /* ── Setup controls ──────────────────────────────────── */
  function _setupControls(algo) {
    /* Buttons */
    var btnPlay  = byId('btnPlay');
    var btnPause = byId('btnPause');
    var btnReset = byId('btnReset');

    if (btnPlay)  btnPlay.addEventListener('click', _onPlay);
    if (btnPause) btnPause.addEventListener('click', _onPause);
    if (btnReset) btnReset.addEventListener('click', _onReset);

    /* Speed slider (1–8 → 0.25× … 2×) */
    var speedSlider = byId('speedSlider');
    var speedLabel  = byId('speedValue');
    if (speedSlider) {
      speedSlider.addEventListener('input', function() {
        WS.speed = parseInt(speedSlider.value);
        if (speedLabel) speedLabel.textContent = speedToLabel(WS.speed);
        _updateSliderFill(speedSlider);
      });
      /* Set initial label */
      if (speedLabel) speedLabel.textContent = speedToLabel(WS.speed);
      _updateSliderFill(speedSlider);
    }

    /* Array size slider — label updates live, regeneration only on release */
    var sizeSlider  = byId('arraySizeSlider');
    var sizeLabel   = byId('arraySizeValue');
    var sizeGroup   = byId('arraySizeGroup');
    if (sizeSlider) {
      if (sizeGroup) sizeGroup.style.display = algo.engine === 'barsEngine' ? 'flex' : 'none';

      /* Live label update only — NO regeneration on drag */
      sizeSlider.addEventListener('input', function() {
        var n = parseInt(sizeSlider.value);
        if (sizeLabel) sizeLabel.textContent = n;
        _updateSliderFill(sizeSlider);
      });

      /* Regenerate ONLY on release */
      function _onSizeCommit() {
        if (!WS.isRunning && WS.engine && typeof WS.engine.generateBars === 'function') {
          WS.engine.generateBars(parseInt(sizeSlider.value));
        }
      }
      sizeSlider.addEventListener('mouseup', _onSizeCommit);
      sizeSlider.addEventListener('touchend', _onSizeCommit);

      _updateSliderFill(sizeSlider);
    }

    /* Custom input group */
    var inputGroup  = byId('ctrlInputGroup');
    var arrayInput  = byId('arrayInput');
    var targetInput = byId('targetInput');

    if (algo.input && algo.input.type === 'array+target') {
      if (inputGroup) inputGroup.style.display = 'flex';
      if (arrayInput) {
        arrayInput.placeholder = algo.input.arrayLabel || 'Comma-separated numbers';
        arrayInput.value = (algo.input.defaultArray || []).join(', ');
      }
      if (targetInput) {
        targetInput.style.display = '';
        targetInput.placeholder = algo.input.targetLabel || 'Target';
        targetInput.value = algo.input.defaultTarget !== undefined ? algo.input.defaultTarget : '';
      }
    } else if (algo.input && algo.input.type === 'array') {
      if (inputGroup) inputGroup.style.display = 'flex';
      if (arrayInput) {
        arrayInput.placeholder = algo.input.arrayLabel || 'Comma-separated numbers';
        arrayInput.value = (algo.input.defaultArray || []).join(', ');
      }
      if (targetInput) targetInput.style.display = 'none';
    }

    /* Apply input button */
    var btnApply = byId('btnApplyInput');
    if (btnApply) {
      btnApply.addEventListener('click', function() {
        if (WS.isRunning) return;
        _applyCustomInput();
      });
    }

    /* Expression input (infix/postfix/prefix converters) */
    var exprIds = ['infix-to-postfix', 'infix-to-prefix', 'postfix-evaluator'];
    var isExpr  = exprIds.indexOf(algo.id) !== -1;
    var exprGroup = byId('ctrlExpressionGroup');
    var exprInput = byId('expressionInput');
    if (exprGroup) exprGroup.style.display = isExpr ? 'flex' : 'none';
    if (isExpr && exprInput && algo.input && algo.input.defaultExpression) {
      exprInput.value       = algo.input.defaultExpression;
      exprInput.placeholder = algo.input.label || 'Expression';
    }
    var btnApplyExpr = byId('btnApplyExpression');
    if (btnApplyExpr) {
      btnApplyExpr.addEventListener('click', function() {
        if (WS.isRunning) return;
        log('info', 'Expression set. Press <strong>Play</strong> to start.');
      });
    }

    /* Depth limit input (DLS) */
    var dlsGroup      = byId('ctrlDepthLimitGroup');
    var dlsInput      = byId('depthLimitInput');
    var isDLS         = algo.id === 'dls';
    if (dlsGroup) dlsGroup.style.display = isDLS ? 'flex' : 'none';
    if (isDLS && dlsInput && algo.input && algo.input.defaultDepthLimit !== undefined) {
      dlsInput.value = algo.input.defaultDepthLimit;
    }

    /* Pathfinding extras */
    var pathExtra = byId('ctrlPathExtra');
    if (pathExtra) pathExtra.style.display = (algo.engine === 'gridEngine') ? 'flex' : 'none';

    var btnMaze  = byId('btnGenMaze');
    var btnClear = byId('btnClearGrid');
    if (btnMaze  && WS.engine && typeof WS.engine.generateMaze  === 'function') btnMaze.addEventListener('click',  function() { WS.engine.generateMaze(); });
    if (btnClear && WS.engine && typeof WS.engine.clearGrid     === 'function') btnClear.addEventListener('click', function() { WS.engine.clearGrid(); });

    /* K slider */
    var kGroup  = byId('kSliderGroup');
    var kSlider = byId('kSlider');
    var kLabel  = byId('kValue');
    if (kGroup) kGroup.style.display = (algo.engine === 'canvasEngine') ? 'flex' : 'none';
    if (kSlider) {
      kSlider.addEventListener('input', function() {
        if (kLabel) kLabel.textContent = kSlider.value;
        _updateSliderFill(kSlider);
      });
      _updateSliderFill(kSlider);
    }

    /* ── Interactive DS Controls ──────────────────────────── */
    _setupInteractiveDS(algo);

    /* ── Interactive BST Controls ─────────────────────────── */
    _setupInteractiveBST(algo);

    /* ── Sort Edge Cases + Random ──────────────────────────── */
    _setupSortExtras(algo);

    /* ── A* Heuristic ───────────────────────────────────────── */
    _setupHeuristic(algo);

    /* Step buttons */
    var btnStepBack = byId('btnStepBack');
    var btnStepFwd  = byId('btnStepFwd');
    if (btnStepBack) btnStepBack.addEventListener('click', _onStepBack);
    if (btnStepFwd)  btnStepFwd.addEventListener('click',  _onStepFwd);

    /* Clear log button */
    var btnClearLog = byId('btnClearLog');
    if (btnClearLog) {
      btnClearLog.addEventListener('click', function() {
        var logEl = byId('stepLog');
        if (logEl) logEl.innerHTML = '';
      });
    }

    _setControlState('idle');
  }

  /* ══════════════════════════════════════════════════════════
     INTERACTIVE DATA STRUCTURE CONTROLS
  ══════════════════════════════════════════════════════════ */
  function _setupInteractiveDS(algo) {
    var dsIds = ['stack', 'queue', 'linked-list-singly', 'linked-list-doubly'];
    var isDS  = dsIds.indexOf(algo.id) !== -1;
    var panel = byId('ctrlInteractiveDS');
    if (!panel) return;

    panel.style.display = isDS ? 'flex' : 'none';
    if (!isDS) return;

    /* Show the right ops group */
    var opStack  = byId('dsOpsStack');
    var opQueue  = byId('dsOpsQueue');
    var opList   = byId('dsOpsList');
    if (opStack) opStack.style.display = 'none';
    if (opQueue) opQueue.style.display = 'none';
    if (opList)  opList.style.display  = 'none';

    if (algo.id === 'stack' && opStack)        opStack.style.display = 'flex';
    else if (algo.id === 'queue' && opQueue)   opQueue.style.display = 'flex';
    else if (opList)                            opList.style.display  = 'flex';

    var valInput = byId('dsValueInput');

    /* ── Helper: get typed value ── */
    function _dsVal() {
      var v = valInput ? parseInt(valInput.value) : NaN;
      return isNaN(v) ? null : v;
    }
    function _requireVal(label) {
      if (_dsVal() === null) {
        log('compare', label + ': please enter a value first.');
        if (valInput) { valInput.focus(); valInput.classList.add('input-error'); setTimeout(function() { valInput.classList.remove('input-error'); }, 1200); }
        return false;
      }
      return true;
    }
    function _eng() { return WS.engine; }

    /* ── DS operation helper — logs + updates vars ── */
    function _dsOp(opFn) {
      if (WS.isRunning && !WS.isPaused) {
        log('compare', 'Pause the demo before manual operations.');
        return;
      }
      opFn();
    }

    /* ══ STACK ══ */
    var btnPush = byId('btnDSPush');
    var btnPop  = byId('btnDSPop');
    var btnPeek = byId('btnDSPeek');
    if (btnPush) btnPush.addEventListener('click', function() {
      if (!_requireVal('Push')) return;
      _dsOp(function() {
        var v   = _dsVal();
        var eng = _eng();
        if (eng && typeof eng.push === 'function') {
          eng.push(v, true);
          var all = eng.getAll ? eng.getAll() : [];
          log('found', '<i class="fa-solid fa-arrow-down"></i> <strong>PUSH</strong> <span class="log-val">' + v + '</span> → size: ' + all.length);
          _updateVar('top', 0); _updateVar('size', all.length);
          _bumpCounter('pushes');
        }
        if (valInput) valInput.value = '';
      });
    });
    if (btnPop) btnPop.addEventListener('click', function() {
      _dsOp(function() {
        var eng = _eng();
        if (!eng || typeof eng.pop !== 'function') return;
        var all = eng.getAll ? eng.getAll() : [];
        if (!all.length) { log('compare', '<strong>POP</strong>: Stack is empty — <span style="color:var(--accent-red)">Stack Underflow!</span>'); return; }
        var popped = all[0];
        eng.pop();
        setTimeout(function() {
          var all2 = eng.getAll ? eng.getAll() : [];
          _updateVar('top', all2.length > 0 ? 0 : -1);
          _updateVar('size', all2.length);
          log('swap', '<i class="fa-solid fa-arrow-up"></i> <strong>POP</strong> → removed <span class="log-val">' + popped + '</span>. Size: ' + all2.length);
          _bumpCounter('pops');
        }, 460);
      });
    });
    if (btnPeek) btnPeek.addEventListener('click', function() {
      _dsOp(function() {
        var eng = _eng();
        var all = eng && eng.getAll ? eng.getAll() : [];
        if (!all.length) { log('compare', '<strong>PEEK</strong>: Stack is empty.'); return; }
        var topVal = all[0];
        if (eng && typeof eng.highlight === 'function') eng.highlight(topVal);
        log('info', '<i class="fa-solid fa-eye"></i> <strong>PEEK</strong> → top = <span class="log-val">' + topVal + '</span> (no removal).');
      });
    });

    /* ══ QUEUE ══ */
    var btnEnq  = byId('btnDSEnqueue');
    var btnDeq  = byId('btnDSDequeue');
    var btnPeekQ = byId('btnDSPeekQ');
    if (btnEnq) btnEnq.addEventListener('click', function() {
      if (!_requireVal('Enqueue')) return;
      _dsOp(function() {
        var v   = _dsVal();
        var eng = _eng();
        if (eng && typeof eng.enqueue === 'function') {
          eng.enqueue(v);
          var all = eng.getAll ? eng.getAll() : [];
          log('found', '<i class="fa-solid fa-plus"></i> <strong>ENQUEUE</strong> <span class="log-val">' + v + '</span> → rear. Size: ' + all.length);
          _updateVar('front', all[0]); _updateVar('rear', all[all.length - 1]); _updateVar('size', all.length);
          _bumpCounter('enqueues');
        }
        if (valInput) valInput.value = '';
      });
    });
    if (btnDeq) btnDeq.addEventListener('click', function() {
      _dsOp(function() {
        var eng = _eng();
        if (!eng || typeof eng.dequeue !== 'function') return;
        var all = eng.getAll ? eng.getAll() : [];
        if (!all.length) { log('compare', '<strong>DEQUEUE</strong>: Queue is empty — <span style="color:var(--accent-red)">Queue Underflow!</span>'); return; }
        var front = all[0];
        eng.dequeue();
        setTimeout(function() {
          var all2 = eng.getAll ? eng.getAll() : [];
          _updateVar('front', all2[0] || '—'); _updateVar('rear', all2[all2.length - 1] || '—'); _updateVar('size', all2.length);
          log('swap', '<i class="fa-solid fa-minus"></i> <strong>DEQUEUE</strong> → served <span class="log-val">' + front + '</span>. Size: ' + all2.length);
          _bumpCounter('dequeues');
        }, 460);
      });
    });
    if (btnPeekQ) btnPeekQ.addEventListener('click', function() {
      _dsOp(function() {
        var eng = _eng();
        var all = eng && eng.getAll ? eng.getAll() : [];
        if (!all.length) { log('compare', '<strong>PEEK</strong>: Queue is empty.'); return; }
        if (eng && typeof eng.highlight === 'function') eng.highlight(all[0]);
        log('info', '<i class="fa-solid fa-eye"></i> <strong>PEEK</strong> → front = <span class="log-val">' + all[0] + '</span> (no removal).');
      });
    });

    /* ══ LINKED LIST ══ */
    var selPos    = byId('dsInsertPos');
    var idxInput  = byId('dsIndexInput');
    var btnInsert = byId('btnDSInsert');
    var btnRemove = byId('btnDSRemove');
    var btnLLSrch = byId('btnDSListSearch');

    if (selPos && idxInput) {
      selPos.addEventListener('change', function() {
        idxInput.style.display = selPos.value === 'index' ? 'inline-block' : 'none';
      });
    }

    if (btnInsert) btnInsert.addEventListener('click', function() {
      if (!_requireVal('Insert')) return;
      _dsOp(function() {
        var v   = _dsVal();
        var eng = _eng();
        if (!eng) return;
        var pos = selPos ? selPos.value : 'tail';
        if (pos === 'head' && typeof eng.insertHead === 'function') {
          eng.insertHead(v);
          log('found', '<i class="fa-solid fa-plus"></i> <strong>INSERT HEAD</strong> <span class="log-val">' + v + '</span> — O(1)');
        } else if (pos === 'tail' && typeof eng.insertTail === 'function') {
          eng.insertTail(v);
          log('found', '<i class="fa-solid fa-plus"></i> <strong>INSERT TAIL</strong> <span class="log-val">' + v + '</span> — O(n) traversal');
        } else if (pos === 'index' && typeof eng.insertAt === 'function') {
          var idx = idxInput ? parseInt(idxInput.value) : 0;
          if (isNaN(idx) || idx < 0) { log('compare', 'Please enter a valid index.'); return; }
          eng.insertAt(v, idx);
          log('found', '<i class="fa-solid fa-plus"></i> <strong>INSERT AT</strong> index <span class="log-idx">' + idx + '</span> value <span class="log-val">' + v + '</span>');
        }
        var all = eng.getAll ? eng.getAll() : [];
        _updateVar('head', all[0] || '—'); _updateVar('size', all.length);
        _bumpCounter('insertions');
        if (valInput) valInput.value = '';
      });
    });

    if (btnRemove) btnRemove.addEventListener('click', function() {
      if (!_requireVal('Remove')) return;
      _dsOp(function() {
        var v   = _dsVal();
        var eng = _eng();
        if (!eng || typeof eng.deleteNode !== 'function') return;
        var found = eng.deleteNode(v);
        if (found) {
          setTimeout(function() {
            var all = eng.getAll ? eng.getAll() : [];
            _updateVar('head', all[0] || 'null'); _updateVar('size', all.length);
            log('swap', '<i class="fa-solid fa-trash"></i> <strong>REMOVE</strong> node <span class="log-val">' + v + '</span> — pointers re-linked.');
            _bumpCounter('deletions');
          }, 460);
        } else {
          log('compare', '<strong>REMOVE</strong>: Value <span class="log-val">' + v + '</span> not found in list.');
        }
      });
    });

    if (btnLLSrch) btnLLSrch.addEventListener('click', function() {
      if (!_requireVal('Search')) return;
      _dsOp(function() {
        var v   = _dsVal();
        var eng = _eng();
        if (!eng) return;
        var all  = eng.getAll ? eng.getAll() : [];
        var idx  = all.indexOf(v);
        if (typeof eng.searchNode === 'function') {
          eng.searchNode(v, idx >= 0);
        } else if (typeof eng.highlight === 'function') {
          eng.highlight(v);
        }
        if (idx >= 0) {
          log('found', '<i class="fa-solid fa-check"></i> <strong>SEARCH</strong> <span class="log-val">' + v + '</span> → found at index <span class="log-idx">' + idx + '</span>.');
          _bumpCounter('traversals');
        } else {
          log('compare', '<strong>SEARCH</strong> <span class="log-val">' + v + '</span> → not found. Traversed all nodes.');
        }
      });
    });

    /* ── Clear ── */
    var btnClearDS = byId('btnDSClear');
    if (btnClearDS) btnClearDS.addEventListener('click', function() {
      _dsOp(function() {
        var eng = _eng();
        if (eng && typeof eng.reset === 'function') eng.reset();
        log('info', '<i class="fa-solid fa-rotate-left"></i> Cleared. Structure is now empty.');
      });
    });

    /* Hint: update empty state hint for interactive mode */
    setTimeout(function() {
      var hintEl = document.querySelector('.list-empty-hint');
      if (hintEl) hintEl.innerHTML = 'Use the controls below to add elements,<br>or press <strong>Play</strong> for the auto-demo.';
    }, 200);
  }

  /* ══════════════════════════════════════════════════════════
     INTERACTIVE BST / TREE TRAVERSAL CONTROLS
  ══════════════════════════════════════════════════════════ */
  function _setupInteractiveBST(algo) {
    var bstIds = ['bst', 'tree-traversals'];
    var isBST  = bstIds.indexOf(algo.id) !== -1;
    var panel  = byId('ctrlInteractiveBST');
    if (!panel) return;

    panel.style.display = isBST ? 'flex' : 'none';
    if (!isBST) return;


    /* Default traversal mode from algorithm JSON (tree-traversals) */
    var selMode = byId('traversalModeSelect');
    if (selMode && algo.input && algo.input.defaultMode) {
      selMode.value = algo.input.defaultMode;
    }

    var valInput = byId('bstValueInput');
    function _bstVal() {
      var v = valInput ? parseInt(valInput.value) : NaN;
      return isNaN(v) ? null : v;
    }
    function _requireBSTVal(label) {
      if (_bstVal() === null) {
        log('compare', label + ': please enter a value first.');
        if (valInput) { valInput.focus(); valInput.classList.add('input-error'); setTimeout(function() { valInput.classList.remove('input-error'); }, 1200); }
        return false;
      }
      return true;
    }
    function _eng() { return WS.engine; }
    function _isBusy() { return WS.isRunning && !WS.isPaused; }

    /* ── Insert ── */
    var btnIns = byId('btnBSTInsert');
    if (btnIns) btnIns.addEventListener('click', function() {
      if (_isBusy()) { log('compare', 'Pause the animation first.'); return; }
      if (!_requireBSTVal('Insert')) return;
      var v   = _bstVal();
      var eng = _eng();
      if (eng && typeof eng.interactiveBSTInsert === 'function') {
        eng.interactiveBSTInsert(v, function(msg) { log('found', msg); });
        _bumpCounter('insertions');
        _updateVar('size', eng.getBSTSize ? eng.getBSTSize() : '?');
        _updateVar('height', eng.getBSTHeight ? eng.getBSTHeight() : '?');
      } else {
        log('compare', 'BST engine not ready — press Play first to build the tree.');
      }
      if (valInput) valInput.value = '';
    });

    /* ── Delete ── */
    var btnDel = byId('btnBSTDelete');
    if (btnDel) btnDel.addEventListener('click', function() {
      if (_isBusy()) { log('compare', 'Pause the animation first.'); return; }
      if (!_requireBSTVal('Delete')) return;
      var v   = _bstVal();
      var eng = _eng();
      if (eng && typeof eng.interactiveBSTDelete === 'function') {
        var ok = eng.interactiveBSTDelete(v, function(msg) { log('swap', msg); });
        if (!ok) log('compare', 'Value <span class="log-val">' + v + '</span> not found in tree.');
        _updateVar('size', eng.getBSTSize ? eng.getBSTSize() : '?');
      } else {
        log('compare', 'BST engine not ready.');
      }
      if (valInput) valInput.value = '';
    });

    /* ── Search ── */
    var btnSrch = byId('btnBSTSearch');
    if (btnSrch) btnSrch.addEventListener('click', function() {
      if (_isBusy()) { log('compare', 'Pause the animation first.'); return; }
      if (!_requireBSTVal('Search')) return;
      var v   = _bstVal();
      var eng = _eng();
      if (eng && typeof eng.interactiveBSTSearch === 'function') {
        eng.interactiveBSTSearch(v, function(found, depth) {
          if (found) log('found', '<i class="fa-solid fa-check"></i> Found <span class="log-val">' + v + '</span> at depth <span class="log-idx">' + depth + '</span>.');
          else       log('compare', 'Value <span class="log-val">' + v + '</span> not in tree (search exhausted).');
          _bumpCounter('comparisons');
        });
      } else {
        log('compare', 'BST engine not ready.');
      }
    });

    /* ── Reset tree ── */
    var btnBSTReset = byId('btnBSTReset');
    if (btnBSTReset) btnBSTReset.addEventListener('click', function() {
      if (_isBusy()) return;
      var eng = _eng();
      if (eng && typeof eng.resetBST === 'function') {
        eng.resetBST(algo.input ? algo.input.defaultValues : null);
        log('info', '<i class="fa-solid fa-rotate-left"></i> Tree reset to defaults.');
      }
    });

    /* ── Traverse ── */
    var btnTrav = byId('btnBSTTraverse');
    if (btnTrav) btnTrav.addEventListener('click', function() {
      if (_isBusy()) { log('compare', 'Pause the animation first.'); return; }
      var mode = selMode ? selMode.value : 'inorder';
      var eng  = _eng();
      if (!eng) { log('compare', 'Build the tree first (use Insert or press Play).'); return; }
      /* Use the graphEngine's traverse API if available */
      if (typeof eng.interactiveBSTTraverse === 'function') {
        _setControlState('running');
        WS.isRunning = true;
        WS.control   = { isPaused: false, isAborted: false };
        eng.interactiveBSTTraverse(mode, WS.control, speedToDelay(WS.speed), function(val, order) {
          log('info', 'Visit <span class="log-val">' + val + '</span> &nbsp;[' + order.join(' → ') + ']');
          _bumpCounter('visits');
          _updateVar('current', val);
          _updateVar('order', order.join(' → '));
        }, function() {
          log('done', '<i class="fa-solid fa-check"></i> Traversal complete — order: <span class="log-val">' + mode + '</span>.');
          WS.isRunning = false;
          _setControlState('idle');
        });
      } else {
        /* Fallback: use the standard runner with the mode */
        WS.algo.input = WS.algo.input || {};
        WS.algo.input.defaultMode = mode;
        _onPlay();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     SORTING EDGE CASES + RANDOM GENERATOR
  ══════════════════════════════════════════════════════════ */
  function _setupSortExtras(algo) {
    var sortIds = ['bubble-sort','selection-sort','insertion-sort','merge-sort','heap-sort','quick-sort'];
    var isSort  = sortIds.indexOf(algo.id) !== -1;
    var panel   = byId('ctrlSortExtras');
    if (!panel) return;

    panel.style.display = isSort ? 'flex' : 'none';
    if (!isSort) return;

    var selCase  = byId('edgeCaseSelect');
    var btnGen   = byId('btnSortRandom');
    var sizeSlider = byId('arraySizeSlider');

    function _generate() {
      if (WS.isRunning) return;
      var n    = sizeSlider ? parseInt(sizeSlider.value) : 20;
      var type = selCase ? selCase.value : 'random';
      var arr  = _buildCaseArray(n, type);

      /* Update the array input field */
      var arrayInput = byId('arrayInput');
      if (arrayInput) arrayInput.value = arr.join(', ');

      /* Apply to engine */
      var eng = WS.engine;
      if (eng && typeof eng.generateFromArray === 'function') {
        eng.generateFromArray(arr);
      }
      log('info', '<i class="fa-solid fa-dice"></i> Generated <span class="log-val">' + arr.length + '</span>-element array (<em>' + (type.replace(/_/g,' ')) + '</em>).');
    }

    if (btnGen)  btnGen.addEventListener('click', _generate);
    if (selCase) selCase.addEventListener('change', _generate);
    /* NOTE: size slider regeneration is handled by mouseup/touchend in _setupControls.
       Do NOT add an additional 'input' listener here — that caused the drag-regeneration bug. */
  }

  /* Builds an array of length n matching a given pattern */
  function _buildCaseArray(n, type) {
    var arr = [];
    var i;
    switch (type) {
      case 'reversed':
        for (i = 0; i < n; i++) arr.push(n - i);
        break;
      case 'nearly_sorted':
        for (i = 0; i < n; i++) arr.push(i + 1);
        /* Swap a few pairs */
        var swaps = Math.max(1, Math.floor(n * 0.07));
        for (i = 0; i < swaps; i++) {
          var a = randomInt(0, n - 2);
          var tmp = arr[a]; arr[a] = arr[a + 1]; arr[a + 1] = tmp;
        }
        break;
      case 'few_unique':
        var uniq = Math.max(3, Math.floor(n * 0.1));
        for (i = 0; i < n; i++) arr.push(randomInt(1, uniq) * 10);
        break;
      case 'all_equal':
        var eq = randomInt(10, 90);
        for (i = 0; i < n; i++) arr.push(eq);
        break;
      case 'already_sorted':
        for (i = 0; i < n; i++) arr.push(i + 1);
        break;
      default: /* random */
        for (i = 0; i < n; i++) arr.push(randomInt(4, 98));
    }
    return arr;
  }

  /* ══════════════════════════════════════════════════════════
     A* HEURISTIC SELECTOR
  ══════════════════════════════════════════════════════════ */
  function _setupHeuristic(algo) {
    var panel = byId('ctrlHeuristicGroup');
    if (!panel) return;
    panel.style.display = algo.id === 'astar' ? 'flex' : 'none';
    if (algo.id !== 'astar') return;

    var sel = byId('heuristicSelect');
    if (sel) {
      sel.addEventListener('change', function() {
        WS.heuristic = sel.value;
        log('info', 'Heuristic switched to <strong>' + sel.value + '</strong>. Press Play to run again.');
      });
      WS.heuristic = sel.value || 'manhattan';
    }
  }

  /* ══════════════════════════════════════════════════════════
     TREE EXTRAS — traversal mode selector + BST ops display
  ══════════════════════════════════════════════════════════ */
  function _setupTreeExtras(algo) {
    var isTree     = algo.category === 'trees';
    var isTrav     = algo.id === 'tree-traversals';
    var isBST      = algo.id === 'bst';

    /* ── Traversal mode group ── */
    var travGroup  = byId('traversalModeGroup');
    if (travGroup) travGroup.style.display = isTrav ? 'flex' : 'none';

    if (isTrav && travGroup) {
      var modeBtns = travGroup.querySelectorAll('.traversal-mode-btn');
      /* Set initial active from algo default */
      var defaultMode = (algo.input && algo.input.defaultMode) || 'inorder';
      for (var b = 0; b < modeBtns.length; b++) {
        modeBtns[b].classList.toggle('active', modeBtns[b].getAttribute('data-mode') === defaultMode);
      }
      /* Wire click handlers */
      (function() {
        for (var i = 0; i < modeBtns.length; i++) {
          modeBtns[i].addEventListener('click', (function(btn) {
            return function() {
              /* Update active state */
              for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('active');
              btn.classList.add('active');

              var mode = btn.getAttribute('data-mode');

              /* Also keep legacy select in sync */
              var sel = byId('traversalModeSelect');
              if (sel) sel.value = mode;

              /* Restart if idle */
              if (!WS.isRunning) {
                log('info', 'Mode: <strong>' + mode + '</strong>. Press <strong>Play</strong> to run.');
              } else {
                log('info', 'Mode changed to <strong>' + mode + '</strong> — takes effect on next Play.');
              }
            };
          })(modeBtns[i]));
        }
      })();
    }

    /* ── BST ops display ── */
    var bstDispGroup = byId('bstOpsDisplayGroup');
    var bstDisp      = byId('bstOpsDisplay');
    if (bstDispGroup) bstDispGroup.style.display = isBST ? 'flex' : 'none';

    if (isBST && bstDisp) {
      var ops = (algo.input && algo.input.defaultOps) || [];
      bstDisp.textContent = ops.join(' · ');

      /* Randomize button */
      var btnRand = byId('btnBSTRandomize');
      if (btnRand) {
        btnRand.addEventListener('click', function() {
          if (WS.isRunning) return;
          /* Generate random insert values and one search */
          var vals = [];
          var pool = [];
          for (var v = 10; v <= 99; v++) pool.push(v);
          /* Fisher-Yates shuffle, take 7 */
          for (var k = pool.length - 1; k > 0; k--) {
            var idx = Math.floor(Math.random() * (k + 1));
            var tmp = pool[k]; pool[k] = pool[idx]; pool[idx] = tmp;
          }
          vals = pool.slice(0, 7);
          var newOps = vals.map(function(v) { return 'insert:' + v; });
          /* Add a search for a random existing value */
          newOps.push('search:' + vals[Math.floor(Math.random() * vals.length)]);
          /* Add a search that misses */
          newOps.push('search:' + (vals[0] - 1));

          /* Update algo and display */
          WS.algo.input = WS.algo.input || {};
          WS.algo.input.defaultOps    = newOps;
          WS.algo.input.defaultValues = vals;
          bstDisp.textContent = newOps.join(' · ');

          /* Rebuild engine with new values */
          if (WS.engine && typeof WS.engine.resetBST === 'function') {
            WS.engine.resetBST(vals);
          } else {
            _loadEngine(WS.algo);
          }
          log('info', '<i class="fa-solid fa-dice"></i> Randomized BST ops: ' + newOps.length + ' operations.');
        });
      }
    }
  }

  /* ── Tabs (no-op if tab elements don't exist) ───────── */
  function _setupTabs() {
    var tabs = document.querySelectorAll('.dash-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', _onTabClick);
    }
  }
  function _onTabClick(e) {
    var panelId = e.currentTarget.getAttribute('data-panel');
    document.querySelectorAll('.dash-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.dash-panel').forEach(function(p) { p.classList.remove('active'); });
    e.currentTarget.classList.add('active');
    var panel = byId('panel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
    if (panel) panel.classList.add('active');
  }

  /* ── Log toggle (new dashboard) ──────────────────────── */
  function _setupLogToggle() {
    var btnToggleLog = byId('btnToggleLog');
    var dashLog = byId('dashLog');
    if (btnToggleLog && dashLog) {
      btnToggleLog.addEventListener('click', function() {
        dashLog.classList.toggle('collapsed');
      });
    }
  }

  /* ── Keyboard shortcuts ──────────────────────────────── */
  function _setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      if (['INPUT','SELECT','TEXTAREA'].indexOf(e.target.tagName) !== -1) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (WS.isRunning && !WS.isPaused) {
          byId('btnPause') && byId('btnPause').click();
        } else {
          byId('btnPlay') && byId('btnPlay').click();
        }
      }
      if (e.code === 'KeyR') {
        byId('btnReset') && byId('btnReset').click();
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        byId('btnStepBack') && byId('btnStepBack').click();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        byId('btnStepFwd') && byId('btnStepFwd').click();
      }
    });
  }

  /* ── Load engine ─────────────────────────────────────── */

  function _loadEngine(algo) {
    var area = byId('wsCanvasArea');
    if (!area) return;
    area.innerHTML = '';

    var engineMap = {
      barsEngine:    typeof BarsEngine    !== 'undefined' ? BarsEngine    : null,
      memoryEngine:  typeof MemoryEngine  !== 'undefined' ? MemoryEngine  : null,
      gridEngine:    typeof GridEngine    !== 'undefined' ? GridEngine    : null,
      canvasEngine:  typeof CanvasEngine  !== 'undefined' ? CanvasEngine  : null,
      graphEngine:   typeof GraphEngine   !== 'undefined' ? GraphEngine   : null,
      networkEngine: typeof NetworkEngine !== 'undefined' ? NetworkEngine : null,
      listEngine:    typeof ListEngine    !== 'undefined' ? ListEngine    : null,
      mathEngine:    typeof MathEngine    !== 'undefined' ? MathEngine    : null,
      dpEngine:      typeof DPEngine      !== 'undefined' ? DPEngine      : null
    };

    WS.engine = engineMap[algo.engine] || null;
    if (WS.engine && typeof WS.engine.mount === 'function') {
      WS.engine.mount(area, algo);
    } else {
      area.innerHTML =
        '<div style="color:var(--text-muted); font-family:var(--font-mono); text-align:center; padding:var(--space-8);">' +
        '<i class="fa-solid fa-wrench" style="font-size:2rem; margin-bottom:var(--space-4); display:block;"></i>' +
        'Engine <strong>' + algo.engine + '</strong> loading…</div>';
    }
  }

  /* ── Play / Pause / Reset ────────────────────────────── */
  async function _onPlay() {
    if (WS.isRunning && !WS.isPaused) return;

    if (WS.isPaused) {
      /* If user stepped back/forward, restore to latest real state before resuming */
      var latest = WS.steps.length - 1;
      if (WS.stepIndex !== latest && latest >= 0 &&
          WS.engine && typeof WS.engine.restoreState === 'function') {
        WS.engine.restoreState(WS.steps[latest]);
        WS.stepIndex = latest;
      }
      WS.isPaused = false;
      WS.control.isPaused = false;
      _setControlState('running');
      log('info', 'Resumed.');
      return;
    }

    /* Fresh run */
    _resetCounters();
    WS.steps     = [];
    WS.stepIndex = -1;
    WS.isRunning = true;
    WS.isPaused  = false;
    WS.control   = { isPaused: false, isAborted: false };
    var myRun    = ++WS.runToken;   /* tag this run to detect a stale completion */
    _setControlState('running');

    /* Dispatch to algorithm runner */
    var runner = _getRunner(WS.algo.id);
    if (!runner) {
      log('info', '<span style="color:var(--accent-red)">Runner for <strong>' + WS.algo.id + '</strong> not implemented yet.</span>');
      WS.isRunning = false;
      _setControlState('idle');
      return;
    }

    var opts = _buildRunOptions();
    var done = await runner(opts);

    /* Only apply completion if this is still the active run. A Reset→Play
       can leave an old runner unwinding; without this guard its stale
       return value would clobber the fresh run's state and force 'done'. */
    if (done !== false && myRun === WS.runToken) {
      WS.isRunning = false;
      _setControlState('done');
    }
  }

  function _onPause() {
    if (!WS.isRunning || WS.isPaused) return;
    WS.isPaused = true;
    WS.control.isPaused = true;
    _setControlState('paused');
    log('info', 'Paused. Press <strong>Play</strong> to continue.');
  }

  function _onReset() {
    WS.isRunning = false;
    WS.isPaused  = false;
    WS.control.isAborted = true;
    WS.runToken++;            /* invalidate any in-flight runner's completion */
    WS.steps     = [];
    WS.stepIndex = -1;
    _setControlState('idle');
    _resetCounters();

    if (WS.engine && typeof WS.engine.reset === 'function') {
      WS.engine.reset();
    } else {
      _loadEngine(WS.algo);
    }
    log('info', 'Reset. Press <strong>Play</strong> to start again.');
  }

  /* ── Step backward ──────────────────────────────────── */
  function _onStepBack() {
    if (WS.stepIndex <= 0 || WS.steps.length === 0) return;
    WS.stepIndex--;
    if (WS.engine && typeof WS.engine.restoreState === 'function') {
      WS.engine.restoreState(WS.steps[WS.stepIndex]);
    }
    _updateStepButtons();
    log('info', 'Step ' + (WS.stepIndex + 1) + ' / ' + WS.steps.length);
  }

  /* ── Step forward ───────────────────────────────────── */
  function _onStepFwd() {
    if (WS.stepIndex >= WS.steps.length - 1 || WS.steps.length === 0) return;
    WS.stepIndex++;
    if (WS.engine && typeof WS.engine.restoreState === 'function') {
      WS.engine.restoreState(WS.steps[WS.stepIndex]);
    }
    _updateStepButtons();
    log('info', 'Step ' + (WS.stepIndex + 1) + ' / ' + WS.steps.length);
  }

  /* ── Record engine state at current animation frame ─── */
  function _recordStep() {
    if (!WS.engine || typeof WS.engine.captureState !== 'function') return;
    var state = WS.engine.captureState();
    if (!state) return;
    /* Truncate any forward history if we navigated back then resumed */
    if (WS.stepIndex < WS.steps.length - 1) {
      WS.steps = WS.steps.slice(0, WS.stepIndex + 1);
    }
    WS.steps.push(state);
    /* Bounded buffer: drop oldest frames beyond MAX_STEPS so a long, fast
       run can't grow memory without limit. */
    while (WS.steps.length > WS.MAX_STEPS) WS.steps.shift();
    WS.stepIndex = WS.steps.length - 1;
    /* Don't update step buttons here — too frequent; updated on pause/done */
  }

  /* ── Enable/disable step buttons ────────────────────── */
  function _updateStepButtons() {
    var btnBack = byId('btnStepBack');
    var btnFwd  = byId('btnStepFwd');
    var canStep = !WS.isRunning || WS.isPaused;
    var hasBack = WS.stepIndex > 0;
    var hasFwd  = WS.stepIndex < WS.steps.length - 1;
    if (btnBack) btnBack.disabled = !(canStep && hasBack);
    if (btnFwd)  btnFwd.disabled  = !(canStep && hasFwd);
  }

  /* ── Build run options ───────────────────────────────── */
  function _buildRunOptions() {
    var opts = {
      algo:     WS.algo,
      engine:   WS.engine,
      control:  WS.control,
      /* getDelay: records state at every step boundary */
      getDelay: function() {
        _recordStep();
        return speedToDelay(WS.speed);
      },
      onStep:   _onStep,
      onLog:    log,
      onCounter: _bumpCounter,
      onVarUpdate: _updateVar
    };

    /* Array input */
    var arrayInput = byId('arrayInput');
    if (arrayInput && arrayInput.value.trim()) {
      var parsed = parseNumberArray(arrayInput.value);
      if (parsed) {
        opts.array = parsed;
        if (WS.algo.input && WS.algo.input.requireSorted) {
          opts.array = sortedCopy(opts.array);
          if (arrayInput) arrayInput.value = opts.array.join(', ');
        }
      } else {
        opts.array = WS.algo.input ? WS.algo.input.defaultArray.slice() : [];
        log('compare', 'Invalid array input — using default.');
      }
    } else if (WS.algo.input && WS.algo.input.defaultArray) {
      opts.array = WS.algo.input.defaultArray.slice();
    }

    /* Target input */
    var targetInput = byId('targetInput');
    if (targetInput && targetInput.value.trim() !== '') {
      var t = Number(targetInput.value.trim());
      opts.target = isFinite(t) ? t : (WS.algo.input ? WS.algo.input.defaultTarget : 0);
    } else if (WS.algo.input) {
      opts.target = WS.algo.input.defaultTarget;
    }

    /* K value */
    var kSlider = byId('kSlider');
    opts.k = kSlider ? parseInt(kSlider.value) : 3;

    /* Array size */
    var sizeSlider = byId('arraySizeSlider');
    opts.arraySize = sizeSlider ? parseInt(sizeSlider.value) : 30;

    /* Heuristic (for A*) */
    opts.heuristic = WS.heuristic || 'manhattan';

    /* Traversal mode (for tree-traversals & BST interactive traverse) */
    /* Prefer the new segmented button group; fall back to legacy select */
    var activeModBtn = document.querySelector('.traversal-mode-btn.active');
    var selMode      = byId('traversalModeSelect');
    var traversalMode = null;
    if (activeModBtn) {
      traversalMode = activeModBtn.getAttribute('data-mode');
    } else if (selMode) {
      traversalMode = selMode.value;
    }
    if (traversalMode) {
      opts.customInput = opts.customInput || {};
      opts.customInput.mode = traversalMode;
    }

    /* Expression input (infix-to-postfix, infix-to-prefix, postfix-evaluator) */
    var exprInput = byId('expressionInput');
    if (exprInput && exprInput.value.trim()) {
      opts.customInput = opts.customInput || {};
      opts.customInput.expression = exprInput.value.trim();
    }

    /* Depth limit for DLS */
    var dlsInput = byId('depthLimitInput');
    if (dlsInput && dlsInput.value.trim()) {
      opts.customInput = opts.customInput || {};
      opts.customInput.depthLimit = parseInt(dlsInput.value) || 3;
    }

    return opts;
  }

  /* ── Apply custom input without running ─────────────── */
  function _applyCustomInput() {
    _loadEngine(WS.algo);
    log('info', 'Input applied. Press <strong>Play</strong> to start.');
  }

  /* ── Dashboard: on-step callback ─────────────────────── */
  function _onStep(snapshot) {
    /* snapshot = plain data object from algorithm */
    /* Engine handles the visual update */
    if (WS.engine && typeof WS.engine.applySnapshot === 'function') {
      WS.engine.applySnapshot(snapshot);
    }
  }

  /* ── Dashboard: counter bump ─────────────────────────────
     Thin wrapper around the single global implementation so engines
     (which call the global) and runners (which receive this) animate
     identically — see A8 dedupe. */
  function _bumpCounter(key, by) { bumpCounter(key, by); }

  function _resetCounters() {
    for (var key in WS.counters) {
      if (WS.counters.hasOwnProperty(key)) {
        WS.counters[key] = 0;
        setText('counter-val-' + key, '0');
      }
    }
  }

  /* ── Dashboard: variable watcher update ───────────────────
     Thin wrapper around the single global implementation (A8 dedupe). */
  function _updateVar(name, value) { updateVar(name, value); }

  /* ── Control state ───────────────────────────────────── */
  function _setControlState(state) {
    var btnPlay     = byId('btnPlay');
    var btnPause    = byId('btnPause');
    var btnReset    = byId('btnReset');
    var btnStepBack = byId('btnStepBack');
    var btnStepFwd  = byId('btnStepFwd');

    /* Defaults */
    _setDisabled(btnPlay,     false);
    _setDisabled(btnPause,    true);
    _setDisabled(btnReset,    false);
    _setDisabled(btnStepBack, true);
    _setDisabled(btnStepFwd,  true);

    switch (state) {
      case 'running':
        _setDisabled(btnPlay,  true);
        _setDisabled(btnPause, false);
        /* Steps disabled while running */
        break;
      case 'paused':
        _setDisabled(btnPlay,  false);
        _setDisabled(btnPause, false);
        /* Enable step buttons if history exists */
        _updateStepButtons();
        break;
      case 'done':
        _setDisabled(btnPlay,  true);
        _setDisabled(btnPause, true);
        /* Enable step history review */
        _updateStepButtons();
        break;
      case 'idle':
        /* reset clears history so steps disabled */
        break;
    }
  }

  function _setDisabled(el, val) {
    if (el) el.disabled = val;
  }

  /* ── Slider fill ──────────────────────────────────────── */
  function _updateSliderFill(slider) {
    var pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--slider-pct', pct + '%');
  }

  /* ── Algorithm runner registry ───────────────────────── */
  function _getRunner(algoId) {
    var RUNNERS = {
      'linear-search':        typeof runLinearSearch        === 'function' ? runLinearSearch        : null,
      'binary-search':        typeof runBinarySearch        === 'function' ? runBinarySearch        : null,
      'interpolation-search': typeof runInterpolationSearch === 'function' ? runInterpolationSearch : null,
      'bubble-sort':          typeof runBubbleSort          === 'function' ? runBubbleSort          : null,
      'selection-sort':       typeof runSelectionSort       === 'function' ? runSelectionSort       : null,
      'insertion-sort':       typeof runInsertionSort       === 'function' ? runInsertionSort       : null,
      'merge-sort':           typeof runMergeSort           === 'function' ? runMergeSort           : null,
      'heap-sort':            typeof runHeapSort            === 'function' ? runHeapSort            : null,
      'quick-sort':           typeof runQuickSort           === 'function' ? runQuickSort           : null,
      'stack':                typeof runStack               === 'function' ? runStack               : null,
      'queue':                typeof runQueue               === 'function' ? runQueue               : null,
      'linked-list-singly':   typeof runLinkedList          === 'function' ? runLinkedList          : null,
      'linked-list-doubly':   typeof runDoublyLinkedList    === 'function' ? runDoublyLinkedList    : null,
      'infix-to-postfix':     typeof runInfixToPostfix      === 'function' ? runInfixToPostfix      : null,
      'infix-to-prefix':      typeof runInfixToPrefix       === 'function' ? runInfixToPrefix       : null,
      'postfix-evaluator':    typeof runPostfixEvaluator    === 'function' ? runPostfixEvaluator    : null,
      'bfs':                  typeof runBFS                 === 'function' ? runBFS                 : null,
      'dfs':                  typeof runDFS                 === 'function' ? runDFS                 : null,
      'astar':                typeof runAstar               === 'function' ? runAstar               : null,
      'dijkstra':             typeof runDijkstra            === 'function' ? runDijkstra            : null,
      'ucs':                  typeof runUCS                 === 'function' ? runUCS                 : null,
      'dls':                  typeof runDLS                 === 'function' ? runDLS                 : null,
      'ids':                  typeof runIDS                 === 'function' ? runIDS                 : null,
      'greedy-best-first':    typeof runGreedy              === 'function' ? runGreedy              : null,
      'maze-generation':      typeof runMazeGeneration      === 'function' ? runMazeGeneration      : null,
      'bst':                  typeof runBST                 === 'function' ? runBST                 : null,
      'tree-traversals':      typeof runTreeTraversals      === 'function' ? runTreeTraversals      : null,
      'knapsack':             typeof runKnapsack            === 'function' ? runKnapsack            : null,
      'fractional-knapsack':  typeof runFractionalKnapsack  === 'function' ? runFractionalKnapsack  : null,
      'coin-change':          typeof runCoinChange          === 'function' ? runCoinChange          : null,
      'kmeans':               typeof runKMeans              === 'function' ? runKMeans              : null,
      'knn':                  typeof runKNN                 === 'function' ? runKNN                 : null,
      'linear-regression':    typeof runLinearRegression    === 'function' ? runLinearRegression    : null,
      'euclidean-algorithm':  typeof runEuclidean           === 'function' ? runEuclidean           : null,
      'sieve-of-eratosthenes':typeof runSieve               === 'function' ? runSieve               : null,
      'rsa-encryption':       typeof runRSA                 === 'function' ? runRSA                 : null
    };
    return RUNNERS[algoId] || null;
  }

  /* Setup difficulty display */
  function _setupDifficulty(algo) { /* done in _setupTitle */ }

  function _capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { init: init };

})();

/* =====================================================
   LOG HELPERS  (global so engines can call them)
===================================================== */
function log(type, message) {
  var logEl = byId('stepLog');
  if (!logEl) return;

  /* Expand log if collapsed when a notable event happens */
  if (type !== 'info') {
    var dashLog = byId('dashLog');
    if (dashLog && dashLog.classList.contains('collapsed')) {
      dashLog.classList.remove('collapsed');
    }
  }

  var entry = createElement('div', 'log-entry ' + type);
  entry.innerHTML = message;
  logEl.insertBefore(entry, logEl.firstChild);

  /* Keep last 60 entries */
  while (logEl.children.length > 60) logEl.removeChild(logEl.lastChild);
}

function updateVar(name, value) {
  var cell = byId('vw-' + name);
  if (!cell) return;
  var prev = cell.textContent;
  cell.textContent = value !== null && value !== undefined ? String(value) : '\u2014';
  var row = byId('vw-row-' + name);
  if (row && String(prev) !== String(value)) {
    row.classList.add('var-row-changed');
    setTimeout(function() { row.classList.remove('var-row-changed'); }, 800);
  }
}

function bumpCounter(key, by) {
  if (by === undefined) by = 1;
  if (!WS || WS.counters[key] === undefined) return;
  WS.counters[key] += by;
  var valEl = byId('counter-val-' + key);
  if (valEl) {
    valEl.textContent = WS.counters[key];
    /* Flash highlight — single implementation shared by engines and runners */
    var box = byId('counter-box-' + key);
    if (box) {
      box.classList.add('highlight');
      setTimeout(function() { box.classList.remove('highlight'); }, 300);
    }
  }
}
