const path = require('path');
const fs = require('fs');
const os = require('os');
const { ModuleLoader, compile, run } = require('../dist/index.js');

let passed = 0;
let failed = 0;
let tmpDir;

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (e) {
    console.log('✗', name, ':', e.message);
    failed++;
  }
}

function testError(name, fn, pattern) {
  try {
    fn();
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

function runModule(filePath) {
  const loader = new ModuleLoader(tmpDir);
  return loader.runModule(filePath);
}

function extractValue(v) {
  if (!v) return undefined;
  if (v.kind === 'Number') return v.getNumber();
  if (v.kind === 'String') return v.get();
  if (v.kind === 'Boolean') return v.get();
  if (v.kind === 'Unit') return '()';
  if (v.kind === 'Result') {
    return {
      ok: v.isOk.get(),
      value: v.isOk.get() ? extractValue(v.value) : v.errMessage,
    };
  }
  if (v.data !== undefined) return v.data;
  return v.toString();
}

console.log('=== Module System Test Suite ===');
console.log();

// Setup: create temp directory
tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simplex-test-'));
const cleanTmpDir = () => fs.rmSync(tmpDir, { recursive: true, force: true });

try {

// ── Happy path: basic module ────────────────────────────────────

test('import add from math module', () => {
  writeMod('math.sim', `
export fn add(a: Number, b: Number) -> Number {
  a + b
}
`);

  writeMod('main.sim', `
import math from "math.sim";
math.add(3, 4)
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 7) throw new Error(`expected 7, got ${val}`);
});

test('import multiply from math module', () => {
  writeMod('math.sim', `
export fn multiply(a: Number, b: Number) -> Number {
  a * b
}
`);

  writeMod('main.sim', `
import math from "math.sim";
math.multiply(5, 6)
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 30) throw new Error(`expected 30, got ${val}`);
});

test('import multiple functions from one module', () => {
  writeMod('math.sim', `
export fn add(a: Number, b: Number) -> Number { a + b }
export fn multiply(a: Number, b: Number) -> Number { a * b }
export fn square(x: Number) -> Number { x * x }
`);

  writeMod('main.sim', `
import math from "math.sim";
math.add(10, 20) + math.multiply(2, 3) + math.square(4)
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 10 + 20 + 2 * 3 + 4 * 4) throw new Error(`expected 52, got ${val}`);
});

test('module function calls its own exported functions', () => {
  writeMod('math.sim', `
export fn double(x: Number) -> Number { x * 2 }
export fn quad(x: Number) -> Number { double(x) + double(x) }
`);

  writeMod('main.sim', `
import math from "math.sim";
math.quad(5)
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 20) throw new Error(`expected 20, got ${val}`);
});

test('multiple imports from different modules', () => {
  writeMod('math.sim', `
export fn add(a: Number, b: Number) -> Number { a + b }
`);
  writeMod('string_util.sim', `
export fn greet(name: String) -> String { "Hello, " + name }
`);

  writeMod('main.sim', `
import math from "math.sim";
import str from "string_util.sim";
let s: String = str.greet("world");
len(s) + math.add(10, 5)
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 27) throw new Error(`expected 27, got ${val}`);
});

// ── Module with types ───────────────────────────────────────────

test('module with custom types', () => {
  writeMod('geometry.sim', `
export fn area(w: Number, h: Number) -> Number { w * h }
`);

  writeMod('main.sim', `
import geo from "geometry.sim";
geo.area(3, 4)
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 12) throw new Error(`expected 12, got ${val}`);
});

// ── Module caching ──────────────────────────────────────────────

test('module data is cached (same object on second load)', () => {
  writeMod('cache_math.sim', `
export fn add(a: Number, b: Number) -> Number { a + b }
`);
  writeMod('main.sim', `import m from "cache_math.sim"; m.add(1, 2)`);

  const loader = new ModuleLoader(tmpDir);
  const first = loader.loadModule('cache_math.sim', 'cache_math.sim');
  const second = loader.loadModule('cache_math.sim', 'cache_math.sim');
  if (first !== second) throw new Error('expected same moduleData reference (cache hit)');
  if (!first.exports.has('add')) throw new Error('exports should contain add');
});

// ── runMain alias ───────────────────────────────────────────────

test('runMain loads and runs the program', () => {
  writeMod('entry.sim', `
export fn answer() -> Number { 42 }
`);
  writeMod('main.sim', `
import e from "entry.sim";
e.answer()
`);

  const loader = new ModuleLoader(tmpDir);
  const result = loader.runMain('main.sim');
  const val = extractValue(result);
  if (val !== 42) throw new Error(`expected 42, got ${val}`);
});

// ── Error cases ─────────────────────────────────────────────────

testError('import non-existent module fails',
  () => {
    writeMod('main.sim', `
import bad from "nonexistent.sim";
bad.anything()
`);
    runModule('main.sim');
  },
  /ENOENT|no such file|exist/i
);

testError('import module with no exports fails type check',
  () => {
    writeMod('empty.sim', `let x: Number = 1;`);
    writeMod('main.sim', `
import e from "empty.sim";
e.anything()
`);
    runModule('main.sim');
  },
  /no exports/i
);

testError('non-exported function is not accessible from importer',
  () => {
    writeMod('secret.sim', `
fn hidden() -> Number { 42 }
export fn visible() -> Number { 10 }
`);
    writeMod('main.sim', `
import s from "secret.sim";
s.hidden()
`);
    runModule('main.sim');
  },
  /no field|Cannot|Undefined|has no exports/i
);

// ── Edge cases ──────────────────────────────────────────────────

test('module function that returns unit', () => {
  writeMod('greet.sim', `
export fn say(msg: String) -> Unit { print(msg) }
`);

  writeMod('main.sim', `
import g from "greet.sim";
g.say("test")
`);

  // Should not throw; returns unit
  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== '()') throw new Error(`expected unit, got ${val}`);
});

test('module with result types', () => {
  writeMod('safe_math.sim', `
export fn divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
`);

  writeMod('main.sim', `
import m from "safe_math.sim";
let r: Result<Number> = m.divide(10, 2);
r.value
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 5) throw new Error(`expected 5, got ${val}`);
});

test('module function returns err result on bad input', () => {
  writeMod('safe_math.sim', `
export fn divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 { return err("div0"); }
  ok(a / b)
}
`);

  writeMod('main.sim', `
import m from "safe_math.sim";
let r: Result<Number> = m.divide(10, 0);
not r.isOk
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== true) throw new Error(`expected true, got ${val}`);
});

test('chain module function calls', () => {
  writeMod('math.sim', `
export fn double(x: Number) -> Number { x * 2 }
export fn square(x: Number) -> Number { x * x }
`);

  writeMod('main.sim', `
import m from "math.sim";
m.double(m.square(3))
`);

  const result = runModule('main.sim');
  const val = extractValue(result);
  if (val !== 18) throw new Error(`expected 18, got ${val}`);
});

// ── Language-level import/export (via run() — these fail) ────────

test('import/export cannot be used with run() — needs ModuleLoader', () => {
  try {
    run(`import math from "math.sim";`);
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.includes('no exports') && !e.message.match(/ENOENT|no such file/i)) {
      throw e; // Unexpected error — re-throw
    }
    // expected — run() has no module resolution
  }
});

test('export keyword compiles via compile()', () => {
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
