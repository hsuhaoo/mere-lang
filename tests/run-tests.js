const { run } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
    const matches = expectedSubstring instanceof RegExp
      ? expectedSubstring.test(e.message)
      : e.message.includes(expectedSubstring);
    if (matches) {
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
  if (v.isNumber()) return v.toRawNumber();
  if (v.isString()) return v.toRawString();
  if (v.isBoolean()) return v.toRawBoolean();
  if (v.isUnit()) return '()';
  if (v.isResult()) {
    return {
      ok: v.isOkValue(),
      value: v.isOkValue() ? extractValue(v.getOk()) : v.getErr(),
    };
  }
  if (v.data !== undefined) return v.data;
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
  if not r.isOk { return r.errMessage.len; }
  0
}
handle(divide(10, 0))
`, 4);

test('List length', `
let l: List<Number> = [1, 2, 3, 4, 5];
l.len
`, 5);

test('Map get', `
let m: Map<Number, Number> = {1: 10, 2: 20};
map_get(m, 1)
`, {ok: true, value: {data: 10}});

test('String length', `
let s: String = "hello";
s.len
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
s.len
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
`, '()');

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
  if lst.len == 0 { return 0; }
  let head: Number = get(lst, 0).value;
  let tail: List<Number> = substring_list(lst, 1, lst.len - 1);
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
s.len
`, 0);

test('result field: isOk on err', `
let r: Result<Number> = err("fail");
not r.isOk
`, true);

test('result field: value on err is unit', `
let r: Result<Number> = err("fail");
r.value
`, '()');

test('result field: errMessage on err', `
let r: Result<Number> = err("fail");
let s: String = r.errMessage;
s.len
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
let m2: Map<Number, Number> = map_remove(m, 1);
has(m2, 1)
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
s.len
`, 4);

test('to_string unit', `
let s: String = to_string(());
s.len
`, 2);

test('to_string list', `
let s: String = to_string([1, 2, 3]);
s.len
`, 9);

test('to_string ok result', `
let s: String = to_string(ok(42));
s.len
`, 6);

test('to_string err result', `
let s: String = to_string(err("fail"));
s.len
`, 11);

test('to_string map', `
let m: Map<Number, Number> = {1: 10, 2: 20};
let s: String = to_string(m);
s.len
`, 14);

test('to_string record', `
type P = { x: Number, y: Number };
let p: P = { x: 10, y: 20 };
let s: String = to_string(p);
s.len
`, 20);

// ── Edge cases: stdlib edges ────────────────────────────────────
testError('len on number errors', `
let x: Number = 42;
x.len
`, /Cannot access field 'len' on type Number/i);
testError('len on boolean errors', `
let x: Boolean = true;
x.len
`, /Cannot access field 'len' on type Boolean/i);

test('abs negative', `
abs(-5)
`, 5);

test('abs positive', `
abs(5)
`, 5);

test('max equal values', `
max(5, 5)
`, 5);

test('min equal values', `
min(5, 5)
`, 5);

test('parse_num success', `
let r: Result<Number> = parse_num("42");
r.value
`, 42);

test('append to list', `
let l: List<Number> = [1, 2];
let l2: List<Number> = append(l, 3);
l2.len
`, 3);

test('list_get out of bounds', `
let l: List<Number> = [1, 2, 3];
not list_get(l, 10).isOk
`, true);

test('get negative index', `
not get([1, 2, 3], -1).isOk
`, true);

test('to_string number', `
to_string(42)
`, "42");

// ── File I/O ────────────────────────────────────────────────────
const ioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simplex-io-test-'));
const ioFilePath = path.join(ioDir, 'test.txt');
const ioLinesPath = path.join(ioDir, 'lines.txt');
const ioWritePath = path.join(ioDir, 'written.txt');
  const ioNoDirPath = path.join(ioDir, 'nope', 'file.txt');
fs.writeFileSync(ioFilePath, 'hello simplex');
fs.writeFileSync(ioLinesPath, 'line1\nline2\nline3\n');
fs.writeFileSync(path.join(ioDir, 'conc-a.txt'), 'aaa');
fs.writeFileSync(path.join(ioDir, 'conc-b.txt'), 'bbb');

test('file_read existing file', `
let r: Result<String> = join(file_read("${ioFilePath}"));
r.value
`, "hello simplex");

test('file_read non-existent file', `
let r: Result<String> = join(file_read("${ioNoDirPath}"));
not r.isOk
`, true);

test('file_read_lines existing file', `
let r: Result<List<String>> = join(file_read_lines("${ioLinesPath}"));
let lines: List<String> = r.value;
lines.len
`, 3);

test('file_read_lines non-existent file', `
let r: Result<List<String>> = join(file_read_lines("${ioNoDirPath}"));
not r.isOk
`, true);

test('file_write and read back', `
let w: Result<Unit> = join(file_write("${ioWritePath}", "written content"));
let r: Result<String> = join(file_read("${ioWritePath}"));
r.value
`, "written content");

test('file_write empty string', `
let w: Result<Unit> = join(file_write("${ioDir}/empty.txt", ""));
let r: Result<String> = join(file_read("${ioDir}/empty.txt"));
r.value
`, "");

test('file_read_lines empty file', `
let r: Result<List<String>> = join(file_read_lines("${ioDir}/empty.txt"));
r.value.len
`, 0);

test('file_write to non-existent directory', `
let r: Result<Unit> = join(file_write("${ioDir}/x/y.txt", "content"));
not r.isOk
`, true);

test('spawn with io inside', `
let w: Result<Unit> = join(file_write("${ioDir}/spawn-test.txt", "spawned io"));
let t: Task<String> = spawn(fn () -> String {
  let r: Result<String> = join(file_read("${ioDir}/spawn-test.txt"));
  r.value
});
let v: String = join(t);
  v
`, "spawned io");

test('concurrent file reads', `
let t1: Task<Result<String>> = file_read("${ioDir}/conc-a.txt");
let t2: Task<Result<String>> = file_read("${ioDir}/conc-b.txt");
let r1: Result<String> = join(t1);
let r2: Result<String> = join(t2);
r1.value + r2.value
`, "aaabbb");

fs.rmSync(ioDir, { recursive: true, force: true });

// ── Tail call optimization ───────────────────────────────────────
test('tail-call sum at depth 10000', `
fn sum(n: Number, acc: Number) -> Number {
  if n == 0 { return acc; }
  return sum(n - 1, acc + n);
}
sum(10000, 0)
`, 50005000);

test('tail-call factorial', `
fn fact(n: Number, acc: Number) -> Number {
  if n <= 1 { return acc; }
  return fact(n - 1, acc * n);
}
fact(5, 1)
`, 120);

// ── Spawn / Join ────────────────────────────────────────────────
test('spawn and join fn', `
let f: Fn<Number> = fn () -> Number { 42 };
let t: Task<Number> = spawn(f);
let v: Number = join(t);
v
`, 42);

test('spawn lambda directly', `
let t: Task<Number> = spawn(fn () -> Number { 7 });
let v: Number = join(t);
v
`, 7);

test('spawn multiple', `
let a: Fn<Number> = fn () -> Number { 1 };
let b: Fn<Number> = fn () -> Number { 2 };
let ta: Task<Number> = spawn(a);
let tb: Task<Number> = spawn(b);
let va: Number = join(ta);
let vb: Number = join(tb);
  va + vb
`, 3);

// ── Nested generics ────────────────────────────────────────────
test('Nested List<List<Number>>', `
let l: List<List<Number>> = [[1, 2], [3, 4]];
let inner: List<Number> = get(l, 0).value;
inner.len
`, 2);

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
