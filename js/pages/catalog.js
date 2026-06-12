/* ════════════════════════════════════════════════════════════
   Lernexa — catalog.js
   Owns the catalog page: renders cards, powers filters & search.
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ── State ───────────────────────────────────────────────── */
var CatalogState = {
  allAlgos:   [],
  filtered:   [],
  catFilter:  'all',
  diffFilter: 'all',
  query:      ''
};

/* ── Category metadata ───────────────────────────────────── */
var CAT_META = {
  sorting:    { icon: 'fa-arrow-up-wide-short', color: 'var(--cat-sorting)' },
  searching:  { icon: 'fa-magnifying-glass',    color: 'var(--cat-searching)' },
  graph:      { icon: 'fa-route',               color: 'var(--cat-graph)' },
  trees:      { icon: 'fa-tree',                color: 'var(--cat-trees)' },
  structures: { icon: 'fa-layer-group',          color: 'var(--cat-structures)' },
  dp:         { icon: 'fa-coins',               color: 'var(--cat-dp)' },
  ml:         { icon: 'fa-brain',               color: 'var(--cat-ml)' },
  math:       { icon: 'fa-calculator',          color: 'var(--cat-math)' }
};

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  AlgorithmData.load(
    function(data) {
      CatalogState.allAlgos = data;
      CatalogState.filtered = data.slice();
      _bindFilterButtons();
      _bindSearch();
      _checkURLFilter();
      _render();
    },
    function(err) {
      _showError(err);
    }
  );
});

/* ── Check ?filter= URL param ────────────────────────────── */
function _checkURLFilter() {
  var cat = getParam('filter');
  if (cat && cat !== 'all') {
    CatalogState.catFilter = cat;
    var btn = document.querySelector('[data-filter="category"][data-value="' + cat + '"]');
    if (btn) {
      document.querySelectorAll('[data-filter="category"]').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
    }
    _applyFilters();
  }
}

/* ── Filter buttons ──────────────────────────────────────── */
function _bindFilterButtons() {
  var btns = document.querySelectorAll('.filter-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', _onFilterClick);
  }
}

function _onFilterClick(e) {
  var btn = e.currentTarget;
  var filterType = btn.getAttribute('data-filter');
  var value      = btn.getAttribute('data-value');

  /* Deactivate siblings in same group */
  var siblings = document.querySelectorAll('[data-filter="' + filterType + '"]');
  for (var i = 0; i < siblings.length; i++) {
    siblings[i].classList.remove('active');
  }

  /* Activate clicked */
  btn.classList.add('active');
  if (filterType === 'difficulty') {
    CatalogState.diffFilter = value;
  } else {
    CatalogState.catFilter = value;
  }

  _applyFilters();
  _render();
}

/* ── Search ──────────────────────────────────────────────── */
function _bindSearch() {
  var input = byId('searchInput');
  if (!input) return;

  var debounce;
  input.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(function() {
      CatalogState.query = input.value.trim();
      _applyFilters();
      _render();
    }, 200);
  });
}

/* ── Apply filters ───────────────────────────────────────── */
function _applyFilters() {
  var result = CatalogState.allAlgos.slice();

  /* Search query */
  if (CatalogState.query) {
    var q = CatalogState.query.toLowerCase();
    result = result.filter(function(a) {
      return (
        a.name.toLowerCase().indexOf(q) !== -1 ||
        a.categoryLabel.toLowerCase().indexOf(q) !== -1 ||
        a.description.toLowerCase().indexOf(q) !== -1 ||
        (a.tags && a.tags.join(' ').toLowerCase().indexOf(q) !== -1)
      );
    });
  }

  /* Category filter */
  if (CatalogState.catFilter !== 'all') {
    result = result.filter(function(a) { return a.category === CatalogState.catFilter; });
  }

  /* Difficulty filter */
  if (CatalogState.diffFilter !== 'all') {
    result = result.filter(function(a) { return a.difficulty === CatalogState.diffFilter; });
  }

  CatalogState.filtered = result;

  /* Update results count */
  setText('resultsNum', result.length);
}

