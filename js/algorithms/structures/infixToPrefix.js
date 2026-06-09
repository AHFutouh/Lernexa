'use strict';

async function runInfixToPrefix(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function(){ return 600; };
  var onLog    = opts.onLog    || function(){};
  var onCnt    = opts.onCounter || function(){};
  var onVar    = opts.onVarUpdate || function(){};

  var expr = (opts.customInput && opts.customInput.expression) ||
             (opts.algo && opts.algo.input && opts.algo.input.defaultExpression) ||
             'a+b*c-d/e';

  onLog('info', 'Converting Infix → Prefix: <span class="log-val">'+expr+'</span>');
  onLog('info', 'Method: reverse expression, convert to postfix, reverse result.');

  /* Step 1: Reverse the expression and swap parentheses */
  var reversed = expr.split('').reverse().map(function(c) {
    if (c === '(') return ')';
    if (c === ')') return '(';
    return c;
  }).join('');

  onVar('expression', expr);
  onVar('reversed_expr', reversed);
  onVar('output', '');
  onVar('stack_top', '—');
  onLog('compare', 'Reversed: <span class="log-val">'+reversed+'</span>');
  await sleep(getDelay());

  /* Step 2: Convert reversed to postfix (same algorithm) */
  var precedence = { '+':1, '-':1, '*':2, '/':2, '^':3 };
  var output = [];
  var stack  = [];
  if (engine && typeof engine.reset === 'function') engine.reset();

  for (var i = 0; i < reversed.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;
    var ch = reversed[i];
    if (ch === ' ') continue;
    onVar('current_token', ch);

    if (/[a-zA-Z0-9]/.test(ch)) {
      output.push(ch);
      onVar('output', output.join(' '));
      onLog('found', 'Operand <span class="log-val">'+ch+'</span> → output.');
    } else if (ch === '(') {
      stack.push(ch);
      if (engine) engine.push(ch);
      onCnt('pushes');
      onVar('stack_top', ch);
    } else if (ch === ')') {
      while (stack.length && stack[stack.length-1] !== '(') {
        var op = stack.pop();
        if (engine) engine.pop();
        onCnt('pops');
        output.push(op);
        onVar('output', output.join(' '));
        onLog('swap', 'Pop <span class="log-val">'+op+'</span> → output.');
        await sleep(getDelay() * 0.4);
      }
      stack.pop();
      if (engine) engine.pop();
      onCnt('pops');
    } else if (precedence[ch] !== undefined) {
      /* Reversed-expression pass: associativity is mirrored versus the
         postfix algorithm. Left-associative operators pop on strict '>',
         while right-associative '^' pops on '>=' — this yields the correct
         prefix output for chained powers (a^b^c → ^ a ^ b c). */
      var isRightAssoc = (ch === '^');
      while (stack.length && stack[stack.length-1] !== '(' &&
             (isRightAssoc
               ? (precedence[stack[stack.length-1]] || 0) >= precedence[ch]
               : (precedence[stack[stack.length-1]] || 0) >  precedence[ch])) {
        var top2 = stack.pop();
        if (engine) engine.pop();
        onCnt('pops');
        output.push(top2);
        onVar('output', output.join(' '));
        onLog('swap', 'Pop <span class="log-val">'+top2+'</span> → output.');
        await sleep(getDelay() * 0.4);
      }
      stack.push(ch);
      if (engine) engine.push(ch);
      onCnt('pushes');
      onVar('stack_top', ch);
    }
    onCnt('tokens_processed');
    await sleep(getDelay() * 0.7);
  }

  while (stack.length) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;
    var rem2 = stack.pop();
    if (engine) engine.pop();
    onCnt('pops');
    output.push(rem2);
    onVar('output', output.join(' '));
    await sleep(getDelay() * 0.4);
  }

  /* Step 3: Reverse the output to get prefix */
  var prefix = output.reverse().join(' ');
  onVar('prefix_result', prefix);
  onLog('done', '<i class="fa-solid fa-check"></i> Prefix: <span class="log-val" style="font-size:1.1em">'+prefix+'</span>');
  return true;
}
