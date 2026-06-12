'use strict';
var fs   = require('fs');
var path = require('path');
var vm   = require('vm');

var ALGO_DIR = path.join(__dirname, '..', 'js', 'algorithms');
var DATA     = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'algorithms.json'), 'utf8'));
function algoById(id) { return DATA.filter(function (a) { return a.id === id; })[0]; }

var FIXED30 = [23, 5, 17, 2, 29, 11, 8, 14, 26, 3, 19, 7, 22, 1, 28,
               12, 9, 30, 15, 4, 21, 6, 25, 13, 27, 10, 18, 16, 20, 24];

function makeSandbox() {
  var sb = {
    sleep: function () { return Promise.resolve(); },
    setTimeout: function (fn) { return fn && fn(); },
    sortedCopy: function (a) { return a.slice().sort(function (x, y) { return x - y; }); },
    isSorted: function (a) { for (var i = 0; i < a.length - 1; i++) if (a[i] > a[i + 1]) return false; return true; },
    randomInt: function (lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; },
    clamp: function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); },
    euclideanDist: function (a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); },
    Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number,
    String: String, Boolean: Boolean, Date: Date, Set: Set, Map: Map,
    Promise: Promise, BigInt: BigInt, parseInt: parseInt, parseFloat: parseFloat,
    isNaN: isNaN, isFinite: isFinite, console: console
  };
  sb.globalThis = sb;
  return vm.createContext(sb);
}
function loadAlgo(relPath) {
  var ctx  = makeSandbox();
  var code = fs.readFileSync(path.join(ALGO_DIR, relPath), 'utf8');
  vm.runInContext(code, ctx, { filename: relPath });
  return ctx;
}
function makeEngine() {
  var bars = [];
  function mkBar(v) {
    return { style: { height: '0px' }, dataset: { value: String(v) },
      classList: { _s: {},
        add: function () { for (var i = 0; i < arguments.length; i++) this._s[arguments[i]] = true; },
        remove: function () { for (var i = 0; i < arguments.length; i++) delete this._s[arguments[i]]; },
        toggle: function (c) { this._s[c] ? delete this._s[c] : (this._s[c] = true); },
        contains: function (c) { return !!this._s[c]; },
        replace: function (a, b) { delete this._s[a]; this._s[b] = true; } } };
  }
  var api = {
    generateFromArray: function (arr) { bars = arr.map(mkBar); },
    generateBars:      function (n)   { bars = []; for (var i = 0; i < n; i++) bars.push(mkBar(1)); },
    updateArray:       function (arr) { bars = arr.map(mkBar); },
    getBars:           function () { return bars; },
    getMaxHeight:      function () { return 400; },
    swapBars:          function (a, b) { var th = a.style.height, tv = a.dataset.value;
      a.style.height = b.style.height; a.dataset.value = b.dataset.value; b.style.height = th; b.dataset.value = tv; },
    getCells:          function () { return []; },
    getAll:            function () { return bars.map(function (b) { return parseInt(b.dataset.value); }); },
    _values:           function () { return bars.map(function (b) { return parseInt(b.dataset.value); }); }
  };
  return new Proxy(api, { get: function (t, p) { return (p in t) ? t[p] : function () {}; } });
}
function makeCapture() {
  var cap = { counters: {}, vars: {}, logs: [], steps: [],
    onCounter: function (k, by) { cap.counters[k] = (cap.counters[k] || 0) + (by === undefined ? 1 : by); },
    onVarUpdate: function (n, v) { cap.vars[n] = v; },
    onLog: function (type, msg) { cap.logs.push({ type: type, msg: msg }); },
    onStep: function (s) { cap.steps.push(s); },
    getDelay: function () { return 0; } };
  return cap;
}
function baseOpts(extra) {
  var cap = makeCapture();
  var opts = { engine: makeEngine(), control: { isPaused: false, isAborted: false },
    getDelay: cap.getDelay, onLog: cap.onLog, onCounter: cap.onCounter, onVarUpdate: cap.onVarUpdate, onStep: cap.onStep };
  for (var k in (extra || {})) opts[k] = extra[k];
  return { opts: opts, cap: cap };
}
var passed = 0, failed = 0;
function ok(name, cond, detail) { if (cond) { passed++; console.log('  PASS ' + name); } else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); } }
function eq(name, got, want) { ok(name, got === want, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
function isSortedArr(a) { for (var i = 0; i < a.length - 1; i++) if (a[i] > a[i + 1]) return false; return true; }
function samePermutation(a, b) { if (a.length !== b.length) return false;
  var x = a.slice().sort(function (p, q) { return p - q; }), y = b.slice().sort(function (p, q) { return p - q; });
  for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; return true; }
function lastStepOfType(steps, type) { for (var i = steps.length - 1; i >= 0; i--) if (steps[i].type === type) return steps[i]; return null; }
function knapsackBrute(items, W) { var best = 0, n = items.length;
  for (var mask = 0; mask < (1 << n); mask++) { var w = 0, v = 0;
    for (var i = 0; i < n; i++) if (mask & (1 << i)) { w += items[i].weight; v += items[i].value; }
    if (w <= W && v > best) best = v; } return best; }
var SORTS = [
  ['bubble-sort','sorting/bubble.js','runBubbleSort'],
  ['selection-sort','sorting/selection.js','runSelectionSort'],
  ['insertion-sort','sorting/insertion.js','runInsertionSort'],
  ['merge-sort','sorting/merge.js','runMergeSort'],
  ['quick-sort','sorting/quick.js','runQuickSort'],
  ['heap-sort','sorting/heap.js','runHeapSort']];
var COUNTS = {};
async function run() {
  console.log('\nSorts -- correctness (produce a sorted permutation):');
  for (var s = 0; s < SORTS.length; s++) {
    var id = SORTS[s][0], file = SORTS[s][1], fn = SORTS[s][2];
    var ctx = loadAlgo(file);
    var b = baseOpts({ array: FIXED30.slice(), algo: algoById(id), arraySize: FIXED30.length });
    var done = await ctx[fn](b.opts);
    var out = b.opts.engine._values();
    ok(id + ' completes', done === true);
    ok(id + ' output sorted', isSortedArr(out), out.join(','));
    ok(id + ' is a permutation of input', samePermutation(out, FIXED30));
    COUNTS[id] = b.cap.counters;
  }
  console.log('\nSearches -- correctness:');
  var lin = loadAlgo('searching/linear.js');
  var lp = baseOpts({ array: [4,7,2,19,1,13,8], target: 13, algo: algoById('linear-search') });
  await lin.runLinearSearch(lp.opts);
  var lf = lastStepOfType(lp.cap.steps, 'FOUND'); eq('linear finds 13 at index 5', lf && lf.foundIndex, 5);
  var lin2 = loadAlgo('searching/linear.js');
  var lp2 = baseOpts({ array: [4,7,2,19,1,13,8], target: 99, algo: algoById('linear-search') });
  await lin2.runLinearSearch(lp2.opts);
  ok('linear reports NOT_FOUND for 99', !!lastStepOfType(lp2.cap.steps, 'NOT_FOUND'));
  var sortedArr = [2,5,8,12,16,23,38,56,72,91];
  var bin = loadAlgo('searching/binary.js');
  var bp = baseOpts({ array: sortedArr.slice(), target: 23, algo: algoById('binary-search') });
  await bin.runBinarySearch(bp.opts);
  var bf = lastStepOfType(bp.cap.steps, 'FOUND'); eq('binary finds 23 at index 5', bf && bf.foundIndex, 5);
  var bin2 = loadAlgo('searching/binary.js');
  var bp2 = baseOpts({ array: sortedArr.slice(), target: 17, algo: algoById('binary-search') });
  await bin2.runBinarySearch(bp2.opts);
  ok('binary reports NOT_FOUND for 17', !!lastStepOfType(bp2.cap.steps, 'NOT_FOUND'));
  var interp = loadAlgo('searching/interpolation.js');
  var ip = baseOpts({ array: [10,20,30,40,50,60,70,80,90,100], target: 70, algo: algoById('interpolation-search') });
  await interp.runInterpolationSearch(ip.opts);
  var ifo = lastStepOfType(ip.cap.steps, 'FOUND'); eq('interpolation finds 70 at index 6', ifo && ifo.foundIndex, 6);
  console.log('\nMath / DP -- correctness:');
  var euc = loadAlgo('math/euclidean.js');
  var ep = baseOpts({ algo: algoById('euclidean-algorithm') });
  await euc.runEuclidean(ep.opts);
  eq('euclidean GCD(56,98) = 14', Number(ep.cap.vars.gcd), 14);
  var kn = loadAlgo('dp/knapsack.js');
  var kAlgo = algoById('knapsack');
  var kp = baseOpts({ algo: kAlgo });
  await kn.runKnapsack(kp.opts);
  var items = kAlgo.input.defaultItems.slice(0, 8);
  var Weff = Math.min(kAlgo.input.defaultCapacity, 20);
  var expectOpt = knapsackBrute(items, Weff);
  eq('knapsack optimal == brute force (cap ' + Weff + ')', Number(kp.cap.vars.optimal_value), expectOpt);
  var rsa = loadAlgo('math/rsa.js');
  var rp = baseOpts({ algo: algoById('rsa-encryption') });
  await rsa.runRSA(rp.opts);
  eq('rsa decrypted === original message', Number(rp.cap.vars.decrypted), Number(rp.cap.vars.M));
  console.log('\nOperation counts on FIXED30 (regression baseline):');
  var BASELINE = JSON.parse(fs.readFileSync(path.join(__dirname, 'counts.baseline.json'), 'utf8'));
  for (var i = 0; i < SORTS.length; i++) {
    var sid = SORTS[i][0], got = COUNTS[sid] || {}, want = BASELINE[sid];
    if (!want) { console.log('  * ' + sid + ': ' + JSON.stringify(got) + '  (no baseline yet)'); continue; }
    var keys = Object.keys(want), match = keys.every(function (k) { return got[k] === want[k]; });
    ok(sid + ' counts == baseline ' + JSON.stringify(want), match, JSON.stringify(got));
  }
  console.log('\n' + (failed === 0 ? 'ALL PASS' : failed + ' FAILED') + '  (' + passed + ' passed, ' + failed + ' failed)\n');
  process.exit(failed === 0 ? 0 : 1);
}
run().catch(function (e) { console.error('Harness error:', e); process.exit(2); });
