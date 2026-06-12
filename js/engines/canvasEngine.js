/* ════════════════════════════════════════════════════════════
   Lernexa — canvasEngine.js  (v2)
   Rich HTML5 Canvas for ML algorithms: K-Means, KNN, Regression.
   Supports pulsing centroid rings, radar expansion, error bars,
   MSE overlay, and continuous requestAnimationFrame animation loop.
   ════════════════════════════════════════════════════════════ */

'use strict';

var CanvasEngine = (function () {

  /* ── canvas / context ─────────────────────────────────────── */
  var _canvas = null;
  var _ctx    = null;
  var _area   = null;
  var _algo   = null;

  /* ── data state ───────────────────────────────────────────── */
  var _points    = [];   /* [{ x, y, cluster, shape?, _highlight }] */
  var _centroids = [];   /* [{ x, y }] */

  /* ── KNN state ────────────────────────────────────────────── */
  var _queryPoint  = null;
  var _queryClass  = -1;
  var _neighborIdx = [];   /* indices of locked-in neighbors */
  var _voteMap     = null; /* { cls: count } for tooltip */

  /* ── Regression state ─────────────────────────────────────── */
  var _regrLine    = null;   /* { m, b } — in DATA coordinates */
  var _regrPoints  = [];     /* raw data points { x, y } passed via initRegression */
  var _regrXMax    = 10;     /* data-space x max */
  var _regrYMax    = 22;     /* data-space y max */
  var _errorLines  = false;
  var _mse         = null;
  var _lineColor   = '#B026FF';

  /* ── K-Means animation state ──────────────────────────────── */
  var _laserLines = false; /* draw thin point→centroid lines */

  /* ── Radar (KNN) animation state ──────────────────────────── */
  var _radarRadius = 0;
  var _radarMax    = 0;

  /* ── animation loop ───────────────────────────────────────── */
  var _animId   = null;
  var _pulse    = 0;       /* 0‥2π — drives centroid ring pulse */
  var _lastRAF  = 0;

  /* ── design tokens ────────────────────────────────────────── */
  var CLUSTER_COLORS = [
    '#00F0FF', '#B026FF', '#F0883E', '#39D353',
    '#FF6E6E', '#F0D060', '#79C0FF', '#D2A8FF'
  ];

  /* ════════════════════════════════════════════════════════════
     MOUNT
  ════════════════════════════════════════════════════════════ */
  function mount(area, algo) {
    _algo        = algo;
    _area        = area;
    _queryPoint  = null;
    _queryClass  = -1;
    _neighborIdx = [];
    _voteMap     = null;
    _regrLine    = null;
    _errorLines  = false;
    _mse         = null;
    _lineColor   = '#B026FF';
    _laserLines  = false;
    _radarRadius = 0;
    _radarMax    = 0;

    area.innerHTML = '';

    var wrapper = createElement('div', 'canvas-container');
    wrapper.style.cssText = 'position:relative;width:100%;height:100%;';
    _canvas = document.createElement('canvas');
    _canvas.className = 'vis-canvas';
    _canvas.id = 'visCanvas';
    _canvas.style.cssText = 'display:block;width:100%;height:100%;';
    wrapper.appendChild(_canvas);
    area.appendChild(wrapper);

    _resize();
    _generatePoints(algo);
    _startAnimLoop();

    /* Click to add a point when not running */
    _canvas.addEventListener('click', function (e) {
      if (typeof WS !== 'undefined' && WS.isRunning) return;
      var rect = _canvas.getBoundingClientRect();
      var sx = _canvas.width  / rect.width;
      var sy = _canvas.height / rect.height;
      _points.push({
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top)  * sy,
        cluster: (_algo && _algo.id === 'knn') ? 0 : -1
      });
    });
  }

  /* ── resize ───────────────────────────────────────────────── */
  function _resize() {
    if (!_canvas || !_area) return;
    _canvas.width  = _area.clientWidth  || 600;
    _canvas.height = _area.clientHeight || 400;
    _ctx = _canvas.getContext('2d');
  }

  /* ════════════════════════════════════════════════════════════
     POINT GENERATION
  ════════════════════════════════════════════════════════════ */
  function _generatePoints(algo) {
    _points    = [];
    _centroids = [];
    if (!_canvas) return;
    var w = _canvas.width, h = _canvas.height;
    var kSlider = byId('kSlider');
    var k = kSlider ? parseInt(kSlider.value) : 3;

    /* ── Linear regression: generate genuinely scattered data ──
       Real (noisy) data drawn from a hidden line y = m·x + b + Gaussian
       noise, spread across the x-range. This gives gradient descent an
       actual cloud to fit — the line visibly converges and the residual
       error bars mean something (vs. the old near-collinear points where
       the "fit" was trivial). Reset regenerates a fresh dataset. */
    if (algo && algo.id === 'linear-regression') {
      var trueM = 1.2 + Math.random() * 1.6;   /* slope  ≈ 1.2 .. 2.8 */
      var trueB = Math.random() * 3;           /* intercept ≈ 0 .. 3  */
      var N     = 18;
      var pts   = [];
      var maxY  = 0;
      for (var li = 0; li < N; li++) {
        var px = 0.5 + Math.random() * 9.5;            /* x ∈ 0.5 .. 10 */
        var py = trueM * px + trueB + _gaussian() * 1.6; /* + noise (σ≈1.6) */
        if (py < 0.2) py = 0.2;
        px = Math.round(px * 100) / 100;
        py = Math.round(py * 100) / 100;
        if (py > maxY) maxY = py;
        pts.push({ x: px, y: py, cluster: 0 });
      }
      pts.sort(function (a, b) { return a.x - b.x; });
      _regrPoints = pts;
      _regrXMax   = 11;
      _regrYMax   = Math.max(12, Math.ceil(maxY * 1.15));
      /* _points stores data-space coords; drawing converts via _regrToCanvas */
      for (var pi = 0; pi < pts.length; pi++) {
        _points.push({ x: pts[pi].x, y: pts[pi].y, cluster: 0 });
      }
      return;
    }

    /* ── KNN: k pre-classified clusters with shapes ── */
    var shapes = ['square', 'triangle', 'diamond'];
    for (var c = 0; c < k; c++) {
      var cx = randomInt(Math.floor(w * 0.15), Math.floor(w * 0.85));
      var cy = randomInt(Math.floor(h * 0.15), Math.floor(h * 0.85));
      var n  = randomInt(12, 22);
      for (var i = 0; i < n; i++) {
        _points.push({
          x: Math.max(20, Math.min(w - 20, cx + randomInt(-70, 70))),
          y: Math.max(20, Math.min(h - 20, cy + randomInt(-70, 70))),
          cluster: (algo && algo.id === 'knn') ? c : -1,
          shape:   (algo && algo.id === 'knn') ? shapes[c % shapes.length] : null
        });
      }
    }
    /* Noise points */
    for (var j = 0; j < 8; j++) {
      _points.push({
        x: randomInt(20, w - 20),
        y: randomInt(20, h - 20),
        cluster: -1,
        shape: null
      });
    }
  }

  /* ════════════════════════════════════════════════════════════
     ANIMATION LOOP
  ════════════════════════════════════════════════════════════ */
  function _startAnimLoop() {
    if (_animId) cancelAnimationFrame(_animId);
    _lastRAF = 0;
    function loop(ts) {
      var dt = _lastRAF ? ts - _lastRAF : 16;
      _lastRAF = ts;
      _pulse = (_pulse + dt * 0.003) % (Math.PI * 2);
      _draw();
      _animId = requestAnimationFrame(loop);
    }
    _animId = requestAnimationFrame(loop);
  }

  /* ════════════════════════════════════════════════════════════
     DRAW
  ════════════════════════════════════════════════════════════ */
  function _draw() {
    if (!_ctx) return;
    var w = _canvas.width, h = _canvas.height;
    var id = _algo ? _algo.id : '';

    /* ── Background ── */
    _ctx.fillStyle = '#0D1117';
    _ctx.fillRect(0, 0, w, h);

    /* ── Radial grid ── */
    _drawGrid(w, h);

    if (id === 'kmeans')            { _drawKMeans(w, h); }
    else if (id === 'knn')          { _drawKNN(w, h); }
    else if (id === 'linear-regression') { _drawRegression(w, h); }
    else                            { _drawKMeans(w, h); } /* fallback */
  }

  /* ── Subtle dot-grid background ─────────────────────────── */
  function _drawGrid(w, h) {
    _ctx.save();
    /* Radial vignette */
    var cx = w / 2, cy = h / 2;
    var grad = _ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
    grad.addColorStop(0,   'rgba(0,240,255,0.03)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    _ctx.fillStyle = grad;
    _ctx.fillRect(0, 0, w, h);

    /* Dot grid */
    _ctx.fillStyle = 'rgba(230,237,243,0.06)';
    var step = 40;
    for (var gx = step; gx < w; gx += step) {
      for (var gy = step; gy < h; gy += step) {
        _ctx.beginPath();
        _ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        _ctx.fill();
      }
    }
    _ctx.restore();
  }

  /* ════════════════════════════════════════════════════════════
     K-MEANS DRAWING
  ════════════════════════════════════════════════════════════ */
  function _drawKMeans(w, h) {
    /* Laser lines: point → centroid */
    if (_laserLines) {
      for (var li = 0; li < _points.length; li++) {
        var p = _points[li];
        if (p.cluster >= 0 && _centroids[p.cluster]) {
          var cen = _centroids[p.cluster];
          var col = CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length];
          _ctx.save();
          _ctx.globalAlpha = 0.25;
          _ctx.strokeStyle = col;
          _ctx.lineWidth   = 0.7;
          _ctx.beginPath();
          _ctx.moveTo(p.x, p.y);
          _ctx.lineTo(cen.x, cen.y);
          _ctx.stroke();
          _ctx.restore();
        }
      }
    }

    /* Points */
    for (var i = 0; i < _points.length; i++) {
      var pt  = _points[i];
      var r   = 5;
      var col = pt.cluster >= 0
        ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]
        : 'rgba(230,237,243,0.4)';

      _ctx.save();
      if (pt.cluster >= 0) {
        _ctx.shadowColor = col;
        _ctx.shadowBlur  = 6;
      }
      _ctx.beginPath();
      _ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      _ctx.fillStyle   = col;
      _ctx.fill();
      _ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      _ctx.lineWidth   = 1;
      _ctx.stroke();
      _ctx.restore();
    }

    /* Centroids */
    for (var j = 0; j < _centroids.length; j++) {
      _drawCentroid(_centroids[j], j);
    }
  }

  function _drawCentroid(cen, idx) {
    var col = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
    var pulse = Math.abs(Math.sin(_pulse + idx * 1.2));

    /* Outer pulsing ring */
    var ringR = 20 + pulse * 7;
    _ctx.save();
    _ctx.globalAlpha = 0.25 + pulse * 0.2;
    _ctx.strokeStyle = col;
    _ctx.lineWidth   = 1.5;
    _ctx.setLineDash([4, 4]);
    _ctx.beginPath();
    _ctx.arc(cen.x, cen.y, ringR, 0, Math.PI * 2);
    _ctx.stroke();
    _ctx.setLineDash([]);
    _ctx.restore();

    /* Inner glow halo */
    var halo = _ctx.createRadialGradient(cen.x, cen.y, 4, cen.x, cen.y, 18);
    halo.addColorStop(0,   _hexToRgba(col, 0.35));
    halo.addColorStop(1,   _hexToRgba(col, 0));
    _ctx.save();
    _ctx.fillStyle = halo;
    _ctx.beginPath();
    _ctx.arc(cen.x, cen.y, 18, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.restore();

    /* Centroid orb */
    _ctx.save();
    _ctx.shadowColor = col;
    _ctx.shadowBlur  = 14;
    _ctx.beginPath();
    _ctx.arc(cen.x, cen.y, 13, 0, Math.PI * 2);
    _ctx.fillStyle   = col;
    _ctx.fill();
    _ctx.strokeStyle = '#fff';
    _ctx.lineWidth   = 2;
    _ctx.stroke();
    _ctx.restore();

    /* Star-burst / crosshair on top */
    _ctx.save();
    _ctx.strokeStyle = '#fff';
    _ctx.lineWidth   = 2;
    _ctx.lineCap     = 'round';
    /* Cross */
    _ctx.beginPath();
    _ctx.moveTo(cen.x - 7, cen.y);
    _ctx.lineTo(cen.x + 7, cen.y);
    _ctx.stroke();
    _ctx.beginPath();
    _ctx.moveTo(cen.x, cen.y - 7);
    _ctx.lineTo(cen.x, cen.y + 7);
    _ctx.stroke();
    /* Diagonal burst rays */
    _ctx.globalAlpha = 0.55;
    _ctx.lineWidth   = 1;
    var diagLen = 5;
    var diags = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (var d = 0; d < diags.length; d++) {
      _ctx.beginPath();
      _ctx.moveTo(cen.x + diags[d][0] * 5, cen.y + diags[d][1] * 5);
      _ctx.lineTo(cen.x + diags[d][0] * (5 + diagLen), cen.y + diags[d][1] * (5 + diagLen));
      _ctx.stroke();
    }
    _ctx.restore();
  }

  /* ════════════════════════════════════════════════════════════
     KNN DRAWING
  ════════════════════════════════════════════════════════════ */
  function _drawKNN(w, h) {
    /* Neighbor connecting lines */
    if (_queryPoint && _neighborIdx.length > 0) {
      for (var ni = 0; ni < _neighborIdx.length; ni++) {
        var nb = _points[_neighborIdx[ni]];
        if (!nb) continue;
        var nbCol = nb.cluster >= 0 ? CLUSTER_COLORS[nb.cluster % CLUSTER_COLORS.length] : '#fff';
        _ctx.save();
        _ctx.globalAlpha = 0.55;
        _ctx.strokeStyle = nbCol;
        _ctx.lineWidth   = 1.2;
        _ctx.setLineDash([5, 4]);
        _ctx.beginPath();
        _ctx.moveTo(_queryPoint.x, _queryPoint.y);
        _ctx.lineTo(nb.x, nb.y);
        _ctx.stroke();
        _ctx.setLineDash([]);
        _ctx.restore();
      }
    }

    /* Data points — shapes by class */
    for (var i = 0; i < _points.length; i++) {
      var pt  = _points[i];
      var col = pt.cluster >= 0
        ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]
        : 'rgba(230,237,243,0.35)';
      var isNeighbor = _neighborIdx.indexOf(i) !== -1;
      var r = isNeighbor ? 8 : 5;

      _ctx.save();
      if (isNeighbor) {
        _ctx.shadowColor = col;
        _ctx.shadowBlur  = 10;
      }
      _ctx.fillStyle   = col;
      _ctx.strokeStyle = isNeighbor ? '#fff' : 'rgba(255,255,255,0.2)';
      _ctx.lineWidth   = isNeighbor ? 2 : 1;
      _drawShape(_ctx, pt.x, pt.y, r, pt.shape || 'square');
      _ctx.restore();
    }

    /* Radar ring */
    if (_queryPoint && _radarRadius > 0) {
      var pulse = Math.abs(Math.sin(_pulse * 2));
      _ctx.save();
      _ctx.globalAlpha = 0.45 + pulse * 0.25;
      _ctx.strokeStyle = '#79C0FF';
      _ctx.lineWidth   = 1.5;
      _ctx.setLineDash([6, 5]);
      _ctx.beginPath();
      _ctx.arc(_queryPoint.x, _queryPoint.y, _radarRadius, 0, Math.PI * 2);
      _ctx.stroke();
      _ctx.setLineDash([]);
      /* secondary inner ring */
      _ctx.globalAlpha = 0.15;
      _ctx.lineWidth   = 1;
      _ctx.setLineDash([3, 6]);
      _ctx.beginPath();
      _ctx.arc(_queryPoint.x, _queryPoint.y, _radarRadius * 0.6, 0, Math.PI * 2);
      _ctx.stroke();
      _ctx.setLineDash([]);
      _ctx.restore();
    }

    /* Query point */
    if (_queryPoint) {
      var qCol = _queryClass >= 0
        ? CLUSTER_COLORS[_queryClass % CLUSTER_COLORS.length]
        : 'rgba(255,255,255,0.75)';
      var qPulse = Math.abs(Math.sin(_pulse * 1.5));
      /* Outer ring */
      _ctx.save();
      _ctx.globalAlpha = 0.35 + qPulse * 0.35;
      _ctx.strokeStyle = qCol;
      _ctx.lineWidth   = 2;
      _ctx.setLineDash([4, 3]);
      _ctx.beginPath();
      _ctx.arc(_queryPoint.x, _queryPoint.y, 22 + qPulse * 5, 0, Math.PI * 2);
      _ctx.stroke();
      _ctx.setLineDash([]);
      _ctx.restore();
      /* Main circle */
      _ctx.save();
      _ctx.shadowColor = qCol;
      _ctx.shadowBlur  = _queryClass >= 0 ? 18 : 8;
      _ctx.beginPath();
      _ctx.arc(_queryPoint.x, _queryPoint.y, 11, 0, Math.PI * 2);
      _ctx.fillStyle   = _queryClass >= 0 ? qCol : 'rgba(30,40,55,0.85)';
      _ctx.fill();
      _ctx.strokeStyle = qCol;
      _ctx.lineWidth   = 2.5;
      _ctx.stroke();
      _ctx.restore();
      /* Label */
      _ctx.save();
      _ctx.fillStyle    = _queryClass >= 0 ? '#0D1117' : '#fff';
      _ctx.font         = 'bold 11px "Fira Code", monospace';
      _ctx.textAlign    = 'center';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(_queryClass >= 0 ? String(_queryClass) : '?', _queryPoint.x, _queryPoint.y);
      _ctx.restore();
    }

    /* Vote tooltip */
    if (_voteMap && _queryPoint) {
      _drawVoteTooltip(w, h);
    }
  }

  function _drawShape(ctx, x, y, r, shape) {
    if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.1, y + r * 0.8);
      ctx.lineTo(x - r * 1.1, y + r * 0.8);
      ctx.closePath();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(x,       y - r * 1.3);
      ctx.lineTo(x + r,   y);
      ctx.lineTo(x,       y + r * 1.3);
      ctx.lineTo(x - r,   y);
      ctx.closePath();
    } else {
      /* square */
      ctx.beginPath();
      ctx.rect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  function _drawVoteTooltip(w, h) {
    if (!_voteMap || !_queryPoint) return;
    var keys   = Object.keys(_voteMap);
    var pad    = 10;
    var lineH  = 18;
    var bw     = 110;
    var bh     = pad * 2 + keys.length * lineH + 4;
    var bx     = Math.min(_queryPoint.x + 28, w - bw - 10);
    var by     = Math.max(10, _queryPoint.y - bh / 2);

    _ctx.save();
    /* Glass box */
    _ctx.fillStyle   = 'rgba(13,17,23,0.82)';
    _ctx.strokeStyle = 'rgba(0,240,255,0.4)';
    _ctx.lineWidth   = 1;
    _ctx.beginPath();
    _ctx.roundRect ? _ctx.roundRect(bx, by, bw, bh, 6) : _ctx.rect(bx, by, bw, bh);
    _ctx.fill();
    _ctx.stroke();

    _ctx.font         = '11px "Fira Code", monospace';
    _ctx.textBaseline = 'middle';
    for (var ki = 0; ki < keys.length; ki++) {
      var cls  = keys[ki];
      var votes = _voteMap[cls];
      var col  = CLUSTER_COLORS[parseInt(cls) % CLUSTER_COLORS.length];
      var ty   = by + pad + ki * lineH + lineH / 2;
      _ctx.fillStyle = col;
      _ctx.fillRect(bx + pad, ty - 4, 8, 8);
      _ctx.fillStyle    = '#E6EDF3';
      _ctx.textAlign    = 'left';
      _ctx.fillText('Class ' + cls + ': ' + votes, bx + pad + 14, ty);
    }
    _ctx.restore();
  }

  /* ════════════════════════════════════════════════════════════
     LINEAR REGRESSION DRAWING — 2D Cartesian Plane
  ════════════════════════════════════════════════════════════ */

  /* Returns margin + helpers; fills plot background + grid + axes */
  function _drawCoordinatePlane(ctx, w, h) {
    var margin = { left: 55, right: 24, top: 24, bottom: 50 };
    var plotW  = w - margin.left - margin.right;
    var plotH  = h - margin.top  - margin.bottom;

    /* Plot background */
    ctx.fillStyle = 'rgba(13,17,23,0.6)';
    ctx.fillRect(margin.left, margin.top, plotW, plotH);

    /* Grid lines */
    ctx.strokeStyle = 'rgba(230,237,243,0.06)';
    ctx.lineWidth   = 1;
    var gridN = 5;
    for (var i = 1; i < gridN; i++) {
      /* Vertical */
      var gx = margin.left + (plotW / gridN) * i;
      ctx.beginPath(); ctx.moveTo(gx, margin.top); ctx.lineTo(gx, margin.top + plotH); ctx.stroke();
      /* Horizontal */
      var gy = margin.top + (plotH / gridN) * i;
      ctx.beginPath(); ctx.moveTo(margin.left, gy); ctx.lineTo(margin.left + plotW, gy); ctx.stroke();
    }

    /* Tick marks + tick labels on X axis */
    ctx.fillStyle  = 'rgba(139,148,158,0.75)';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';
    var xTickN = 5;
    for (var ti = 0; ti <= xTickN; ti++) {
      var txPx  = margin.left + (plotW / xTickN) * ti;
      var txVal = (_regrXMax / xTickN * ti).toFixed(0);
      ctx.strokeStyle = 'rgba(139,148,158,0.4)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(txPx, margin.top + plotH);
      ctx.lineTo(txPx, margin.top + plotH + 5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(139,148,158,0.75)';
      ctx.fillText(txVal, txPx, margin.top + plotH + 7);
    }

    /* Tick marks + tick labels on Y axis */
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    var yTickN = 5;
    for (var tj = 0; tj <= yTickN; tj++) {
      var tyPx  = margin.top + plotH - (plotH / yTickN) * tj;
      var tyVal = (_regrYMax / yTickN * tj).toFixed(0);
      ctx.strokeStyle = 'rgba(139,148,158,0.4)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left - 5, tyPx);
      ctx.lineTo(margin.left,     tyPx);
      ctx.stroke();
      ctx.fillStyle = 'rgba(139,148,158,0.75)';
      ctx.fillText(tyVal, margin.left - 8, tyPx);
    }

    /* Axes */
    ctx.strokeStyle = 'rgba(230,237,243,0.3)';
    ctx.lineWidth   = 1.5;
    /* X axis (bottom of plot area) */
    ctx.beginPath(); ctx.moveTo(margin.left, margin.top + plotH); ctx.lineTo(margin.left + plotW, margin.top + plotH); ctx.stroke();
    /* Y axis (left of plot area) */
    ctx.beginPath(); ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, margin.top + plotH); ctx.stroke();

    /* Axis labels */
    ctx.fillStyle    = 'rgba(139,148,158,0.8)';
    ctx.font         = '11px monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('x', margin.left + plotW + 4, margin.top + plotH + 4);
    ctx.fillText('y', margin.left - 6, margin.top - 6);
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', margin.left - 4, margin.top + plotH + 4);

    return { margin: margin, plotW: plotW, plotH: plotH };
  }

  /* Convert a data-space (dx, dy) → canvas pixel coords */
  function _regrToCanvas(dx, dy, margin, plotW, plotH) {
    var cx = margin.left  + (dx / _regrXMax) * plotW;
    var cy = margin.top   + plotH - (dy / _regrYMax) * plotH;
    return { x: cx, y: cy };
  }

  function _drawRegression(w, h) {
    /* Draw coordinate plane; get layout */
    var layout = _drawCoordinatePlane(_ctx, w, h);
    var margin = layout.margin;
    var plotW  = layout.plotW;
    var plotH  = layout.plotH;

    /* Use _regrPoints if available, else fall back to _points (data-space) */
    var pts = _regrPoints.length > 0 ? _regrPoints : _points;

    /* Error bars (residuals in data space) */
    if (_errorLines && _regrLine) {
      for (var ei = 0; ei < pts.length; ei++) {
        var pt      = pts[ei];
        var predDY  = _regrLine.m * pt.x + _regrLine.b;
        var cpPt    = _regrToCanvas(pt.x, pt.y,    margin, plotW, plotH);
        var cpPred  = _regrToCanvas(pt.x, predDY,  margin, plotW, plotH);
        _ctx.save();
        _ctx.globalAlpha = 0.55;
        _ctx.strokeStyle = '#FF6E6E';
        _ctx.lineWidth   = 1;
        _ctx.setLineDash([3, 3]);
        _ctx.beginPath();
        _ctx.moveTo(cpPt.x,   cpPt.y);
        _ctx.lineTo(cpPred.x, cpPred.y);
        _ctx.stroke();
        _ctx.setLineDash([]);
        _ctx.restore();
      }
    }

    /* Scatter points */
    for (var i = 0; i < pts.length; i++) {
      var p  = pts[i];
      var cp = _regrToCanvas(p.x, p.y, margin, plotW, plotH);
      _ctx.save();
      _ctx.shadowColor = 'rgba(0,240,255,0.5)';
      _ctx.shadowBlur  = 6;
      _ctx.beginPath();
      _ctx.arc(cp.x, cp.y, 4, 0, Math.PI * 2);
      _ctx.fillStyle   = 'rgba(0,240,255,0.55)';
      _ctx.fill();
      _ctx.strokeStyle = 'rgba(0,240,255,0.9)';
      _ctx.lineWidth   = 1.5;
      _ctx.stroke();
      _ctx.restore();
    }

    /* Regression line */
    if (_regrLine) {
      var m     = _regrLine.m;
      var b     = _regrLine.b;
      var pulse = Math.abs(Math.sin(_pulse));

      /* Compute canvas coords for x=0 (y-intercept) and x=xMax */
      var cpStart = _regrToCanvas(0,          b,                   margin, plotW, plotH);
      var cpEnd   = _regrToCanvas(_regrXMax,  m * _regrXMax + b,   margin, plotW, plotH);

      _ctx.save();
      _ctx.shadowColor = _lineColor;
      _ctx.shadowBlur  = 12 + pulse * 6;
      _ctx.strokeStyle = _lineColor;
      _ctx.lineWidth   = 2.5;
      _ctx.beginPath();
      _ctx.moveTo(cpStart.x, cpStart.y);
      _ctx.lineTo(cpEnd.x,   cpEnd.y);
      _ctx.stroke();
      _ctx.restore();

      /* Mark y-intercept (x=0) — green circle + label */
      _ctx.save();
      _ctx.shadowColor = '#39D353';
      _ctx.shadowBlur  = 8;
      _ctx.beginPath();
      _ctx.arc(cpStart.x, cpStart.y, 6, 0, Math.PI * 2);
      _ctx.fillStyle   = '#39D353';
      _ctx.fill();
      _ctx.strokeStyle = '#fff';
      _ctx.lineWidth   = 1.5;
      _ctx.stroke();
      _ctx.restore();

      /* y-intercept label */
      _ctx.save();
      _ctx.font         = '10px monospace';
      _ctx.fillStyle    = 'rgba(57,211,83,0.9)';
      _ctx.textAlign    = 'left';
      _ctx.textBaseline = 'bottom';
      _ctx.fillText('β=' + b.toFixed(2), cpStart.x + 8, cpStart.y - 4);
      _ctx.restore();

      /* Mark end point (x=xMax) — blue circle */
      _ctx.save();
      _ctx.shadowColor = '#79C0FF';
      _ctx.shadowBlur  = 8;
      _ctx.beginPath();
      _ctx.arc(cpEnd.x, cpEnd.y, 5, 0, Math.PI * 2);
      _ctx.fillStyle   = '#79C0FF';
      _ctx.fill();
      _ctx.strokeStyle = '#fff';
      _ctx.lineWidth   = 1.5;
      _ctx.stroke();
      _ctx.restore();
    }

    /* MSE overlay */
    if (_mse !== null) {
      _drawMSEOverlay(w);
    }
  }

  function _drawMSEOverlay(w) {
    var bw = 140, bh = 38, bx = w - bw - 12, by = 12;
    _ctx.save();
    /* Glass box */
    _ctx.fillStyle   = 'rgba(13,17,23,0.78)';
    _ctx.strokeStyle = 'rgba(176,38,255,0.5)';
    _ctx.lineWidth   = 1;
    _ctx.beginPath();
    _ctx.roundRect ? _ctx.roundRect(bx, by, bw, bh, 7) : _ctx.rect(bx, by, bw, bh);
    _ctx.fill();
    _ctx.stroke();
    /* Label */
    _ctx.font         = '12px "Fira Code", monospace';
    _ctx.textAlign    = 'left';
    _ctx.textBaseline = 'middle';
    _ctx.fillStyle    = 'rgba(230,237,243,0.6)';
    _ctx.fillText('MSE', bx + 12, by + bh / 2);
    _ctx.fillStyle = '#B026FF';
    _ctx.font      = 'bold 13px "Fira Code", monospace';
    _ctx.fillText(parseFloat(_mse).toFixed(2), bx + 52, by + bh / 2);
    _ctx.restore();
  }

  /* ════════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════════ */
  /* Standard-normal sample via the Box–Muller transform. */
  function _gaussian() {
    var u = 1 - Math.random();   /* (0,1] to avoid log(0) */
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function _hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var bl = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha + ')';
  }

  /* ════════════════════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════════════════════ */

  /* General */
  function redraw()      { _draw(); }
  function getPoints()   { return _points; }
  function getCentroids(){ return _centroids; }
  function getCanvas()   { return _canvas; }
  function getCtx()      { return _ctx; }
  function getColors()   { return CLUSTER_COLORS; }
  function getK() {
    var s = byId('kSlider');
    return s ? parseInt(s.value) : 3;
  }

  /* K-Means */
  function setCentroids(arr)       { _centroids = arr; }
  function updateCentroids(arr)    { _centroids = arr; }
  function updateClusters(pts)     { _points = pts; }
  function setAssignments(arr) {
    for (var i = 0; i < arr.length && i < _points.length; i++) {
      _points[i].cluster = arr[i];
    }
  }

  /* KNN */
  function setQueryPoint(x, y) {
    if (typeof x === 'object' && x !== null) {
      /* legacy: called with a point object */
      _queryPoint = x;
    } else {
      _queryPoint = { x: x, y: y };
    }
    _queryClass  = -1;
    _neighborIdx = [];
    _voteMap     = null;
    _radarRadius = 0;
  }
  function setQueryClass(cls)      { _queryClass = cls; }
  function setNeighbors(indices)   { _neighborIdx = indices; }
  function setVotes(vmap)          { _voteMap = vmap; }
  function getQueryPoint()         { return _queryPoint; }
  function classifyQueryPoint(cls) { _queryClass = cls; }

  /* Highlight */
  function highlightPoint(idx, state) {
    if (!_points[idx]) return;
    _points[idx]._highlight = state || '';
  }

  /* Regression */
  function setRegressionLine(m, b) { _regrLine = { m: m, b: b }; }
  function setErrorLines(show)     { _errorLines = !!show; }
  function setMSE(val)             { _mse = val; }
  /* legacy alias used by old linearRegression.js */
  function drawRegressionLine(m, b){ _regrLine = { m: m, b: b }; }

  /**
   * initRegression(points, opts)
   *  points — array of { x, y } in data coordinates
   *  opts   — { xLabel, yLabel } (optional)
   * Replaces the canvas point set with the supplied data points
   * and recalculates axis bounds automatically.
   */
  function initRegression(points, opts) {
    _regrPoints = points || [];
    _points     = _regrPoints.slice(); /* keep _points in sync for getPoints() */
    var xs = _regrPoints.map(function(p){ return p.x; });
    var ys = _regrPoints.map(function(p){ return p.y; });
    _regrXMax = xs.length ? Math.ceil(Math.max.apply(null, xs) * 1.1) : 10;
    _regrYMax = ys.length ? Math.ceil(Math.max.apply(null, ys) * 1.15) : 22;
    _regrLine = null;
    _errorLines = false;
    _mse = null;
    _lineColor = '#B026FF';
  }

  /* Snapshot — captures the full visual state so step-back/forward
     can faithfully rewind K-Means, KNN and Regression frames. */
  function captureState() {
    return {
      points:      JSON.parse(JSON.stringify(_points)),
      centroids:   JSON.parse(JSON.stringify(_centroids)),
      regrLine:    _regrLine ? Object.assign({}, _regrLine) : null,
      /* KNN display state */
      queryPoint:  _queryPoint ? Object.assign({}, _queryPoint) : null,
      queryClass:  _queryClass,
      neighborIdx: _neighborIdx.slice(),
      voteMap:     _voteMap ? Object.assign({}, _voteMap) : null,
      radarRadius: _radarRadius,
      radarMax:    _radarMax,
      laserLines:  _laserLines,
      /* Regression display state */
      errorLines:  _errorLines,
      mse:         _mse,
      lineColor:   _lineColor
    };
  }
  function applySnapshot(snap) {
    if (!snap) return;
    if (snap.points)    _points    = snap.points;
    if (snap.centroids) _centroids = snap.centroids;
    if (snap.regrLine)  _regrLine  = snap.regrLine;
    if (snap.m !== undefined) _regrLine = { m: snap.m, b: snap.b || 0 };
    /* Restore richer display state when present (from captureState) */
    if (snap.hasOwnProperty('queryPoint'))  _queryPoint  = snap.queryPoint;
    if (snap.hasOwnProperty('queryClass'))  _queryClass  = snap.queryClass;
    if (snap.hasOwnProperty('neighborIdx')) _neighborIdx = snap.neighborIdx ? snap.neighborIdx.slice() : [];
    if (snap.hasOwnProperty('voteMap'))     _voteMap     = snap.voteMap;
    if (snap.hasOwnProperty('radarRadius')) _radarRadius = snap.radarRadius;
    if (snap.hasOwnProperty('radarMax'))    _radarMax    = snap.radarMax;
    if (snap.hasOwnProperty('laserLines'))  _laserLines  = snap.laserLines;
    if (snap.hasOwnProperty('errorLines'))  _errorLines  = snap.errorLines;
    if (snap.hasOwnProperty('mse'))         _mse         = snap.mse;
    if (snap.hasOwnProperty('lineColor'))   _lineColor   = snap.lineColor;
  }

  /* restoreState — alias used by the workspace step-back/forward controls.
     The continuous requestAnimationFrame loop repaints from this state. */
  function restoreState(state) { applySnapshot(state); }

  /* Reset */
  function reset() {
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    _queryPoint  = null;
    _queryClass  = -1;
    _neighborIdx = [];
    _voteMap     = null;
    _centroids   = [];
    _regrLine    = null;
    _regrPoints  = [];
    _regrXMax    = 10;
    _regrYMax    = 22;
    _errorLines  = false;
    _mse         = null;
    _lineColor   = '#B026FF';
    _laserLines  = false;
    _radarRadius = 0;
    _radarMax    = 0;
    _pulse       = 0;
    _resize();
    _generatePoints(_algo);
    _startAnimLoop();
  }

  /* ── exposed object ───────────────────────────────────────── */
  return {
    /* lifecycle */
    mount:              mount,
    redraw:             redraw,
    reset:              reset,
    captureState:       captureState,
    applySnapshot:      applySnapshot,
    restoreState:       restoreState,

    /* data getters */
    getPoints:          getPoints,
    getCentroids:       getCentroids,
    getCanvas:          getCanvas,
    getCtx:             getCtx,
    getColors:          getColors,
    getK:               getK,
    getQueryPoint:      getQueryPoint,

    /* K-Means setters */
    setCentroids:       setCentroids,
    updateCentroids:    updateCentroids,
    updateClusters:     updateClusters,
    setAssignments:     setAssignments,

    /* KNN setters */
    setQueryPoint:      setQueryPoint,
    setQueryClass:      setQueryClass,
    setNeighbors:       setNeighbors,
    setVotes:           setVotes,
    classifyQueryPoint: classifyQueryPoint,
    highlightPoint:     highlightPoint,

    /* Regression setters */
    initRegression:     initRegression,
    setRegressionLine:  setRegressionLine,
    setErrorLines:      setErrorLines,
    setMSE:             setMSE,
    drawRegressionLine: drawRegressionLine,

    /* expose animation state for direct manipulation by algorithms */
    get _laserLines()    { return _laserLines;  },
    set _laserLines(v)   { _laserLines = v;     },
    get _radarRadius()   { return _radarRadius; },
    set _radarRadius(v)  { _radarRadius = v;    },
    get _radarMax()      { return _radarMax;    },
    set _radarMax(v)     { _radarMax = v;       },
    get _lineColor()     { return _lineColor;   },
    set _lineColor(v)    { _lineColor = v;      },
    get _neighborIdx()   { return _neighborIdx; },
    set _neighborIdx(v)  { _neighborIdx = v;    }
  };

})();
