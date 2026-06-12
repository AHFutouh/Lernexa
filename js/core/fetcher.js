/* ════════════════════════════════════════════════════════════
   Lernexa — fetcher.js
   Loads algorithms.json via XMLHttpRequest (no fetch API).
   Provides a simple callback-based API consumed by all pages.
   ════════════════════════════════════════════════════════════ */

'use strict';

var AlgorithmData = (function() {

  /* Cache so we only ever make one HTTP request */
  var _cache = null;
  var _callbacks = [];
  var _loading = false;
  var _error = null;

  /* ── Public: load and cache ─────────────────────────────── */
  function load(onSuccess, onError) {
    /* If already cached, call back immediately */
    if (_cache !== null) {
      onSuccess(_cache);
      return;
    }

    /* Queue callback if request is already in flight */
    if (_loading) {
      _callbacks.push({ onSuccess: onSuccess, onError: onError });
      return;
    }

    _loading = true;
    _callbacks.push({ onSuccess: onSuccess, onError: onError });

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/algorithms.json', true);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;

      if (xhr.status === 200 || xhr.status === 0) {
        /* status 0 = file:// protocol (local dev) */
        try {
          _cache = JSON.parse(xhr.responseText);
          _loading = false;
          _error = null;
          _flush(true);
        } catch (e) {
          _loading = false;
          _error = 'JSON parse error: ' + e.message;
          _flush(false);
        }
      } else {
        _loading = false;
        _error = 'HTTP ' + xhr.status + ': Failed to load algorithms.json';
        _flush(false);
      }
    };

    xhr.onerror = function() {
      _loading = false;
      _error = 'Network error: Could not reach algorithms.json';
      _flush(false);
    };

    xhr.send();
  }

  /* Drain the callback queue */
  function _flush(success) {
    var cbs = _callbacks.slice();
    _callbacks = [];
    for (var i = 0; i < cbs.length; i++) {
      if (success) {
        if (typeof cbs[i].onSuccess === 'function') cbs[i].onSuccess(_cache);
      } else {
        if (typeof cbs[i].onError === 'function') cbs[i].onError(_error);
      }
    }
  }

  /* ── Public: getById ────────────────────────────────────── */
  function getById(id) {
    if (!_cache) return null;
    for (var i = 0; i < _cache.length; i++) {
      if (_cache[i].id === id) return _cache[i];
    }
    return null;
  }

  /* ── Public: getAll ─────────────────────────────────────── */
  function getAll() { return _cache || []; }

  /* ── Public: getByCategory ──────────────────────────────── */
  function getByCategory(cat) {
    if (!_cache) return [];
    var result = [];
    for (var i = 0; i < _cache.length; i++) {
      if (_cache[i].category === cat) result.push(_cache[i]);
    }
    return result;
  }

  /* ── Public: search ─────────────────────────────────────── */
  function search(query) {
    if (!_cache) return [];
    query = query.toLowerCase().trim();
    if (!query) return _cache.slice();

    var result = [];
    for (var i = 0; i < _cache.length; i++) {
      var algo = _cache[i];
      if (
        algo.name.toLowerCase().indexOf(query) !== -1 ||
        algo.category.toLowerCase().indexOf(query) !== -1 ||
        algo.description.toLowerCase().indexOf(query) !== -1 ||
        _tagsMatch(algo.tags, query)
      ) {
        result.push(algo);
      }
    }
    return result;
  }

  function _tagsMatch(tags, query) {
    if (!tags) return false;
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].toLowerCase().indexOf(query) !== -1) return true;
    }
    return false;
  }

  /* ── Public: getCategories (sorted unique list) ─────────── */
  function getCategories() {
    if (!_cache) return [];
    var seen = {};
    var cats = [];
    for (var i = 0; i < _cache.length; i++) {
      var c = _cache[i].category;
      if (!seen[c]) {
        seen[c] = true;
        cats.push({ id: c, label: _cache[i].categoryLabel });
      }
    }
    return cats;
  }

  /* ── Public: isValidId ──────────────────────────────────── */
  function isValidId(id) {
    return getById(id) !== null;
  }

  return {
    load: load,
    getById: getById,
    getAll: getAll,
    getByCategory: getByCategory,
    search: search,
    getCategories: getCategories,
    isValidId: isValidId
  };

})();
