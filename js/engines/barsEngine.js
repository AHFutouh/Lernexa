/* ════════════════════════════════════════════════════════════
   Lernexa — barsEngine.js
   Renders the bar chart for sorting algorithms.
   Zero algorithm logic. Only DOM + CSS classes.
   ════════════════════════════════════════════════════════════ */

'use strict';

var BarsEngine = (function() {

  var _container = null;
  var _algo      = null;

  /* ── mount ───────────────────────────────────────────── */
  function mount(area, algo) {
    _algo = algo;
    area.innerHTML = '';

    var wrapper = createElement('div', 'bars-container');
    wrapper.setAttribute('id', 'barsContainer');
    area.appendChild(wrapper);
    _container = wrapper;

    /* Generate initial random bars */
    var size = 30;
    var sizeSlider = byId('arraySizeSlider');
    if (sizeSlider) size = parseInt(sizeSlider.value);

    var arrayInput = byId('arrayInput');
    if (arrayInput && arrayInput.value.trim()) {
      var parsed = parseNumberArray(arrayInput.value);
      if (parsed) {
        generateFromArray(parsed);
        return;
      }
    }

    if (algo.input && algo.input.defaultArray) {
      generateFromArray(algo.input.defaultArray.slice());
    } else {
      generateBars(size);
    }
  }

  /* ── generateBars (random) ───────────────────────────── */
  function generateBars(count) {
    if (!_container) return;
    _container.innerHTML = '';
    var maxH = _container.clientHeight || 380;

    for (var i = 0; i < count; i++) {
      var value = randomInt(6, 98);
      var bar = createElement('div', 'bar');
      bar.style.height = ((value / 100) * maxH) + 'px';
      bar.dataset.value = value;
      _container.appendChild(bar);
    }
    _toggleManyBars(count);
  }

  /* ── generateFromArray ───────────────────────────────── */
  function generateFromArray(arr) {
    if (!_container) return;
    _container.innerHTML = '';
    var maxH = _container.clientHeight || 380;
    var max  = Math.max.apply(null, arr) || 100;

    for (var i = 0; i < arr.length; i++) {
      var bar = createElement('div', 'bar');
      bar.style.height = ((arr[i] / max) * maxH * 0.92) + 'px';
      bar.dataset.value = arr[i];
      _container.appendChild(bar);
    }
    _toggleManyBars(arr.length);
  }

  /* ── Toggle label visibility based on bar count ─────── */
  function _toggleManyBars(count) {
    if (!_container) return;
    _container.classList.toggle('many-bars', count > 25);
  }

  /* ── getBars ─────────────────────────────────────────── */
  function getBars() {
    if (!_container) return [];
    return Array.from(_container.querySelectorAll('.bar'));
  }

  /* ── swapBars ────────────────────────────────────────── */
  function swapBars(a, b) {
    var tmpH = a.style.height;
    var tmpV = a.dataset.value;
    a.style.height   = b.style.height;
    a.dataset.value  = b.dataset.value;
    b.style.height   = tmpH;
    b.dataset.value  = tmpV;
  }

  /* ── getMaxHeight ────────────────────────────────────── */
  function getMaxHeight() {
    return (_container && _container.clientHeight) || 380;
  }

  /* ── applySnapshot (called by onStep) ────────────────── */
  function applySnapshot(snap) { /* reserved */ }

  /* ── captureState: serialise every bar's visual state ── */
  function captureState() {
    if (!_container) return null;
    var bars = Array.from(_container.querySelectorAll('.bar'));
    return bars.map(function(b) {
      return {
        height:  b.style.height,
        value:   b.dataset.value,
        classes: Array.from(b.classList)
      };
    });
  }

  /* ── restoreState: replay a captured snapshot ──────── */
  function restoreState(state) {
    if (!_container || !Array.isArray(state)) return;
    var bars = Array.from(_container.querySelectorAll('.bar'));
    for (var i = 0; i < bars.length && i < state.length; i++) {
      bars[i].style.height  = state[i].height;
      bars[i].dataset.value = state[i].value;
      bars[i].className     = state[i].classes.join(' ');
    }
  }

  /* ── reset ───────────────────────────────────────────── */
  function reset() {
    var size = 30;
    var sizeSlider = byId('arraySizeSlider');
    if (sizeSlider) size = parseInt(sizeSlider.value);

    var arrayInput = byId('arrayInput');
    if (arrayInput && arrayInput.value.trim()) {
      var parsed = parseNumberArray(arrayInput.value);
      if (parsed) { generateFromArray(parsed); return; }
    }

    if (_algo && _algo.input && _algo.input.defaultArray) {
      generateFromArray(_algo.input.defaultArray.slice());
    } else {
      generateBars(size);
    }
  }


  /* Public helper: update heights after container resize */
  function refreshHeights() {
    if (!_container) return;
    var bars = Array.from(_container.querySelectorAll('.bar'));
    var maxH = _container.clientHeight || 380;
    var maxV = 0;
    bars.forEach(function(b) { var v = parseInt(b.dataset.value) || 0; if (v > maxV) maxV = v; });
    if (!maxV) return;
    bars.forEach(function(b) {
      var v = parseInt(b.dataset.value) || 0;
      b.style.height = ((v / maxV) * maxH * 0.92) + 'px';
    });
  }

  return {
    mount: mount,
    generateBars: generateBars,
    generateFromArray: generateFromArray,
    getBars: getBars,
    swapBars: swapBars,
    getMaxHeight: getMaxHeight,
    applySnapshot: applySnapshot,
    captureState: captureState,
    restoreState: restoreState,
    refreshHeights: refreshHeights,
    reset: reset
  };

})();
