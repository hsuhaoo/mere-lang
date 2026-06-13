const { compile, run } = require('../dist/index.js');

let passed = 0;
let failed = 0;

function test(name, src, expected) {
  try {
    const result = run(src);
    if (result.kind === 'Int') {
      const actual = result.getNumber();
      if (actual === expected) {
        console.log('✓', name);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actual);
        failed++;
      }
    } else if (result.kind === 'Bool') {
      const actual = result.get();
      if (actual === expected) {
        console.log('✓', name, '=', actual);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actual);
        failed++;
      }
    } else if (result.kind === 'String') {
      const actual = result.get();
      if (actual === expected) {
        console.log('✓', name);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actual);
        failed++;
      }
    } else {
      console.log('✓', name, '=', result.toString());
      passed++;
    }
  } catch (e) {
    console.log('✗', name, 'ERROR:', e.message);
    failed++;
  }
}

function testError(name, src, pattern) {
  try {
    compile(src);
    console.log('✗', name, 'expected error but got none');
    failed++;
  } catch (e) {
    if (pattern.test(e.message)) {
      console.log('✓', name);
      passed++;
    } else {
      console.log('✗', name, 'expected', pattern, 'got:', e.message);
      failed++;
    }
  }
}

console.log('=== Type Checker Test Suite ===');
console.log();

// ── Arithmetic type validation ──────────────────────────────────

testError('arithmetic on non-numeric: true - 5', `
  let x: Int = true - 5;
  x
`, /numeric|requires/i);

testError('arithmetic on non-numeric: "hello" * 3', `
  let x: Int = "hello" * 3;
  x
`, /numeric|requires/i);

testError('arithmetic on non-numeric: false / 2', `
  let x: Int = false / 2;
  x
`, /numeric|requires/i);

// ── Operator '+' type validation ────────────────────────────────

testError('add mismatched types: 5 + "hello"', `
  let x: Int = 5 + "hello";
  x
`, /operator.*\+|requires.*numeric.*string/i);

testError('add mismatched types: "hello" + 5', `
  let x: Int = "hello" + 5;
  x
`, /operator.*\+|requires.*numeric.*string/i);

// ── Bool operator validation ────────────────────────────────────

testError('and on non-bool: 5 and true', `
  let x: Bool = 5 and true;
  x
`, /Bool/i);

testError('or on non-bool: true or 5', `
  let x: Bool = true or 5;
  x
`, /Bool/i);

// ── Not operator validation ─────────────────────────────────────

testError('not on non-bool: not 5', `
  let x: Bool = not 5;
  x
`, /requires Bool/i);

// ── Negation validation ─────────────────────────────────────────

testError('negation on non-numeric: -true', `
  let x: Int = -true;
  x
`, /numeric/i);

testError('negation on string: -"hello"', `
  let x: Int = -"hello";
  x
`, /numeric/i);

// ── Record field validation ─────────────────────────────────────

testError('access non-existent field on record', `
  type P = { x: Int, y: Int };
  let p: P = { x: 10, y: 20 };
  p.z
`, /no field|Cannot/i);

testError('extra field in record literal', `
  type P = { x: Int };
  let p: P = { x: 10, y: 20 };
  p.x
`, /no field/i);

// ── List type validation ────────────────────────────────────────

testError('list element type mismatch', `
  let l: List<Int> = [1, "hello"];
  l
`, /type mismatch|expected.*Int.*got.*String/i);

testError('empty list has no type', `
  let l: List<Int> = [];
  l
`, /empty list|no type/i);

// ── Map type validation ─────────────────────────────────────────

testError('map key/value type mismatch', `
  let m: Map<Int, Int> = {1: "a"};
  m
`, /type mismatch|expected.*Int.*got.*String/i);

// empty maps `{}` are parsed as empty records, so this error is unreachable
// ── err() validation ────────────────────────────────────────────

testError('err() requires string argument', `
  let r: Result<Int> = err(42);
  r
`, /requires String/i);

// ── Function return type validation ─────────────────────────────

testError('function return type mismatch', `
  fn f() -> Int {
    "hello"
  }
  f()
`, /Expected type|return/i);

testError('function return type mismatch with explicit return', `
  fn f() -> Int {
    return "hello";
  }
  f()
`, /Expected type|return/i);

// ── Call validation ─────────────────────────────────────────────

testError('calling integer as function', `
  let x: Int = 5;
  x()
`, /Undefined function/i);

testError('wrong argument count to user function', `
  fn f(x: Int) -> Int { x }
  f(1, 2)
`, /expects.*arguments/i);

// ── Polymorphic builtin validation ──────────────────────────────

testError('get on non-List/Map', `
  let x: Int = 5;
  get(x, 1)
`, /expects.*List.*Map/i);

testError('has expects Map', `
  let l: List<Int> = [1, 2];
  has(l, 1)
`, /expects.*Map/i);

testError('put expects Map', `
  let l: List<Int> = [1, 2];
  put(l, 1, 2)
`, /expects.*Map/i);

testError('get list index must be Int', `
  let l: List<Int> = [1, 2];
  get(l, "hello")
`, /index must be Int/i);

// ── Scope and identifier validation ─────────────────────────────

