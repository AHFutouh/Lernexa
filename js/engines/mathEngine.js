/* ════════════════════════════════════════════════════════════
   Lernexa — mathEngine.js  (Premium Visual Edition)
   Rich visual engine for Math algorithms (DOM/CSS — no Canvas).

   Rendering modes (detected from algo.id):
     • euclidean-algorithm    → _setupEuclidean()
     • sieve-of-eratosthenes  → _setupSieve()
     • rsa-encryption         → _setupRSA()
     • anything else          → _showReadyCard()
   ════════════════════════════════════════════════════════════ */

'use strict';

var MathEngine = (function () {

  /* ── Private state ────────────────────────────────────────── */
  var _area        = null;
  var _algo        = null;
  var _panel       = null;
  var _renderMode  = null;   /* 'euclidean' | 'sieve' | 'rsa' | null */

  /* Sieve state */
  var _sieveCells  = {};     /* { number: DOMElement } */
  var _sieveMarked = {};     /* { number: true } — composite */
  var _sieveN      = 0;

  /* Euclidean state */
  var _euclBarA  = null;
  var _euclBarB  = null;
  var _euclLblA  = null;
  var _euclLblB  = null;
  var _euclMax   = 1;

  /* RSA state */
  var _rsaPanels = {};       /* { forge, alice, bob } */

  /* ── Design-token mirrors ─────────────────────────────────── */
  var C = {
    blue:   '#00F0FF',
    purple: '#B026FF',
    green:  '#39D353',
    orange: '#F0883E',
    red:    '#FF6E6E',
    yellow: '#F0D060',
    sky:    '#79C0FF',
    lavender: '#D2A8FF',
    glass:  'rgba(22,27,34,0.82)',
    border: 'rgba(230,237,243,0.09)'
  };

  /* ── Inject sieve CSS once ────────────────────────────────── */
  (function _injectSieveCSS() {
    if (document.getElementById('me-sieve-style')) return;
    var s = document.createElement('style');
    s.id  = 'me-sieve-style';
    s.textContent = [
      '.sieve-grid{',
        'display:grid;',
        'grid-template-columns:repeat(10,1fr);',
        'gap:4px;padding:16px;',
        'width:100%;max-width:560px;margin:0 auto;',
      '}',
      '.sieve-cell{',
        'aspect-ratio:1;',
        'display:flex;align-items:center;justify-content:center;',
        'border-radius:6px;',
        'border:1px solid rgba(230,237,243,0.08);',
        'background:rgba(28,35,48,0.8);',
        'font-family:"Fira Code",monospace;',
        'font-size:0.75rem;font-weight:600;',
        'color:#8B949E;',
        'transition:all 0.25s ease;',
        'position:relative;overflow:hidden;cursor:default;',
      '}',
      '.sieve-cell.prime{',
        'border-color:var(--prime-color,#00F0FF);',
        'color:var(--prime-color,#00F0FF);',
        'background:color-mix(in srgb,var(--prime-color,#00F0FF) 10%,transparent);',
        'box-shadow:0 0 8px color-mix(in srgb,var(--prime-color,#00F0FF) 40%,transparent);',
        'font-size:0.8rem;',
      '}',
      '.sieve-cell.composite{',
        'opacity:0.18;color:#484F58;border-color:transparent;',
      '}',
      '.sieve-cell.composite::after{',
        'content:"✕";position:absolute;',
        'font-size:0.6rem;color:#484F58;',
        'top:2px;right:3px;',
      '}',
      /* Multiple being struck out right now — flashes in the prime's colour
         before settling to composite (B-G3, makes the sweep visible). */
      '.sieve-cell.sweeping{',
        'background:color-mix(in srgb,var(--sweep-color,#F0883E) 35%,transparent);',
        'border-color:var(--sweep-color,#F0883E);color:var(--sweep-color,#F0883E);',
        'box-shadow:0 0 10px color-mix(in srgb,var(--sweep-color,#F0883E) 55%,transparent);',
        'transform:scale(1.08);z-index:2;',
      '}',
      /* The prime doing the sweeping pulses while its multiples fall. */
      '.sieve-cell.sweep-source{animation:me-pulse 0.7s ease infinite;}',
      '@keyframes me-fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes me-pulse{0%,100%{opacity:1}50%{opacity:0.55}}',
      '@keyframes me-packetFly{to{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0.7)}}'
    ].join('');
    document.head.appendChild(s);
  }());

  /* ════════════════════════════════════════════════════════════
     MOUNT
  ════════════════════════════════════════════════════════════ */
  function mount(area, algo) {
    _algo        = algo;
    _area        = area;
    _renderMode  = null;
    _sieveCells  = {};
    _sieveMarked = {};
    _sieveN      = 0;
    _euclBarA = _euclBarB = _euclLblA = _euclLblB = null;
    _euclMax  = 1;
    _rsaPanels   = {};

    area.innerHTML = '';

    var panel = createElement('div', '');
    panel.id = 'mathPanel';
    panel.style.cssText =
      'width:100%;height:100%;overflow-y:auto;padding:var(--space-8,24px);' +
      'display:flex;flex-direction:column;align-items:center;gap:var(--space-6,16px);';
    area.appendChild(panel);
    _panel = panel;

    if (algo.id === 'euclidean-algorithm') {
      _renderMode = 'euclidean';
      _setupEuclidean();
    } else if (algo.id === 'sieve-of-eratosthenes') {
      _renderMode = 'sieve';
      _setupSieve();
    } else if (algo.id === 'rsa-encryption') {
      _renderMode = 'rsa';
      _setupRSA();
    } else {
      _showReadyCard(algo);
    }
  }

  /* ── Fallback card ────────────────────────────────────────── */
  function _showReadyCard(algo) {
    if (!_panel) return;
    _panel.innerHTML =
      '<div style="text-align:center;max-width:480px;">' +
      '<i class="fa-solid ' + (algo.icon || 'fa-code') + '"' +
      '   style="font-size:3rem;color:' + C.blue + ';margin-bottom:20px;display:block;"></i>' +
      '<h2 style="font-size:1.4rem;margin-bottom:12px;color:#E6EDF3;">' + algo.name + '</h2>' +
      '<p style="color:#8B949E;line-height:1.7;">' + algo.description + '</p>' +
      '<p style="margin-top:24px;font-family:\'Fira Code\',monospace;font-size:0.8rem;color:' + C.blue + ';">' +
      'Press <strong>Play</strong> to start the visualization.</p>' +
      '</div>';
  }

  /* ════════════════════════════════════════════════════════════
     MODE 1 — EUCLIDEAN GCD  (animated rectangle bars)
  ════════════════════════════════════════════════════════════ */

  function _setupEuclidean() {
    if (!_panel) return;
    _panel.innerHTML = '';
    _panel.style.justifyContent = 'flex-start';

    /* ── Formula bar ──── */
    var formulaBar = createElement('div', '');
    formulaBar.style.cssText =
      'width:100%;max-width:640px;background:' + C.glass + ';' +
      'border:1px solid ' + C.border + ';border-radius:12px;padding:12px 20px;' +
      'display:flex;align-items:center;gap:12px;backdrop-filter:blur(16px);' +
      'border-left:3px solid ' + C.blue + ';';
    formulaBar.innerHTML =
      '<i class="fa-solid fa-divide" style="color:' + C.blue + ';font-size:1.1rem;"></i>' +
      '<span style="font-family:\'Fira Code\',monospace;font-size:0.85rem;' +
      'color:#E6EDF3;font-weight:600;letter-spacing:0.04em;">' +
      'GCD(A, B) = GCD(B, A mod B)' +
      '</span>' +
      '<span id="euclFormulaStep" style="margin-left:auto;font-family:\'Fira Code\',monospace;' +
      'font-size:0.8rem;color:' + C.yellow + ';font-weight:700;min-width:120px;text-align:right;"></span>';
    _panel.appendChild(formulaBar);

    /* ── Bar container ──── */
    var barWrap = createElement('div', '');
    barWrap.id = 'euclBarWrap';
    barWrap.style.cssText =
      'width:100%;max-width:640px;display:flex;flex-direction:column;gap:20px;' +
      'background:' + C.glass + ';border:1px solid ' + C.border + ';' +
      'border-radius:16px;padding:24px;backdrop-filter:blur(16px);';

    /* Row A */
    var rowA = _makeBarRow('A', C.blue, '00F0FF');
    _euclLblA  = rowA.lbl;
    _euclBarA  = rowA.bar;
    barWrap.appendChild(rowA.root);

    /* Row B */
    var rowB = _makeBarRow('B', C.purple, 'B026FF');
    _euclLblB  = rowB.lbl;
    _euclBarB  = rowB.bar;
    barWrap.appendChild(rowB.root);

    /* Remainder row */
    var remRow = createElement('div', '');
    remRow.style.cssText =
      'display:flex;align-items:center;gap:12px;font-family:\'Fira Code\',monospace;' +
      'font-size:0.8rem;color:#8B949E;min-height:26px;padding-top:6px;' +
      'border-top:1px solid ' + C.border + ';';
    remRow.innerHTML =
      '<span style="color:#484F58;text-transform:uppercase;letter-spacing:0.08em;font-size:0.7rem;">A mod B =</span>' +
      '<span id="euclRemVal" style="color:' + C.orange + ';font-weight:800;font-size:1rem;">—</span>' +
      '<span id="euclStepsLbl" style="margin-left:auto;color:#484F58;font-size:0.7rem;letter-spacing:0.06em;">STEP 0</span>';
    barWrap.appendChild(remRow);

    /* Operation label */
    var opLbl = createElement('div', '');
    opLbl.id  = 'euclOpLbl';
    opLbl.style.cssText =
      'font-family:\'Fira Code\',monospace;font-size:0.75rem;color:#484F58;' +
      'min-height:18px;transition:color 0.3s;';
    barWrap.appendChild(opLbl);

    _panel.appendChild(barWrap);

    /* ── Step log table ──── */
    var tableWrap = createElement('div', '');
    tableWrap.style.cssText = 'width:100%;max-width:640px;overflow-x:auto;';
    tableWrap.innerHTML =
      '<div style="font-family:\'Fira Code\',monospace;font-size:0.7rem;color:#484F58;' +
      'margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase;">Step Log</div>' +
      '<table style="width:100%;border-collapse:collapse;font-family:\'Fira Code\',monospace;font-size:0.75rem;">' +
      '<thead><tr>' +
      '<th style="padding:6px 10px;border-bottom:1px solid ' + C.border + ';color:#484F58;text-align:left;">#</th>' +
      '<th style="padding:6px 10px;border-bottom:1px solid ' + C.border + ';color:' + C.blue + ';text-align:left;">A</th>' +
      '<th style="padding:6px 10px;border-bottom:1px solid ' + C.border + ';color:' + C.purple + ';text-align:left;">B</th>' +
      '<th style="padding:6px 10px;border-bottom:1px solid ' + C.border + ';color:#8B949E;text-align:left;">A mod B</th>' +
      '</tr></thead>' +
      '<tbody id="euclStepLog"></tbody>' +
      '</table>';
    _panel.appendChild(tableWrap);
  }

  function _makeBarRow(label, color, hexRaw) {
    var root = createElement('div', '');
    root.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    var lbl = createElement('div', '');
    lbl.style.cssText =
      'font-family:\'Fira Code\',monospace;font-size:0.72rem;color:' + color + ';' +
      'letter-spacing:0.1em;font-weight:700;text-transform:uppercase;';
    lbl.textContent = label + ' = —';

    var track = createElement('div', '');
    track.style.cssText =
      'width:100%;height:44px;background:rgba(' + _hexToRgb(hexRaw) + ',0.05);' +
      'border-radius:10px;position:relative;overflow:hidden;' +
      'border:1px solid rgba(' + _hexToRgb(hexRaw) + ',0.18);';

    var bar = createElement('div', '');
    bar.style.cssText =
      'height:100%;width:0%;' +
      'background:linear-gradient(90deg,rgba(' + _hexToRgb(hexRaw) + ',0.25),rgba(' + _hexToRgb(hexRaw) + ',0.7));' +
      'border-radius:10px;' +
      'transition:width 0.4s cubic-bezier(0.34,1.56,0.64,1);' +
      'box-shadow:0 0 14px rgba(' + _hexToRgb(hexRaw) + ',0.4);' +
      'position:relative;';

    /* Shimmer overlay */
    var shimmer = createElement('div', '');
    shimmer.style.cssText =
      'position:absolute;top:0;left:-60%;width:40%;height:100%;' +
      'background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);' +
      'animation:me-shimmer 2.4s ease infinite;pointer-events:none;';
    bar.appendChild(shimmer);

    track.appendChild(bar);
    root.appendChild(lbl);
    root.appendChild(track);
    return { root: root, lbl: lbl, bar: bar };
  }

  function _hexToRgb(hex) {
    /* hex without '#', returns 'r,g,b' */
    var r = parseInt(hex.slice(0,2), 16);
    var g = parseInt(hex.slice(2,4), 16);
    var b = parseInt(hex.slice(4,6), 16);
    return r + ',' + g + ',' + b;
  }

  /* ── initEuclidean ─────────────────────────────────────────── */
  function initEuclidean(a, b) {
    _euclMax = Math.max(a, b, 1);
    _setBarWidth(_euclBarA, a);
    _setBarWidth(_euclBarB, b);
    if (_euclLblA) _euclLblA.textContent = 'A = ' + a;
    if (_euclLblB) _euclLblB.textContent = 'B = ' + b;

    var remEl = byId('euclRemVal');
    if (remEl) remEl.textContent = '—';
    var logEl = byId('euclStepLog');
    if (logEl) logEl.innerHTML = '';
    var stepsLbl = byId('euclStepsLbl');
    if (stepsLbl) stepsLbl.textContent = 'STEP 0';
    var formulaEl = byId('euclFormulaStep');
    if (formulaEl) formulaEl.textContent = 'GCD(' + a + ', ' + b + ')';
  }

  /* ── stepEuclidean ─────────────────────────────────────────── */
  function stepEuclidean(newA, newB, remainder, step) {
    _euclMax = Math.max(newA, newB, remainder, 1);
    _setBarWidth(_euclBarA, newA);
    _setBarWidth(_euclBarB, newB);

    if (_euclLblA) _euclLblA.textContent = 'A = ' + newA;
    if (_euclLblB) _euclLblB.textContent = 'B = ' + newB;

    var remEl = byId('euclRemVal');
    if (remEl) {
      remEl.textContent = remainder;
      remEl.style.animation = 'none';
      /* Force reflow then re-enable */
      void remEl.offsetWidth;
      remEl.style.animation = 'me-pulse 0.6s ease';
    }

    var stepsLbl = byId('euclStepsLbl');
    if (stepsLbl) stepsLbl.textContent = 'STEP ' + (typeof step === 'number' ? step : '—');

    var formulaEl = byId('euclFormulaStep');
    if (formulaEl) formulaEl.textContent = 'GCD(' + newA + ', ' + newB + ')';

    var opLbl = byId('euclOpLbl');
    if (opLbl) {
      opLbl.style.color = C.orange;
      opLbl.textContent = newA + ' = ' + newB + ' × ' + Math.floor(newA / (newB || 1)) + ' + ' + remainder;
    }

    /* Flash bar A with orange glow on modulo step */
    if (_euclBarA) {
      _euclBarA.style.boxShadow = '0 0 28px rgba(240,136,62,0.6)';
      var baRef = _euclBarA;
      setTimeout(function () {
        baRef.style.boxShadow = '0 0 14px rgba(0,240,255,0.4)';
      }, 460);
    }

    /* Append step row */
    var tbody = byId('euclStepLog');
    if (tbody) {
      var count = tbody.querySelectorAll('tr').length + 1;
      var tr = document.createElement('tr');
      var isDone = (remainder === 0);
      tr.style.cssText =
        'animation:me-fadeIn 0.3s ease;' +
        'background:' + (isDone ? 'rgba(57,211,83,0.06)' : 'transparent') + ';';
      var remColor = isDone ? C.green : '#E6EDF3';
      tr.innerHTML =
        '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:#484F58;">' + count + '</td>' +
        '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:' + C.blue + ';font-weight:700;">' + newA + '</td>' +
        '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:' + C.purple + ';font-weight:700;">' + newB + '</td>' +
        '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:' + remColor + ';font-weight:800;">' + remainder + '</td>';
      tbody.appendChild(tr);
      /* Scroll table into view */
      var scrollEl = tbody.closest('[style*="overflow-x"]');
      if (scrollEl) scrollEl.scrollTop = 9999;
    }
  }

  /* ── highlightGCD ──────────────────────────────────────────── */
  function highlightGCD(val) {
    if (_euclBarA) {
      _euclBarA.style.background = 'linear-gradient(90deg,rgba(240,208,96,0.4),rgba(240,208,96,0.85))';
      _euclBarA.style.boxShadow  = '0 0 36px rgba(240,208,96,0.7)';
    }
    if (_euclLblA) {
      _euclLblA.style.color    = C.yellow;
      _euclLblA.textContent    = 'GCD = ' + val + ' ✓';
    }
    if (_euclBarB) {
      _euclBarB.style.opacity  = '0.25';
    }
    if (_euclLblB) {
      _euclLblB.style.opacity  = '0.4';
    }

    var opLbl = byId('euclOpLbl');
    if (opLbl) {
      opLbl.style.color   = C.green;
      opLbl.textContent   = 'B = 0 → GCD found: ' + val;
    }
    var formulaEl = byId('euclFormulaStep');
    if (formulaEl) {
      formulaEl.style.color = C.yellow;
      formulaEl.textContent = 'GCD = ' + val;
    }
    var remEl = byId('euclRemVal');
    if (remEl) {
      remEl.style.color   = C.green;
      remEl.textContent   = '0';
    }
  }

  function _setBarWidth(bar, val) {
    if (!bar) return;
    var pct = _euclMax > 0 ? Math.max(0, Math.min(100, (val / _euclMax) * 100)) : 0;
    bar.style.width = pct + '%';
  }

  /* ════════════════════════════════════════════════════════════
     MODE 2 — SIEVE OF ERATOSTHENES  (CSS-grid number cells)
  ════════════════════════════════════════════════════════════ */

  function _setupSieve() {
    if (!_panel) return;
    _panel.innerHTML = '';
    _panel.style.justifyContent = 'flex-start';

    /* Title */
    var title = createElement('div', '');
    title.style.cssText =
      'font-size:1.15rem;font-weight:700;color:#E6EDF3;' +
      'font-family:\'Fira Code\',monospace;margin-bottom:4px;align-self:flex-start;';
    title.innerHTML =
      '<i class="fa-solid fa-filter" style="color:' + C.blue + ';margin-right:8px;"></i>' +
      'Sieve of Eratosthenes';
    _panel.appendChild(title);

    var sub = createElement('p', '');
    sub.style.cssText =
      'color:#8B949E;font-size:0.82rem;margin-bottom:16px;align-self:flex-start;';
    sub.textContent =
      'Neon cells are prime. Dimmed cells with ✕ are composite (struck by a prime factor).';
    _panel.appendChild(sub);

    /* Legend */
    var legend = createElement('div', '');
    legend.id = 'sieveLegend';
    legend.style.cssText =
      'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;align-self:flex-start;max-width:560px;';
    _panel.appendChild(legend);

    /* Grid host */
    var gridHost = createElement('div', '');
    gridHost.id   = 'sieveGridHost';
    gridHost.style.cssText = 'width:100%;';
    _panel.appendChild(gridHost);
  }

  /* ── buildSieve ────────────────────────────────────────────── */
  function buildSieve(n) {
    _sieveCells  = {};
    _sieveMarked = {};
    _sieveN      = n;

    var host = byId('sieveGridHost');
    if (!host) return;
    host.innerHTML = '';

    var grid = createElement('div', 'sieve-grid');
    grid.id   = 'sieveGrid';

    for (var i = 2; i <= n; i++) {
      var cell = createElement('div', 'sieve-cell');
      cell.id              = 'sc-' + i;
      cell.setAttribute('data-num', String(i));
      cell.textContent     = String(i);
      grid.appendChild(cell);
      _sieveCells[i] = cell;
    }

    host.appendChild(grid);
  }

  /* ── markPrime ─────────────────────────────────────────────── */
  function markPrime(p, color) {
    var cell = _sieveCells[p];
    if (!cell) return;

    cell.style.setProperty('--prime-color', color || C.blue);
    /* Remove composite class in case it was set early */
    cell.classList.remove('composite');
    cell.classList.add('prime');

    /* Legend chip */
    var legend = byId('sieveLegend');
    if (legend) {
      var tag = createElement('span', '');
      tag.style.cssText =
        'display:inline-flex;align-items:center;gap:4px;padding:3px 9px;' +
        'border-radius:20px;font-family:\'Fira Code\',monospace;font-size:0.68rem;' +
        'border:1px solid ' + (color || C.blue) + ';color:' + (color || C.blue) + ';' +
        'background:' + (color || C.blue) + '1A;animation:me-fadeIn 0.3s ease;';
      tag.textContent = 'p=' + p;
      legend.appendChild(tag);
    }
  }

  /* ── markComposite ─────────────────────────────────────────── */
  function markComposite(m) {
    var cell = _sieveCells[m];
    if (!cell || cell.classList.contains('prime')) return;
    _sieveMarked[m] = true;
    cell.classList.add('composite');
  }

  /* ── sweepMultiples ────────────────────────────────────────── */
  function sweepMultiples(p, color, delayMs) {
    return new Promise(function (resolve) {
      var cells  = _sieveCells;
      var marked = _sieveMarked;
      var n      = _sieveN;
      var keys   = [];

      for (var m = 2 * p; m <= n; m += p) {
        if (!marked[m] && cells[m] && !cells[m].classList.contains('prime')) {
          keys.push(m);
        }
      }

      if (keys.length === 0) { resolve(); return; }

      /* Pulse the prime cell while it sweeps so the cause is visible. */
      var src = cells[p];
      if (src) src.classList.add('sweep-source');

      var idx = 0;
      function next() {
        if (idx >= keys.length) {
          if (src) src.classList.remove('sweep-source');
          resolve();
          return;
        }
        var num  = keys[idx++];
        var cell = cells[num];
        if (cell) {
          marked[num] = true;
          /* Flash the multiple in the prime's colour, then settle it to
             composite — so you see WHICH cell is being struck and by whom. */
          cell.style.setProperty('--sweep-color', color || '#F0883E');
          cell.classList.add('sweeping');
          (function (c) {
            setTimeout(function () {
              c.classList.remove('sweeping');
              c.classList.add('composite');
            }, Math.min((delayMs || 60) * 1.6, 200));
          })(cell);
        }
        setTimeout(next, delayMs || 60);
      }
      next();
    });
  }

  /* ── finalReveal ───────────────────────────────────────────── */
  function finalReveal() {
    return new Promise(function (resolve) {
      var rainbow = [C.blue, C.purple, C.orange, C.green, C.yellow, C.red, C.sky, C.lavender];

      /* Fade composites out */
      for (var k in _sieveCells) {
        if (_sieveMarked[k]) {
          var cell = _sieveCells[k];
          cell.style.transition = 'opacity 0.3s ease';
          cell.style.opacity    = '0';
        }
      }

      /* After 500ms rainbow-reveal primes */
      setTimeout(function () {
        var ri = 0;
        for (var pk in _sieveCells) {
          if (!_sieveMarked[pk]) {
            var pc  = rainbow[ri % rainbow.length]; ri++;
            var pcell = _sieveCells[pk];
            pcell.style.setProperty('--prime-color', pc);
            /* Ensure prime class */
            pcell.classList.remove('composite');
            pcell.classList.add('prime');
            pcell.style.transform = 'scale(1.12)';
            pcell.style.transition = 'all 0.5s ease';
          }
        }

        /* Banner */
        setTimeout(function () {
          var host = byId('sieveGridHost');
          if (host) {
            var banner = createElement('div', '');
            banner.style.cssText =
              'text-align:center;margin-top:24px;font-family:\'Fira Code\',monospace;' +
              'font-size:1rem;font-weight:700;color:' + C.green + ';' +
              'text-shadow:0 0 18px rgba(57,211,83,0.55);animation:me-fadeIn 0.6s ease;';
            banner.innerHTML =
              '<i class="fa-solid fa-star" style="margin-right:8px;"></i>' +
              'Prime Constellation Revealed!';
            host.appendChild(banner);
          }
          resolve();
        }, 500);
      }, 500);
    });
  }

  /* ════════════════════════════════════════════════════════════
     MODE 3 — RSA  (three-column glassmorphism panels)
  ════════════════════════════════════════════════════════════ */

  function _setupRSA() {
    if (!_panel) return;
    _panel.innerHTML = '';
    _panel.style.justifyContent = 'flex-start';

    /* Title */
    var title = createElement('div', '');
    title.style.cssText =
      'font-size:1.15rem;font-weight:700;color:#E6EDF3;' +
      'font-family:\'Fira Code\',monospace;margin-bottom:4px;align-self:flex-start;';
    title.innerHTML =
      '<i class="fa-solid fa-lock" style="color:' + C.green + ';margin-right:8px;"></i>' +
      'RSA Encryption';
    _panel.appendChild(title);

    var sub = createElement('p', '');
    sub.style.cssText =
      'color:#8B949E;font-size:0.82rem;margin-bottom:16px;align-self:flex-start;';
    sub.textContent =
      'Key Forge generates keypairs. Alice encrypts with the public key. Bob decrypts with the private key.';
    _panel.appendChild(sub);

    /* Three-column grid */
    var cols = createElement('div', '');
    cols.id   = 'rsaCols';
    cols.style.cssText =
      'width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;' +
      'gap:16px;align-items:start;';

    _rsaPanels.forge = _makeRSAPanel('forge', '⚙️ Math Forge',  C.purple, cols);
    _rsaPanels.alice = _makeRSAPanel('alice', '✉️ Alice',        C.orange, cols);
    _rsaPanels.bob   = _makeRSAPanel('bob',   '🔒 Bob',          C.green,  cols);

    _panel.appendChild(cols);

    /* Overlay for flying packets */
    var overlay = createElement('div', '');
    overlay.id   = 'rsaOverlay';
    overlay.style.cssText = 'position:relative;width:100%;height:0;overflow:visible;pointer-events:none;';
    _panel.appendChild(overlay);
  }

  function _makeRSAPanel(id, label, accent, parent) {
    var panel = createElement('div', '');
    panel.id   = 'rsaPanel-' + id;
    panel.style.cssText =
      'background:' + C.glass + ';border:1px solid ' + C.border + ';' +
      'border-radius:12px;padding:16px;backdrop-filter:blur(16px);' +
      'min-height:220px;display:flex;flex-direction:column;gap:10px;' +
      'border-top:2px solid ' + accent + 'AA;';

    var header = createElement('div', '');
    header.style.cssText =
      'font-family:\'Fira Code\',monospace;font-size:0.82rem;font-weight:700;' +
      'color:' + accent + ';padding-bottom:10px;' +
      'border-bottom:1px solid ' + C.border + ';margin-bottom:2px;';
    header.textContent = label;
    panel.appendChild(header);

    var body = createElement('div', '');
    body.id   = 'rsaBody-' + id;
    body.style.cssText = 'display:flex;flex-direction:column;gap:7px;flex:1;';
    panel.appendChild(body);

    parent.appendChild(panel);
    return panel;
  }

  function _rsaAppendRow(panelId, html, animDelay) {
    var body = byId('rsaBody-' + panelId);
    if (!body) return;
    var row = createElement('div', '');
    row.style.cssText =
      'animation:me-fadeIn 0.4s ease ' + (animDelay || '0s') + ' both;';
    row.innerHTML = html;
    body.appendChild(row);
  }

  function _rsaKeyRow(panelId, label, formula, value, color) {
    var c = color || C.blue;
    var inner =
      '<div style="display:flex;justify-content:space-between;align-items:baseline;' +
      'font-family:\'Fira Code\',monospace;font-size:0.72rem;padding:5px 8px;' +
      'background:rgba(255,255,255,0.03);border-radius:6px;' +
      'border-left:2px solid ' + c + '66;">' +
      '<span style="color:#484F58;">' + label + (formula ? '<br><span style="font-size:0.65rem;color:#484F58AA;">' + formula + '</span>' : '') + '</span>' +
      '<span style="color:' + c + ';font-weight:800;">' + value + '</span>' +
      '</div>';
    _rsaAppendRow(panelId, inner);
  }

  /* ── initRSA ────────────────────────────────────────────────── */
  function initRSA() {
    ['forge', 'alice', 'bob'].forEach(function (id) {
      var body = byId('rsaBody-' + id);
      if (body) body.innerHTML = '';
    });
  }

  /* ── showKeyStep ─────────────────────────────────────────────── */
  function showKeyStep(label, formula, value) {
    _rsaKeyRow('forge', label, formula, value, C.blue);
  }

  /* ── showPublicKey ──────────────────────────────────────────── */
  function showPublicKey(e, n) {
    /* Forge badge */
    var forgeBody = byId('rsaBody-forge');
    if (forgeBody) {
      var badge = createElement('div', '');
      badge.style.cssText =
        'margin-top:4px;padding:8px 10px;border-radius:8px;' +
        'background:rgba(57,211,83,0.12);border:1px solid rgba(57,211,83,0.5);' +
        'font-family:\'Fira Code\',monospace;font-size:0.72rem;color:' + C.green + ';' +
        'display:flex;align-items:center;gap:7px;animation:me-fadeIn 0.4s ease;';
      badge.innerHTML =
        '<i class="fa-solid fa-lock-open" style="font-size:0.9rem;"></i>' +
        '<span><strong>Public Key</strong>: (e=' + e + ', n=' + n + ')</span>';
      forgeBody.appendChild(badge);
    }

    /* Alice panel hint */
    var aliceBody = byId('rsaBody-alice');
    if (aliceBody) {
      var hint = createElement('div', '');
      hint.style.cssText =
        'padding:7px 10px;border-radius:8px;' +
        'background:rgba(57,211,83,0.08);border:1px solid rgba(57,211,83,0.35);' +
        'font-family:\'Fira Code\',monospace;font-size:0.7rem;color:' + C.green + ';' +
        'animation:me-fadeIn 0.4s ease;';
      hint.innerHTML =
        '<i class="fa-solid fa-key" style="margin-right:5px;"></i>' +
        'Encrypting with Public Key<br>' +
        '<span style="opacity:0.7;">e=' + e + ', n=' + n + '</span>';
      aliceBody.appendChild(hint);
    }
  }

  /* ── showPrivateKey ─────────────────────────────────────────── */
  function showPrivateKey(d, n) {
    /* Forge badge */
    var forgeBody = byId('rsaBody-forge');
    if (forgeBody) {
      var badge = createElement('div', '');
      badge.style.cssText =
        'padding:8px 10px;border-radius:8px;' +
        'background:rgba(255,110,110,0.1);border:1px solid rgba(255,110,110,0.45);' +
        'font-family:\'Fira Code\',monospace;font-size:0.72rem;color:' + C.red + ';' +
        'display:flex;align-items:center;gap:7px;animation:me-fadeIn 0.4s ease;';
      badge.innerHTML =
        '<i class="fa-solid fa-key" style="font-size:0.9rem;"></i>' +
        '<span><strong>Private Key</strong>: (d=' + d + ', n=' + n + ')</span>';
      forgeBody.appendChild(badge);
    }

    /* Bob panel hint */
    var bobBody = byId('rsaBody-bob');
    if (bobBody) {
      var hint = createElement('div', '');
      hint.style.cssText =
        'padding:7px 10px;border-radius:8px;' +
        'background:rgba(255,110,110,0.07);border:1px solid rgba(255,110,110,0.3);' +
        'font-family:\'Fira Code\',monospace;font-size:0.7rem;color:' + C.red + ';' +
        'animation:me-fadeIn 0.4s ease;';
      hint.innerHTML =
        '<i class="fa-solid fa-unlock" style="margin-right:5px;"></i>' +
        'Decrypting with Private Key<br>' +
        '<span style="opacity:0.7;">d=' + d + ', n=' + n + '</span>';
      bobBody.appendChild(hint);
    }
  }

  /* ── showEncryption ─────────────────────────────────────────── */
  function showEncryption(M, e, n, C_val) {
    var body = byId('rsaBody-alice');
    if (!body) return;

    var inner =
      '<div style="display:flex;flex-direction:column;gap:5px;' +
      'font-family:\'Fira Code\',monospace;font-size:0.72rem;' +
      'background:rgba(240,136,62,0.07);border:1px solid rgba(240,136,62,0.3);' +
      'border-radius:8px;padding:10px;animation:me-fadeIn 0.5s ease;">' +

      '<div style="display:flex;align-items:center;gap:6px;">' +
      '<span style="color:#484F58;font-size:0.65rem;">MESSAGE M</span>' +
      '<span style="color:#E6EDF3;font-weight:800;font-size:1rem;' +
      'text-shadow:0 0 10px rgba(255,255,255,0.5);">' + M + '</span>' +
      '</div>' +

      '<div style="color:#484F58;font-size:0.68rem;padding:4px 0;border-top:1px solid rgba(240,136,62,0.2);">' +
      'C = M<sup>e</sup> mod n' +
      '</div>' +

      '<div style="color:#8B949E;font-size:0.65rem;">' +
      'C = ' + M + '<sup>' + e + '</sup> mod ' + n +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:6px;padding-top:4px;border-top:1px solid rgba(240,136,62,0.2);">' +
      '<span style="color:#484F58;font-size:0.65rem;">CIPHERTEXT C</span>' +
      '<span style="color:' + C.orange + ';font-weight:800;font-size:1rem;' +
      'text-shadow:0 0 12px rgba(240,136,62,0.6);">' + C_val + '</span>' +
      '</div>' +
      '</div>';

    var row = createElement('div', '');
    row.innerHTML = inner;
    body.appendChild(row);

    /* Glow pulse on Alice panel */
    var panel = byId('rsaPanel-alice');
    if (panel) {
      panel.style.boxShadow = '0 0 32px rgba(240,136,62,0.4)';
      setTimeout(function () { panel.style.boxShadow = ''; }, 2200);
    }
  }

  /* ── showDecryption ─────────────────────────────────────────── */
  function showDecryption(C_val, d, n, M2) {
    var body = byId('rsaBody-bob');
    if (!body) return;

    var inner =
      '<div style="display:flex;flex-direction:column;gap:5px;' +
      'font-family:\'Fira Code\',monospace;font-size:0.72rem;' +
      'background:rgba(57,211,83,0.07);border:1px solid rgba(57,211,83,0.3);' +
      'border-radius:8px;padding:10px;animation:me-fadeIn 0.5s ease;">' +

      '<div style="display:flex;align-items:center;gap:6px;">' +
      '<span style="color:#484F58;font-size:0.65rem;">CIPHERTEXT C</span>' +
      '<span style="color:' + C.orange + ';font-weight:800;">' + C_val + '</span>' +
      '</div>' +

      '<div style="color:#484F58;font-size:0.68rem;padding:4px 0;border-top:1px solid rgba(57,211,83,0.2);">' +
      'M = C<sup>d</sup> mod n' +
      '</div>' +

      '<div style="color:#8B949E;font-size:0.65rem;">' +
      'M = ' + C_val + '<sup>' + d + '</sup> mod ' + n +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:6px;padding-top:4px;border-top:1px solid rgba(57,211,83,0.2);">' +
      '<span style="color:#484F58;font-size:0.65rem;">DECRYPTED M</span>' +
      '<span style="color:' + C.green + ';font-weight:800;font-size:1rem;' +
      'text-shadow:0 0 12px rgba(57,211,83,0.6);">' + M2 + '</span>' +
      '</div>' +

      '<div style="margin-top:6px;padding:6px 8px;border-radius:6px;text-align:center;' +
      'background:rgba(57,211,83,0.15);border:1px solid ' + C.green + ';' +
      'color:' + C.green + ';font-weight:700;font-size:0.75rem;">' +
      '<i class="fa-solid fa-check-circle" style="margin-right:5px;"></i>RSA Verified ✓' +
      '</div>' +
      '</div>';

    var row = createElement('div', '');
    row.innerHTML = inner;
    body.appendChild(row);

    /* Glow pulse on Bob panel */
    var panel = byId('rsaPanel-bob');
    if (panel) {
      panel.style.boxShadow = '0 0 32px rgba(57,211,83,0.4)';
      setTimeout(function () { panel.style.boxShadow = ''; }, 2200);
    }
  }

  /* ── sendMessage ────────────────────────────────────────────── */
  function sendMessage(label) {
    return new Promise(function (resolve) {
      var aliceEl = byId('rsaPanel-alice');
      var bobEl   = byId('rsaPanel-bob');
      if (!aliceEl || !bobEl || !_panel) { resolve(); return; }

      _panel.style.position = 'relative';

      var panelRect = _panel.getBoundingClientRect();
      var aliceRect = aliceEl.getBoundingClientRect();
      var bobRect   = bobEl.getBoundingClientRect();

      var startX = aliceRect.right  - panelRect.left;
      var startY = aliceRect.top    - panelRect.top  + aliceRect.height / 2;
      var endX   = bobRect.left     - panelRect.left;
      var endY   = bobRect.top      - panelRect.top  + bobRect.height  / 2;

      var packet = createElement('div', 'rsa-packet');
      packet.style.cssText =
        'position:absolute;' +
        'left:' + startX + 'px;top:' + startY + 'px;' +
        'transform:translate(-50%,-50%);' +
        'background:' + C.orange + ';color:#000;border-radius:6px;' +
        'padding:4px 10px;font-family:\'Fira Code\',monospace;font-size:0.7rem;font-weight:700;' +
        'box-shadow:0 0 18px rgba(240,136,62,0.7);' +
        'pointer-events:none;z-index:100;white-space:nowrap;' +
        'transition:left 0.9s cubic-bezier(0.4,0,0.2,1),top 0.75s ease,opacity 0.3s ease;';
      packet.textContent = label || '🔐 C';
      _panel.appendChild(packet);

      /* Trigger transition */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          packet.style.left = endX + 'px';
          packet.style.top  = endY + 'px';
        });
      });

      setTimeout(function () {
        packet.style.opacity = '0';
        setTimeout(function () {
          if (packet.parentNode) packet.parentNode.removeChild(packet);
          resolve();
        }, 320);
      }, 960);
    });
  }

  /* ════════════════════════════════════════════════════════════
     LEGACY API — preserved for DP / other engines
  ════════════════════════════════════════════════════════════ */

  function buildNumberGrid(countOrArray, defaultLabel) {
    if (!_panel) return;
    clear();
    var labels = [];
    if (Array.isArray(countOrArray)) {
      labels = countOrArray.map(String);
    } else {
      for (var n = 0; n < countOrArray; n++) {
        labels.push(defaultLabel !== undefined ? String(defaultLabel) : String(n));
      }
    }
    var cols = Math.min(labels.length, 10);
    var container = createElement('div', '');
    container.style.cssText =
      'display:grid;grid-template-columns:repeat(' + cols + ',44px);' +
      'gap:4px;justify-content:center;max-width:100%;overflow-x:auto;';
    var cells = [];
    for (var i = 0; i < labels.length; i++) {
      var cell = createElement('div', '');
      cell.style.cssText =
        'width:44px;height:44px;display:flex;align-items:center;justify-content:center;' +
        'background:var(--bg-tertiary);border:1px solid var(--border-subtle);' +
        'border-radius:var(--radius-md);font-family:var(--font-mono);font-size:var(--text-sm);' +
        'color:var(--text-secondary);transition:background 0.2s,color 0.2s,border-color 0.2s;';
      cell.id = 'mgrid-' + i;
      cell.textContent = labels[i];
      container.appendChild(cell);
      cells.push(cell);
    }
    _panel.appendChild(container);
    return cells;
  }

  function highlightGridCell(idx, newValue, type) {
    if (typeof newValue === 'string' && type === undefined) {
      type = newValue; newValue = undefined;
    }
    var cell = byId('mgrid-' + idx);
    if (!cell) return;
    if (newValue !== undefined && newValue !== null) cell.textContent = String(newValue);
    var styles = {
      prime:     { bg: 'rgba(0,240,255,0.15)',  color: 'var(--accent-blue)',   border: 'var(--accent-blue)' },
      composite: { bg: 'rgba(255,110,110,0.08)', color: 'var(--text-muted)',   border: 'var(--border-subtle)' },
      current:   { bg: 'rgba(240,208,96,0.15)', color: 'var(--accent-yellow)', border: 'var(--accent-yellow)' },
      selected:  { bg: 'rgba(57,211,83,0.15)',  color: 'var(--accent-green)',  border: 'var(--accent-green)' },
      found:     { bg: 'rgba(57,211,83,0.15)',  color: 'var(--accent-green)',  border: 'var(--accent-green)' },
      normal:    { bg: 'rgba(0,240,255,0.08)',  color: 'var(--text-primary)',  border: 'var(--accent-blue)' },
      not_found: { bg: 'rgba(255,110,110,0.08)', color: 'var(--text-muted)',  border: 'var(--border-subtle)' },
      excluded:  { bg: 'transparent',           color: 'var(--text-muted)',   border: 'transparent' }
    };
    var s = styles[type] || styles.current;
    cell.style.background  = s.bg;
    cell.style.color       = s.color;
    cell.style.borderColor = s.border;
  }

  var _dpRows = 0, _dpCols = 0;

  function buildDPTable(rows, cols, items) {
    if (!_panel) return;
    clear();
    _dpRows = rows; _dpCols = cols;
    var title = createElement('h3', '', '0/1 Knapsack DP Table');
    title.style.cssText = 'color:var(--text-primary);font-size:var(--text-lg);margin-bottom:var(--space-3);align-self:flex-start;';
    _panel.appendChild(title);
    if (items && items.length) {
      var legend = createElement('div', '');
      legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4);font-family:var(--font-mono);font-size:var(--text-xs);align-self:flex-start;';
      for (var k = 0; k < items.length; k++) {
        var tag = createElement('span', '');
        tag.style.cssText = 'background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:2px 8px;color:var(--text-secondary);';
        tag.textContent = 'i' + (k+1) + ': w=' + items[k].weight + ' v=' + items[k].value;
        legend.appendChild(tag);
      }
      _panel.appendChild(legend);
    }
    var tableWrapper = createElement('div', '');
    tableWrapper.style.cssText = 'overflow-x:auto;width:100%;';
    var table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;font-family:var(--font-mono);font-size:var(--text-xs);';
    var thead = document.createElement('thead');
    var htr   = document.createElement('tr');
    var th0   = createElement('th', '', 'item \\ w');
    th0.style.cssText = 'padding:4px 8px;color:var(--text-muted);border-bottom:1px solid var(--border-default);white-space:nowrap;';
    htr.appendChild(th0);
    for (var w = 0; w < cols; w++) {
      var th = createElement('th', '', String(w));
      th.style.cssText = 'padding:4px 8px;color:var(--accent-blue);border-bottom:1px solid var(--border-default);text-align:center;min-width:32px;';
      htr.appendChild(th);
    }
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    tbody.id = 'dpTableBody';
    for (var i = 0; i < rows; i++) {
      var tr = document.createElement('tr');
      var rowLabel = i === 0 ? '0 (none)' : ('i' + i + (items && items[i-1] ? ' (w'+items[i-1].weight+',v'+items[i-1].value+')' : ''));
      var tdLabel = createElement('td', '', rowLabel);
      tdLabel.style.cssText = 'padding:3px 8px;color:var(--text-muted);border-right:1px solid var(--border-default);white-space:nowrap;';
      tr.appendChild(tdLabel);
      for (var ww = 0; ww < cols; ww++) {
        var td = createElement('td', '', '0');
        td.style.cssText = 'padding:3px 6px;text-align:center;border:1px solid rgba(139,148,158,0.1);color:var(--text-secondary);transition:background 0.2s,color 0.2s;';
        td.id = 'dp-' + i + '-' + ww;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    _panel.appendChild(tableWrapper);
  }

  function highlightDPCell(i, w, val, type) {
    var cell = byId('dp-' + i + '-' + w);
    if (!cell) return;
    if (val !== undefined) cell.textContent = String(val);
    var styles = {
      found:    { bg: 'rgba(57,211,83,0.2)',   color: 'var(--accent-green)',  border: 'var(--accent-green)' },
      selected: { bg: 'rgba(0,240,255,0.2)',   color: 'var(--accent-blue)',   border: 'var(--accent-blue)' },
      normal:   { bg: 'rgba(176,38,255,0.08)', color: 'var(--text-primary)',  border: 'transparent' },
      current:  { bg: 'rgba(240,208,96,0.2)',  color: 'var(--accent-yellow)', border: 'var(--accent-yellow)' }
    };
    var s = styles[type] || styles.normal;
    cell.style.background  = s.bg;
    cell.style.color       = s.color;
    cell.style.borderColor = s.border;
  }

  function addStepCard(titleText, content, type) {
    if (!_panel) return;
    var colors = {
      info:    { bg: 'rgba(22,27,34,0.8)',    border: C.border },
      compare: { bg: 'rgba(240,136,62,0.08)', border: C.orange },
      found:   { bg: 'rgba(57,211,83,0.08)',  border: C.green  },
      result:  { bg: 'rgba(0,240,255,0.08)',  border: C.blue   }
    };
    var col = colors[type] || colors.info;
    var card = createElement('div', '');
    card.style.cssText =
      'width:100%;max-width:560px;background:' + col.bg + ';border:1px solid ' + col.border + ';' +
      'border-radius:12px;padding:16px 20px;animation:me-fadeIn 0.3s ease;';
    card.innerHTML =
      '<div style="font-size:0.7rem;font-family:\'Fira Code\',monospace;color:#484F58;margin-bottom:6px;">' + titleText + '</div>' +
      '<div style="font-size:0.82rem;color:#E6EDF3;line-height:1.6;">' + content + '</div>';
    _panel.insertBefore(card, _panel.firstChild);
    while (_panel.children.length > 12) _panel.removeChild(_panel.lastChild);
  }

  function buildEuclideanTable() { /* no-op — setup handled by _setupEuclidean */ }

  function addEuclideanRow(step, a, b, quotient, remainder) {
    if (remainder === undefined) { remainder = quotient; quotient = '—'; }
    var tbody = byId('euclStepLog');
    if (!tbody) return;
    var isDone   = remainder === 0;
    var remColor = isDone ? C.green : '#E6EDF3';
    var tr = document.createElement('tr');
    tr.style.animation = 'me-fadeIn 0.3s ease';
    if (isDone) tr.style.background = 'rgba(57,211,83,0.06)';
    tr.innerHTML =
      '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:#484F58;">' + step + '</td>' +
      '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:' + C.blue + ';font-weight:700;">' + a + '</td>' +
      '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:' + C.purple + ';font-weight:700;">' + b + '</td>' +
      '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:#8B949E;">' + quotient + '</td>' +
      '<td style="padding:5px 10px;border-bottom:1px solid ' + C.border + ';color:' + remColor + ';font-weight:800;">' + remainder + '</td>';
    tbody.appendChild(tr);
  }

  function applySnapshot(snap) { /* reserved */ }

  /* ── Public: clear / reset / getPanel ────────────────────── */
  function getPanel() { return _panel; }

  function clear() {
    if (_panel) _panel.innerHTML = '';
  }

  function reset() {
    _sieveCells  = {};
    _sieveMarked = {};
    _sieveN      = 0;
    _euclBarA = _euclBarB = _euclLblA = _euclLblB = null;
    _euclMax  = 1;
    _rsaPanels   = {};
    _renderMode  = null;
    if (_algo) {
      if (_algo.id === 'euclidean-algorithm')   { _renderMode = 'euclidean'; _setupEuclidean(); }
      else if (_algo.id === 'sieve-of-eratosthenes') { _renderMode = 'sieve'; _setupSieve(); }
      else if (_algo.id === 'rsa-encryption')   { _renderMode = 'rsa'; _setupRSA(); }
      else _showReadyCard(_algo);
    }
    /* Re-grab bar refs after rebuild */
    _euclBarA = byId('euclBarA') || _euclBarA;
    _euclBarB = byId('euclBarB') || _euclBarB;
  }

  /* ════════════════════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════════════════════ */
  return {
    /* Core */
    mount:              mount,
    getPanel:           getPanel,
    clear:              clear,
    reset:              reset,
    applySnapshot:      applySnapshot,

    /* Euclidean */
    initEuclidean:      initEuclidean,
    stepEuclidean:      stepEuclidean,
    highlightGCD:       highlightGCD,

    /* Sieve */
    buildSieve:         buildSieve,
    markPrime:          markPrime,
    markComposite:      markComposite,
    sweepMultiples:     sweepMultiples,
    finalReveal:        finalReveal,

    /* RSA */
    initRSA:            initRSA,
    showKeyStep:        showKeyStep,
    showPublicKey:      showPublicKey,
    showPrivateKey:     showPrivateKey,
    showEncryption:     showEncryption,
    showDecryption:     showDecryption,
    sendMessage:        sendMessage,

    /* Legacy / DP */
    buildNumberGrid:    buildNumberGrid,
    highlightGridCell:  highlightGridCell,
    addStepCard:        addStepCard,
    buildEuclideanTable: buildEuclideanTable,
    addEuclideanRow:    addEuclideanRow,
    buildDPTable:       buildDPTable,
    highlightDPCell:    highlightDPCell,

    /* Legacy RSA shim (old name) */
    showKeyForge: function (p, q, n, phi, e, d) {
      showKeyStep('p (prime)', '', p);
      showKeyStep('q (prime)', '', q);
      showKeyStep('n = p × q', p + ' × ' + q, n);
      showKeyStep('φ(n)', '(p-1)(q-1)', phi);
      showKeyStep('e (public exp)', 'coprime with φ', e);
      showKeyStep('d (private exp)', 'e⁻¹ mod φ', d);
    }
  };

}());
