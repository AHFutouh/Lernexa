'use strict';

async function runInfixToPostfix(opts) {
  var engine   = opts.engine;
  var control  = opts.control  || { isPaused: false, isAborted: false };
  var getDelay = opts.getDelay || function(){ return 600; };
  var onLog    = opts.onLog    || function(){};
  var onCnt    = opts.onCounter || function(){};
  var onVar    = opts.onVarUpdate || function(){};

  /* Get expression from input or use default */
  var expr = (opts.customInput && opts.customInput.expression) ||
             (opts.algo && opts.algo.input && opts.algo.input.defaultExpression) ||
             'a+b*c-d/e';

  onLog('info', 'Converting Infix → Postfix (RPN): <span class="log-val">'+expr+'</span>');
  onLog('info', 'Using Shunting-Yard algorithm. Stack handles operator precedence.');

  var precedence = { '+':1, '-':1, '*':2, '/':2, '^':3 };
  var output = [];
  var stack  = [];  /* operator stack */

  if (engine && typeof engine.reset === 'function') engine.reset();
  onVar('expression', expr);
  onVar('output', '');
  onVar('stack_top', '—');

  for (var i = 0; i < expr.length; i++) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;

    var ch = expr[i];
    if (ch === ' ') continue;
    onVar('current_token', ch);

    if (/[a-zA-Z0-9]/.test(ch)) {
      /* Operand → goes directly to output */
      output.push(ch);
      onVar('output', output.join(' '));
      onLog('found', 'Token <span class="log-val">'+ch+'</span> is an operand → output: <span class="log-val">'+output.join(' ')+'</span>');

    } else if (ch === '(') {
      stack.push(ch);
      if (engine) engine.push(ch);
      onCnt('pushes');
      onVar('stack_top', ch);
      onLog('compare', 'Push <span class="log-val">(</span> to stack.');

    } else if (ch === ')') {
      while (stack.length && stack[stack.length-1] !== '(') {
        var op = stack.pop();
        if (engine) engine.pop();
        onCnt('pops');
        output.push(op);
        onVar('output', output.join(' '));
        onLog('swap', 'Pop <span class="log-val">'+op+'</span> from stack → output.');
        await sleep(getDelay() * 0.5);
      }
      stack.pop(); /* remove '(' */
      if (engine) engine.pop();
      onCnt('pops');
      onLog('compare', 'Popped matching <span class="log-val">(</span>.');

    } else if (precedence[ch] !== undefined) {
      /* Operator. '^' is right-associative, so it must use a strict '>'
         comparison (only pop operators of strictly higher precedence);
         left-associative operators use '>='. This makes a^b^c → a b c ^ ^. */
      var isRightAssoc = (ch === '^');
      while (stack.length &&
             stack[stack.length-1] !== '(' &&
             (isRightAssoc
               ? (precedence[stack[stack.length-1]] || 0) >  precedence[ch]
               : (precedence[stack[stack.length-1]] || 0) >= precedence[ch])) {
        var top = stack.pop();
        if (engine) engine.pop();
        onCnt('pops');
        output.push(top);
        onVar('output', output.join(' '));
        onLog('swap', 'Precedence: pop <span class="log-val">'+top+'</span> → output.');
        await sleep(getDelay() * 0.5);
      }
      stack.push(ch);
      if (engine) engine.push(ch);
      onCnt('pushes');
      onVar('stack_top', ch);
      onLog('compare', 'Push operator <span class="log-val">'+ch+'</span> to stack.');
    }

    onCnt('tokens_processed');
    await sleep(getDelay());
  }

  /* Pop remaining operators */
  while (stack.length) {
    while (control.isPaused && !control.isAborted) { await sleep(60); }
    if (control.isAborted) return false;
    var rem = stack.pop();
    if (engine) engine.pop();
    onCnt('pops');
    output.push(rem);
    onVar('output', output.join(' '));
    onLog('swap', 'Pop remaining <span class="log-val">'+rem+'</span> → output.');
    await sleep(getDelay() * 0.6);
  }

  var result = output.join(' ');
  onVar('postfix_result', result);
  onLog('done', '<i class="fa-solid fa-check"></i> Postfix: <span class="log-val" style="font-size:1.1em">'+result+'</span>');
  return true;
}
