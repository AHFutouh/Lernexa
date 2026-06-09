/* ════════════════════════════════════════════════════════════
   Lernexa — K-Means Clustering  (v2)
   Engine: canvasEngine  (scatter plot + centroid orbs)
   Animated centroid drops, laser assignment lines,
   smooth centroid movement interpolation.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runKMeans(opts) {
  var engine   = opts.engine;
  var control  = opts.control    || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay   || function () { return 400; };
  var onLog    = opts.onLog      || function () {};
  var onCnt    = opts.onCounter  || function () {};
  var onVar    = opts.onVarUpdate || function () {};

  var k       = (opts.k !== undefined ? opts.k : null)
             || (opts.algo && opts.algo.input && opts.algo.input.defaultK) || 3;
  var maxIter = 20;

  if (!engine) { onLog('compare', 'No engine attached.'); return false; }

  /* Pause / abort guard helper */
  async function _guard() {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    return !control.isAborted;
  }

  /* ── Fetch points ── */
  var points = engine.getPoints ? engine.getPoints() : [];
  if (points.length === 0) {
    onLog('compare', 'No data points — canvas still initialising.');
    return false;
  }

  var w = engine.getCanvas ? engine.getCanvas().width  : 600;
  var h = engine.getCanvas ? engine.getCanvas().height : 400;

  onLog('info',
    'K-Means started — <span class="log-val">K=' + k + '</span>, ' +
    '<span class="log-val">' + points.length + '</span> points, max ' +
    '<span class="log-val">' + maxIter + '</span> iterations.'
  );
  onVar('k',         k);
  onVar('points',    points.length);
  onVar('iteration', 0);
  onVar('status',    'initialising');

  /* ════════════════════════════════════════════════════════════
     STEP 1 — DROP CENTROIDS into canvas space (not from points)
  ════════════════════════════════════════════════════════════ */
  var centroids = _kmRandomCentroids(k, w, h);
  engine.setCentroids(centroids);
  engine._laserLines = false;

  onLog('compare',
    'Dropping <span class="log-val">' + k + '</span> centroids into the data space.'
  );
  onVar('status', 'centroids placed');
  await sleep(getDelay() * 2);
  if (!await _guard()) return false;

  /* ════════════════════════════════════════════════════════════
     MAIN LOOP
  ════════════════════════════════════════════════════════════ */
  var assignments = new Array(points.length).fill(0);
  var converged   = false;
  var iter        = 0;

  while (!converged && iter < maxIter) {
    if (!await _guard()) return false;
    iter++;
    onVar('iteration', iter);

    /* ── STEP 2 — Assign ── */
    var changed  = 0;
    for (var i = 0; i < points.length; i++) {
      var nearest = _kmNearest(points[i], centroids);
      onCnt('comparisons');
      if (nearest !== assignments[i]) {
        assignments[i] = nearest;
        changed++;
        onCnt('reassignments');
      }
    }

    engine.setAssignments(assignments);
    engine._laserLines = true;

    onLog('info',
      'Iteration <span class="log-val">' + iter + '</span> — assigning ' +
      '<span class="log-val">' + points.length + '</span> points to nearest centroid. ' +
      'Changed: <span class="log-val">' + changed + '</span>'
    );
    onVar('changed', changed);
    onVar('status',  'assigning');
    await sleep(getDelay());
    if (!await _guard()) return false;

    /* ── STEP 3 — Move centroids (animated) ── */
    var newCentroids = _kmRecompute(points, assignments, k, centroids);
    var maxMove      = 0;
    for (var c = 0; c < k; c++) {
      var move = _kmDist(centroids[c], newCentroids[c]);
      if (move > maxMove) maxMove = move;
    }

    onLog('compare',
      'Centroids moving to cluster centers — max shift: ' +
      '<span class="log-val">' + maxMove.toFixed(2) + '</span>'
    );
    onVar('max_move', maxMove.toFixed(3));
    onVar('status',   'moving centroids');

    /* Animate centroid movement over 8 frames */
    engine._laserLines = false;
    var frames = 8;
    for (var f = 1; f <= frames; f++) {
      if (!await _guard()) return false;
      var t = f / frames;
      var interp = centroids.map(function (old, ci) {
        return {
          x: old.x + (newCentroids[ci].x - old.x) * t,
          y: old.y + (newCentroids[ci].y - old.y) * t
        };
      });
      engine.setCentroids(interp);
      await sleep(30);
    }
    centroids = newCentroids;
    engine.setCentroids(centroids);

    onCnt('iterations');

    if (changed === 0 || maxMove < 0.5) {
      converged = true;
      onLog('found',
        '<strong>Converged!</strong> at iteration <span class="log-val">' + iter +
        '</span>. Centroid shift: <span class="log-val">' + maxMove.toFixed(3) + '</span>'
      );
      onVar('status', 'converged');
    } else {
      await sleep(getDelay());
    }
  }

  /* ── Final: laser lines on to show final assignment ── */
  engine.setAssignments(assignments);
  engine._laserLines = true;

  /* WCSS / Inertia */
  var wcss = 0;
  for (var p = 0; p < points.length; p++) {
    var d = _kmDist(points[p], centroids[assignments[p]]);
    wcss += d * d;
  }

  onVar('wcss',      wcss.toFixed(1));
  onVar('clusters',  k);
  onVar('status',    'complete');

  onLog('done',
    '<i class="fa-solid fa-check"></i> K-Means complete in ' +
    '<span class="log-val">' + iter + '</span> iteration(s). ' +
    'WCSS: <span class="log-val">' + wcss.toFixed(1) + '</span>'
  );
  return true;
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */

/** Pick k random positions in canvas space (not from existing points). */
function _kmRandomCentroids(k, w, h) {
  var result = [];
  var margin = 60;
  for (var i = 0; i < k; i++) {
    result.push({
      x: margin + Math.random() * (w - margin * 2),
      y: margin + Math.random() * (h - margin * 2)
    });
  }
  return result;
}

function _kmNearest(point, centroids) {
  var best  = 0;
  var bestD = Infinity;
  for (var c = 0; c < centroids.length; c++) {
    var d = _kmDist(point, centroids[c]);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function _kmRecompute(points, assignments, k, prevCentroids) {
  var sums   = [];
  var counts = new Array(k).fill(0);
  for (var c = 0; c < k; c++) sums.push({ x: 0, y: 0 });
  for (var i = 0; i < points.length; i++) {
    var cl = assignments[i];
    sums[cl].x += points[i].x;
    sums[cl].y += points[i].y;
    counts[cl]++;
  }
  return sums.map(function (s, c) {
    if (counts[c] > 0) {
      return { x: s.x / counts[c], y: s.y / counts[c] };
    }
    /* Empty cluster: keep the previous centroid in place instead of
       returning the zero-sum {0,0}, which teleported it to the corner. */
    return (prevCentroids && prevCentroids[c])
      ? { x: prevCentroids[c].x, y: prevCentroids[c].y }
      : { x: s.x, y: s.y };
  });
}

function _kmDist(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
