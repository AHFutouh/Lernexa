/* ════════════════════════════════════════════════════════════
   Lernexa — dpEngine.js
   Lightweight DOM/CSS engine for Dynamic Programming algorithms.
   Renders animated DP tables, item cards, coin tokens, and
   result banners inside the ws-canvas-area.

   Supported modes (detected via algo.id):
     'knapsack'            → 2-D DP table + item cards
     'fractional-knapsack' → greedy item cards with fill bars
     'coin-change'         → 1-D DP array + coin tokens

   Public API
   ──────────────────────────────────────────────────────────
   dpEngine.mount(container, algo)
   dpEngine.reset()
   dpEngine.initTable(rowLabels, colLabels, title)
   dpEngine.setCellValue(row, col, value, state)
   dpEngine.highlightRow(row, state)
   dpEngine.highlightCol(col, state)
   dpEngine.showItemRow(items, capacity)
   dpEngine.markItemChosen(itemIdx, chosen)
   dpEngine.showCoinsRow(coins)
   dpEngine.markCoinActive(coinVal, active)
   dpEngine.updateItemFill(itemIdx, fraction)
   dpEngine.showResultBanner(text, subtext)
   dpEngine.captureState()
   dpEngine.applySnapshot(snap)
   dpEngine.unmount()
   ════════════════════════════════════════════════════════════ */

'use strict';

