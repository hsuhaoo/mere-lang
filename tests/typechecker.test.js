const { compile, run } = require('../dist/index.js');

let passed = 0;
let failed = 0;

function test(name, src, expected) {
  try {
    const result = run(src);
    if (result.kind === 'Number') {
      const actual = result.getNumber();
      if (actual === expected) {
        console.log('✓', name);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actual);
        failed++;
      }
    } else if (result.kind === 'Boolean') {
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
  let x: Number = true - 5;
  x
`, /numeric|requires/i);

testError('arithmetic on non-numeric: "hello" * 3', `
  let x: Number = "hello" * 3;
  x
`, /numeric|requires/i);

testError('arithmetic on non-numeric: false / 2', `
  let x: Number = false / 2;
  x
`, /numeric|requires/i);

// ── Operator '+' type validation ────────────────────────────────

testError('add mismatched types: 5 + "hello"', `
  let x: Number = 5 + "hello";
  x
`, /operator.*\+|requires.*numeric.*string/i);

testError('add mismatched types: "hello" + 5', `
  let x: Number = "hello" + 5;
  x
`, /operator.*\+|requires.*numeric.*string/i);

// ── Boolean operator validation ─────────────────────────────────

testError('and on non-bool: 5 and true', `
  let x: Boolean = 5 and true;
  x
    `, /Boolean/i);

testError('or on non-bool: true or 5', `
  let x: Boolean = true or 5;
  x
    `, /Boolean/i);

// ── Not operator validation ─────────────────────────────────────

testError('not on non-bool: not 5', `
  let x: Boolean = not 5;
  x
`, /requires Boolean/i);

// ── Negation validation ─────────────────────────────────────────

testError('negation on non-numeric: -true', `
  let x: Number = -true;
  x
`, /numeric/i);

testError('negation on string: -"hello"', `
  let x: Number = -"hello";
  x
`, /numeric/i);

// ── Record field validation ─────────────────────────────────────

testError('access non-existent field on record', `
  type P = { x: Number, y: Number };
  let p: P = { x: 10, y: 20 };
  p.z
`, /no field|Cannot/i);

testError('extra field in record literal', `
  type P = { x: Number };
  let p: P = { x: 10, y: 20 };
  p.x
`, /no field/i);

// ── List type validation ────────────────────────────────────────

testError('list element type mismatch', `
  let l: List<Number> = [1, "hello"];
  l
`, /type mismatch|expected.*Number.*got.*String/i);

test('empty list with type annotation', `
let l: List<Number> = [];
len(l)
`, 0);

testError('empty list without type annotation', `
[]
`, /empty list|no type/i);

// ── Map type validation ─────────────────────────────────────────

testError('map key/value type mismatch', `
  let m: Map<Number, Number> = {1: "a"};
  m
`, /type mismatch|expected.*Number.*got.*String/i);

// empty maps `{}` are parsed as empty records, so this error is unreachable
// ── err() validation ────────────────────────────────────────────

testError('err() requires string argument', `
  let r: Result<Number> = err(42);
  r
`, /requires String/i);

// ── Function return type validation ─────────────────────────────

testError('function return type mismatch', `
  fn f() -> Number {
    "hello"
  }
  f()
`, /Expected type|return/i);

testError('function return type mismatch with explicit return', `
  fn f() -> Number {
    return "hello";
  }
  f()
`, /Expected type|return/i);

// ── Call validation ─────────────────────────────────────────────

testError('calling integer as function', `
  let x: Number = 5;
  x()
`, /Undefined function/i);

testError('wrong argument count to user function', `
  fn f(x: Number) -> Number { x }
  f(1, 2)
`, /expects.*arguments/i);

// ── Polymorphic builtin validation ──────────────────────────────

testError('get on non-List/Map', `
  let x: Number = 5;
  get(x, 1)
`, /expects.*List.*Map/i);

testError('has expects Map', `
  let l: List<Number> = [1, 2];
  has(l, 1)
`, /expects.*Map/i);

testError('put expects Map', `
  let l: List<Number> = [1, 2];
  put(l, 1, 2)
`, /expects.*Map/i);

testError('get list index must be Number', `
  let l: List<Number> = [1, 2];
  get(l, "hello")
`, /index must be Number/i);

// ── Scope and identifier validation ─────────────────────────────

testError('reference undefined variable', `
  let x: Number = y;
  x
`, /Undefined/i);

testError('type mismatch on assignment', `
  let x: Number = "hello";
  x
`, /Expected type.*Number.*got.*String|type/i);

// ── Unknown type validation ─────────────────────────────────────

testError('unknown record type', `
  let p: UnknownType = { x: 1 };
  p
`, /unknown record|UnknownType/i);

// ── Correct programs still pass type checking ───────────────────

test('factorial with type annotations', `
fn f(n: Number) -> Number {
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
let m: Map<String, Number> = {"a": 1, "b": 2};
let v: Number = get(m, "a").value;
v
`, 1);

test('result err with string', `
let r: Result<Number> = err("oops");
len(r.errMessage)
`, 4);

test('record field access', `
type Point = { x: Number, y: Number };
let p: Point = { x: 10, y: 20 };
p.x + p.y
`, 30);

test('function call: substring()', `
let s: String = "hello world";
let sub: String = substring(s, 0, 5);
len(sub)
`, 5);

test('function call: concat()', `
let s: String = "hello";
let t: String = concat(s, " world");
len(t)
`, 11);

test('chained function calls with get', `
let l: List<Number> = [1, 2, 3];
get(l, 0).isOk
`, true);

// ── Runtime edge cases ──────────────────────────────────────────

test('list_get function', `
let l: List<Number> = [10, 20, 30];
let v: Number = list_get(l, 1).value;
v
`, 20);

test('map_get function', `
let m: Map<Number, String> = {1: "a", 2: "b"};
let v: String = map_get(m, 2).value;
v
`, "b");

test('map_has function', `
let m: Map<Number, Number> = {1: 10, 2: 20};
map_has(m, 3)
`, false);

test('map_put then get', `
let m: Map<Number, Number> = {1: 10};
map_put(m, 2, 20);
let v: Number = map_get(m, 2).value;
v
`, 20);

test('map_remove', `
let m: Map<Number, Number> = {1: 10, 2: 20};
map_remove(m, 1);
map_has(m, 1)
`, false);

test('append returns new list', `
let l: List<Number> = [1, 2];
let l2: List<Number> = append(l, 3);
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

test('parse_num failure', `
let r: Result<Number> = parse_num("not_a_number");
not r.isOk
`, true);

test('substring runtime', `
let s: String = "hello world";
let sub: String = substring(s, 6, 5);
sub
`, "world");

test('to_string with number', `
to_string(42)
`, "42");

// ── Lambda tests ────────────────────────────────────────────────

test('lambda call with two params', `
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
add(3, 4)
`, 7);

test('lambda call with single param', `
let double: Fn<Number, Number> = fn(n: Number) -> Number { n * 2 };
double(21)
`, 42);

test('lambda with no params', `
let hello: Fn<String> = fn() -> String { "Hello from lambda!" };
hello()
`, "Hello from lambda!");

test('lambda as argument to higher-order function', `
fn apply(f: Fn<Number, Number>, x: Number) -> Number { f(x) }
let double: Fn<Number, Number> = fn(n: Number) -> Number { n * 2 };
apply(double, 5)
`, 10);

test('lambda type inference: return type', `
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
add(10, 20)
`, 30);

testError('lambda wrong argument type', `
let add: Fn<Number, Number> = fn(n: Number) -> Number { n + 1 };
add("hello")
`, /expected.*Number.*got.*String|type/i);

testError('lambda too many args', `
let add: Fn<Number, Number> = fn(n: Number) -> Number { n + 1 };
add(1, 2)
`, /expects.*args/i);

// ── Edge cases: type checker ────────────────────────────────────
testError('record field type mismatch', `
type P = { x: Number };
let p: P = { x: "hello" };
p.x
`, /Expected type.*Number.*got.*String|type/i);

testError('get on number errors', `
get(42, 1)
`, /expects.*List.*Map/i);

testError('put on non-map errors', `
put(42, 1, 2)
`, /expects.*Map/i);

testError('len on number errors', `
len(42)
`, /expects a String, List, or Map|type/i);

testError('redefine variable in same scope', `
let x: Number = 1;
let x: String = "a";
x
`, /already defined|redefine|shadow/i);

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);
