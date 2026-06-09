/* ════════════════════════════════════════════════════════════
   Lernexa — utils.js
   Pure helper functions with zero side effects.
   Loaded first on every page.
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────
   TIMING
────────────────────────────────────────────────────────── */

/**
 * Promise-based delay — the heartbeat of every animation.
 * `await sleep(300)` suspends the current async function,
 * releases the main thread so the browser can repaint,
 * then resumes after `ms` milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Speed level (1–8) → delay in milliseconds.
 * Maps to 0.25× … 2× playback speed.
 * Higher level = shorter delay = faster animation.
 *
 *  1 = 0.25×  (1600 ms)
 *  2 = 0.5×   (800 ms)
 *  3 = 0.75×  (480 ms)
 *  4 = 1×     (280 ms)   ← default
 *  5 = 1.25×  (170 ms)
 *  6 = 1.5×   (100 ms)
 *  7 = 1.75×  (55 ms)
 *  8 = 2×     (28 ms)
 */
var SPEED_MAP = Object.freeze({
  1: 1600, 2: 800, 3: 480, 4: 280,
  5: 170,  6: 100, 7: 55,  8: 28
});

var SPEED_LABELS = Object.freeze({
  1: '0.25×', 2: '0.5×', 3: '0.75×', 4: '1×',
  5: '1.25×', 6: '1.5×', 7: '1.75×', 8: '2×'
});

function speedToDelay(speed) {
  return SPEED_MAP[speed] || 280;
}

function speedToLabel(speed) {
  return SPEED_LABELS[speed] || '1×';
}

/* ──────────────────────────────────────────────────────────
   MATH HELPERS
────────────────────────────────────────────────────────── */

/** Random integer in [min, max] inclusive. */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clamp value between lo and hi. */
function clamp(value, lo, hi) {
  return Math.min(Math.max(value, lo), hi);
}

/** Euclidean distance between two {x, y} points. */
function euclideanDist(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Manhattan distance between two {row, col} cells. */
function manhattanDist(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Return a new array shuffled (Fisher-Yates). */
function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = randomInt(0, i);
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/** Generate an array of `n` random integers in [min, max]. */
function generateRandomArray(n, min, max) {
  var arr = [];
  for (var i = 0; i < n; i++) arr.push(randomInt(min, max));
  return arr;
}

/* ──────────────────────────────────────────────────────────
   INPUT PARSING & VALIDATION
────────────────────────────────────────────────────────── */

/**
 * Parse a comma-separated string into an array of numbers.
 * Returns null if any token is not a finite number.
 *
 * @param {string} str
 * @returns {number[]|null}
 */
function parseNumberArray(str) {
  if (!str || !str.trim()) return null;
  var parts = str.split(',');
  var result = [];
  for (var i = 0; i < parts.length; i++) {
    var token = parts[i].trim();
    /* Reject empty tokens (trailing/double commas) instead of silently
       coercing '' → 0, which would inject phantom zeros into the data. */
    if (token === '') return null;
    var n = Number(token);
    if (!isFinite(n)) return null;
    result.push(n);
  }
  return result.length ? result : null;
}

/** Sort an array in ascending order (returns NEW array, does not mutate). */
function sortedCopy(arr) {
  return arr.slice().sort(function(a, b) { return a - b; });
}

/** Check if array is sorted ascending. */
function isSorted(arr) {
  for (var i = 0; i < arr.length - 1; i++) {
    if (arr[i] > arr[i + 1]) return false;
  }
  return true;
}

/* ──────────────────────────────────────────────────────────
   DOM HELPERS
────────────────────────────────────────────────────────── */

/** Get element by ID (safe — returns null without throwing). */
function byId(id) {
  return document.getElementById(id);
}

/** Set textContent safely. */
function setText(id, value) {
  var el = byId(id);
  if (el) el.textContent = value;
}

/** Set innerHTML safely. */
function setHTML(id, html) {
  var el = byId(id);
  if (el) el.innerHTML = html;
}

/** Add/remove CSS class. */
function toggleClass(el, cls, force) {
  if (!el) return;
  if (typeof force === 'boolean') {
    el.classList.toggle(cls, force);
  } else {
    el.classList.toggle(cls);
  }
}

/** Create an element with optional className and text. */
function createElement(tag, className, text) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/* ──────────────────────────────────────────────────────────
   URL / ROUTING
────────────────────────────────────────────────────────── */

/** Read a URL search param. Returns null if missing. */
function getParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/** Update a URL param without reloading the page. */
function setParam(name, value) {
  var url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.replaceState({}, '', url);
}

/* ──────────────────────────────────────────────────────────
   NAVBAR — shared across all pages
────────────────────────────────────────────────────────── */
(function initNavbar() {
  var navbar  = byId('navbar');
  var toggle  = byId('navToggle');
  var mobileMenu = byId('navMobileMenu');

  if (navbar) {
    window.addEventListener('scroll', function() {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function() {
      var open = mobileMenu.classList.toggle('open');
      toggle.innerHTML = open
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });
  }

  /* Mark active nav link based on current page */
  var page = window.location.pathname.split('/').pop() || 'index.html';
  var links = document.querySelectorAll('.nav-links a, .nav-mobile-menu a');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href');
    if (href && href.indexOf(page) !== -1) {
      links[i].classList.add('active');
    }
  }
})();
