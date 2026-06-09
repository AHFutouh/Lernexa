/* ════════════════════════════════════════════════════════════
   Lernexa — router.js
   Reads the URL ?algo= parameter, validates it against
   algorithms.json, and boots the correct engine.

   Error contract:
   - Unknown ?algo=xxx  → show 404 state + 5s redirect
   - Missing ?algo      → redirect to catalog.html
   ════════════════════════════════════════════════════════════ */

'use strict';

var Router = (function() {

  var REDIRECT_DELAY_MS = 5000; /* 5 seconds */
  var _currentAlgo = null;

  /* ── Boot ────────────────────────────────────────────────── */
  function boot() {
    var algoId = getParam('algo');

    /* No param → go to catalog */
    if (!algoId) {
      window.location.replace('catalog.html');
      return;
    }

    /* Load data, then validate */
    AlgorithmData.load(
      function onLoaded(data) {
        var algo = AlgorithmData.getById(algoId);
        if (!algo) {
          show404(algoId);
        } else {
          _currentAlgo = algo;
          _launch(algo);
        }
      },
      function onError(err) {
        show404(algoId, 'Could not load algorithm database: ' + err);
      }
    );
  }

  /* ── Launch correct engine ───────────────────────────────── */
  function _launch(algo) {
    /* Populate header */
    var nameEl = byId('wsAlgoName');
    var catEl  = byId('wsAlgoCat');
    if (nameEl) nameEl.textContent = algo.name;
    if (catEl) {
      catEl.textContent = algo.categoryLabel;
      catEl.className = 'ws-algo-category algo-category ' + algo.category;
    }

    /* Populate sidebar active state */
    var sideItems = document.querySelectorAll('.sidebar-algo-item');
    for (var i = 0; i < sideItems.length; i++) {
      var match = sideItems[i].getAttribute('href') === 'workspace.html?algo=' + algo.id;
      sideItems[i].classList.toggle('active', match);
    }

    /* Fill complexity dashboard */
    _populateComplexity(algo);

    /* Fill variable watcher */
    _populateVarWatcher(algo);

    /* Dispatch to engine */
    WorkspaceController.init(algo);
  }

  /* ── Dashboard helpers ───────────────────────────────────── */
  function _populateComplexity(algo) {
    setText('cmpxBest',  algo.timeComplexity.best);
    setText('cmpxAvg',   algo.timeComplexity.average);
    setText('cmpxWorst', algo.timeComplexity.worst);
    setText('cmpxSpace', algo.spaceComplexity);

    /* Render tags */
    var tagsEl = byId('algoTags');
    if (tagsEl && algo.tags) {
      tagsEl.innerHTML = '';
      for (var i = 0; i < algo.tags.length; i++) {
        var span = createElement('span', 'algo-tag', algo.tags[i]);
        tagsEl.appendChild(span);
      }
    }
  }

  function _populateVarWatcher(algo) {
    var tbody = byId('varWatcherBody');
    if (!tbody || !algo.variables) return;
    tbody.innerHTML = '';
    for (var i = 0; i < algo.variables.length; i++) {
      var tr = document.createElement('tr');
      tr.setAttribute('id', 'vw-row-' + algo.variables[i]);
      tr.innerHTML =
        '<td>' + algo.variables[i] + '</td>' +
        '<td id="vw-' + algo.variables[i] + '">—</td>';
      tbody.appendChild(tr);
    }
  }

  /* ── 404 State ───────────────────────────────────────────── */
  function show404(algoId, customMsg) {
    /* Hide normal workspace content */
    var wsBody = byId('wsBody');
    if (wsBody) wsBody.style.display = 'none';

    /* Show 404 panel */
    var panel = byId('ws404');
    if (!panel) return;
    panel.classList.add('visible');

    /* Set the bad ID */
    var badId = byId('ws404AlgoId');
    if (badId) badId.textContent = algoId || '???';

    /* Surface the specific error detail when one was supplied
       (e.g. a database load failure) instead of only the generic 404.
       Rendered into its own element so the existing markup is preserved. */
    if (customMsg) {
      var msgEl = byId('ws404Message');
      if (!msgEl) {
        msgEl = createElement('p', 'ws-404-detail');
        msgEl.setAttribute('id', 'ws404Message');
        var anchor = panel.querySelector('.ws-404-msg');
        if (anchor && anchor.parentNode) {
          anchor.parentNode.insertBefore(msgEl, anchor.nextSibling);
        } else {
          panel.appendChild(msgEl);
        }
      }
      msgEl.textContent = customMsg;
    }

    /* Start countdown */
    _startCountdown();
  }

  function _startCountdown() {
    var numEl  = byId('countdownNumber');
    var fillEl = byId('countdownFill');
    var TOTAL  = REDIRECT_DELAY_MS / 1000; /* seconds */
    var remaining = TOTAL;
    var circumference = 163; /* 2π × 26 (radius of SVG circle) */

    /* Immediate first render */
    if (numEl) numEl.textContent = remaining;
    if (fillEl) fillEl.style.strokeDashoffset = '0';

    var timer = setInterval(function() {
      remaining--;

      if (numEl) numEl.textContent = remaining;

      /* Animate ring: from 0 offset (full) to circumference (empty) */
      if (fillEl) {
        var offset = circumference * (1 - remaining / TOTAL);
        fillEl.style.strokeDashoffset = offset;
      }

      if (remaining <= 0) {
        clearInterval(timer);
        window.location.replace('catalog.html');
      }
    }, 1000);
  }

  /* ── Public: current algo accessor ──────────────────────── */
  function getCurrent() { return _currentAlgo; }

  return { boot: boot, getCurrent: getCurrent, show404: show404 };

})();
