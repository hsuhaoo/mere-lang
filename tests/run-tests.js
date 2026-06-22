const { run } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== Mere Language Test Suite ===');
console.log();

let passed = 0;
let failed = 0;

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i]) && Array.isArray(b[i])) {
      if (!arraysEqual(a[i], b[i])) return false;
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

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
    } else if (Array.isArray(actual) && Array.isArray(expected)) {
      if (arraysEqual(actual, expected)) {
        console.log('✓', name);
        passed++;
      } else {
        console.log('✗', name, 'expected', JSON.stringify(expected), 'got', JSON.stringify(actual));
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
  if (v.isList()) {
    const items = [];
    for (let i = 0; i < v.length(); i++) {
      items.push(extractValue(v.get(i)));
    }
    return items;
  }
  if (v.isResult()) {
    return {
      ok: v.isOkValue(),
      value: v.isOkValue() ? extractValue(v.getOk()) : v.getErr(),
    };
  }
  if (v.data !== undefined) return v.data;
  return v.toString();
}

// ── Named function as first-class value ──────────────────────────

test('named fn passed to fn param at runtime', `
fn foo(x: Number, y: Number) -> Number { x + y };
fn call(f: Fn<Number, Number, Number>) -> Number { f(3, 4) };
call(foo)
`, 7);

test('named fn as value accesses top-level let', `
let base: Number = 10;
fn add_base(n: Number) -> Number { n + base };
fn call(f: Fn<Number, Number>) -> Number { f(5) };
call(add_base)
`, 15);

test('named fn passed to named fn via Fn type', `
let factor: Number = 3;
fn mul(n: Number) -> Number { n * factor };
fn apply(f: Fn<Number, Number>, x: Number) -> Number { f(x) };
apply(mul, 4)
`, 12);

// ── Lambda calling named function (scope bridging) ──────────────

test('lambda callback calls named fn that accesses top-level let', `
let offset: Number = 100;
fn add_offset(n: Number) -> Number { n + offset };
let f: Fn<Number, Number> = fn(x: Number) -> Number { add_offset(x) };
f(50)
`, 150);

test('chained: named fn -> named fn -> top-level let', `
let greeting: String = "Hello, ";
fn greet(name: String) -> String { greeting + name };
fn shout(s: String) -> String { greet(s) + "!" };
shout("World")
`, "Hello, World!");

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

test('cos zero', `
cos(0)
`, 1);

test('cos pi', `
cos(pi())
`, -1);

test('lerp mid', `
lerp(0, 10, 0.5)
`, 5);

test('lerp full', `
lerp(0, 10, 1)
`, 10);

test('clamp mid', `
clamp(5, 0, 10)
`, 5);

test('clamp low', `
clamp(-5, 0, 10)
`, 0);

test('clamp high', `
clamp(15, 0, 10)
`, 10);

test('ease_in zero', `
ease_in(0)
`, 0);

test('ease_in one', `
ease_in(1)
`, 1);

test('ease_in half', `
ease_in(0.5)
`, 0.25);

test('ease_out zero', `
ease_out(0)
`, 0);

test('ease_out half', `
ease_out(0.5)
`, 0.75);

test('ease_out one', `
ease_out(1)
`, 1);

test('ease_in_out zero', `
ease_in_out(0)
`, 0);

test('ease_in_out quarter', `
ease_in_out(0.25)
`, 0.125);

test('ease_in_out three_quarter', `
ease_in_out(0.75)
`, 0.875);

test('ease_in_out one', `
ease_in_out(1)
`, 1);

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
const ioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mere-io-test-'));
const ioFilePath = path.join(ioDir, 'test.txt');
const ioLinesPath = path.join(ioDir, 'lines.txt');
const ioWritePath = path.join(ioDir, 'written.txt');
  const ioNoDirPath = path.join(ioDir, 'nope', 'file.txt');
fs.writeFileSync(ioFilePath, 'hello mere');
fs.writeFileSync(ioLinesPath, 'line1\nline2\nline3\n');
fs.writeFileSync(path.join(ioDir, 'conc-a.txt'), 'aaa');
fs.writeFileSync(path.join(ioDir, 'conc-b.txt'), 'bbb');

test('file_read existing file', `
let r: Result<String> = join(file_read("${ioFilePath}"));
r.value
`, "hello mere");

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

// ── Record update ──────────────────────────────────────────────
test('record_update changes field value', `
type P = { x: Number, y: Number };
let p: P = { x: 10, y: 20 };
let p2: P = record_update(p, "x", 30);
p2.x
`, 30);

test('record_update preserves other fields', `
type P = { x: Number, y: Number };
let p: P = { x: 10, y: 20 };
let p2: P = record_update(p, "x", 30);
p2.y
`, 20);

test('record_update returns same record type', `
type P = { x: Number, y: Number };
let p: P = { x: 1, y: 2 };
let p2: P = record_update(p, "y", 99);
  p2.y
`, 99);

// ── elif ────────────────────────────────────────────────

test('elif basic: first branch taken', `
let x: Number = 10;
if x > 5 {
  1
} elif x > 0 {
  2
} elif x > -5 {
  3
}
`, 1);

test('elif basic: second branch taken', `
let x: Number = 1;
if x > 5 {
  1
} elif x > 0 {
  2
} elif x > -5 {
  3
}
`, 2);

test('elif basic: third branch taken', `
let x: Number = -1;
if x > 5 {
  1
} elif x > 0 {
  2
} elif x > -5 {
  3
}
`, 3);

test('elif basic: no branch taken', `
let x: Number = -10;
if x > 5 {
  1
} elif x > 0 {
  2
} elif x > -5 {
  3
}
`, '()');

test('elif nested', `
let x: Number = 5;
if x > 10 {
  1
} elif x > 3 {
  if x > 4 {
    2
  } elif x > 2 {
    3
  }
} elif x > 0 {
  4
}
`, 2);

test('elif as expression in let', `
let x: Number = 1;
let result: Number = if x > 5 { 10 } elif x > 0 { 20 } elif x > -5 { 30 };
result
`, 20);

test('elif typecheck correct', `
fn classify(n: Number) -> String {
  if n > 0 { "pos" } elif n == 0 { "zero" } elif n < 0 { "neg" };
  "default"
};
classify(1)
`, 'default');

// ── else ────────────────────────────────────────────────

test('else: if false take else', `
if false { 1 } else { 2 }
`, 2);

test('else: if true skip else', `
if true { 1 } else { 2 }
`, 1);

test('else: elif-else chain', `
if false { 1 } elif false { 2 } else { 3 }
`, 3);

test('else: elif true skips else', `
if false { 1 } elif true { 2 } else { 3 }
`, 2);

// ── long elif chains ────────────────────────────────────

test('long elif: first branch taken (5 elif + else)', `
let x: Number = 10;
let result: String = if x > 5 {
  "a"
} elif x > 4 {
  "b"
} elif x > 3 {
  "c"
} elif x > 2 {
  "d"
} elif x > 1 {
  "e"
} else {
  "f"
};
result
`, "a");

test('long elif: middle branch taken (5 elif + else)', `
let x: Number = 2;
let result: String = if x > 5 {
  "a"
} elif x > 4 {
  "b"
} elif x > 3 {
  "c"
} elif x > 2 {
  "d"
} elif x > 1 {
  "e"
} else {
  "f"
};
result
`, "e");

test('long elif: last elif taken (5 elif + else)', `
let x: Number = 4;
let result: String = if x > 5 {
  "a"
} elif x > 4 {
  "b"
} elif x > 3 {
  "c"
} elif x > 2 {
  "d"
} elif x > 1 {
  "e"
} else {
  "f"
};
result
`, "c");

test('long elif: else taken (5 elif + else)', `
let x: Number = 0;
let result: String = if x > 5 {
  "a"
} elif x > 4 {
  "b"
} elif x > 3 {
  "c"
} elif x > 2 {
  "d"
} elif x > 1 {
  "e"
} else {
  "f"
};
result
`, "f");

test('long elif: global state (like game handle_hover)', `
let state: String = "game";
let result: String = if state == "title" {
  "title"
} elif state == "menu" {
  "menu"
} elif state == "character-select" {
  "char"
} elif state == "game" {
  "game"
} elif state == "pause" {
  "pause"
} else {
  "unknown"
};
result
`, "game");

// ── concat_all ───────────────────────────────────────────

test('concat_all joins strings', `
concat_all(["a", "b", "c"], ", ")
`, "a, b, c");

test('concat_all single element', `
concat_all(["hello"], ", ")
`, "hello");

test('concat_all empty list', `
let xs: List<String> = [];
concat_all(xs, ",")
`, "");

test('concat_all empty separator', `
concat_all(["a", "b", "c"], "")
`, "abc");

// ── list_pop / list_remove_at / list_index_of / find ──────

test('list_pop empty list', `
let xs: List<Number> = [];
let popped: List<Number> = list_pop(xs);
popped.len
`, 0);

test('list_pop single element', `
let xs: List<Number> = [42];
let popped: List<Number> = list_pop(xs);
popped.len
`, 0);

test('list_pop multi element', `
let xs: List<Number> = [1, 2, 3];
let popped: List<Number> = list_pop(xs);
let last: Number = list_get(xs, xs.len - 1).value;
popped.len + last
`, 5); // popped=[1,2] len=2, last=3 -> 5

test('list_pop two elements', `
let xs: List<Number> = [10, 20];
let popped: List<Number> = list_pop(xs);
list_get(popped, 0).value
`, 10); // popped=[10]

test('list_pop preserves original', `
let xs: List<Number> = [1, 2, 3];
let popped: List<Number> = list_pop(xs);
xs.len
`, 3); // original unchanged

test('list_remove_at normal', `
let xs: List<Number> = [10, 20, 30, 40];
let removed: List<Number> = list_remove_at(xs, 1);
removed
`, [10, 30, 40]);

test('list_remove_at out of bounds', `
let xs: List<Number> = [1, 2, 3];
let removed: List<Number> = list_remove_at(xs, 10);
removed.len
`, 3);

test('list_remove_at first element', `
let xs: List<Number> = [10, 20, 30];
let removed: List<Number> = list_remove_at(xs, 0);
removed
`, [20, 30]);

test('list_remove_at last element', `
let xs: List<Number> = [10, 20, 30];
let removed: List<Number> = list_remove_at(xs, 2);
removed
`, [10, 20]);

test('list_remove_at single element returns empty', `
let xs: List<Number> = [42];
let removed: List<Number> = list_remove_at(xs, 0);
removed.len
`, 0);

test('list_remove_at negative index unchanged', `
let xs: List<Number> = [1, 2, 3];
let removed: List<Number> = list_remove_at(xs, -1);
removed.len
`, 3);

test('list_remove_at empty list unchanged', `
let xs: List<Number> = [];
let removed: List<Number> = list_remove_at(xs, 0);
removed.len
`, 0);

test('list_remove_at preserves original', `
let xs: List<Number> = [1, 2, 3];
let removed: List<Number> = list_remove_at(xs, 1);
xs.len
`, 3);

test('list_index_of found', `
let xs: List<Number> = [10, 20, 30];
list_index_of(xs, 20)
`, 1);

test('list_index_of not found', `
let xs: List<Number> = [10, 20, 30];
list_index_of(xs, 99)
`, -1);

test('list_index_of string', `
let xs: List<String> = ["a", "b", "c"];
list_index_of(xs, "c")
`, 2);

test('list_index_of first element', `
let xs: List<Number> = [5, 10, 15];
list_index_of(xs, 5)
`, 0);

test('list_index_of duplicates returns first', `
let xs: List<Number> = [7, 8, 7, 9];
list_index_of(xs, 7)
`, 0);

test('list_index_of empty list', `
let xs: List<Number> = [];
list_index_of(xs, 1)
`, -1);

test('list_index_of boolean', `
let xs: List<Boolean> = [true, false, true];
list_index_of(xs, false)
`, 1);

test('find found', `
find([10, 20, 30], fn(x: Number) -> Boolean { x > 15 }).value
`, 20);

test('find not found', `
let r: Result<Number> = find([1, 2, 3], fn(x: Number) -> Boolean { x > 10 });
not r.isOk
`, true);

test('find empty list', `
let xs: List<Number> = [];
let r: Result<Number> = find(xs, fn(x: Number) -> Boolean { true });
not r.isOk
`, true);

test('find first element match', `
find([10, 20, 30], fn(x: Number) -> Boolean { x < 25 }).value
`, 10);

test('find with strings', `
find(["cat", "dog", "bird"], fn(s: String) -> Boolean { s == "dog" }).value
`, "dog");

// ── range / for_each ────────────────────────────────────

test('range produces numbers', `
range(0, 5)
`, [0, 1, 2, 3, 4]);

test('range empty when start >= end', `
range(5, 3)
`, []);

test('range single element', `
range(3, 4)
`, [3]);

test('for_each returns Unit', `
let xs: List<Number> = [1, 2, 3];
for_each(xs, fn(x: Number) -> Unit {})
`, '()');

test('for_each empty list', `
let xs: List<Number> = [];
for_each(xs, fn(x: Number) -> Unit {})
`, '()');

// ── sort ────────────────────────────────────────────────

test('sort numbers ascending', `
sort([3, 1, 4, 1, 5, 9, 2, 6])
`, [1, 1, 2, 3, 4, 5, 6, 9]);

test('sort strings', `
sort(["c", "a", "b"])
`, ["a", "b", "c"]);

test('sort single element', `
sort([42])
`, [42]);

test('sort empty list', `
let xs: List<Number> = [];
sort(xs)
`, []);

// ── sort_by ──────────────────────────────────────────────

test('sort_by numbers descending', `
sort_by([1, 5, 3, 2, 4], fn(a: Number, b: Number) -> Number { b - a })
`, [5, 4, 3, 2, 1]);

test('sort_by strings by length', `
sort_by(["aa", "b", "ccc"], fn(a: String, b: String) -> Number { a.len - b.len })
`, ["b", "aa", "ccc"]);

test('sort_by ascending', `
sort_by([3, 1, 2], fn(a: Number, b: Number) -> Number { a - b })
`, [1, 2, 3]);

// ── map_keys / map_values ────────────────────────────

test('map_keys returns string keys', `
let m: Map<Number, String> = {1: "a", 2: "b", 3: "c"};
let keys: List<String> = map_keys(m);
sort(keys)
`, ["1", "2", "3"]);

test('map_values returns values', `
let m: Map<Number, String> = {1: "a", 2: "b", 3: "c"};
let vals: List<String> = map_values(m);
sort(vals)
`, ["a", "b", "c"]);

test('map_keys fold over keys', `
let m: Map<Number, Number> = {10: 1, 20: 2, 30: 3};
let keys: List<String> = map_keys(m);
fold(keys, 0, fn(acc: Number, k: String) -> Number { acc + parse_num(k).value })
`, 60);

test('map_keys fold inferred', `
let m: Map<Number, Number> = {10: 1, 20: 2, 30: 3};
fold(map_keys(m), 0, fn(acc: Number, k: String) -> Number { acc + parse_num(k).value })
`, 60);

test('map_keys empty map', `
let m: Map<String, Number> = {};
let keys: List<String> = map_keys(m);
keys.len
`, 0);

test('map_values empty map', `
let m: Map<String, Number> = {};
let vals: List<Number> = map_values(m);
vals.len
`, 0);

// ── sleep ───────────────────────────────────────────────

test('sleep and join', `
join(sleep(1))
`, '()');

// ── Mutable variables (let mut) ──────────────────────────

test('let mut number assign', `
let mut x: Number = 10;
x = 20;
x
`, 20);

test('let mut increment', `
let mut x: Number = 0;
x = x + 1;
x = x + 1;
x = x + 1;
x
`, 3);

test('let mut string', `
let mut s: String = "hello";
s = s + " world";
s
`, "hello world");

test('let mut boolean', `
let mut b: Boolean = true;
b = false;
b
`, false);

test('let mut in function body', `
fn test_mut() -> Number {
  let mut x: Number = 0;
  x = 42;
  x
}
test_mut()
`, 42);

test('let mut overwrite in function', `
fn accum(n: Number) -> Number {
  let mut sum: Number = 0;
  sum = n;
  sum = sum + 1;
  sum
}
accum(5)
`, 6);

testError('assign to immutable variable', `
let x: Number = 5;
x = 6;
`, 'Cannot assign to immutable');

testError('assign to undefined variable', `
undefined_var = 42;
`, 'Undefined variable');

// ── while loop ─────────────────────────────────────────

test('while basic sum', `
let mut sum: Number = 0;
let mut i: Number = 0;
while i < 5 {
  sum = sum + i;
  i = i + 1;
}
sum
`, 10);

test('while condition false on entry', `
let mut x: Number = 42;
while false {
  x = 0;
}
x
`, 42);

test('while with boolean condition', `
let mut run: Boolean = true;
let mut count: Number = 0;
while run {
  count = count + 1;
  if count >= 3 {
    run = false;
  }
}
count
`, 3);

test('while nested if/else', `
let mut x: Number = 0;
let mut i: Number = 0;
while i < 5 {
  if i == 0 {
    x = x + 1;
  } else {
    x = x - 1;
  }
  i = i + 1;
}
x
`, -3);

// ── global index edge cases (regression: JMP offsets off-by-one) ──
// With 11+ preceding let bindings, a global's index has low byte = 11+,
// which collides with opcode values (MUL=11, DIV=12, EQ=13, JMP=23, etc.)
// JMP overshooting by 1 byte would land on that byte as a spurious opcode.

test('elif high global index: first branch', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_val: Number = 15;
fn pick(n: Number) -> Number {
  if n > 20 { 100 } elif n > 10 { 200 } elif n > 0 { 300 } else { 400 }
};
pick(gi_val)
`, 200);

test('elif high global index: second branch', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_val: Number = 5;
fn pick(n: Number) -> Number {
  if n > 20 { 100 } elif n > 10 { 200 } elif n > 0 { 300 } else { 400 }
};
pick(gi_val)
`, 300);

test('elif high global index: else branch', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_val: Number = -5;
fn pick(n: Number) -> Number {
  if n > 20 { 100 } elif n > 10 { 200 } elif n > 0 { 300 } else { 400 }
};
pick(gi_val)
`, 400);

test('elif high global index: no branch', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_val: Number = 15;
fn pick(n: Number) -> Number {
  if n > 20 { 100 } elif n > 10 { 200 } elif n > 0 { 300 };
};
pick(gi_val)
`, 200);

test('elif high global index: nested func calls (like render pattern)', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_screen: String = "game";
fn render_bg() -> Number { 10 };
fn render_title() -> Number { 1 };
fn render_game() -> Number { 2 };
fn render_over() -> Number { 3 };
fn render() -> Number {
  if gi_screen == "title" { render_title()
  } elif gi_screen == "game" { render_game()
  } elif gi_screen == "game-over" { render_over()
  };
};
render()
`, 2);

test('while high global index: loop body', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_limit: Number = 3;
let mut gi_sum: Number = 0;
let mut gi_i: Number = 0;
fn accumulate() -> Number {
  while gi_i < gi_limit {
    gi_sum = gi_sum + 1;
    gi_i = gi_i + 1;
  };
  gi_sum
};
accumulate()
`, 3);

test('while high global index: always true + nested if/else', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let mut gi_flag: Boolean = true;
let mut gi_cnt: Number = 0;
fn run_loop() -> Number {
  while gi_flag {
    gi_cnt = gi_cnt + 1;
    if gi_cnt >= 3 { gi_flag = false } else {};
  };
  gi_cnt
};
run_loop()
`, 3);

test('while high global index: condition false on entry', `
let gi0: Number = 0; let gi1: Number = 0; let gi2: Number = 0; let gi3: Number = 0; let gi4: Number = 0;
let gi5: Number = 0; let gi6: Number = 0; let gi7: Number = 0; let gi8: Number = 0; let gi9: Number = 0;
let gi10: Number = 0; let gi11: Number = 0; let gi12: Number = 0; let gi13: Number = 0; let gi14: Number = 0;
let gi_cond: Boolean = false;
let mut gi_val: Number = 42;
fn test() -> Number {
  while gi_cond { gi_val = 0; };
  gi_val
};
test()
`, 42);

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
