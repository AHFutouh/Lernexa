/* ════════════════════════════════════════════════════════════
   Lernexa — Linear Regression (Gradient Descent)  (v3)
   Engine: canvasEngine  — proper 2D Cartesian coordinate plane.
   Works in ORIGINAL data coordinates. Gradient descent animated.
   Error bars visible during descent, removed on convergence.
   Line starts purple (steep random), turns green when converged.
   ════════════════════════════════════════════════════════════ */

'use strict';

async function runLinearRegression(opts) {
  var engine   = opts.engine;
  var control  = opts.control    || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay   || function () { return 80; };
  var onLog    = opts.onLog      || function () {};
  var onCnt    = opts.onCounter  || function () {};
  var onVar    = opts.onVarUpdate || function () {};

  if (!engine) { onLog('compare', 'No engine attached.'); return false; }

  /* Pause / abort guard */
  async function _guard() {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    return !control.isAborted;
  }

  /* ── Default dataset: y ≈ 2x + 0.1 ── */
  var defaultPoints = [
    {x:1,  y:2.1},  {x:2,  y:3.9},  {x:3,  y:6.2},  {x:4,  y:7.8},
    {x:5,  y:10.1}, {x:6,  y:11.9}, {x:7,  y:14.2}, {x:8,  y:15.8},
    {x:9,  y:18.1}, {x:10, y:20.0}
  ];

  /* Use custom points if provided, otherwise default */
  var dataPoints = (opts.customInput && opts.customInput.points) || defaultPoints;

  /* Pass the dataset to the engine — sets up coordinate plane */
  engine.initRegression(dataPoints, { xLabel: 'x', yLabel: 'y' });

  var n  = dataPoints.length;
  var xs = dataPoints.map(function(p){ return p.x; });
  var ys = dataPoints.map(function(p){ return p.y; });

  if (n < 2) {
    onLog('compare', 'Linear Regression: Need at least 2 data points.');
    return false;
  }

  /* ════════════════════════════════════════════════════════════
     STEP 1 — RANDOM LINE START (steep, far from truth)
     Work entirely in data coordinates (no normalization needed
     since the coordinate plane handles the canvas mapping).
  ════════════════════════════════════════════════════════════ */
  var lr       = 0.005;   /* learning rate in data space */
  var maxEpoch = 120;
  var epsilon  = 1e-6;

  /* Random steep start: slope far from truth (≈2), random intercept */
  var m = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 6);   /* ±4..10 */
  var b = (Math.random() - 0.5) * 10;                                   /* ±5 */

  engine.setRegressionLine(m, b);
  engine.setErrorLines(true);
  engine._lineColor = '#B026FF';

  var initMSE = _computeMSE(xs, ys, m, b, n);
  engine.setMSE(initMSE);

  onLog('info',
    'Starting with random steep line — ' +
    'm=<span class="log-val">' + m.toFixed(3) + '</span>, ' +
    'b=<span class="log-val">' + b.toFixed(3) + '</span>, ' +
    'MSE=<span class="log-val">' + initMSE.toFixed(4) + '</span>'
  );
  onVar('learning_rate', lr);
  onVar('iteration',     0);
  onVar('m',             m.toFixed(3));
  onVar('b',             b.toFixed(3));
  onVar('mse',           initMSE.toFixed(4));

  await sleep(getDelay() * 3);
  if (!await _guard()) return false;

  /* ════════════════════════════════════════════════════════════
     STEP 2 — GRADIENT DESCENT in data coordinates
  ════════════════════════════════════════════════════════════ */
  onLog('compare',
    'Starting gradient descent — <span class="log-val">' + n + '</span> points, ' +
    'lr=<span class="log-val">' + lr + '</span>, max ' +
    '<span class="log-val">' + maxEpoch + '</span> iterations.'
  );

  var convergedAt = maxEpoch;

  for (var epoch = 1; epoch <= maxEpoch; epoch++) {
    if (!await _guard()) return false;

    /* Compute gradients in data space */
    var dM = 0, dB = 0, mse = 0;
    for (var i = 0; i < n; i++) {
      var pred = m * xs[i] + b;
      var err  = pred - ys[i];
      dM  += err * xs[i];
      dB  += err;
      mse += err * err;
      onCnt('gradient_steps');
    }
    dM  /= n;
    dB  /= n;
    mse /= n;

    /* Update parameters */
    var newM  = m - lr * dM;
    var newB  = b - lr * dB;
    var delta = Math.abs(newM - m) + Math.abs(newB - b);
    m = newM;
    b = newB;

    onCnt('epochs');

    /* Update engine every 2 iterations for smooth animation */
    if (epoch % 2 === 0 || epoch === 1) {
      engine.setRegressionLine(m, b);
      engine.setMSE(mse);
      onVar('iteration', epoch);
      onVar('m',   m.toFixed(3));
      onVar('b',   b.toFixed(3));
      onVar('mse', mse.toFixed(4));
      await sleep(getDelay() * 0.4);
    }

    /* Log every 10 iterations */
    if (epoch % 10 === 0 || epoch === 1) {
      onLog('info',
        'Iteration <span class="log-val">' + epoch + '</span> — ' +
        'MSE: <span class="log-val">' + mse.toFixed(4) + '</span>, ' +
        'm: <span class="log-val">' + m.toFixed(3) + '</span>, ' +
        'b: <span class="log-val">' + b.toFixed(3) + '</span>'
      );
    }

    if (delta < epsilon) {
      convergedAt = epoch;
      onLog('found',
        '<strong>Converged</strong> at iteration ' +
        '<span class="log-val">' + epoch + '</span>! ' +
        'Δ=<span class="log-val">' + delta.toExponential(2) + '</span>'
      );
      break;
    }
  }

  /* ════════════════════════════════════════════════════════════
     STEP 3 — FINAL STATE: green line, no error bars
  ════════════════════════════════════════════════════════════ */
  var finalMSE = _computeMSE(xs, ys, m, b, n);

  engine._lineColor = '#39D353';
  engine.setRegressionLine(m, b);
  engine.setErrorLines(false);
  engine.setMSE(finalMSE);

  onVar('iteration', convergedAt);
  onVar('m',         m.toFixed(3));
  onVar('b',         b.toFixed(3));
  onVar('mse',       finalMSE.toFixed(4));

  /* R² score */
  var yMean = ys.reduce(function(a, v){ return a + v; }, 0) / n;
  var ssTot = ys.reduce(function(a, v){ return a + Math.pow(v - yMean, 2); }, 0);
  var ssRes = 0;
  for (var j = 0; j < n; j++) {
    ssRes += Math.pow(ys[j] - (m * xs[j] + b), 2);
  }
  var r2 = ssTot > 0 ? (1 - ssRes / ssTot) : 0;

  onVar('r2',      r2.toFixed(4));
  onVar('final_m', m.toFixed(3));
  onVar('final_b', b.toFixed(3));

  onLog('done',
    '<i class="fa-solid fa-check"></i> Convergence! ' +
    'Final line: y = <span class="log-val">' + m.toFixed(3) + '</span>x ' +
    '+ <span class="log-val">' + b.toFixed(3) + '</span>. ' +
    'MSE=<span class="log-val">' + finalMSE.toFixed(4) + '</span>, ' +
    'R²=<span class="log-val">' + r2.toFixed(4) + '</span>'
  );

  await sleep(getDelay());
  return true;
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */

function _computeMSE(xs, ys, m, b, n) {
  var mse = 0;
  for (var i = 0; i < n; i++) {
    var err = (m * xs[i] + b) - ys[i];
    mse += err * err;
  }
  return mse / n;
}
