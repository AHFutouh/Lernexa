/* ════════════════════════════════════════════════════════════
   Lernexa — networkEngine.js  (v2 — Structured Layout)
   SVG-based engine for node-edge graph algorithms.
   Produces a hierarchical tree layout instead of random scatter.
   (BFS, DFS, A*, Dijkstra, UCS, DLS, IDS, Greedy)
   ════════════════════════════════════════════════════════════ */

'use strict';

var NetworkEngine = (function() {

  /* ── Private State ── */
  var _area      = null;
  var _algo      = null;
  var _svg       = null;
  var _nodes     = {};   /* { id: { x, y, el, labelEl, state, dist } } */
  var _edges     = [];   /* [{ from, to, weight, el, labelEl, state }] */
  var _startId   = null;
  var _endId     = null;
  var _selectMode = null; /* null | 'start' | 'end' */

  /* ── Config ── */
  var _isWeighted = true;
  var _labelType  = 'num';   /* 'num' | 'alpha' */
  var _depth      = 4;
  var _branching  = 2;
  var _graphType  = 'tree';  /* 'tree' | 'graph' */
  var _cfgCollapsed = false;  /* floating settings panel collapsed state (session) */

  /* ── Constants ── */
  var NODE_RADIUS = 22;
  /* Edge weight = ceil(pixel distance × WEIGHT_SCALE). Tying weight to the
     true geometric distance is what makes A*'s straight-line (Euclidean)
     heuristic admissible — h can never exceed the real remaining cost, so
     A* is provably optimal and matches Dijkstra on the same instance. */
  var WEIGHT_SCALE = 0.1;
  var COLORS = {
    default:  { fill: '#1C2330',                stroke: '#484F58', text: '#8B949E' },
    start:    { fill: 'rgba(57,211,83,0.25)',    stroke: '#39D353', text: '#39D353' },
    end:      { fill: 'rgba(255,110,110,0.25)',  stroke: '#FF6E6E', text: '#FF6E6E' },
    visiting: { fill: 'rgba(240,136,62,0.30)',   stroke: '#F0883E', text: '#F0883E' },
    visited:  { fill: 'rgba(176,38,255,0.25)',   stroke: '#B026FF', text: '#B026FF' },
    path:     { fill: 'rgba(0,240,255,0.30)',    stroke: '#00F0FF', text: '#00F0FF' },
    found:    { fill: 'rgba(57,211,83,0.40)',    stroke: '#39D353', text: '#00F0FF' }
  };

  /* ════════════════════════════════════════════════════════════
     LABEL HELPER
     ════════════════════════════════════════════════════════════ */
  function _nodeLabel(id) {
    if (_labelType === 'alpha') {
      var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (id < 26) return letters[id];
      return letters[Math.floor(id / 26) - 1] + letters[id % 26];
    }
    return String(id);
  }

  /* Edge weight derived from the geometric distance between two placed
     nodes. Rounded UP so weight ≥ distance×scale for every edge, which
     guarantees the Euclidean heuristic stays a lower bound (admissible)
     even after integer rounding. */
  function _edgeWeight(idA, idB) {
    var a = _nodes[idA], b = _nodes[idB];
    if (!a || !b) return 1;
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) * WEIGHT_SCALE));
  }

  /* ════════════════════════════════════════════════════════════
     TREE / GRAPH BUILDER
     ════════════════════════════════════════════════════════════ */
  function _buildTree() {
    var w = _area.clientWidth  || 800;
    var h = _area.clientHeight || 500;
    var levelH = Math.min(100, (h - 80) / _depth);

    _nodes = {};
    _edges = [];
    var id = 0;

    function place(parentId, level, xMin, xMax) {
      var x   = (xMin + xMax) / 2;
      var y   = 50 + level * levelH;
      var myId = id;
      _nodes[myId] = {
        id:      myId,
        x:       x,
        y:       y,
        state:   'default',
        el:      null,
        labelEl: null,
        dist:    Infinity,
        parent:  parentId
      };
      id++;

      if (level < _depth - 1) {
        var b    = _branching;
        var segW = (xMax - xMin) / b;
        for (var i = 0; i < b; i++) {
          var childId = place(myId, level + 1, xMin + i * segW, xMin + (i + 1) * segW);
          var w = _isWeighted ? _edgeWeight(myId, childId) : 1;
          _edges.push({ from: myId, to: childId, weight: w, el: null, labelEl: null, state: 'default' });
        }
      }
      return myId;
    }

    place(-1, 0, 40, w - 40);

    /* For 'graph' type: add 1-3 random cross-edges between non-adjacent nodes */
    if (_graphType === 'graph') {
      var nodeIds = Object.keys(_nodes).map(Number);
      var edgeSet = new Set();
      for (var k = 0; k < _edges.length; k++) {
        var e = _edges[k];
        edgeSet.add(Math.min(e.from, e.to) + '-' + Math.max(e.from, e.to));
      }
      var added = 0;
      var attempts = 0;
      while (added < 3 && attempts < 60) {
        attempts++;
        var a = nodeIds[randomInt(0, nodeIds.length - 1)];
        var b = nodeIds[randomInt(0, nodeIds.length - 1)];
        if (a === b) continue;
        var key = Math.min(a, b) + '-' + Math.max(a, b);
        if (edgeSet.has(key)) continue;
        /* Ensure they are not parent-child */
        var nA = _nodes[a], nB = _nodes[b];
        if (nA.parent === b || nB.parent === a) continue;
        edgeSet.add(key);
        var cw = _isWeighted ? _edgeWeight(a, b) : 1;
        _edges.push({ from: a, to: b, weight: cw, el: null, labelEl: null, state: 'default' });
        added++;
      }
    }

    /* Default: start = root (0), end = last leaf */
    var allIds  = Object.keys(_nodes).map(Number);
    _startId    = 0;
    _endId      = allIds[allIds.length - 1];
    _nodes[_startId].state = 'start';
    _nodes[_endId].state   = 'end';
  }

  /* ════════════════════════════════════════════════════════════
     SVG RENDER
     ════════════════════════════════════════════════════════════ */
  function _renderSVG() {
    _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    _svg.setAttribute('width',  '100%');
    _svg.setAttribute('height', '100%');
    _svg.style.cssText = 'position:absolute;inset:0;overflow:visible;';

    /* Glow filter */
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML =
      '<filter id="net-glow-blue" x="-50%" y="-50%" width="200%" height="200%">' +
        '<feGaussianBlur stdDeviation="3" result="blur"/>' +
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>';
    _svg.appendChild(defs);

    /* ── Draw edges first (behind nodes) ── */
    for (var i = 0; i < _edges.length; i++) {
      var e  = _edges[i];
      var nA = _nodes[e.from];
      var nB = _nodes[e.to];
      if (!nA || !nB) continue;

      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', nA.x); line.setAttribute('y1', nA.y);
      line.setAttribute('x2', nB.x); line.setAttribute('y2', nB.y);
      line.setAttribute('stroke',       '#30363D');
      line.setAttribute('stroke-width', '2');
      line.style.transition = 'stroke 0.3s, stroke-width 0.3s';
      e.el = line;
      _svg.appendChild(line);

      /* Weight label at midpoint */
      if (_isWeighted) {
        var mx = (nA.x + nB.x) / 2;
        var my = (nA.y + nB.y) / 2;

        var wBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        wBg.setAttribute('x',      mx - 9);
        wBg.setAttribute('y',      my - 10);
        wBg.setAttribute('width',  18);
        wBg.setAttribute('height', 14);
        wBg.setAttribute('rx',     3);
        wBg.setAttribute('fill',   '#161B22');
        wBg.setAttribute('stroke', '#30363D');
        wBg.setAttribute('stroke-width', '1');
        _svg.appendChild(wBg);

        var wLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        wLabel.setAttribute('x',              mx);
        wLabel.setAttribute('y',              my - 2);
        wLabel.setAttribute('text-anchor',    'middle');
        wLabel.setAttribute('font-size',      '9');
        wLabel.setAttribute('font-family',    'Fira Code, monospace');
        wLabel.setAttribute('fill',           '#484F58');
        wLabel.textContent = e.weight;
        e.labelEl = wLabel;
        _svg.appendChild(wLabel);
      } else {
        e.labelEl = null;
      }
    }

    /* ── Draw nodes (on top) ── */
    var nodeIds = Object.keys(_nodes);
    for (var j = 0; j < nodeIds.length; j++) {
      var node = _nodes[nodeIds[j]];
      var g    = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', 'translate(' + node.x + ',' + node.y + ')');
      g.style.cursor = 'pointer';

      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r',            NODE_RADIUS);
      circle.setAttribute('fill',         COLORS[node.state].fill);
      circle.setAttribute('stroke',       COLORS[node.state].stroke);
      circle.setAttribute('stroke-width', '2');
      circle.style.transition = 'fill 0.3s, stroke 0.3s';
      node.el = circle;

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor',       'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size',         '12');
      text.setAttribute('font-family',       'Fira Code, monospace');
      text.setAttribute('font-weight',       '600');
      text.setAttribute('fill',              COLORS[node.state].text);
      text.style.transition = 'fill 0.3s';
      text.textContent = _nodeLabel(parseInt(nodeIds[j]));
      node.labelEl = text;

      g.appendChild(circle);
      g.appendChild(text);
      _svg.appendChild(g);

      (function(nid) {
        g.addEventListener('click', function() { _onNodeClick(nid); });
      })(parseInt(nodeIds[j]));
    }

    _area.appendChild(_svg);
  }

  /* ════════════════════════════════════════════════════════════
     CONFIG OVERLAY
     ════════════════════════════════════════════════════════════ */
  function _renderConfigOverlay() {
    var overlay = createElement('div', 'net-config-overlay');
    overlay.innerHTML =
      /* Header: title + collapse toggle */
      '<div class="net-cfg-header">' +
        '<span class="net-cfg-title"><i class="fa-solid fa-sliders"></i>' +
          '<span class="net-cfg-title-text">Graph Settings</span></span>' +
        '<button class="net-cfg-toggle" id="netCfgToggle" type="button" aria-label="Toggle settings panel">' +
          '<i class="fa-solid fa-chevron-down"></i></button>' +
      '</div>' +
      '<div class="net-cfg-body">' +
      /* Row 1: Graph type */
      '<div class="net-cfg-row">' +
        '<span class="net-cfg-label">Layout</span>' +
        '<button class="net-cfg-btn' + (_graphType === 'tree'  ? ' active' : '') + '" data-cfg="graphType" data-val="tree">Tree</button>' +
        '<button class="net-cfg-btn' + (_graphType === 'graph' ? ' active' : '') + '" data-cfg="graphType" data-val="graph">Graph</button>' +
      '</div>' +
      /* Row 2: Labels */
      '<div class="net-cfg-row">' +
        '<span class="net-cfg-label">Labels</span>' +
        '<button class="net-cfg-btn' + (_labelType === 'num'   ? ' active' : '') + '" data-cfg="labelType" data-val="num">0,1,2</button>' +
        '<button class="net-cfg-btn' + (_labelType === 'alpha' ? ' active' : '') + '" data-cfg="labelType" data-val="alpha">A,B,C</button>' +
      '</div>' +
      /* Row 3: Weights */
      '<div class="net-cfg-row">' +
        '<span class="net-cfg-label">Weights</span>' +
        '<button class="net-cfg-btn' + (_isWeighted ? ' active' : '') + '" data-cfg="weighted" data-val="on">On</button>' +
        '<button class="net-cfg-btn' + (!_isWeighted ? ' active' : '') + '" data-cfg="weighted" data-val="off">Off</button>' +
      '</div>' +
      /* Row 4: Depth */
      '<div class="net-cfg-row">' +
        '<span class="net-cfg-label">Depth</span>' +
        '<button class="net-cfg-btn' + (_depth === 3 ? ' active' : '') + '" data-cfg="depth" data-val="3">3</button>' +
        '<button class="net-cfg-btn' + (_depth === 4 ? ' active' : '') + '" data-cfg="depth" data-val="4">4</button>' +
        '<button class="net-cfg-btn' + (_depth === 5 ? ' active' : '') + '" data-cfg="depth" data-val="5">5</button>' +
      '</div>' +
      /* Row 5: Branching */
      '<div class="net-cfg-row">' +
        '<span class="net-cfg-label">Branch</span>' +
        '<button class="net-cfg-btn' + (_branching === 2 ? ' active' : '') + '" data-cfg="branching" data-val="2">2</button>' +
        '<button class="net-cfg-btn' + (_branching === 3 ? ' active' : '') + '" data-cfg="branching" data-val="3">3</button>' +
      '</div>' +
      /* Row 6: Actions */
      '<div class="net-cfg-row">' +
        '<button class="net-sel-btn" id="netBtnStart">Set Start</button>' +
        '<button class="net-sel-btn" id="netBtnEnd">Set End</button>' +
        '<button class="net-regen-btn" id="netBtnRegen">&#8634; New</button>' +
      '</div>' +
      /* Row 7: Badges */
      '<div class="net-cfg-row">' +
        '<span class="net-cfg-label">Start:</span>' +
        '<span class="net-node-badge start" id="netStartBadge">' + _nodeLabel(_startId !== null ? _startId : 0) + '</span>' +
        '<span class="net-cfg-label">End:</span>' +
        '<span class="net-node-badge end" id="netEndBadge">' + _nodeLabel(_endId !== null ? _endId : 0) + '</span>' +
      '</div>' +
      '</div>';  /* /net-cfg-body */

    _area.appendChild(overlay);

    /* Apply persisted collapsed state + wire the collapse toggle */
    if (_cfgCollapsed) overlay.classList.add('collapsed');
    var cfgToggle = byId('netCfgToggle');
    if (cfgToggle) cfgToggle.addEventListener('click', function() {
      _cfgCollapsed = !_cfgCollapsed;
      overlay.classList.toggle('collapsed', _cfgCollapsed);
    });

    /* Wire config buttons */
    var cfgBtns = overlay.querySelectorAll('[data-cfg]');
    for (var i = 0; i < cfgBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var cfg = btn.getAttribute('data-cfg');
          var val = btn.getAttribute('data-val');
          /* Remove active from siblings */
          var siblings = overlay.querySelectorAll('[data-cfg="' + cfg + '"]');
          for (var s = 0; s < siblings.length; s++) siblings[s].classList.remove('active');
          btn.classList.add('active');
          /* Update config */
          _applyConfig(cfg, val);
          _regenerate();
        });
      })(cfgBtns[i]);
    }

    /* Wire Set Start / Set End / Regen */
    var btnStart = byId('netBtnStart');
    var btnEnd   = byId('netBtnEnd');
    var btnRegen = byId('netBtnRegen');

    if (btnStart) btnStart.addEventListener('click', function() {
      _selectMode = (_selectMode === 'start') ? null : 'start';
      btnStart.classList.toggle('active', _selectMode === 'start');
      if (btnEnd) btnEnd.classList.remove('active');
    });
    if (btnEnd) btnEnd.addEventListener('click', function() {
      _selectMode = (_selectMode === 'end') ? null : 'end';
      btnEnd.classList.toggle('active', _selectMode === 'end');
      if (btnStart) btnStart.classList.remove('active');
    });
    if (btnRegen) btnRegen.addEventListener('click', function() {
      _regenerate();
    });
  }

  function _applyConfig(cfg, val) {
    if (cfg === 'graphType')  _graphType  = val;
    if (cfg === 'labelType')  _labelType  = val;
    if (cfg === 'weighted')   _isWeighted = (val === 'on');
    if (cfg === 'depth')      _depth      = parseInt(val);
    if (cfg === 'branching')  _branching  = parseInt(val);
  }

  function _regenerate() {
    _area.innerHTML = '';
    _selectMode = null;
    _buildTree();
    _renderSVG();
    _renderConfigOverlay();
  }

  /* ════════════════════════════════════════════════════════════
     NODE CLICK
     ════════════════════════════════════════════════════════════ */
  function _onNodeClick(id) {
    if (typeof WS !== 'undefined' && WS.isRunning) return;
    if (_selectMode === 'start') {
      if (_startId !== null && _nodes[_startId]) {
        _nodes[_startId].state = 'default';
        _updateNode(_startId);
      }
      _startId = id;
      _nodes[id].state = 'start';
      _updateNode(id);
      var badge = byId('netStartBadge');
      if (badge) badge.textContent = _nodeLabel(id);
      _selectMode = null;
      var bs = byId('netBtnStart');
      if (bs) bs.classList.remove('active');
    } else if (_selectMode === 'end') {
      if (_endId !== null && _nodes[_endId]) {
        _nodes[_endId].state = 'default';
        _updateNode(_endId);
      }
      _endId = id;
      _nodes[id].state = 'end';
      _updateNode(id);
      var badge2 = byId('netEndBadge');
      if (badge2) badge2.textContent = _nodeLabel(id);
      _selectMode = null;
      var be = byId('netBtnEnd');
      if (be) be.classList.remove('active');
    }
  }

  /* ════════════════════════════════════════════════════════════
     VISUAL UPDATE HELPERS
     ════════════════════════════════════════════════════════════ */
  function _updateNode(id) {
    var node = _nodes[id];
    if (!node || !node.el) return;
    var s = COLORS[node.state] || COLORS.default;
    node.el.setAttribute('fill',   s.fill);
    node.el.setAttribute('stroke', s.stroke);
    if (node.labelEl) node.labelEl.setAttribute('fill', s.text);
  }

  function _updateEdge(e) {
    if (!e.el) return;
    var colors = { default: '#30363D', visiting: '#F0883E', path: '#00F0FF', visited: '#B026FF' };
    var widths  = { default: 2,        visiting: 3,         path: 4,         visited: 2        };
    var state   = e.state || 'default';
    e.el.setAttribute('stroke',       colors[state] || '#30363D');
    e.el.setAttribute('stroke-width', widths[state] || 2);
    if (e.labelEl) {
      var lc = { default: '#484F58', visiting: '#F0883E', path: '#00F0FF', visited: '#B026FF' };
      e.labelEl.setAttribute('fill', lc[state] || '#484F58');
    }
  }

  /* ════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════ */

  function mount(area, algo) {
    _algo = algo;
    _area = area;
    _nodes = {}; _edges = []; _startId = null; _endId = null;
    _selectMode = null;
    area.innerHTML = '';
    area.style.position = 'relative';
    _buildTree();
    _renderSVG();
    _renderConfigOverlay();
  }

  function reset() {
    var ids = Object.keys(_nodes);
    for (var i = 0; i < ids.length; i++) {
      var node = _nodes[ids[i]];
      if (node.state !== 'start' && node.state !== 'end') {
        node.state = 'default';
        _updateNode(parseInt(ids[i]));
      }
    }
    for (var j = 0; j < _edges.length; j++) {
      _edges[j].state = 'default';
      _updateEdge(_edges[j]);
    }
    for (var k = 0; k < ids.length; k++) _nodes[ids[k]].dist = Infinity;
  }

  function setNodeState(id, state) {
    if (_nodes[id] === undefined) return;
    if (_nodes[id].state === 'start' || _nodes[id].state === 'end') return;
    _nodes[id].state = state;
    _updateNode(id);
  }

  function setEdgeState(fromId, toId, state) {
    for (var i = 0; i < _edges.length; i++) {
      var e = _edges[i];
      if ((e.from === fromId && e.to === toId) ||
          (e.from === toId   && e.to === fromId)) {
        e.state = state;
        _updateEdge(e);
        return;
      }
    }
  }

  function getNeighbors(id) {
    var result = [];
    for (var i = 0; i < _edges.length; i++) {
      var e = _edges[i];
      var w = _isWeighted ? e.weight : 1;
      if (e.from === id) result.push({ id: e.to,   weight: w, edge: e });
      if (e.to   === id) result.push({ id: e.from, weight: w, edge: e });
    }
    return result;
  }

  function getStartNode() { return _startId; }
  function getEndNode()   { return _endId;   }

  function getNode(id) { return _nodes[id]; }

  function getDistance(a, b) {
    var nA = _nodes[a], nB = _nodes[b];
    if (!nA || !nB) return Infinity;
    var dx = nA.x - nB.x, dy = nA.y - nB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function highlightPath(pathIds) {
    for (var i = 0; i < pathIds.length - 1; i++) {
      setEdgeState(pathIds[i], pathIds[i + 1], 'path');
      if (i > 0) setNodeState(pathIds[i], 'path');
    }
    if (pathIds.length > 0) {
      var last = pathIds[pathIds.length - 1];
      if (_nodes[last] && _nodes[last].state !== 'end') setNodeState(last, 'found');
    }
  }

  function captureState() {
    return {
      nodeStates: Object.keys(_nodes).reduce(function(acc, id) {
        acc[id] = _nodes[id].state; return acc;
      }, {}),
      edgeStates: _edges.map(function(e) { return e.state; })
    };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    var ids = Object.keys(_nodes);
    for (var i = 0; i < ids.length; i++) {
      if (snap.nodeStates && snap.nodeStates[ids[i]] !== undefined) {
        _nodes[ids[i]].state = snap.nodeStates[ids[i]];
        _updateNode(parseInt(ids[i]));
      }
    }
    for (var j = 0; j < _edges.length; j++) {
      if (snap.edgeStates && snap.edgeStates[j] !== undefined) {
        _edges[j].state = snap.edgeStates[j];
        _updateEdge(_edges[j]);
      }
    }
  }

  /* restoreState — re-applies a captured snapshot of node/edge states
     so the step-back / step-forward controls actually rewind the search. */
  function restoreState(state) { applySnapshot(state); }

  /* ── New public helpers ── */

  function setConfig(key, val) {
    _applyConfig(key, val);
    _regenerate();
  }

  function getNodes() {
    return Object.keys(_nodes).map(Number);
  }

  function getEdges() {
    return _edges.slice();
  }

  function isWeighted() {
    return _isWeighted;
  }

  /* Scale factor relating pixel distance to edge weight. A* uses this so
     its heuristic is on the same scale as g (the accumulated edge cost). */
  function getWeightScale() {
    return WEIGHT_SCALE;
  }

  function getNodeLabel(id) {
    return _nodeLabel(id);
  }

  /* ── Return public API ── */
  return {
    mount:           mount,
    reset:           reset,
    captureState:    captureState,
    applySnapshot:   applySnapshot,
    restoreState:    restoreState,
    setNodeState:    setNodeState,
    setEdgeState:    setEdgeState,
    getNeighbors:    getNeighbors,
    getStartNode:    getStartNode,
    getEndNode:      getEndNode,
    getNode:         getNode,
    getDistance:     getDistance,
    highlightPath:   highlightPath,
    setConfig:       setConfig,
    getNodes:        getNodes,
    getEdges:        getEdges,
    isWeighted:      isWeighted,
    getWeightScale:  getWeightScale,
    getNodeLabel:    getNodeLabel,
    /* Compat shims so workspace.js engine-map doesn't break */
    buildDefaultBST:  function() {},
    buildBSTFromRoot: function() {},
    getRootValue:     function() { return null; }
  };

})();