/* ── Render ──────────────────────────────────────────────── */
function _render() {
  var main  = byId('catalogMain');
  var empty = byId('catalogEmpty');
  if (!main) return;

  /* Clear previous content except empty state */
  var sections = main.querySelectorAll('.category-section');
  for (var i = 0; i < sections.length; i++) main.removeChild(sections[i]);

  if (!CatalogState.filtered.length) {
    if (empty) empty.classList.add('visible');
    return;
  }
  if (empty) empty.classList.remove('visible');

  /* Group by category */
  var groups = {};
  var groupOrder = [];
  for (var j = 0; j < CatalogState.filtered.length; j++) {
    var algo = CatalogState.filtered[j];
    if (!groups[algo.category]) {
      groups[algo.category] = { label: algo.categoryLabel, items: [] };
      groupOrder.push(algo.category);
    }
    groups[algo.category].items.push(algo);
  }

  /* Render each group */
  for (var k = 0; k < groupOrder.length; k++) {
    var catId = groupOrder[k];
    var group = groups[catId];
    var section = _buildSection(catId, group.label, group.items);
    main.insertBefore(section, empty);
  }
}

/* Build a category section DOM node */
function _buildSection(catId, label, items) {
  var section = createElement('div', 'category-section');
  section.setAttribute('data-cat', catId);

  var meta  = CAT_META[catId] || { icon: 'fa-code', color: 'var(--accent-blue)' };
  var header = createElement('div', 'category-header');
  header.innerHTML =
    '<div class="category-icon" style="background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle);">' +
    '  <i class="fa-solid ' + meta.icon + '" style="color:' + meta.color + ';"></i>' +
    '</div>' +
    '<h2>' + label + '</h2>' +
    '<span class="category-count">' + items.length + ' algorithm' + (items.length !== 1 ? 's' : '') + '</span>';

  var grid = createElement('div', 'cards-grid');
  for (var i = 0; i < items.length; i++) {
    grid.appendChild(_buildCard(items[i]));
  }

  section.appendChild(header);
  section.appendChild(grid);
  return section;
}

/* Build a single algorithm card */
function _buildCard(algo) {
  var a = document.createElement('a');
  a.className = 'algo-card glass-card';
  a.href = 'workspace.html?algo=' + algo.id;

  var meta = CAT_META[algo.category] || { icon: 'fa-code', color: 'var(--accent-blue)' };

  a.innerHTML =
    '<div class="algo-card-header">' +
    '  <span class="algo-category ' + algo.category + '">' + algo.categoryLabel + '</span>' +
    '  <i class="fa-solid ' + (algo.icon || meta.icon) + '" style="font-size:var(--text-2xl); color:' + meta.color + ';"></i>' +
    '</div>' +
    '<div style="display:flex; align-items:center; justify-content:space-between; gap:var(--space-2);">' +
    '  <h3>' + algo.name + '</h3>' +
    '  <span class="difficulty-badge ' + algo.difficulty + '">' + _capFirst(algo.difficulty) + '</span>' +
    '</div>' +
    '<div class="algo-complexity">' +
    '  <span class="complexity-badge">' + algo.timeComplexity.average + '</span>' +
    '  <span class="complexity-label">Avg Time</span>' +
    '  <span class="complexity-badge" style="color:var(--accent-purple);">' + algo.spaceComplexity + '</span>' +
    '  <span class="complexity-label">Space</span>' +
    '</div>' +
    '<p class="algo-desc">' + algo.description + '</p>' +
    _buildTagsHTML(algo.tags) +
    '<span class="algo-launch">Launch Visualizer <i class="fa-solid fa-arrow-right"></i></span>';

  return a;
}

function _buildTagsHTML(tags) {
  if (!tags || !tags.length) return '';
  var html = '<div class="algo-tags">';
  var max = Math.min(tags.length, 3);
  for (var i = 0; i < max; i++) {
    html += '<span class="algo-tag">' + tags[i] + '</span>';
  }
  if (tags.length > 3) {
    html += '<span class="algo-tag">+' + (tags.length - 3) + ' more</span>';
  }
  html += '</div>';
  return html;
}

function _capFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _showError(msg) {
  var main = byId('catalogMain');
  if (!main) return;
  main.innerHTML =
    '<div style="text-align:center; padding:var(--space-16) var(--space-6);">' +
    '  <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; color:var(--accent-red); margin-bottom:var(--space-4); display:block;"></i>' +
    '  <h3 style="color:var(--text-primary); margin-bottom:var(--space-3);">Failed to load algorithms</h3>' +
    '  <p style="color:var(--text-muted);">' + msg + '</p>' +
    '</div>';
}
