const { run, compile, Lexer, Parser, TypeChecker } = require('../src/index');
const assert = require('assert');

// ── Basic arithmetic ────────────────────────────────────────────

describe('Basic Arithmetic', () => {
  it('integer addition', () => {
    const src = `
      let x: Int = 2 + 3;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.kind, 'Int');
    assert.strictEqual(result.data, 5);
  });

  it('integer subtraction', () => {
    const src = `
      let x: Int = 10 - 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 6);
  });

  it('integer multiplication', () => {
    const src = `
      let x: Int = 3 * 7;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 21);
  });

  it('integer division', () => {
    const src = `
      let x: Int = 20 / 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('operator precedence', () => {
    const src = `
      let x: Int = 2 + 3 * 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 14); // 2 + (3 * 4)
  });

  it('parenthesized expression', () => {
    const src = `
      let x: Int = (2 + 3) * 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 20);
  });
});

// ── Boolean logic ───────────────────────────────────────────────

describe('Boolean Logic', () => {
  it('and operator', () => {
    const src = `
      let x: Bool = true and false;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, false);
  });

  it('or operator', () => {
    const src = `
      let x: Bool = true or false;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, true);
  });

  it('not operator', () => {
    const src = `
      let x: Bool = not true;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, false);
  });

  it('comparison operators', () => {
    const src = `
      let a: Bool = 5 > 3;
      let b: Bool = 5 < 3;
      let c: Bool = 5 == 5;
      let d: Bool = 5 != 3;
      let e: Bool = 5 >= 5;
      let f: Bool = 5 <= 4;
      a
    `;
    const result = run(src);
    assert.strictEqual(result.data, true);
  });
});

// ── Variables ───────────────────────────────────────────────────

describe('Variables', () => {
  it('integer variable', () => {
    const src = `
      let x: Int = 42;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 42);
  });

  it('string variable', () => {
    const src = `
      let name: String = "hello";
      name
    `;
    const result = run(src);
    assert.strictEqual(result.data, 'hello');
  });

  it('bool variable', () => {
    const src = `
      let flag: Bool = true;
      flag
    `;
    const result = run(src);
    assert.strictEqual(result.data, true);
  });

  it('variable shadowing in blocks', () => {
    const src = `
      let x: Int = 1;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 1);
  });
});

// ── Functions ───────────────────────────────────────────────────

describe('Functions', () => {
  it('simple function', () => {
    const src = `
      fn add(x: Int, y: Int) -> Int {
        x + y
      }
      let result: Int = add(3, 4);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.data, 7);
  });

  it('function with return statement', () => {
    const src = `
      fn abs(x: Int) -> Int {
        if x < 0 {
          return -x;
        }
        x
      }
      let result: Int = abs(-5);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('function with unit return', () => {
    const src = `
      fn greet(name: String) -> Unit {
        print("Hello, " + name)
      }
      greet("World")
    `;
    const result = run(src);
    assert.strictEqual(result.kind, 'Unit');
  });

  it('recursive function', () => {
    const src = `
      fn factorial(n: Int) -> Int {
        if n <= 1 {
          return 1;
        }
        n * factorial(n - 1)
      }
      let result: Int = factorial(5);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.data, 120);
  });

  it('fibonacci', () => {
    const src = `
      fn fib(n: Int) -> Int {
        if n <= 0 {
          return 0;
        }
        if n == 1 {
          return 1;
        }
        fib(n - 1) + fib(n - 2)
      }
      let result: Int = fib(10);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.data, 55);
  });
});

// ── Conditionals ────────────────────────────────────────────────

describe('Conditionals', () => {
  it('if true branch', () => {
    const src = `
      let x: Int = 10;
      if x > 5 {
        let y: Int = 1;
        y
      }
    `;
    const result = run(src);
    assert.strictEqual(result.data, 1);
  });

  it('if false branch (no else)', () => {
    const src = `
      let x: Int = 3;
      if x > 5 {
        let y: Int = 1;
        y
      }
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 3);
  });

  it('nested ifs', () => {
    const src = `
      let x: Int = 10;
      if x > 5 {
        if x > 8 {
          let y: Int = 2;
          y
        }
      }
    `;
    const result = run(src);
    assert.strictEqual(result.data, 2);
  });
});

// ── Result type ─────────────────────────────────────────────────

