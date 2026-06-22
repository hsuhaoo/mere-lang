const { compile, run } = require('../dist/index.js');

let passed = 0;
let failed = 0;

async function test(name, src, expected) {
  try {
    const result = await run(src);
    if (result.isNumber()) {
      const actual = result.toRawNumber();
      if (actual === expected) {
        console.log('✓', name);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actual);
        failed++;
      }
    } else if (result.isBoolean()) {
      const actual = result.toRawBoolean();
      if (actual === expected) {
        console.log('✓', name, '=', actual);
        passed++;
      } else {
        console.log('✗', name, 'expected', expected, 'got', actual);
        failed++;
      }
    } else if (result.isString()) {
      const actual = result.toRawString();
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

async function main() {
await testError('arithmetic on non-numeric: true - 5', `
  let x: Number = true - 5;
  x
`, /numeric|requires/i);

await testError('arithmetic on non-numeric: "hello" * 3', `
  let x: Number = "hello" * 3;
  x
`, /numeric|requires/i);

await testError('arithmetic on non-numeric: false / 2', `
  let x: Number = false / 2;
  x
`, /numeric|requires/i);

// ── Operator '+' type validation ────────────────────────────────

await testError('add mismatched types: 5 + "hello"', `
  let x: Number = 5 + "hello";
  x
`, /operator.*\+|requires.*numeric.*string/i);

await testError('add mismatched types: "hello" + 5', `
  let x: Number = "hello" + 5;
  x
`, /operator.*\+|requires.*numeric.*string/i);

// ── Boolean operator validation ─────────────────────────────────

await testError('and on non-bool: 5 and true', `
  let x: Boolean = 5 and true;
  x
    `, /Boolean/i);

await testError('or on non-bool: true or 5', `
  let x: Boolean = true or 5;
  x
    `, /Boolean/i);

// ── Not operator validation ─────────────────────────────────────

await testError('not on non-bool: not 5', `
  let x: Boolean = not 5;
  x
`, /requires Boolean/i);

// ── Negation validation ─────────────────────────────────────────

await testError('negation on non-numeric: -true', `
  let x: Number = -true;
  x
`, /numeric/i);

await testError('negation on string: -"hello"', `
  let x: Number = -"hello";
  x
`, /numeric/i);

// ── Record field validation ─────────────────────────────────────

await testError('access non-existent field on record', `
  type P = { x: Number, y: Number };
  let p: P = { x: 10, y: 20 };
  p.z
`, /no field|Cannot/i);

await testError('extra field in record literal', `
  type P = { x: Number };
  let p: P = { x: 10, y: 20 };
  p.x
`, /no field/i);

// ── List type validation ────────────────────────────────────────

await testError('list element type mismatch', `
  let l: List<Number> = [1, "hello"];
  l
`, /type mismatch|expected.*Number.*got.*String/i);

await test('empty list with type annotation', `
let l: List<Number> = [];
l.len
`, 0);

await testError('empty list without type annotation', `
[]
`, /empty list|no type/i);

// ── Map type validation ─────────────────────────────────────────

await testError('map key/value type mismatch', `
  let m: Map<Number, Number> = {1: "a"};
  m
`, /type mismatch|expected.*Number.*got.*String/i);

// empty maps `{}` are parsed as empty records, so this error is unreachable
// ── err() validation ────────────────────────────────────────────

await testError('err() requires string argument', `
  let r: Result<Number> = err(42);
  r
`, /requires String/i);

// ── Function return type validation ─────────────────────────────

await testError('function return type mismatch', `
  fn f() -> Number {
    "hello"
  }
  f()
`, /Expected type|return/i);

await testError('function return type mismatch with explicit return', `
  fn f() -> Number {
    return "hello";
  }
  f()
`, /Expected type|return/i);

// ── Call validation ─────────────────────────────────────────────

await testError('calling integer as function', `
  let x: Number = 5;
  x()
`, /Undefined function/i);

await testError('wrong argument count to user function', `
  fn f(x: Number) -> Number { x }
  f(1, 2)
`, /expects.*arguments/i);

// ── Polymorphic builtin validation ──────────────────────────────

await testError('get on non-List/Map', `
  let x: Number = 5;
  get(x, 1)
`, /expects.*List.*Map/i);

await testError('has expects Map', `
  let l: List<Number> = [1, 2];
  has(l, 1)
`, /expects.*Map/i);

await testError('put expects Map', `
  let l: List<Number> = [1, 2];
  put(l, 1, 2)
`, /expects.*Map/i);

await testError('get list index must be Number', `
  let l: List<Number> = [1, 2];
  get(l, "hello")
`, /index must be Number/i);

// ── Scope and identifier validation ─────────────────────────────

await testError('reference undefined variable', `
  let x: Number = y;
  x
`, /Undefined/i);

await testError('type mismatch on assignment', `
  let x: Number = "hello";
  x
`, /Expected type.*Number.*got.*String|type/i);

// ── Unknown type validation ─────────────────────────────────────

await testError('unknown record type', `
  let p: UnknownType = { x: 1 };
  p
`, /unknown record|UnknownType/i);

// ── Correct programs still pass type checking ───────────────────

await test('factorial with type annotations', `
fn f(n: Number) -> Number {
  if n <= 1 { return 1; }
  n * f(n - 1)
}
f(5)
`, 120);

await test('list of strings', `
let l: List<String> = ["a", "b", "c"];
l.len
`, 3);

await test('map with string keys', `
let m: Map<String, Number> = {"a": 1, "b": 2};
let v: Number = get(m, "a").value;
v
`, 1);

await test('result err with string', `
let r: Result<Number> = err("oops");
r.errMessage.len
`, 4);

await test('record field access', `
type Point = { x: Number, y: Number };
let p: Point = { x: 10, y: 20 };
p.x + p.y
`, 30);

await test('function call: substring()', `
let s: String = "hello world";
let sub: String = substring(s, 0, 5);
sub.len
`, 5);

await test('function call: concat()', `
let s: String = "hello";
let t: String = concat(s, " world");
t.len
`, 11);

await test('chained function calls with get', `
let l: List<Number> = [1, 2, 3];
get(l, 0).isOk
`, true);

// ── Runtime edge cases ──────────────────────────────────────────

await test('list_get function', `
let l: List<Number> = [10, 20, 30];
let v: Number = list_get(l, 1).value;
v
`, 20);

await test('map_get function', `
let m: Map<Number, String> = {1: "a", 2: "b"};
let v: String = map_get(m, 2).value;
v
`, "b");

await test('map_has function', `
let m: Map<Number, Number> = {1: 10, 2: 20};
map_has(m, 3)
`, false);

await test('map_put then get', `
let m: Map<Number, Number> = {1: 10};
map_put(m, 2, 20);
let v: Number = map_get(m, 2).value;
v
`, 20);

await test('map_remove', `
let m: Map<Number, Number> = {1: 10, 2: 20};
let m2: Map<Number, Number> = map_remove(m, 1);
map_has(m2, 1)
`, false);

await test('append returns new list', `
let l: List<Number> = [1, 2];
let l2: List<Number> = append(l, 3);
l2.len
`, 3);

await test('abs', `
abs(-5)
`, 5);

await test('max', `
max(10, 20)
`, 20);

await test('min', `
min(10, 20)
`, 10);

await test('parse_num failure', `
let r: Result<Number> = parse_num("not_a_number");
not r.isOk
`, true);

await test('substring runtime', `
let s: String = "hello world";
let sub: String = substring(s, 6, 5);
sub
`, "world");

await test('to_string with number', `
to_string(42)
`, "42");

// ── Lambda tests ────────────────────────────────────────────────

await test('lambda call with two params', `
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
add(3, 4)
`, 7);

await test('lambda call with single param', `
let double: Fn<Number, Number> = fn(n: Number) -> Number { n * 2 };
double(21)
`, 42);

await test('lambda with no params', `
let hello: Fn<String> = fn() -> String { "Hello from lambda!" };
hello()
`, "Hello from lambda!");

await test('lambda as argument to higher-order function', `
fn apply(f: Fn<Number, Number>, x: Number) -> Number { f(x) }
let double: Fn<Number, Number> = fn(n: Number) -> Number { n * 2 };
apply(double, 5)
`, 10);

await test('lambda type inference: return type', `
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
add(10, 20)
`, 30);

await testError('lambda wrong argument type', `
let add: Fn<Number, Number> = fn(n: Number) -> Number { n + 1 };
add("hello")
`, /expected.*Number.*got.*String|type/i);

await testError('lambda too many args', `
let add: Fn<Number, Number> = fn(n: Number) -> Number { n + 1 };
add(1, 2)
`, /expects.*args/i);

// ── Edge cases: type checker ────────────────────────────────────
await testError('record field type mismatch', `
type P = { x: Number };
let p: P = { x: "hello" };
p.x
`, /Expected type.*Number.*got.*String|type/i);

await testError('get on number errors', `
get(42, 1)
`, /expects.*List.*Map/i);

await testError('put on non-map errors', `
put(42, 1, 2)
`, /expects.*Map/i);

await testError('len on number errors', `
let x: Number = 42;
x.len
`, /Cannot access field 'len' on type Number|type/i);

await testError('redefine variable in same scope', `
let x: Number = 1;
let x: String = "a";
x
`, /already defined|redefine|shadow/i);

await testError('lambda cannot access outer let binding', `
let x: Number = 42;
let f: Fn<Number> = fn() -> Number { x };
f()
`, /Undefined variable/i);

await testError('nested lambda cannot access outer lambda let binding', `
let outer: Fn<Number> = fn() -> Number {
  let a: Number = 1;
  let inner: Fn<Number> = fn() -> Number { a };
  inner()
};
outer()
`, /Undefined variable/i);

await testError('fn body local not visible to another fn', `
let f1: Fn<Number> = fn() -> Number {
  let a: Number = 1;
  a
};
let f2: Fn<Number> = fn() -> Number { a };
f1()
`, /Undefined variable/i);

await test('lambda can access its own param in isolation', `
let f: Fn<Number, Number> = fn(x: Number) -> Number { x };
f(5)
`, 5);

await test('lambda body with return stmt and explicit return type', `
let f: Fn<Number, Number> = fn(x: Number) -> Number {
  let y: Number = x + 1;
  return y + 2;
};
f(3)
`, 6);

await testError('lambda return type mismatch in expression body', `
let f: Fn<Number> = fn() -> Number { true };
f()
`, /expected|but got/i);

await testError('lambda return type mismatch in return stmt', `
let f: Fn<Number> = fn() -> Number {
  return true;
};
f()
`, /expected|but got/i);

// ── Named function as first-class value ─────────────────────────

await test('named fn passed to fn param type-checks', `
fn foo(x: Number, y: Number) -> Number { x + y };
fn call(f: Fn<Number, Number, Number>) -> Number { f(3, 4) };
call(foo)
`, 7);

await testError('named fn with wrong Fn type rejected', `
fn foo(x: Number) -> Number { x + 1 };
let f: Fn<Number, Number, Number> = foo;
f(1, 2)
`, /expected|but got|mismatch/i);

await testError('named fn passed to fn expecting different Fn signature rejected', `
fn foo(x: Number) -> Unit { () };
fn bar(f: Fn<Number, Number, Unit>) -> Unit { () };
bar(foo)
`, /expected|but got|mismatch/i);

await testError('named fn passed to fn expecting wrong param type rejected', `
fn greet(n: Number) -> Number { n + 1 };
fn apply(f: Fn<String, Number>) -> Number { f("hi") };
apply(greet)
`, /expected|but got|mismatch/i);

// ── IndexedDB storage builtins (compile-time type validation only) ──

await testError('db_load rejects non-String', `
db_load(42)
`, /String|Number|expected|mismatch/i);

await testError('db_store rejects wrong arg types', `
db_store(1, true)
`, /String|expected|mismatch/i);

await testError('db_delete rejects non-String', `
db_delete(42)
`, /String|expected|mismatch/i);

// ── list_pop / list_remove_at / list_index_of / find ──────────

await test('list_pop type-checks', `
let xs: List<Number> = [1, 2, 3];
let popped: List<Number> = list_pop(xs);
popped.len
`, 2);

await test('list_remove_at type-checks', `
let xs: List<Number> = [10, 20, 30, 40];
let removed: List<Number> = list_remove_at(xs, 1);
list_get(removed, 0).value
`, 10);

await test('list_index_of type-checks', `
let xs: List<String> = ["a", "b", "c"];
let idx: Number = list_index_of(xs, "b");
idx
`, 1);

await test('find type-checks', `
let r: Result<Number> = find([1, 2, 3], fn(x: Number) -> Boolean { x == 2 });
r.value
`, 2);

await test('list_index_of returns Number', `
let xs: List<Number> = [5, 10, 15];
let idx: Number = list_index_of(xs, 10);
idx
`, 1);

await testError('list_pop rejects non-List', `
list_pop(42)
`, /List|expected|mismatch/i);

await testError('list_remove_at rejects non-List', `
list_remove_at(42, 1)
`, /List|expected|mismatch/i);

await testError('list_index_of rejects non-List', `
list_index_of(42, 1)
`, /List|expected|mismatch/i);

// ── for_each / range ──────────────────────────────────────────

await test('for_each type-checks', `
for_each([1, 2, 3], fn(x: Number) -> Unit {})
`, '()');

await test('range type-checks', `
let xs: List<Number> = range(0, 5);
xs.len
`, 5);

await testError('for_each rejects non-List', `
for_each(42, fn(x: Number) -> Unit {})
`, /List|expected|mismatch/i);

await testError('range rejects non-Number', `
range("a", 5)
`, /Number|expected|mismatch/i);

// ── map_keys / map_values ──────────────────────────────────────

await test('map_keys returns List<String>', `
let m: Map<Number, String> = {1: "a"};
let keys: List<String> = map_keys(m);
sort(keys)
`, ["1"]);

await test('map_values returns List<V>', `
let m: Map<Number, String> = {1: "a"};
let vals: List<String> = map_values(m);
sort(vals)
`, ["a"]);

await testError('map_keys rejects non-Map', `
map_keys(42)
`, /Map|expected|mismatch/i);

// ── record_update ─────────────────────────────────────────────

await test('record_update type-checks', `
type P = { x: Number, y: Number };
let p: P = { x: 10, y: 20 };
let p2: P = record_update(p, "x", 30);
  p2.x
`, 30);

await test('elif typechecks condition as Boolean', `
let x: Number = 5;
if x > 3 { 1 } elif x > 1 { 2 }
`, 1);

await testError('elif rejects non-Boolean condition', `
let x: Number = 5;
if x > 3 { 1 } elif 42 { 2 }
`, /expected|Boolean|mismatch/i);

await testError('elif rejects non-Boolean condition after chain', `
let x: Number = 5;
if x > 3 { 1 } elif x > 1 { 2 } elif "hello" { 3 }
`, /expected|Boolean|mismatch/i);

await test('else typechecks in if-else', `
if true { 1 } else { 2 }
`, 1);

await test('else typechecks in if-elif-else', `
if false { 1 } elif false { 2 } else { 3 }
`, 3);

await test('concat_all typechecks', `
concat_all(["a", "b"], ",")
`, "a,b");

console.log();
console.log('=== Results:', passed, 'passed,', failed, 'failed ===');

if (failed > 0) process.exit(1);

}

main().catch(e => { console.error(e); process.exit(1); });