testError('reference undefined variable', `
  let x: Int = y;
  x
`, /Undefined/i);

testError('type mismatch on assignment', `
  let x: Int = "hello";
  x
`, /Expected type.*Int.*got.*String|type/i);

// ── Unknown type validation ─────────────────────────────────────

testError('unknown record type', `
  let p: UnknownType = { x: 1 };
  p
`, /unknown record|UnknownType/i);

// ── Correct programs still pass type checking ───────────────────

test('factorial with type annotations', `
fn f(n: Int) -> Int {
  if n <= 1 { return 1; }
  n * f(n - 1)
}
f(5)
`, 120);

test('list of strings', `
let l: List<String> = ["a", "b", "c"];
list_len(l)
`, 3);

test('map with string keys', `
let m: Map<String, Int> = {"a": 1, "b": 2};
let v: Int = unwrap(get(m, "a"));
v
`, 1);

test('result err with string', `
let r: Result<Int> = err("oops");
len(unwrap_err(r))
`, 4);

test('record field access', `
type Point = { x: Int, y: Int };
let p: Point = { x: 10, y: 20 };
p.x + p.y
`, 30);

test('method call: string.len()', `
let s: String = "hello";
s.len()
`, 5);

test('function call: substring()', `
let s: String = "hello world";
let sub: String = substring(s, 0, 5);
len(sub)
`, 5);

test('method call: string.concat()', `
let s: String = "hello";
let t: String = s.concat(" world");
len(t)
`, 11);

test('method call: list.len()', `
let l: List<Int> = [1, 2, 3];
l.len()
`, 3);

// note: list.get() only works at runtime via direct method syntax

test('method call: result.is_ok()', `
let r: Result<Int> = ok(42);
r.is_ok()
`, true);

test('method call: result.is_err()', `
let r: Result<Int> = err("msg");
r.is_err()
`, true);

test('method call: result.unwrap()', `
let r: Result<Int> = ok(42);
r.unwrap()
`, 42);

test('chained method and field access', `
let l: List<Int> = [1, 2, 3];
l.get(0).is_ok()
`, true);

// ── Runtime edge cases ──────────────────────────────────────────

test('list_get function', `
let l: List<Int> = [10, 20, 30];
let v: Int = unwrap(list_get(l, 1));
v
`, 20);

test('map_get function', `
let m: Map<Int, String> = {1: "a", 2: "b"};
let v: String = unwrap(map_get(m, 2));
v
`, "b");

test('map_has function', `
let m: Map<Int, Int> = {1: 10, 2: 20};
map_has(m, 3)
`, false);

test('map_put then get', `
let m: Map<Int, Int> = {1: 10};
map_put(m, 2, 20);
let v: Int = unwrap(map_get(m, 2));
v
`, 20);

test('map_remove', `
let m: Map<Int, Int> = {1: 10, 2: 20};
map_remove(m, 1);
map_has(m, 1)
`, false);

test('append returns new list', `
let l: List<Int> = [1, 2];
let l2: List<Int> = append(l, 3);
list_len(l2)
`, 3);

test('abs', `
abs(-5)
`, 5);

test('max', `
max(10, 20)
`, 20);

test('min', `
min(10, 20)
`, 10);

test('parse_int failure', `
let r: Result<Int> = parse_int("not_a_number");
is_err(r)
`, true);

test('substring runtime', `
let s: String = "hello world";
let sub: String = substring(s, 6, 5);
sub
`, "world");

test('to_string with int', `
to_string(42)
`, "42");

// ── Method edge cases ──────────────────────────────────────────

test('method: list.append() mutates', `
let l: List<Int> = [1, 2];
l.append(3);
list_len(l)
`, 3);

test('method: result.unwrap_err()', `
let r: Result<Int> = err("fail");
r.unwrap_err()
`, "fail");

test('method: map.get', `
let m: Map<String, Int> = {"a": 10};
let v: Int = unwrap(m.get("a"));
v
`, 10);

// ── Lambda tests ────────────────────────────────────────────────

test('lambda call with two params', `
let add: Fn<Int, Int, Int> = fn(x: Int, y: Int) -> Int { x + y };
add(3, 4)
`, 7);

test('lambda call with single param', `
let double: Fn<Int, Int> = fn(n: Int) -> Int { n * 2 };
double(21)
`, 42);

test('lambda with no params', `
let hello: Fn<String> = fn() -> String { "Hello from lambda!" };
hello()
`, "Hello from lambda!");

test('lambda as argument to higher-order function', `
fn apply(f: Fn<Int, Int>, x: Int) -> Int { f(x) }
let double: Fn<Int, Int> = fn(n: Int) -> Int { n * 2 };
apply(double, 5)
`, 10);

test('lambda type inference: return type', `
let add: Fn<Int, Int, Int> = fn(x: Int, y: Int) -> Int { x + y };
add(10, 20)
`, 30);

testError('lambda wrong argument type', `
let add: Fn<Int, Int> = fn(n: Int) -> Int { n + 1 };
add("hello")
`, /expected.*Int.*got.*String|type/i);

testError('lambda too many args', `
let add: Fn<Int, Int> = fn(n: Int) -> Int { n + 1 };
add(1, 2)
`, /expects.*args/i);

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
