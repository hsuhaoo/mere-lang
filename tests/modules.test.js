const path = require('path');
const fs = require('fs');
const os = require('os');
const { ModuleLoader, compile, run } = require('../dist/index.js');

let passed = 0;
let failed = 0;
let tmpDir;

async function test(name, fn) {
  try {
    await fn();
    console.log('✓', name);
    passed++;
  } catch (e) {
    console.log('✗', name, ':', e.message);
    failed++;
  }
}

async function testError(name, fn, pattern) {
  try {
    await fn();
    console.log('✗', name, 'expected error, got success');
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

function writeMod(name, source) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, source, 'utf-8');
  return p;
}

async function runModule(filePath) {
  const loader = new ModuleLoader(tmpDir);
  return await loader.runModule(filePath);
}

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

async function main() {
  console.log('=== Module System Test Suite ===');
  console.log();

  // Setup: create temp directory
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mere-test-'));
  const cleanTmpDir = () => fs.rmSync(tmpDir, { recursive: true, force: true });

  try {

  // ── Happy path: basic module ────────────────────────────────────

  await test('import add from math module', async () => {
    writeMod('math.mere', `
export fn add(a: Number, b: Number) -> Number {
  a + b
}
`);

    writeMod('main.mere', `
import math from "math.mere";
math.add(3, 4)
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 7) throw new Error(`expected 7, got ${val}`);
  });

  await test('import multiply from math module', async () => {
    writeMod('math.mere', `
export fn multiply(a: Number, b: Number) -> Number {
  a * b
}
`);

    writeMod('main.mere', `
import math from "math.mere";
math.multiply(5, 6)
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 30) throw new Error(`expected 30, got ${val}`);
  });

  await test('import multiple functions from one module', async () => {
    writeMod('math.mere', `
export fn add(a: Number, b: Number) -> Number { a + b }
export fn multiply(a: Number, b: Number) -> Number { a * b }
export fn square(x: Number) -> Number { x * x }
`);

    writeMod('main.mere', `
import math from "math.mere";
math.add(10, 20) + math.multiply(2, 3) + math.square(4)
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 10 + 20 + 2 * 3 + 4 * 4) throw new Error(`expected 52, got ${val}`);
  });

  await test('module function calls its own exported functions', async () => {
    writeMod('math.mere', `
export fn double(x: Number) -> Number { x * 2 }
export fn quad(x: Number) -> Number { double(x) + double(x) }
`);

    writeMod('main.mere', `
import math from "math.mere";
math.quad(5)
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 20) throw new Error(`expected 20, got ${val}`);
  });

  await test('multiple imports from different modules', async () => {
    writeMod('math.mere', `
export fn add(a: Number, b: Number) -> Number { a + b }
`);
    writeMod('string_util.mere', `
export fn greet(name: String) -> String { "Hello, " + name }
`);

    writeMod('main.mere', `
import math from "math.mere";
import str from "string_util.mere";
let s: String = str.greet("world");
s.len + math.add(10, 5)
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 27) throw new Error(`expected 27, got ${val}`);
  });

  // ── Module with types ───────────────────────────────────────────

  await test('module with custom types', async () => {
    writeMod('geometry.mere', `
export fn area(w: Number, h: Number) -> Number { w * h }
`);

    writeMod('main.mere', `
import geo from "geometry.mere";
geo.area(3, 4)
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 12) throw new Error(`expected 12, got ${val}`);
  });

  // ── Module caching ──────────────────────────────────────────────

  await test('module data is cached (same object on second load)', () => {
    writeMod('cache_math.mere', `
export fn add(a: Number, b: Number) -> Number { a + b }
`);
    writeMod('main.mere', `import m from "cache_math.mere"; m.add(1, 2)`);

    const loader = new ModuleLoader(tmpDir);
    const first = loader.loadModule('cache_math.mere', 'cache_math.mere');
    const second = loader.loadModule('cache_math.mere', 'cache_math.mere');
    if (first !== second) throw new Error('expected same moduleData reference (cache hit)');
    if (!first.exports.has('add')) throw new Error('exports should contain add');
  });

  // ── runMain alias ───────────────────────────────────────────────

  await test('runMain loads and runs the program', async () => {
    writeMod('entry.mere', `
export fn answer() -> Number { 42 }
`);
    writeMod('main.mere', `
import e from "entry.mere";
e.answer()
`);

    const loader = new ModuleLoader(tmpDir);
    const result = await loader.runMain('main.mere');
    const val = extractValue(result);
    if (val !== 42) throw new Error(`expected 42, got ${val}`);
  });

  // ── Error cases ─────────────────────────────────────────────────

  await testError('import non-existent module fails',
    async () => {
      writeMod('main.mere', `
import bad from "nonexistent.mere";
bad.anything()
`);
      await runModule('main.mere');
    },
    /ENOENT|no such file|exist/i
  );

  await testError('import module with no exports fails type check',
    async () => {
      writeMod('empty.mere', `let x: Number = 1;`);
      writeMod('main.mere', `
import e from "empty.mere";
e.anything()
`);
      await runModule('main.mere');
    },
    /no exports/i
  );

  await testError('non-exported function is not accessible from importer',
    async () => {
      writeMod('secret.mere', `
fn hidden() -> Number { 42 }
export fn visible() -> Number { 10 }
`);
      writeMod('main.mere', `
import s from "secret.mere";
s.hidden()
`);
      await runModule('main.mere');
    },
    /no field|Cannot|Undefined|has no exports/i
  );

  // ── Edge cases ──────────────────────────────────────────────────

  await test('module function that returns unit', async () => {
    writeMod('greet.mere', `
export fn say(msg: String) -> Unit { print(msg) }
`);

    writeMod('main.mere', `
import g from "greet.mere";
g.say("test")
`);

    // Should not throw; returns unit
    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== '()') throw new Error(`expected unit, got ${val}`);
  });

  await test('module with result types', async () => {
    writeMod('safe_math.mere', `
export fn divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
`);

    writeMod('main.mere', `
import m from "safe_math.mere";
let r: Result<Number> = m.divide(10, 2);
r.value
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 5) throw new Error(`expected 5, got ${val}`);
  });

  await test('module function returns err result on bad input', async () => {
    writeMod('safe_math.mere', `
export fn divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
`);

    writeMod('main.mere', `
import m from "safe_math.mere";
let r: Result<Number> = m.divide(10, 0);
not r.isOk
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== true) throw new Error(`expected true, got ${val}`);
  });

  await test('chain module function calls', async () => {
    writeMod('math.mere', `
export fn double(x: Number) -> Number { x * 2 }
export fn square(x: Number) -> Number { x * x }
`);

    writeMod('main.mere', `
import m from "math.mere";
m.double(m.square(3))
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 18) throw new Error(`expected 18, got ${val}`);
  });

  // ── Function body accessing import qualified name ──────────────

  await test('function body can call import qualified name', async () => {
    writeMod('greeter.mere', `
export fn hello(name: String) -> String { "Hello, " + name }
`);

    writeMod('main.mere', `
import g from "greeter.mere";

fn run_test(name: String) -> String {
  g.hello(name)
}

run_test("world")
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 'Hello, world') throw new Error(`expected 'Hello, world', got ${val}`);
  });

  await test('function body can call import qualified name inside main()', async () => {
    writeMod('math.mere', `
export fn double(x: Number) -> Number { x * 2 }
`);

    writeMod('main.mere', `
import m from "math.mere";

fn compute() -> Number {
  m.double(21)
}

compute()
`);

    const result = await runModule('main.mere');
    const val = extractValue(result);
    if (val !== 42) throw new Error(`expected 42, got ${val}`);
  });

  // ── collectSources ────────────────────────────────────────────

  await test('collectSources returns all dependency sources', () => {
    writeMod('a.mere', `export fn a() -> Number { 1 }`);
    writeMod('b.mere', `
import x from "a.mere";
export fn b() -> Number { x.a() + 1 }
`);
    writeMod('main.mere', `
import y from "b.mere";
y.b()
`);

    const loader = new ModuleLoader(tmpDir);
    const sources = loader.collectSources('main.mere');

    // Should contain all 3 modules
    const absKey = function(name) { return Object.keys(sources).find(function(k) { return k.endsWith(name); }); };
    if (!absKey('main.mere')) throw new Error('main.mere not in sources');
    if (!absKey('a.mere')) throw new Error('a.mere not in sources (transitive dep)');
    if (!absKey('b.mere')) throw new Error('b.mere not in sources');

    // Each source should be non-empty
    for (const key of Object.keys(sources)) {
      const src = sources[key];
      if (!src || src.trim().length === 0) throw new Error('empty source for ' + key);
    }

    // Should have exactly 3 modules: main.mere, a.mere, b.mere
    if (Object.keys(sources).length !== 3) throw new Error('expected 3 sources, got ' + Object.keys(sources).length);
  });

  // ── Language-level import/export (via run() — these fail) ────────

  await test('import/export cannot be used with run() — needs ModuleLoader', async () => {
    try {
      await run(`import math from "math.mere";`);
      throw new Error('expected error');
    } catch (e) {
      if (!e.message.includes('no exports') && !e.message.match(/ENOENT|no such file/i)) {
        throw e; // Unexpected error — re-throw
      }
      // expected — run() has no module resolution
    }
  });

  await test('export keyword compiles via compile()', () => {
    const result = compile(`
export fn f() -> Number { 42 }
f()
`);
    if (!result) throw new Error('compile returned falsy');
  });

  } finally {
    cleanTmpDir();
  }

  console.log();
  console.log('=== Results:', passed, 'passed,', failed, 'failed ===');
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