describe('Result Type', () => {
  it('ok constructor', () => {
    const src = `
      let r: Result<Int> = ok(42);
      is_ok(r)
    `;
    const result = run(src);
    assert.strictEqual(result.data, true);
  });

  it('err constructor', () => {
    const src = `
      let r: Result<Int> = err("something went wrong");
      is_err(r)
    `;
    const result = run(src);
    assert.strictEqual(result.data, true);
  });

  it('divide with error handling', () => {
    const src = `
      fn divide(a: Int, b: Int) -> Result<Int> {
        if b == 0 {
          return err("division by zero");
        }
        ok(a / b)
      }
      let r: Result<Int> = divide(10, 2);
      if is_ok(r) {
        let v: Int = unwrap(r);
        v
      }
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('divide by zero', () => {
    const src = `
      fn divide(a: Int, b: Int) -> Result<Int> {
        if b == 0 {
          return err("division by zero");
        }
        ok(a / b)
      }
      let r: Result<Int> = divide(10, 0);
      if is_err(r) {
        let msg: String = unwrap_err(r);
        len(msg)
      }
    `;
    const result = run(src);
    assert.strictEqual(result.data, 18); // "division by zero".length
  });
});

// ── Lists ───────────────────────────────────────────────────────

describe('Lists', () => {
  it('create and get element', () => {
    const src = `
      let nums: List<Int> = [1, 2, 3];
      let first: Int = get(nums, 0);
      first
    `;
    const result = run(src);
    assert.strictEqual(result.data, 1);
  });

  it('list length', () => {
    const src = `
      let nums: List<Int> = [1, 2, 3, 4, 5];
      let count: Int = list_len(nums);
      count
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('append to list', () => {
    const src = `
      let nums: List<Int> = [1, 2];
      let new_nums: List<Int> = append(nums, 3);
      let count: Int = list_len(new_nums);
      count
    `;
    const result = run(src);
    assert.strictEqual(result.data, 3);
  });

  it('sum of list', () => {
    const src = `
      fn sum(lst: List<Int>) -> Int {
        if list_len(lst) == 0 {
          return 0;
        }
        let head: Int = get(lst, 0);
        let tail: List<Int> = substring_list(lst, 1, list_len(lst) - 1);
        head + sum(tail)
      }
      let nums: List<Int> = [1, 2, 3, 4, 5];
      sum(nums)
    `;
    const result = run(src);
    assert.strictEqual(result.data, 15);
  });
});

// ── Maps ────────────────────────────────────────────────────────

describe('Maps', () => {
  it('create and get', () => {
    const src = `
      let m: Map<Int, Int> = {1: 10, 2: 20};
      let v: Int = get(m, 1);
      v
    `;
    const result = run(src);
    assert.strictEqual(result.data, 10);
  });

  it('map has', () => {
    const src = `
      let m: Map<Int, Int> = {1: 10, 2: 20};
      let has_one: Bool = has(m, 1);
      has_one
    `;
    const result = run(src);
    assert.strictEqual(result.data, true);
  });

  it('map put and get', () => {
    const src = `
      let m: Map<Int, Int> = {1: 10};
      put(m, 2, 20);
      let v: Int = get(m, 2);
      v
    `;
    const result = run(src);
    assert.strictEqual(result.data, 20);
  });
});

// ── String operations ───────────────────────────────────────────

describe('String Operations', () => {
  it('string concatenation', () => {
    const src = `
      let greeting: String = "Hello, " + "World";
      len(greeting)
    `;
    const result = run(src);
    assert.strictEqual(result.data, 13);
  });

  it('string length', () => {
    const src = `
      let s: String = "hello";
      len(s)
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('substring', () => {
    const src = `
      let s: String = "hello world";
      let sub: String = substring(s, 0, 5);
      len(sub)
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('parse_int', () => {
    const src = `
      let r: Result<Int> = parse_int("42");
      if is_ok(r) {
        let v: Int = unwrap(r);
        v
      }
    `;
    const result = run(src);
    assert.strictEqual(result.data, 42);
  });

  it('to_string', () => {
    const src = `
      let s: String = to_string(42);
      len(s)
    `;
    const result = run(src);
    assert.strictEqual(result.data, 2);
  });
});

// ── Type checking errors ────────────────────────────────────────

describe('Type Checking', () => {
  it('type mismatch on assignment', () => {
    const src = `
      let x: Int = "hello";
      x
    `;
    assert.throws(() => compile(src), /type/i);
  });

  it('undefined variable', () => {
    const src = `
      let x: Int = undefined_var;
      x
    `;
    assert.throws(() => compile(src), /undefined|Undefined/i);
  });

  it('wrong argument count', () => {
    const src = `
      fn add(x: Int, y: Int) -> Int {
        x + y
      }
      let z: Int = add(1);
      z
    `;
    assert.throws(() => compile(src), /expects.*arguments|argument/i);
  });

  it('comparison of different types', () => {
    const src = `
      let x: Bool = 5 == "hello";
      x
    `;
    assert.throws(() => compile(src), /type/i);
  });
});

// ── Edge cases ──────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('unit value', () => {
    const src = `
      let x: Unit = ();
      x
    `;
    const result = run(src);
    assert.strictEqual(result.kind, 'Unit');
  });

  it('negative numbers', () => {
    const src = `
      let x: Int = -5;
      let y: Int = x + 10;
      y
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('complex expression', () => {
    const src = `
      let x: Int = (2 + 3) * (4 - 1) / 3;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.data, 5);
  });

  it('chained function calls', () => {
    const src = `
      fn double(x: Int) -> Int {
        x * 2
      }
      fn square(x: Int) -> Int {
        x * x
      }
      let result: Int = square(double(3));
      result
    `;
    const result = run(src);
    assert.strictEqual(result.data, 36); // (3*2)^2 = 36
  });
});
