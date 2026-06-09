/* ════════════════════════════════════════════════════════════
   Lernexa — K-Nearest Neighbours (KNN) Classifier  (v2)
   Engine: canvasEngine  (scatter plot + query point + radar)
   Animated radar expansion, step-by-step neighbor capture,
   vote tooltip, and final classification reveal.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runKNN(opts) {
  var engine   = opts.engine;
  var control  = opts.control    || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay   || function () { return 300; };
  var onLog    = opts.onLog      || function () {};
  var onCnt    = opts.onCounter  || function () {};
  var onVar    = opts.onVarUpdate || function () {};

  var k = (opts.k !== undefined ? opts.k : null)
       || (opts.algo && opts.algo.input && opts.algo.input.defaultK) || 3;

  if (!engine) { onLog('compare', 'No engine attached.'); return false; }

  /* Pause / abort guard */
  async function _guard() {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    return !control.isAborted;
  }

  var points = engine.getPoints ? engine.getPoints() : [];
  if (points.length < k) {
    onLog('compare',
      'KNN: Need at least <span class="log-val">' + k + '</span> data points. ' +
      'Currently have <span class="log-val">' + points.length + '</span>.'
    );
    return false;
  }

  var canvas = engine.getCanvas ? engine.getCanvas() : null;
  var w = canvas ? canvas.width  : 600;
  var h = canvas ? canvas.height : 400;

  /* ════════════════════════════════════════════════════════════
     STEP 1 — PLACE QUERY POINT
  ════════════════════════════════════════════════════════════ */
  var margin = 60;
  var qx = margin + Math.random() * (w - margin * 2);
  var qy = margin + Math.random() * (h - margin * 2);

  engine.setQueryPoint(qx, qy);
  engine._radarRadius = 0;
  engine._neighborIdx = [];

  onLog('info',
    'Unknown point placed at (' + qx.toFixed(0) + ', ' + qy.toFixed(0) + ') — ' +
    'scanning for <span class="log-val">k=' + k + '</span> nearest neighbours.'
  );
  onVar('k',        k);
  onVar('query_x',  qx.toFixed(1));
  onVar('query_y',  qy.toFixed(1));
  onVar('status',   'scanning');

  await sleep(getDelay());
  if (!await _guard()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 2 — COMPUTE DISTANCES
  ════════════════════════════════════════════════════════════ */
  onLog('compare',
    'Computing distance from query to all ' +
    '<span class="log-val">' + points.length + '</span> points…'
  );

  var distances = [];
  for (var i = 0; i < points.length; i++) {
    if (!await _guard()) return false;
    var d = _knnDist({ x: qx, y: qy }, points[i]);
    distances.push({ index: i, point: points[i], dist: d });
    onCnt('distance_calculations');
  }

  /* Sort by distance */
  distances.sort(function (a, b) { return a.dist - b.dist; });
  onCnt('sorts');

  /* k-th neighbor distance = radar target radius */
  var kthDist = distances[k - 1].dist;
  engine._radarMax    = kthDist;
  engine._radarRadius = 0;

  onLog('compare',
    'Sorted distances. k-th neighbor distance: ' +
    '<span class="log-val">' + kthDist.toFixed(1) + '</span>px. ' +
    'Expanding radar…'
  );
  await sleep(getDelay() * 0.5);
  if (!await _guard()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 3 — RADAR EXPANSION + NEIGHBOR CAPTURE
  ════════════════════════════════════════════════════════════ */
  var lockedIn    = [];
  var captureIdx  = 0;   /* which neighbor we're watching for next */
  var radarFrames = 24;
  var CLUSTER_COLORS = engine.getColors ? engine.getColors() : [
    '#00F0FF', '#B026FF', '#F0883E', '#39D353',
    '#FF6E6E', '#F0D060', '#79C0FF', '#D2A8FF'
  ];

  for (var f = 0; f <= radarFrames; f++) {
    if (!await _guard()) return false;
    var t = f / radarFrames;
    engine._radarRadius = t * kthDist;

    /* Capture any neighbors swept by the current radius */
    while (captureIdx < k && distances[captureIdx].dist <= engine._radarRadius) {
      var nb  = distances[captureIdx];
      var cls = nb.point.cluster !== undefined ? nb.point.cluster : 0;
      lockedIn.push(nb.index);
      engine._neighborIdx = lockedIn.slice();

      onCnt('k_neighbors');
      onLog('info',
        'Captured neighbour <span class="log-val">' + (captureIdx + 1) + '</span>: ' +
        'class=<span class="log-val">' + cls + '</span>, ' +
        'dist=<span class="log-val">' + nb.dist.toFixed(1) + '</span>'
      );
      onVar('neighbors_found', lockedIn.length);
      captureIdx++;
    }

    await sleep(getDelay() * 0.04);
  }

  /* Ensure all k neighbors are captured (handles floating-point edge cases) */
  while (captureIdx < k) {
    var nb  = distances[captureIdx];
    var cls = nb.point.cluster !== undefined ? nb.point.cluster : 0;
    lockedIn.push(nb.index);
    captureIdx++;
  }
  engine._neighborIdx = lockedIn.slice();
  engine._radarRadius = kthDist;

  /* ════════════════════════════════════════════════════════════
     STEP 4 — LOCK-ON: show all neighbor lines
  ════════════════════════════════════════════════════════════ */
  engine.setNeighbors(lockedIn);
  onLog('compare',
    'Lock-on complete — <span class="log-val">' + k + '</span> neighbours identified.'
  );

  /* Log each neighbor and surface the k nearest distances in the watcher.
     (Per-neighbor dynamic keys can't be declared in algorithms.json, so we
     publish a single 'distances' summary row instead.) */
  var distSummary = [];
  for (var n = 0; n < k; n++) {
    var nb  = distances[n];
    var cls = nb.point.cluster !== undefined ? nb.point.cluster : 0;
    distSummary.push(nb.dist.toFixed(1) + '(c' + cls + ')');
  }
  onVar('distances',   distSummary.join(', '));
  onVar('query_point', '(' + qx.toFixed(0) + ', ' + qy.toFixed(0) + ')');

  await sleep(getDelay());
  if (!await _guard()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 5 — VOTE COUNTING
  ════════════════════════════════════════════════════════════ */
  var votes = {};
  for (var v = 0; v < k; v++) {
    var cls = distances[v].point.cluster !== undefined ? distances[v].point.cluster : 0;
    votes[cls] = (votes[cls] || 0) + 1;
  }

  /* Build vote log string */
  var voteStr = Object.keys(votes).map(function (c) {
    return 'class' + c + '=' + votes[c];
  }).join(', ');
  onLog('compare', 'Vote count: <span class="log-val">' + voteStr + '</span>');
  onVar('votes', voteStr);

  /* Show vote tooltip in engine */
  if (engine.setVotes) engine.setVotes(votes);

  await sleep(getDelay() * 2);
  if (!await _guard()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 6 — CLASSIFY (majority vote)
  ════════════════════════════════════════════════════════════ */
  var winner     = 0;
  var bestVotes  = 0;
  var voteKeys   = Object.keys(votes);
  for (var vi = 0; vi < voteKeys.length; vi++) {
    if (votes[voteKeys[vi]] > bestVotes) {
      bestVotes = votes[voteKeys[vi]];
      winner    = parseInt(voteKeys[vi]);
    }
  }

  engine.setQueryClass(winner);

  onVar('winner_class', winner);
  onVar('status',       'classified');

  onLog('found',
    '<strong>CLASSIFIED as class <span class="log-val">' + winner + '</span></strong>' +
    ' — won with <span class="log-val">' + bestVotes + '/' + k + '</span> votes.'
  );

  await sleep(getDelay());
  if (!await _guard()) return false;

  onLog('done',
    '<i class="fa-solid fa-check"></i> KNN classification complete.'
  );
  return true;
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */

function _knnDist(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
