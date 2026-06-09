/* ════════════════════════════════════════════════════════════
   LERNEXA PRO — graphEngine.js
   SVG-based engine for Graph & Tree algorithms.
   (BFS, DFS, BST, Tree Traversals)
   ════════════════════════════════════════════════════════════ */

'use strict';

var GraphEngine = (function() {

  var _area      = null;
  var _algo      = null;
  var _svg       = null;
  var _nodes     = {};   /* { id: { el, labelEl, x, y, state } } */
  var _edges     = [];   /* [{ from, to, el, state }] */
  var _treeRoot  = null; /* root value for BST/traversal */
  var _treeMap   = {};   /* val → { left, right } for navigation */

  /* Internal BST state (for interactive operations) */
  var _bstRoot = null;
  var _bstSize = 0;
  var _bstTraverseRunning = false;

  var NODE_STATE = Object.freeze({
    DEFAULT: 'default', VISITING: 'visiting',
    VISITED: 'visited', PATH: 'path', FOUND: 'found', CURRENT: 'current'
  });

  var STATE_COLORS = {
    default:  { fill: '#1C2330', stroke: '#484F58' },
    visiting: { fill: 'rgba(240,136,62,0.3)',  stroke: '#F0883E' },
    visited:  { fill: 'rgba(176,38,255,0.3)',  stroke: '#B026FF' },
    path:     { fill: 'rgba(0,240,255,0.2)',   stroke: '#00F0FF' },
    found:    { fill: 'rgba(57,211,83,0.3)',   stroke: '#39D353' },
    current:  { fill: 'rgba(240,208,96,0.3)',  stroke: '#F0D060' }
  };

  /* ── mount ───────────────────────────────────────────── */
  function mount(area, algo) {
    _algo = algo;
    _area = area;
    area.innerHTML = '';

    var wrapper = createElement('div', 'graph-container');
    _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    _svg.setAttribute('class', 'graph-svg');
    _svg.setAttribute('id', 'graphSvg');
    wrapper.appendChild(_svg);
    area.appendChild(wrapper);

    _nodes = {};
    _edges = [];

    if (algo.input && algo.input.type === 'bst-ops' && algo.input.defaultValues) {
      _buildBST(algo.input.defaultValues);
    } else {
      _buildDefaultGraph();
    }
  }

  /* ── Build BST from values ───────────────────────────── */
  function _buildBST(values) {
    var root = null;

    function insert(node, val) {
      if (!node) return { val: val, left: null, right: null };
      if (val < node.val) node.left  = insert(node.left,  val);
      else if (val > node.val) node.right = insert(node.right, val);
      return node;
    }

    /* Also sync internal interactive BST */
    _bstRoot = null; _bstSize = 0;
    for (var i = 0; i < values.length; i++) {
      root = insert(root, values[i]);
      _bstRoot = _bstInsert(_bstRoot, values[i]);
    }
    _treeRoot = root ? root.val : null;
    _buildTreeMap(root);

    var w = _area.clientWidth  || 700;
    var h = _area.clientHeight || 450;

    _nodes = {};
    _edges = [];
    var counter = [0];
    var nodeCount = values.length;
    _assignPositions(root, 0, w, h, Math.min(70, (h - 60) / (_treeHeight(root))), counter, nodeCount);
    _addBSTEdges(root);
    _renderAll();
  }

  /* ── Build from external root node (called by bst.js) ── */
  function buildBSTFromRoot(rootNode) {
    if (!rootNode) return;
    _treeRoot = rootNode.val;
    _buildTreeMap(rootNode);
    /* Keep internal BST in sync */
    _syncInternalBST(rootNode);

    var w = _area.clientWidth  || 700;
    var h = _area.clientHeight || 450;
    _nodes = {};
    _edges = [];
    var counter    = [0];
    var nodeCount  = _countNodes(rootNode);
    var levelH     = Math.min(70, (h - 60) / (_treeHeight(rootNode) + 1));
    _assignPositions(rootNode, 0, w, h, levelH, counter, nodeCount);
    _addBSTEdges(rootNode);
    _renderAll();
  }

  /* ── Build default BST for traversal demo ───────────── */
  function buildDefaultBST() {
    var defaults = (_algo && _algo.input && _algo.input.defaultValues) || [4,2,6,1,3,5,7];
    _buildBST(defaults);
    /* Also sync internal BST for interactive operations */
    _bstRoot = null; _bstSize = 0;
    for (var i = 0; i < defaults.length; i++) _bstRoot = _bstInsert(_bstRoot, defaults[i]);
  }

  function _buildTreeMap(node) {
    _treeMap = {};
    function walk(n) {
      if (!n) return;
      _treeMap[n.val] = { left: n.left ? n.left.val : null, right: n.right ? n.right.val : null };
      walk(n.left);
      walk(n.right);
    }
    walk(node);
  }

  function _treeHeight(node) {
    if (!node) return 0;
    return 1 + Math.max(_treeHeight(node.left), _treeHeight(node.right));
  }

  function _countNodes(node) {
    if (!node) return 0;
    return 1 + _countNodes(node.left) + _countNodes(node.right);
  }

  function _assignPositions(node, depth, areaW, areaH, levelH, counter, nodeCount) {
    if (!node) return;
    _assignPositions(node.left,  depth + 1, areaW, areaH, levelH, counter, nodeCount);
    /* Evenly space nodes across width based on in-order index */
    var step = areaW / (nodeCount + 1);
    node.x = (counter[0] + 1) * step;
    node.y = depth * levelH + 50;
    counter[0]++;
    _assignPositions(node.right, depth + 1, areaW, areaH, levelH, counter, nodeCount);
    _nodes[node.val] = { id: node.val, x: node.x, y: node.y, state: NODE_STATE.DEFAULT };
  }

  function _addBSTEdges(node) {
    if (!node) return;
    if (node.left)  _edges.push({ from: node.val, to: node.left.val  });
    if (node.right) _edges.push({ from: node.val, to: node.right.val });
    _addBSTEdges(node.left);
    _addBSTEdges(node.right);
  }

  /* ── Build default demo graph (for BFS/DFS) ─────────── */
  function _buildDefaultGraph() {
    var w = _area.clientWidth  || 700;
    var h = _area.clientHeight || 450;
    var cx = w / 2, cy = h / 2;
    var r  = Math.min(w, h) * 0.35;

    /* 8 nodes in a circle */
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      _nodes[i] = {
        id: i,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        state: NODE_STATE.DEFAULT
      };
    }
    /* Center node */
    _nodes[8] = { id: 8, x: cx, y: cy, state: NODE_STATE.DEFAULT };

    /* Edges */
    var edgePairs = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[2,8],[4,8],[6,8]];
    for (var j = 0; j < edgePairs.length; j++) {
      _edges.push({ from: edgePairs[j][0], to: edgePairs[j][1] });
    }

    _renderAll();
  }

  /* ── Render SVG ──────────────────────────────────────── */
  function _renderAll() {
    _svg.innerHTML = '';

    /* Edges first */
    for (var e = 0; e < _edges.length; e++) {
      var edge  = _edges[e];
      var nFrom = _nodes[edge.from];
      var nTo   = _nodes[edge.to];
      if (!nFrom || !nTo) continue;

      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', nFrom.x); line.setAttribute('y1', nFrom.y);
      line.setAttribute('x2', nTo.x);   line.setAttribute('y2', nTo.y);
      line.setAttribute('class', 'graph-edge');
      _svg.appendChild(line);
      edge.el = line;
    }

    /* Nodes */
    for (var id in _nodes) {
      if (!_nodes.hasOwnProperty(id)) continue;
      var node  = _nodes[id];
      var col   = STATE_COLORS[node.state] || STATE_COLORS.default;

      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x); circle.setAttribute('cy', node.y);
      circle.setAttribute('r', 20);
      circle.setAttribute('fill', col.fill);
      circle.setAttribute('stroke', col.stroke);
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('class', 'graph-node');
      g.appendChild(circle);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x); text.setAttribute('y', node.y);
      text.setAttribute('class', 'node-label');
      text.textContent = id;
      g.appendChild(text);

      _svg.appendChild(g);
      node.el = circle;
    }
  }

  /* ── Public: set node state ──────────────────────────── */
  /* Accepts both uppercase ('FOUND', 'COMPARING') and lowercase ('found', 'visiting') */
  var STATE_ALIAS = {
    'FOUND':     'found',
    'VISITED':   'visited',
    'VISITING':  'visiting',
    'COMPARING': 'visiting',
    'DEFAULT':   'default',
    'CURRENT':   'current',
    'PATH':      'path'
  };

  function setNodeState(id, state) {
    var node = _nodes[id];
    if (!node || !node.el) return;
    var normalized = STATE_ALIAS[state] || state;
    node.state = normalized;
    var col = STATE_COLORS[normalized] || STATE_COLORS.default;
    node.el.setAttribute('fill',   col.fill);
    node.el.setAttribute('stroke', col.stroke);
    node.el.setAttribute('stroke-width', normalized === 'current' ? '3' : '2');
  }

  /* ── Public: set edge state ──────────────────────────── */
  function setEdgeState(fromId, toId, state) {
    for (var i = 0; i < _edges.length; i++) {
      var e = _edges[i];
      if ((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)) {
        if (e.el) e.el.setAttribute('class', 'graph-edge ' + state);
        break;
      }
    }
  }

  /* ── Public: reset all ───────────────────────────────── */
  function resetStates() {
    for (var id in _nodes) {
      if (_nodes.hasOwnProperty(id)) setNodeState(id, NODE_STATE.DEFAULT);
    }
    for (var i = 0; i < _edges.length; i++) {
      if (_edges[i].el) _edges[i].el.setAttribute('class', 'graph-edge');
    }
  }

  /* ── Public getters ──────────────────────────────────── */
  function getNodes()      { return Object.keys(_nodes).map(function(k){ return _nodes[k]; }); }
  function getEdges()      { return _edges; }
  function NODE_STATES()   { return NODE_STATE; }

  /* ── Tree navigation (for BST / Traversals) ─────────── */
  function getRootValue()       { return _treeRoot; }
  function getLeftChild(val)    { return _treeMap[val] ? _treeMap[val].left  : null; }
  function getRightChild(val)   { return _treeMap[val] ? _treeMap[val].right : null; }
  function hasNode(val)         { return !!_nodes[val]; }

  /* ── applySnapshot ───────────────────────────────────── */
  function applySnapshot(snap) { /* reserved for step history */ }

  /* ── reset ───────────────────────────────────────────── */
  function reset() { resetStates(); }

  /* ══════════════════════════════════════════════════════
     INTERACTIVE BST API
     Maintains an internal tree structure and supports
     interactive Insert / Delete / Search / Traverse
     without needing to run the full algorithm sequence.
  ══════════════════════════════════════════════════════ */

  /* Internal node constructor */
  function _newBSTNode(v) { return { val: v, left: null, right: null }; }

  /* ── Insert into internal BST ── */
  function _bstInsert(node, v) {
    if (!node) { _bstSize++; return _newBSTNode(v); }
    if (v < node.val)      node.left  = _bstInsert(node.left,  v);
    else if (v > node.val) node.right = _bstInsert(node.right, v);
    /* duplicate: ignore */
    return node;
  }

  /* ── Find in-order successor ── */
  function _bstMinNode(node) {
    while (node.left) node = node.left;
    return node;
  }

  /* ── Delete from internal BST ── */
  function _bstDelete(node, v) {
    if (!node) return null;
    if (v < node.val)      { node.left  = _bstDelete(node.left,  v); }
    else if (v > node.val) { node.right = _bstDelete(node.right, v); }
    else {
      _bstSize--;
      if (!node.left)  return node.right;
      if (!node.right) return node.left;
      /* Two children: replace with in-order successor */
      var succ = _bstMinNode(node.right);
      node.val   = succ.val;
      node.right = _bstDelete(node.right, succ.val);
      _bstSize++;   /* compensate for the double-decrement */
    }
    return node;
  }

  /* ── Search path ── */
  function _bstSearchPath(node, v, path) {
    if (!node) return false;
    path.push(node.val);
    if (v === node.val) return true;
    if (v < node.val)  return _bstSearchPath(node.left,  v, path);
    return _bstSearchPath(node.right, v, path);
  }

  /* ── Compute height ── */
  function _bstH(node) {
    if (!node) return 0;
    return 1 + Math.max(_bstH(node.left), _bstH(node.right));
  }

  /* ── PUBLIC: interactiveBSTInsert ── */
  function interactiveBSTInsert(val, onLog) {
    var numVal = Number(val);
    if (isNaN(numVal)) return;

    /* First animate the search path to insertion point */
    var path = [];
    _bstSearchPath(_bstRoot, numVal, path);

    /* Flash visited path */
    for (var i = 0; i < path.length; i++) {
      (function(idx, v) {
        setTimeout(function() {
          setNodeState(v, 'visiting');
          setTimeout(function() { setNodeState(v, 'default'); }, 350);
        }, idx * 200);
      })(i, path[i]);
    }

    var delay = path.length * 200 + 200;

    /* Insert the node and rebuild the visual tree */
    setTimeout(function() {
      _bstRoot = _bstInsert(_bstRoot, numVal);
      _treeRoot = _bstRoot ? _bstRoot.val : null;
      buildBSTFromRoot(_bstRoot);
      /* Highlight new node with a green flash */
      setTimeout(function() {
        setNodeState(numVal, 'found');
        setTimeout(function() { setNodeState(numVal, 'default'); }, 800);
      }, 100);
      if (onLog) onLog('<i class="fa-solid fa-plus"></i> <strong>INSERT</strong> <span class="log-val">' + numVal + '</span> — tree size: ' + _bstSize);
    }, delay);
  }

  /* ── PUBLIC: interactiveBSTDelete ── */
  function interactiveBSTDelete(val, onLog) {
    var numVal = Number(val);
    if (isNaN(numVal)) return false;

    /* Check if node exists */
    var path = [];
    var found = _bstSearchPath(_bstRoot, numVal, path);
    if (!found) return false;

    /* Animate the search path */
    for (var i = 0; i < path.length; i++) {
      (function(idx, v) {
        setTimeout(function() {
          setNodeState(v, idx === path.length - 1 ? 'current' : 'visiting');
          if (idx < path.length - 1) setTimeout(function() { setNodeState(v, 'default'); }, 300);
        }, idx * 200);
      })(i, path[i]);
    }

    var delay = path.length * 200 + 150;

    setTimeout(function() {
      /* Flash red before deletion */
      setNodeState(numVal, 'visiting');
      setTimeout(function() {
        _bstRoot = _bstDelete(_bstRoot, numVal);
        _treeRoot = _bstRoot ? _bstRoot.val : null;
        if (_bstRoot) {
          buildBSTFromRoot(_bstRoot);
        } else {
          /* Tree is empty now */
          _nodes = {}; _edges = [];
          if (_svg) _svg.innerHTML = '';
        }
        if (onLog) onLog('<i class="fa-solid fa-trash"></i> <strong>DELETE</strong> <span class="log-val">' + numVal + '</span> — tree size: ' + _bstSize);
      }, 300);
    }, delay);

    return true;
  }

  /* ── PUBLIC: interactiveBSTSearch ── */
  function interactiveBSTSearch(val, callback) {
    var numVal = Number(val);
    if (isNaN(numVal)) return;

    var path = [];
    var found = _bstSearchPath(_bstRoot, numVal, path);

    for (var i = 0; i < path.length; i++) {
      (function(idx, v, isLast) {
        setTimeout(function() {
          setNodeState(v, isLast && found ? 'found' : 'visiting');
          if (!isLast) setTimeout(function() { setNodeState(v, 'default'); }, 300);
          else setTimeout(function() { setNodeState(v, 'default'); }, 1200);
        }, idx * 250);
      })(i, path[i], i === path.length - 1);
    }

    var delay = path.length * 250 + 300;
    if (callback) {
      setTimeout(function() { callback(found, path.length - 1); }, delay);
    }
  }

  /* ── PUBLIC: interactiveBSTTraverse ── */
  function interactiveBSTTraverse(mode, control, delayMs, onVisit, onDone) {
    if (_bstTraverseRunning) return;
    _bstTraverseRunning = true;

    var order = [];

    function visit(val) {
      return new Promise(function(resolve) {
        if (control && control.isAborted) { resolve(); return; }
        setNodeState(val, 'current');
        order.push(val);
        if (onVisit) onVisit(val, order.slice());
        setTimeout(function() {
          setNodeState(val, 'visited');
          resolve();
        }, delayMs || 500);
      });
    }

    function inorder(node) {
      if (!node || (control && control.isAborted)) return Promise.resolve();
      return inorder(node.left).then(function() { return visit(node.val); }).then(function() { return inorder(node.right); });
    }
    function preorder(node) {
      if (!node || (control && control.isAborted)) return Promise.resolve();
      return visit(node.val).then(function() { return preorder(node.left); }).then(function() { return preorder(node.right); });
    }
    function postorder(node) {
      if (!node || (control && control.isAborted)) return Promise.resolve();
      return postorder(node.left).then(function() { return postorder(node.right); }).then(function() { return visit(node.val); });
    }
    function levelorder(root) {
      if (!root) return Promise.resolve();
      var q = [root];
      function step() {
        if (q.length === 0 || (control && control.isAborted)) return Promise.resolve();
        var n = q.shift();
        if (n.left)  q.push(n.left);
        if (n.right) q.push(n.right);
        return visit(n.val).then(step);
      }
      return step();
    }

    var trav;
    switch (mode) {
      case 'preorder':   trav = preorder(_bstRoot);   break;
      case 'postorder':  trav = postorder(_bstRoot);  break;
      case 'levelorder': trav = levelorder(_bstRoot); break;
      default:           trav = inorder(_bstRoot);
    }

    trav.then(function() {
      _bstTraverseRunning = false;
      if (onDone) onDone();
    });
  }

  /* ── PUBLIC: resetBST ── */
  function resetBST(defaultValues) {
    _bstRoot = null;
    _bstSize = 0;
    _bstTraverseRunning = false;
    var vals = defaultValues || (_algo && _algo.input && _algo.input.defaultValues) || [50,30,70,20,40,60,80];
    for (var i = 0; i < vals.length; i++) {
      _bstRoot = _bstInsert(_bstRoot, vals[i]);
    }
    _treeRoot = _bstRoot ? _bstRoot.val : null;
    buildBSTFromRoot(_bstRoot);
  }

  /* ── PUBLIC: getBSTSize / getBSTHeight ── */
  function getBSTSize()   { return _bstSize; }
  function getBSTHeight() { return _bstH(_bstRoot); }

  /* ── Sync internal BST when tree is built from external root ── */
  function _syncInternalBST(rootNode) {
    _bstRoot = null;
    _bstSize = 0;
    function _walk(node) {
      if (!node) return;
      _bstRoot = _bstInsert(_bstRoot, node.val);
      _walk(node.left);
      _walk(node.right);
    }
    _walk(rootNode);
  }

  return {
    mount: mount,
    setNodeState: setNodeState,
    setEdgeState: setEdgeState,
    resetStates: resetStates,
    getNodes: getNodes,
    getEdges: getEdges,
    NODE_STATES: NODE_STATES,
    /* Tree API */
    buildBSTFromRoot: buildBSTFromRoot,
    buildDefaultBST:  buildDefaultBST,
    getRootValue:     getRootValue,
    getLeftChild:     getLeftChild,
    getRightChild:    getRightChild,
    hasNode:          hasNode,
    /* Interactive BST API */
    interactiveBSTInsert:   interactiveBSTInsert,
    interactiveBSTDelete:   interactiveBSTDelete,
    interactiveBSTSearch:   interactiveBSTSearch,
    interactiveBSTTraverse: interactiveBSTTraverse,
    resetBST:               resetBST,
    getBSTSize:             getBSTSize,
    getBSTHeight:           getBSTHeight,
    applySnapshot: applySnapshot,
    reset: reset
  };

})();
