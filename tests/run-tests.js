const { run } = require('../dist/index.js');

console.log('=== Simplex Language Test Suite ===');
console.log();

let passed = 0;
let failed = 0;

function test(name, src, expected) {
  try {
    const result = run(src);
    const actual = extractValue(result);
    // Handle Result comparison
    if (expected && expected.ok !== undefined) {
      const actualOk = extractValue(result);
      if (actualOk.ok === expected.ok && actualOk.value?.ok === expected.value?.ok) {
        console.log('✓', name);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actualOk);
        failed++;
      }
    } else if (actual === expected) {
      console.log('✓', name, '=', actual);
      passed++;
    } else {
      console.log('✗', name, 'expected', expected, 'got', actual);
      failed++;
    }
  } catch (e) {
    console.log('✗', name, 'ERROR:', e.message);
    failed++;
  }
}

function testError(name, src, expectedSubstring) {
  try {
    const result = run(src);
    console.log('✗', name, 'expected error, got result');
    failed++;
  } catch (e) {
    if (e.message.includes(expectedSubstring)) {
      console.log('✓', name, '=', e.message);
      passed++;
    } else {
      console.log('✗', name, 'expected "' + expectedSubstring + '", got "' + e.message + '"');
      failed++;
    }
  }
}

/**
 * Extract the primitive value from a Value class instance.
 * This bridges the old .data API used by tests to the new class-based system.
 */
function extractValue(v) {
  if (!v) return undefined;
  // New class-based values
  if (v.kind === 'Number') return v.getNumber();
  if (v.kind === 'String') return v.get();
  if (v.kind === 'Boolean') return v.get();
  if (v.kind === 'Unit') return undefined; // Unit maps to undefined for comparison
  if (v.kind === 'Result') {
    return {
      ok: v.isOk.get(),
      value: v.isOk.get() ? extractValue(v.value) : v.errMessage,
    };
  }
  // If it still has .data (backward compat), use it
  if (v.data !== undefined) return v.data;
  // Fallback: toString
  return v.toString();
}

// Core tests
test('Factorial 5!', `
fn f(n: Number) -> Number {
  if n <= 1 { return 1; }
  n * f(n - 1)
}
f(5)
`, 120);

test('Fibonacci 10', `
fn f(n: Number) -> Number {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  f(n - 1) + f(n - 2)
}
f(10)
`, 55);

test('Division success', `
fn divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
let r: Result<Number> = divide(10, 2);
  if not r.isOk { print(r.errMessage) }
  r.value
`, 5);

test('Division by zero', `
fn divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
fn handle(r: Result<Number>) -> Number {
  if not r.isOk { return len(r.errMessage); }
  0
}
handle(divide(10, 0))
`, 4);

test('List length', `
let l: List<Number> = [1, 2, 3, 4, 5];
list_len(l)
`, 5);

test('Map get', `
let m: Map<Number, Number> = {1: 10, 2: 20};
map_get(m, 1)
`, {ok: true, value: {data: 10}});

test('String length', `
let s: String = "hello";
len(s)
`, 5);

test('Operator precedence', `
let x: Number = 2 + 3 * 4;
x
`, 14);

test('Negative numbers', `
let x: Number = -5;
let y: Number = x + 10;
y
`, 5);

test('Record fields', `
type P = { x: Number, y: Number };
let p: P = { x: 10, y: 20 };
p.x + p.y
`, 30);

test('String concat', `
let s: String = "Hello" + " World";
len(s)
`, 11);

test('Boolean and', `
let x: Boolean = true and false;
x
`, false);

test('Boolean or', `
let x: Boolean = true or false;
x
`, true);

test('Boolean not', `
let x: Boolean = not true;
x
`, false);

test('Comparison >', `
let x: Boolean = 5 > 3;
x
`, true);

test('Comparison ==', `
let x: Boolean = 5 == 5;
x
`, true);

test('Parenthesized expression', `
let x: Number = (2 + 3) * 4;
x
`, 20);

test('Chained function calls', `
fn double(x: Number) -> Number { x * 2 }
fn square(x: Number) -> Number { x * x }
square(double(3))
`, 36);

test('Function with unit return', `
fn greet(name: String) -> Unit {
  print("Hello, " + name)
}
greet("World")
`, undefined);

test('If false branch (no else)', `
let x: Number = 3;
if x > 5 {
  let y: Number = 1;
  y
}
x
`, 3);

test('Nested ifs', `
let x: Number = 10;
if x > 5 {
  if x > 8 {
    let y: Number = 2;
    y
  }
}
`, 2);

test('Sum of list', `
fn sum(lst: List<Number>) -> Number {
  if list_len(lst) == 0 { return 0; }
  let head: Number = get(lst, 0).value;
  let tail: List<Number> = substring_list(lst, 1, list_len(lst) - 1);
  head + sum(tail)
}
sum([1, 2, 3, 4, 5])
`, 15);

// ── Result field access (product type) ────────────────────────
test('result field: isOk on ok', `
let r: Result<Number> = ok(42);
r.isOk
`, true);

test('result field: value on ok', `
let r: Result<Number> = ok(42);
r.value
`, 42);

test('result field: errMessage on ok', `
let r: Result<Number> = ok(42);
let s: String = r.errMessage;
len(s)
`, 0);

test('result field: isOk on err', `
let r: Result<Number> = err("fail");
not r.isOk
`, true);

test('result field: value on err is unit', `
let r: Result<Number> = err("fail");
r.value
`, undefined);

test('result field: errMessage on err', `
let r: Result<Number> = err("fail");
let s: String = r.errMessage;
len(s)
`, 4);

// ── Returns err (not throw) ────────────────────────────────────
test('List get out of bounds', `
not get([1, 2, 3], 10).isOk
`, true);

test('Map get missing key', `
let m: Map<Number, Number> = {1: 10};
not get(m, 99).isOk
`, true);

test('Map remove', `
let m: Map<Number, Number> = {1: 10, 2: 20};
map_remove(m, 1);
has(m, 1)
`, false);

// ── Lambda runtime ─────────────────────────────────────────────
test('Lambda with no params', `
let f: Fn<Number> = fn () -> Number { 42 };
f()
`, 42);

test('Lambda as higher-order argument', `
fn apply(g: Fn<Number, Number>, x: Number) -> Number { g(x) }
apply(fn (x: Number) -> Number { x * 2 }, 5)
`, 10);

// ── to_string other types ──────────────────────────────────────
test('to_string bool', `
let s: String = to_string(true);
len(s)
`, 4);

test('to_string unit', `
let s: String = to_string(());
len(s)
`, 2);

test('to_string list', `
let s: String = to_string([1, 2, 3]);
len(s)
`, 9);

test('to_string ok result', `
let s: String = to_string(ok(42));
len(s)
`, 6);

test('to_string err result', `
let s: String = to_string(err("fail"));
len(s)
`, 11);

test('to_string map', `
let m: Map<Number, Number> = {1: 10, 2: 20};
let s: String = to_string(m);
len(s)
`, 14);

test('to_string record', `
type P = { x: Number, y: Number };
let p: P = { x: 10, y: 20 };
let s: String = to_string(p);
len(s)
`, 20);

// ── Nested generics ────────────────────────────────────────────
test('Nested List<List<Number>>', `
let l: List<List<Number>> = [[1, 2], [3, 4]];
let inner: List<Number> = get(l, 0).value;
list_len(inner)
`, 2);

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