var DPEngine = (function () {

  /* ── Private state ────────────────────────────────────────── */
  var _container   = null;
  var _algo        = null;
  var _mode        = null;   /* 'knapsack' | 'fractional-knapsack' | 'coin-change' */
  var _wrap        = null;   /* .dp-engine-wrap */
  var _tableEl     = null;   /* <table class="dp-table"> */
  var _rows        = 0;
  var _cols        = 0;
  var _cellData    = [];     /* 2-D array of { el, value, state } */
  var _itemCards   = [];     /* array of item card elements */
  var _coinTokens  = {};     /* { denomination: element } */
  var _bannerEl    = null;

  /* ── Inject CSS once ─────────────────────────────────────── */
  (function _injectCSS() {
    if (document.getElementById('dp-engine-style')) return;
    var s = document.createElement('style');
    s.id = 'dp-engine-style';
    s.textContent = [
      /* Wrapper */
      '.dp-engine-wrap{display:flex;flex-direction:column;gap:var(--space-4);',
        'height:100%;width:100%;padding:var(--space-4);overflow:hidden;box-sizing:border-box;}',

      /* Items row */
      '.dp-items-row{display:flex;gap:var(--space-2);flex-wrap:wrap;',
        'padding-bottom:var(--space-3);border-bottom:1px solid var(--border-subtle);',
        'flex-shrink:0;align-items:flex-start;}',

      /* Item card */
      '.dp-item-card{background:var(--bg-tertiary);border:1px solid var(--border-default);',
        'border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);',
        'min-width:68px;text-align:center;transition:all var(--transition-base);',
        'position:relative;overflow:hidden;}',
      '.dp-item-card.chosen{border-color:var(--accent-green);',
        'box-shadow:0 0 12px rgba(57,211,83,0.30);background:rgba(57,211,83,0.10);}',
      '.dp-item-card.excluded{opacity:0.32;}',
      '.dp-item-label{font-size:var(--text-xs);color:var(--text-muted);',
        'font-family:var(--font-mono);display:block;margin-bottom:2px;}',
      '.dp-item-val{font-size:var(--text-sm);font-weight:var(--weight-semi);',
        'color:var(--text-primary);display:block;line-height:1.3;}',
      '.dp-item-sub{font-size:9px;color:var(--text-muted);font-family:var(--font-mono);}',

      /* Fill bar (fractional) */
      '.dp-item-fill-wrap{margin-top:var(--space-1);height:4px;',
        'background:var(--border-subtle);border-radius:2px;overflow:hidden;}',
      '.dp-item-fill-bar{height:100%;width:0%;background:var(--accent-green);',
        'transition:width 0.5s ease;border-radius:2px;}',
      '.dp-item-card.partial .dp-item-fill-bar{background:var(--accent-orange);}',

      /* Chosen checkmark */
      '.dp-item-check{position:absolute;top:3px;right:4px;',
        'font-size:9px;color:var(--accent-green);opacity:0;}',
      '.dp-item-card.chosen .dp-item-check{opacity:1;}',

      /* Coins row */
      '.dp-coins-row{display:flex;gap:var(--space-2);flex-wrap:wrap;',
        'padding-bottom:var(--space-3);border-bottom:1px solid var(--border-subtle);',
        'flex-shrink:0;align-items:center;}',
      '.dp-coins-label{font-size:var(--text-xs);color:var(--text-muted);',
        'font-family:var(--font-mono);margin-right:var(--space-1);}',

      /* Coin token */
      '.dp-coin-token{width:44px;height:44px;border-radius:var(--radius-full);',
        'background:var(--bg-tertiary);border:2px solid var(--accent-yellow);',
        'display:flex;align-items:center;justify-content:center;',
        'font-weight:var(--weight-bold);font-size:var(--text-sm);',
        'color:var(--accent-yellow);transition:all var(--transition-base);}',
      '.dp-coin-token.active{background:rgba(240,208,96,0.15);',
        'box-shadow:0 0 16px rgba(240,208,96,0.4);transform:scale(1.15);}',

      /* Table wrap */
      '.dp-table-section{flex:1;display:flex;flex-direction:column;',
        'gap:var(--space-2);min-height:0;}',
      '.dp-table-title{font-size:var(--text-xs);font-family:var(--font-mono);',
        'color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;',
        'flex-shrink:0;}',
      '.dp-table-wrap{flex:1;overflow:auto;border-radius:var(--radius-lg);',
        'border:1px solid var(--border-subtle);}',
      '.dp-table-wrap::-webkit-scrollbar{width:6px;height:6px;}',
      '.dp-table-wrap::-webkit-scrollbar-track{background:transparent;}',
      '.dp-table-wrap::-webkit-scrollbar-thumb{background:var(--border-subtle);border-radius:3px;}',

      /* Table */
      '.dp-table{border-collapse:collapse;min-width:100%;',
        'font-family:var(--font-mono);font-size:var(--text-sm);}',

      /* Headers */
      '.dp-table th{background:var(--bg-tertiary);color:var(--text-secondary);',
        'padding:var(--space-2) var(--space-3);border:1px solid var(--border-subtle);',
        'text-align:center;font-size:var(--text-xs);',
        'position:sticky;top:0;z-index:2;}',
      '.dp-table th.row-header{left:0;z-index:3;background:var(--bg-tertiary);}',

      /* Cells */
      '.dp-table td{padding:var(--space-2) var(--space-3);border:1px solid var(--border-subtle);',
        'text-align:center;color:var(--text-secondary);min-width:48px;',
        'transition:background 0.25s ease,color 0.25s ease,box-shadow 0.25s ease;}',
      '.dp-table td.row-header{background:var(--bg-tertiary);color:var(--text-muted);',
        'font-size:var(--text-xs);position:sticky;left:0;z-index:1;}',

      /* Cell states */
      /* Current cell: bright outer ring + glow so it reads as the cursor
         moving across the table (B-U3). Injected here because this style
         loads after workspace.css and would otherwise override it. */
      '.dp-table td.state-computing{background:rgba(240,136,62,0.22);',
        'color:var(--accent-orange);position:relative;z-index:2;',
        'box-shadow:inset 0 0 10px rgba(240,136,62,0.15),',
        '0 0 0 2px var(--accent-orange),0 0 12px rgba(240,136,62,0.5);}',
      '.dp-table td.state-optimal{background:rgba(57,211,83,0.15);color:var(--accent-green);',
        'box-shadow:inset 0 0 10px rgba(57,211,83,0.18);font-weight:var(--weight-semi);}',
      '.dp-table td.state-chosen{background:rgba(0,240,255,0.15);color:var(--accent-blue);',
        'box-shadow:inset 0 0 14px rgba(0,240,255,0.18);font-weight:var(--weight-bold);}',
      '.dp-table td.state-excluded{background:rgba(176,38,255,0.08);color:var(--text-muted);}',

      /* Animations */
      '@keyframes dpCellPop{0%{transform:scale(1)}50%{transform:scale(1.10)}100%{transform:scale(1)}}',
      '.dp-table td.state-optimal,.dp-table td.state-chosen{animation:dpCellPop 0.28s ease;}',

      /* Result banner */
      '.dp-result-banner{background:linear-gradient(135deg,rgba(57,211,83,0.12),rgba(0,240,255,0.10));',
        'border:1px solid var(--accent-green);border-radius:var(--radius-lg);',
        'padding:var(--space-4) var(--space-6);text-align:center;',
        'animation:dpBannerIn 0.5s ease;flex-shrink:0;}',
      '@keyframes dpBannerIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '.dp-result-banner .result-main{font-size:var(--text-xl);font-weight:var(--weight-bold);',
        'color:var(--accent-green);display:block;}',
      '.dp-result-banner .result-sub{font-size:var(--text-sm);color:var(--text-secondary);',
        'margin-top:var(--space-1);display:block;}',

      /* Greedy step rows (fractional) */
      '.dp-greedy-steps{flex:1;overflow-y:auto;display:flex;flex-direction:column;',
        'gap:var(--space-2);padding-right:var(--space-1);}',
      '.dp-greedy-step{background:var(--bg-tertiary);border:1px solid var(--border-subtle);',
        'border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);',
        'display:flex;align-items:center;gap:var(--space-3);',
        'animation:dpBannerIn 0.3s ease;}',
      '.dp-greedy-step.take-all{border-color:var(--accent-green);}',
      '.dp-greedy-step.take-partial{border-color:var(--accent-orange);}',
      '.dp-greedy-step-badge{font-size:var(--text-xs);font-weight:var(--weight-bold);',
        'padding:2px 8px;border-radius:var(--radius-full);white-space:nowrap;}',
      '.dp-greedy-step.take-all .dp-greedy-step-badge{background:rgba(57,211,83,0.15);color:var(--accent-green);}',
      '.dp-greedy-step.take-partial .dp-greedy-step-badge{background:rgba(240,136,62,0.15);color:var(--accent-orange);}',
      '.dp-greedy-step-text{font-size:var(--text-xs);color:var(--text-secondary);font-family:var(--font-mono);}',
      '.dp-greedy-step-value{margin-left:auto;font-size:var(--text-sm);font-weight:var(--weight-semi);',
        'color:var(--accent-blue);font-family:var(--font-mono);}'

    ].join('');
    document.head.appendChild(s);
  })();

  /* ── mount ───────────────────────────────────────────────── */
  function mount(container, algo) {
    _container = container;
    _algo      = algo;
    _mode      = algo.id;
    _cellData  = [];
    _itemCards = [];
    _coinTokens = {};
    _bannerEl  = null;
    _tableEl   = null;
    _rows = 0;
    _cols = 0;

    container.innerHTML = '';

    _wrap = document.createElement('div');
    _wrap.className = 'dp-engine-wrap';
    container.appendChild(_wrap);
  }

  /* ── reset ───────────────────────────────────────────────── */
  function reset() {
    if (!_container || !_algo) return;
    mount(_container, _algo);
  }

  /* ── initTable ───────────────────────────────────────────── */
  /*
   * rowLabels: string[] — label for each data row (not counting the header row)
   * colLabels: string[] — label for each data col (not counting the row-header col)
   * title: string — shown above the table
   */
  function initTable(rowLabels, colLabels, title) {
    if (!_wrap) return;

    _rows = rowLabels.length;
    _cols = colLabels.length;
    _cellData = [];

    /* Section wrapper */
    var section = document.createElement('div');
    section.className = 'dp-table-section';

    if (title) {
      var titleEl = document.createElement('div');
      titleEl.className = 'dp-table-title';
      titleEl.textContent = title;
      section.appendChild(titleEl);
    }

    var tableWrap = document.createElement('div');
    tableWrap.className = 'dp-table-wrap';

    _tableEl = document.createElement('table');
    _tableEl.className = 'dp-table';

    /* Header row */
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');

    /* Top-left corner cell */
    var cornerTh = document.createElement('th');
    cornerTh.className = 'row-header';
    cornerTh.textContent = '';
    headerRow.appendChild(cornerTh);

    for (var c = 0; c < colLabels.length; c++) {
      var th = document.createElement('th');
      th.textContent = colLabels[c];
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    _tableEl.appendChild(thead);

    /* Body rows */
    var tbody = document.createElement('tbody');
    for (var r = 0; r < rowLabels.length; r++) {
      var tr = document.createElement('tr');
      var rowCells = [];

      /* Row header */
      var rowTh = document.createElement('td');
      rowTh.className = 'row-header';
      rowTh.textContent = rowLabels[r];
      tr.appendChild(rowTh);

      for (var cc = 0; cc < colLabels.length; cc++) {
        var td = document.createElement('td');
        td.id  = 'dp-cell-' + r + '-' + cc;
        td.textContent = '0';
        tr.appendChild(td);
        rowCells.push({ el: td, value: 0, state: 'default' });
      }

      _cellData.push(rowCells);
      tbody.appendChild(tr);
    }
    _tableEl.appendChild(tbody);

    tableWrap.appendChild(_tableEl);
    section.appendChild(tableWrap);
    _wrap.appendChild(section);
  }

  /* ── setCellValue ────────────────────────────────────────── */
  function setCellValue(row, col, value, state) {
    if (!_cellData[row] || !_cellData[row][col]) return;
    var cell = _cellData[row][col];
    cell.value = value;
    cell.state = state || 'default';

    var el = cell.el;
    el.textContent = (value === Infinity || value > 10000) ? '∞' : value;

    /* Remove all state classes */
    el.classList.remove('state-computing', 'state-optimal', 'state-chosen', 'state-excluded');
    if (state && state !== 'default') {
      /* Force reflow so animation re-triggers */
      void el.offsetWidth;
      el.classList.add('state-' + state);
    }

    /* Scroll cell into view gently */
    try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } catch(e) {}
  }

  /* ── highlightRow ────────────────────────────────────────── */
  function highlightRow(row, state) {
    if (!_cellData[row]) return;
    for (var c = 0; c < _cellData[row].length; c++) {
      var el = _cellData[row][c].el;
      el.classList.remove('state-computing','state-optimal','state-chosen','state-excluded');
      if (state && state !== 'default') el.classList.add('state-' + state);
    }
  }

  /* ── highlightCol ────────────────────────────────────────── */
  function highlightCol(col, state) {
    for (var r = 0; r < _cellData.length; r++) {
      if (!_cellData[r][col]) continue;
      var el = _cellData[r][col].el;
      el.classList.remove('state-computing','state-optimal','state-chosen','state-excluded');
      if (state && state !== 'default') el.classList.add('state-' + state);
    }
  }

  /* ── showItemRow ─────────────────────────────────────────── */
  /*
   * items: [{weight, value}] or [{weight, value, name}]
   * capacity: number (displayed in label only)
   * showRatio: bool — show v/w ratio (fractional mode)
   */
  function showItemRow(items, capacity, showRatio) {
    if (!_wrap) return;
    _itemCards = [];

    var row = document.createElement('div');
    row.className = 'dp-items-row';

    /* Capacity chip */
    var capChip = document.createElement('div');
    capChip.className = 'dp-item-card';
    capChip.innerHTML =
      '<span class="dp-item-label">Capacity</span>' +
      '<span class="dp-item-val" style="color:var(--accent-yellow);">' + capacity + '</span>';
    row.appendChild(capChip);

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var card = document.createElement('div');
      card.className = 'dp-item-card';
      card.setAttribute('data-item-idx', i);

      var ratio = item.value / item.weight;
      var name  = item.name || ('Item ' + (i + 1));

      var innerHTML =
        '<span class="dp-item-check"><i class="fa-solid fa-check"></i></span>' +
        '<span class="dp-item-label">' + name + '</span>' +
        '<span class="dp-item-val">v:' + item.value + ' w:' + item.weight + '</span>';

      if (showRatio) {
        innerHTML += '<span class="dp-item-sub">ratio ' + ratio.toFixed(2) + '</span>';
        innerHTML += '<div class="dp-item-fill-wrap"><div class="dp-item-fill-bar"></div></div>';
      }

      card.innerHTML = innerHTML;
      row.appendChild(card);
      _itemCards.push(card);
    }

    _wrap.appendChild(row);
  }

  /* ── markItemChosen ──────────────────────────────────────── */
  function markItemChosen(itemIdx, chosen) {
    var card = _itemCards[itemIdx];
    if (!card) return;
    card.classList.remove('chosen', 'excluded');
    card.classList.add(chosen ? 'chosen' : 'excluded');
  }

  /* ── updateItemFill ──────────────────────────────────────── */
  /* fraction: 0..1 */
  function updateItemFill(itemIdx, fraction) {
    var card = _itemCards[itemIdx];
    if (!card) return;
    var bar = card.querySelector('.dp-item-fill-bar');
    if (!bar) return;
    var pct = Math.min(100, Math.max(0, Math.round(fraction * 100)));
    bar.style.width = pct + '%';
    if (fraction < 1 && fraction > 0) {
      card.classList.add('partial');
    }
  }

  /* ── showCoinsRow ────────────────────────────────────────── */
  function showCoinsRow(coins) {
    if (!_wrap) return;
    _coinTokens = {};

    var row = document.createElement('div');
    row.className = 'dp-coins-row';

    var lbl = document.createElement('span');
    lbl.className = 'dp-coins-label';
    lbl.textContent = 'Coins:';
    row.appendChild(lbl);

    for (var i = 0; i < coins.length; i++) {
      var token = document.createElement('div');
      token.className = 'dp-coin-token';
      token.textContent = coins[i];
      token.setAttribute('data-coin', coins[i]);
      row.appendChild(token);
      _coinTokens[coins[i]] = token;
    }

    _wrap.appendChild(row);
  }

  /* ── markCoinActive ──────────────────────────────────────── */
  function markCoinActive(coinVal, active) {
    var token = _coinTokens[coinVal];
    if (!token) return;
    if (active) token.classList.add('active');
    else        token.classList.remove('active');
  }

  /* ── addGreedyStep ───────────────────────────────────────── */
  /* For fractional knapsack — appends a step row */
  function addGreedyStep(label, description, value, type) {
    if (!_wrap) return;
    /* Find or create the steps container */
    var stepsEl = _wrap.querySelector('.dp-greedy-steps');
    if (!stepsEl) {
      stepsEl = document.createElement('div');
      stepsEl.className = 'dp-greedy-steps';
      _wrap.appendChild(stepsEl);
    }

    var step = document.createElement('div');
    step.className = 'dp-greedy-step ' + (type || '');
    step.innerHTML =
      '<span class="dp-greedy-step-badge">' + label + '</span>' +
      '<span class="dp-greedy-step-text">' + description + '</span>' +
      '<span class="dp-greedy-step-value">+' + value + '</span>';

    stepsEl.appendChild(step);
    stepsEl.scrollTop = stepsEl.scrollHeight;
  }

  /* ── showResultBanner ────────────────────────────────────── */
  function showResultBanner(text, subtext) {
    if (!_wrap) return;

    /* Remove any existing banner */
    if (_bannerEl && _bannerEl.parentNode) {
      _bannerEl.parentNode.removeChild(_bannerEl);
    }

    _bannerEl = document.createElement('div');
    _bannerEl.className = 'dp-result-banner';
    _bannerEl.innerHTML =
      '<span class="result-main">' + text + '</span>' +
      (subtext ? '<span class="result-sub">' + subtext + '</span>' : '');

    _wrap.appendChild(_bannerEl);
  }

  /* ── captureState ────────────────────────────────────────── */
  function captureState() {
    if (!_wrap) return null;
    var snap = {
      html: _wrap.innerHTML,
      rows: _rows,
      cols: _cols
    };
    return snap;
  }

  /* ── applySnapshot ───────────────────────────────────────── */
  function applySnapshot(snap) {
    if (!snap || !_wrap) return;
    _wrap.innerHTML = snap.html;
    /* Re-sync internal references after DOM restore */
    _rows = snap.rows || 0;
    _cols = snap.cols || 0;
    _tableEl = _wrap.querySelector('.dp-table') || null;

    /* Re-build _cellData from restored DOM */
    _cellData = [];
    if (_tableEl) {
      var bodyRows = _tableEl.querySelectorAll('tbody tr');
      for (var r = 0; r < bodyRows.length; r++) {
        var cells = bodyRows[r].querySelectorAll('td:not(.row-header)');
        var rowData = [];
        for (var c = 0; c < cells.length; c++) {
          rowData.push({ el: cells[c], value: 0, state: 'default' });
        }
        _cellData.push(rowData);
      }
    }

    /* Re-build item cards */
    _itemCards = [];
    var cards = _wrap.querySelectorAll('.dp-item-card[data-item-idx]');
    for (var i = 0; i < cards.length; i++) {
      _itemCards[parseInt(cards[i].getAttribute('data-item-idx'))] = cards[i];
    }

    /* Re-build coin tokens */
    _coinTokens = {};
    var tokens = _wrap.querySelectorAll('.dp-coin-token[data-coin]');
    for (var j = 0; j < tokens.length; j++) {
      _coinTokens[tokens[j].getAttribute('data-coin')] = tokens[j];
    }

    _bannerEl = _wrap.querySelector('.dp-result-banner') || null;
  }

  /* ── restoreState ────────────────────────────────────────── */
  function restoreState(snap) {
    applySnapshot(snap);
  }

  /* ── unmount ─────────────────────────────────────────────── */
  function unmount() {
    if (_container) _container.innerHTML = '';
    _container  = null;
    _algo       = null;
    _mode       = null;
    _wrap       = null;
    _tableEl    = null;
    _cellData   = [];
    _itemCards  = [];
    _coinTokens = {};
    _bannerEl   = null;
  }

  /* ══════════════════════════════════════════════════════════
     NEW PREMIUM API — Knapsack / Fractional / Coin Change
     ══════════════════════════════════════════════════════════ */

  /* Private extra state */
  var _gemCards      = [];   /* gem card elements for knapsack items */
  var _bagEl         = null; /* .dp-knapsack-bag element */
  var _bagCapEl      = null; /* capacity counter element inside bag */
  var _vialEls       = [];   /* .dp-vial elements */
  var _bagFillEl     = null; /* .dp-bag-fill element (fractional) */
  var _bagFillPct    = 0;    /* current fill % (0..100) */
  var _coinTokensNew = {};   /* new coin tokens map (denomination → el) */
  var _1dCells       = [];   /* .dp-1d-cell elements */
  var _1dSection     = null; /* container for 1D array */
  var _arrowOverlay  = null; /* SVG overlay for holographic arrows */

  /* ── helpers ────────────────────────────────────────────── */
  function createElement(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }
  function byId(id) { return document.getElementById(id); }

  /* ── showKnapsackItems ──────────────────────────────────── */
  function showKnapsackItems(items, capacity) {
    if (!_wrap) return;
    var existing = _wrap.querySelector('.dp-physical-world');
    if (existing) existing.parentNode.removeChild(existing);

    var world = createElement('div', 'dp-physical-world');

    var gemsRow = createElement('div', 'dp-gems-row');
    var COLORS = ['#00F0FF','#B026FF','#F0883E','#39D353','#FF6E6E','#F0D060','#79C0FF','#D2A8FF'];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var card = createElement('div', 'dp-gem-card');
      card.setAttribute('id', 'dp-gem-' + i);
      card.innerHTML =
        '<div class="dp-gem-icon" style="color:'+COLORS[i % COLORS.length]+'">◆</div>' +
        '<div class="dp-gem-name">Item '+(i+1)+'</div>' +
        '<div class="dp-gem-stat"><span>W</span><strong>'+item.weight+'</strong></div>' +
        '<div class="dp-gem-stat"><span>V</span><strong>'+item.value+'</strong></div>';
      gemsRow.appendChild(card);
    }
    world.appendChild(gemsRow);

    var bag = createElement('div', 'dp-knapsack-bag');
    bag.setAttribute('id', 'dpKnapsackBag');
    bag.innerHTML =
      '<div class="dp-bag-icon"><i class="fa-solid fa-bag-shopping"></i></div>' +
      '<div class="dp-bag-cap">Cap: <span id="dpBagCap">'+capacity+'</span></div>' +
      '<div class="dp-bag-fill-wrap"><div class="dp-bag-fill-bar" id="dpBagFill" style="width:0%"></div></div>';
    world.appendChild(bag);

    _wrap.insertBefore(world, _wrap.firstChild);
  }

  /* ── showHolographicArrows ──────────────────────────────── */
  function showHolographicArrows(fromLeave, fromTake, toCell) {
    var prev = document.querySelectorAll('.dp-arrow-badge');
    for (var p = 0; p < prev.length; p++) {
      if (prev[p].parentNode) prev[p].parentNode.removeChild(prev[p]);
    }

    function flashCell(r, c, color, label) {
      if (r < 0 || c < 0 || r >= _rows || c >= _cols) return;
      var cell = _cellData[r] && _cellData[r][c] && _cellData[r][c].el;
      if (!cell) return;
      var badge = document.createElement('div');
      badge.className = 'dp-arrow-badge';
      badge.style.cssText = 'position:absolute;top:-18px;left:50%;transform:translateX(-50%);'+
        'font-size:10px;color:'+color+';font-family:monospace;white-space:nowrap;pointer-events:none;'+
        'text-shadow:0 0 6px '+color+';';
      badge.textContent = label + ' ↓';
      cell.style.position = 'relative';
      cell.appendChild(badge);
      setTimeout(function() { if(badge.parentNode) badge.parentNode.removeChild(badge); }, 800);
    }

    if (fromLeave) flashCell(fromLeave.row, fromLeave.col, '#FF6E6E', 'Leave');
    if (fromTake)  flashCell(fromTake.row,  fromTake.col,  '#39D353', 'Take');
  }

  /* ── flyItemToBag ───────────────────────────────────────── */
  function flyItemToBag(itemIdx) {
    var gem = byId('dp-gem-' + itemIdx);
    var bag = byId('dpKnapsackBag');
    if (!gem || !bag) return;
    gem.classList.add('dp-gem-flying');
    setTimeout(function() {
      gem.classList.remove('dp-gem-flying');
      gem.classList.add('chosen');
    }, 600);
  }

  /* ── updateBagCapacity ──────────────────────────────────── */
  function updateBagCapacity(remaining, total) {
    var el = byId('dpBagCap');
    if (el) el.textContent = remaining;
    var fill = byId('dpBagFill');
    if (fill && total > 0) fill.style.width = (((total-remaining)/total)*100) + '%';
  }

  /* ── showVials ──────────────────────────────────────────── */
  function showVials(items) {
    if (!_wrap) return;
    var existing = _wrap.querySelector('.dp-vials-world');
    if (existing) existing.parentNode.removeChild(existing);

    var world = createElement('div', 'dp-vials-world');
    var COLORS = ['#00F0FF','#B026FF','#F0883E','#39D353','#FF6E6E','#F0D060'];
    var maxRatio = 0;
    for (var j = 0; j < items.length; j++) {
      var r = items[j].value / items[j].weight;
      if (r > maxRatio) maxRatio = r;
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var ratio = (item.value / item.weight);
      var fillPct = Math.round((ratio / (maxRatio || 1)) * 100);
      var color = COLORS[i % COLORS.length];

      var vialWrap = createElement('div', 'dp-vial-wrap');
      vialWrap.setAttribute('id', 'dp-vial-' + i);
      vialWrap.innerHTML =
        '<div class="dp-vial-tube">'+
          '<div class="dp-vial-liquid" id="dp-vliq-'+i+'" style="height:'+fillPct+'%;background:'+color+';opacity:0.7;"></div>'+
          '<div class="dp-vial-cut" id="dp-vcut-'+i+'" style="display:none;"></div>'+
        '</div>'+
        '<div class="dp-vial-ratio" style="color:'+color+'">'+(ratio.toFixed(1))+'</div>'+
        '<div class="dp-vial-meta">W:'+item.weight+' V:'+item.value+'</div>';
      world.appendChild(vialWrap);
    }

    /* Bag on the right */
    var bag = createElement('div', 'dp-frac-bag');
    bag.setAttribute('id', 'dpFracBag');
    bag.innerHTML =
      '<div class="dp-frac-bag-label">Bag</div>'+
      '<div class="dp-frac-bag-body">'+
        '<div class="dp-frac-bag-fill" id="dpFracFill" style="height:0%"></div>'+
        '<div class="dp-frac-bag-val" id="dpFracVal">0</div>'+
      '</div>';
    world.appendChild(bag);

    _wrap.insertBefore(world, _wrap.firstChild);
  }

  /* ── sortVials ──────────────────────────────────────────── */
  function sortVials(newOrder) {
    var container = _wrap && _wrap.querySelector('.dp-vials-world');
    if (!container) return;
    for (var i = 0; i < newOrder.length; i++) {
      var vial = byId('dp-vial-' + newOrder[i]);
      if (vial) container.insertBefore(vial, container.querySelector('.dp-frac-bag'));
    }
  }

  /* ── pourVial ───────────────────────────────────────────── */
  function pourVial(vialIdx, fraction, bagValueTotal, capacityTotal) {
    var vial = byId('dp-vial-' + vialIdx);
    if (vial) {
      vial.style.transform = 'rotate(-35deg) translateY(-10px)';
      setTimeout(function() { vial.style.transform = ''; }, 800);
    }
    var fill = byId('dpFracFill');
    if (fill && capacityTotal > 0) {
      fill.style.height = Math.min(100, (bagValueTotal / (capacityTotal * 3)) * 100) + '%';
    }
    var val = byId('dpFracVal');
    if (val) val.textContent = bagValueTotal.toFixed(1);
  }

  /* ── cutVial ────────────────────────────────────────────── */
  function cutVial(vialIdx, fraction) {
    var vial = byId('dp-vcut-' + vialIdx);
    if (!vial) return;
    vial.style.cssText = 'display:block;position:absolute;bottom:'+Math.round(fraction*100)+'%;left:-4px;right:-4px;'+
      'height:2px;background:var(--accent-red);box-shadow:0 0 8px var(--accent-red);';
  }

  /* ── showCoins ──────────────────────────────────────────── */
  function showCoins(coins) {
    if (!_wrap) return;
    var existing = _wrap.querySelector('.dp-coins-world');
    if (existing) existing.parentNode.removeChild(existing);
    var COLORS = [
      {bg:'rgba(0,240,255,0.15)', border:'#00F0FF', text:'#00F0FF'},
      {bg:'rgba(240,208,96,0.15)', border:'#F0D060', text:'#F0D060'},
      {bg:'rgba(240,136,62,0.15)', border:'#F0883E', text:'#F0883E'},
      {bg:'rgba(57,211,83,0.15)', border:'#39D353', text:'#39D353'},
      {bg:'rgba(176,38,255,0.15)', border:'#B026FF', text:'#B026FF'},
    ];
    var world = createElement('div', 'dp-coins-world');
    _coinTokensNew = {};
    for (var i = 0; i < coins.length; i++) {
      var c = COLORS[i % COLORS.length];
      var token = createElement('div', 'dp-coin-token');
      token.setAttribute('id', 'dp-coin-' + coins[i]);
      token.textContent = coins[i];
      token.style.cssText = 'background:'+c.bg+';border-color:'+c.border+';color:'+c.text+';';
      world.appendChild(token);
      _coinTokensNew[coins[i]] = token;
    }
    _wrap.insertBefore(world, _wrap.firstChild);
  }

  /* ── activateCoin ───────────────────────────────────────── */
  function activateCoin(coinValue, active) {
    var token = byId('dp-coin-' + coinValue);
    if (!token) return;
    if (active) token.classList.add('active');
    else token.classList.remove('active');
  }

  /* ── drawArc ────────────────────────────────────────────── */
  function drawArc(fromCol, toCol, arcColor) {
    var fromCell = byId('dp-1d-' + fromCol);
    var toCell   = byId('dp-1d-' + toCol);
    if (!fromCell || !toCell) return;

    var fromRect = fromCell.getBoundingClientRect();
    var toRect   = toCell.getBoundingClientRect();
    var wrapRect = _wrap.getBoundingClientRect();

    var x1 = fromRect.left + fromRect.width/2 - wrapRect.left;
    var x2 = toRect.left   + toRect.width/2   - wrapRect.left;
    var y  = fromRect.top  + fromRect.height/2 - wrapRect.top;

    var arc = document.createElement('div');
    arc.className = 'dp-arc-anim';
    arc.style.cssText =
      'position:absolute;' +
      'left:'+Math.min(x1,x2)+'px;' +
      'top:'+(y - 28)+'px;' +
      'width:'+Math.abs(x2-x1)+'px;' +
      'height:28px;' +
      'border:2px solid '+(arcColor||'var(--accent-blue)')+';' +
      'border-bottom:none;' +
      'border-radius:8px 8px 0 0;' +
      'pointer-events:none;' +
      'animation:arcFade 0.6s ease forwards;' +
      'box-shadow:0 0 8px '+(arcColor||'var(--accent-blue)')+';';
    _wrap.style.position = 'relative';
    _wrap.appendChild(arc);
    setTimeout(function() { if(arc.parentNode) arc.parentNode.removeChild(arc); }, 700);
  }

  /* ── show1DArray ────────────────────────────────────────── */
  function show1DArray(length, initVal) {
    if (!_wrap) return;
    var existing = _wrap.querySelector('.dp-1d-wrap');
    if (existing) existing.parentNode.removeChild(existing);

    _cellData = [[]]; _rows = 1; _cols = length;
    var outer = createElement('div', 'dp-1d-wrap');
    var row   = createElement('div', 'dp-1d-row');

    for (var i = 0; i <= length; i++) {
      var colWrap = createElement('div', 'dp-1d-col');
      var idx = createElement('div', 'dp-1d-idx', i);
      var cell = createElement('div', 'dp-1d-cell');
      cell.setAttribute('id', 'dp-1d-' + i);
      if (i === 0) {
        cell.textContent = '0';
        cell.classList.add('state-zero');
      } else {
        cell.textContent = initVal !== undefined ? initVal : '∞';
      }
      colWrap.appendChild(idx);
      colWrap.appendChild(cell);
      row.appendChild(colWrap);
      _cellData[0][i] = { el: cell, value: (i===0?0:Infinity), state: i===0?'state-zero':'default' };
    }
    outer.appendChild(row);
    _wrap.appendChild(outer);
  }

  /* ── set1DCell ──────────────────────────────────────────── */
  function set1DCell(col, value, state) {
    var cell = byId('dp-1d-' + col);
    if (!cell) return;
    cell.textContent = value === Infinity ? '∞' : value;
    cell.className = 'dp-1d-cell ' + (state || '');
  }

  /* ── Public API ─────────────────────────────────────────── */
  return {
    mount:                mount,
    reset:                reset,
    unmount:              unmount,
    initTable:            initTable,
    setCellValue:         setCellValue,
    highlightRow:         highlightRow,
    highlightCol:         highlightCol,
    showItemRow:          showItemRow,
    markItemChosen:       markItemChosen,
    updateItemFill:       updateItemFill,
    showCoinsRow:         showCoinsRow,
    markCoinActive:       markCoinActive,
    addGreedyStep:        addGreedyStep,
    showResultBanner:     showResultBanner,
    captureState:         captureState,
    applySnapshot:        applySnapshot,
    restoreState:         restoreState,
    /* NEW */
    showKnapsackItems:    showKnapsackItems,
    showHolographicArrows:showHolographicArrows,
    flyItemToBag:         flyItemToBag,
    updateBagCapacity:    updateBagCapacity,
    showVials:            showVials,
    sortVials:            sortVials,
    pourVial:             pourVial,
    cutVial:              cutVial,
    showCoins:            showCoins,
    activateCoin:         activateCoin,
    drawArc:              drawArc,
    show1DArray:          show1DArray,
    set1DCell:            set1DCell
  };

})();
