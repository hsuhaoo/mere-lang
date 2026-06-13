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
  if (v.kind === 'Num') return v.getNumber();
  if (v.kind === 'String') return v.get();
  if (v.kind === 'Bool') return v.get();
  if (v.kind === 'Unit') return undefined; // Unit maps to undefined for comparison
  if (v.kind === 'Result') {
    return {
      ok: v.isOk(),
      value: v.isOk() ? extractValue(v.getOk()) : v.getErr(),
    };
  }
  // If it still has .data (backward compat), use it
  if (v.data !== undefined) return v.data;
  // Fallback: toString
  return v.toString();
}

// Core tests
test('Factorial 5!', `
fn f(n: Num) -> Num {
  if n <= 1 { return 1; }
  n * f(n - 1)
}
f(5)
`, 120);

test('Fibonacci 10', `
fn f(n: Num) -> Num {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  f(n - 1) + f(n - 2)
}
f(10)
`, 55);

test('Division success', `
fn divide(a: Num, b: Num) -> Result<Num> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
let r: Result<Num> = divide(10, 2);
if is_err(r) { let m: String = unwrap_err(r); print(m); }
unwrap(r)
`, 5);

test('Division by zero', `
fn divide(a: Num, b: Num) -> Result<Num> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
fn handle(r: Result<Num>) -> Num {
  if is_err(r) { return len(unwrap_err(r)); }
  0
}
handle(divide(10, 0))
`, 4);

test('List length', `
let l: List<Num> = [1, 2, 3, 4, 5];
list_len(l)
`, 5);

test('Map get', `
let m: Map<Num, Num> = {1: 10, 2: 20};
map_get(m, 1)
`, {ok: true, value: {data: 10}});

test('String length', `
let s: String = "hello";
len(s)
`, 5);

test('Operator precedence', `
let x: Num = 2 + 3 * 4;
x
`, 14);

test('Negative numbers', `
let x: Num = -5;
let y: Num = x + 10;
y
`, 5);

test('Record fields', `
type P = { x: Num, y: Num };
let p: P = { x: 10, y: 20 };
p.x + p.y
`, 30);

test('String concat', `
let s: String = "Hello" + " World";
len(s)
`, 11);

test('Boolean and', `
let x: Bool = true and false;
x
`, false);

test('Boolean or', `
let x: Bool = true or false;
x
`, true);

test('Boolean not', `
let x: Bool = not true;
x
`, false);

test('Comparison >', `
let x: Bool = 5 > 3;
x
`, true);

test('Comparison ==', `
let x: Bool = 5 == 5;
x
`, true);

test('Parenthesized expression', `
let x: Num = (2 + 3) * 4;
x
`, 20);

test('Chained function calls', `
fn double(x: Num) -> Num { x * 2 }
fn square(x: Num) -> Num { x * x }
square(double(3))
`, 36);

test('Function with unit return', `
fn greet(name: String) -> Unit {
  print("Hello, " + name)
}
greet("World")
`, undefined);

test('If false branch (no else)', `
let x: Num = 3;
if x > 5 {
  let y: Num = 1;
  y
}
x
`, 3);

test('Nested ifs', `
let x: Num = 10;
if x > 5 {
  if x > 8 {
    let y: Num = 2;
    y
  }
}
`, 2);

test('Sum of list', `
fn sum(lst: List<Num>) -> Num {
  if list_len(lst) == 0 { return 0; }
  let head: Num = unwrap(get(lst, 0));
  let tail: List<Num> = substring_list(lst, 1, list_len(lst) - 1);
  head + sum(tail)
}
sum([1, 2, 3, 4, 5])
`, 15);

// ── Runtime errors ──────────────────────────────────────────────
testError('unwrap on err value', `
let r: Result<Num> = err("fail");
unwrap(r)
`, 'Called unwrap on err value: "fail"');

testError('unwrap_err on ok value', `
let r: Result<Num> = ok(42);
unwrap_err(r)
`, 'Called unwrap_err on ok value');

// ── Returns err (not throw) ────────────────────────────────────
test('List get out of bounds', `
is_err(get([1, 2, 3], 10))
`, true);

test('Map get missing key', `
let m: Map<Num, Num> = {1: 10};
is_err(get(m, 99))
`, true);

test('Map remove', `
let m: Map<Num, Num> = {1: 10, 2: 20};
map_remove(m, 1);
has(m, 1)
`, false);

// ── Lambda runtime ─────────────────────────────────────────────
test('Lambda with no params', `
let f: Fn<Num> = fn () -> Num { 42 };
f()
`, 42);

test('Lambda as higher-order argument', `
fn apply(g: Fn<Num, Num>, x: Num) -> Num { g(x) }
apply(fn (x: Num) -> Num { x * 2 }, 5)
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

// ── Nested generics ────────────────────────────────────────────
test('Nested List<List<Num>>', `
let l: List<List<Num>> = [[1, 2], [3, 4]];
let inner: List<Num> = unwrap(get(l, 0));
list_len(inner)
`, 2);

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
