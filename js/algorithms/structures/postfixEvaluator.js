'use strict';

async function runPostfixEvaluator(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function(){ return 600; };
  var onLog    = opts.onLog    || function(){};
  var onCnt    = opts.onCounter || function(){};
  var onVar    = opts.onVarUpdate || function(){};

  /* Expression should be postfix notation with spaces, e.g. "3 4 + 2 * 7 /" */
  var expr = (opts.customInput && opts.customInput.expression) ||
             (opts.algo && opts.algo.input && opts.algo.input.defaultExpression) ||
             '3 4 + 2 * 7 -';

  onLog('info', 'Evaluating Postfix expression: <span class="log-val">'+expr+'</span>');
  onLog('info', 'Scan left to right. Numbers → push to stack. Operator → pop two, compute, push result.');

  var tokens = expr.trim().split(/\s+/);
  var stack  = [];
  if (engine && typeof engine.reset === 'function') engine.reset();

  onVar('expression', expr);
  onVar('stack_top', '—');
  onVar('result', '—');

  for (var i = 0; i < tokens.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var tok = tokens[i];
    onVar('current_token', tok);

    if (!isNaN(parseFloat(tok))) {
      /* Number → push */
      var num = parseFloat(tok);
      stack.push(num);
      if (engine) engine.push(tok);
      onCnt('pushes');
      onVar('stack_top', tok);
      onLog('compare', 'Number <span class="log-val">'+tok+'</span> → push to stack.');
    } else if (['+','-','*','/','^'].indexOf(tok) !== -1) {
      if (stack.length < 2) { onLog('compare', 'Error: not enough operands.'); break; }
      var b = stack.pop();
      if (engine) engine.pop();
      var a = stack.pop();
      if (engine) engine.pop();
      onCnt('pops', 2);
      var res;
      if (tok === '+') res = a + b;
      else if (tok === '-') res = a - b;
      else if (tok === '*') res = a * b;
      else if (tok === '^') res = Math.pow(a, b);
      else { /* division */
        if (b === 0) {
          res = NaN;
          onLog('compare', '<strong>Division by zero</strong> — ' + a + ' / 0 is undefined (result: NaN).');
        } else {
          res = a / b;
        }
      }

      onLog('swap', 'Pop <span class="log-val">'+b+'</span> and <span class="log-val">'+a+'</span>, compute <span class="log-val">'+a+tok+b+'='+res+'</span>');
      stack.push(res);
      if (engine) engine.push(String(res));
      onCnt('pushes');
      onVar('stack_top', String(res));
      onCnt('operations');
    }
    await sleep(getDelay());
  }

  if (stack.length === 1) {
    onVar('result', stack[0]);
    onLog('done', '<i class="fa-solid fa-check"></i> Result = <span class="log-val" style="font-size:1.2em">'+stack[0]+'</span>');
  } else {
    onLog('compare', 'Error: invalid postfix expression.');
  }
  return true;
}
