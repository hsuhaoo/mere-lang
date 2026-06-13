const { run } = require('../src/index');

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

/**
 * Extract the primitive value from a Value class instance.
 * This bridges the old .data API used by tests to the new class-based system.
 */
function extractValue(v) {
  if (!v) return undefined;
  // New class-based values
  if (v.kind === 'Int') return v.getNumber();
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
fn f(n: Int) -> Int {
  if n <= 1 { return 1; }
  n * f(n - 1)
}
f(5)
`, 120);

test('Fibonacci 10', `
fn f(n: Int) -> Int {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  f(n - 1) + f(n - 2)
}
f(10)
`, 55);

test('Division success', `
fn divide(a: Int, b: Int) -> Result<Int> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
let r: Result<Int> = divide(10, 2);
if is_err(r) { let m: String = unwrap_err(r); print(m); }
unwrap(r)
`, 5);

test('Division by zero', `
fn divide(a: Int, b: Int) -> Result<Int> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
fn handle(r: Result<Int>) -> Int {
  if is_err(r) { return len(unwrap_err(r)); }
  0
}
handle(divide(10, 0))
`, 4);

test('List length', `
let l: List<Int> = [1, 2, 3, 4, 5];
list_len(l)
`, 5);

test('Map get', `
let m: Map<Int, Int> = {1: 10, 2: 20};
map_get(m, 1)
`, {ok: true, value: {data: 10}});

test('String length', `
let s: String = "hello";
len(s)
`, 5);

test('Operator precedence', `
let x: Int = 2 + 3 * 4;
x
`, 14);

test('Negative numbers', `
let x: Int = -5;
let y: Int = x + 10;
y
`, 5);

test('Record fields', `
type P = { x: Int, y: Int };
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

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
