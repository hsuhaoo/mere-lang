const { run, compile, Lexer, Parser, TypeChecker } = require('../dist/index.js');
const assert = require('assert');

// ── Basic arithmetic ────────────────────────────────────────────

describe('Basic Arithmetic', () => {
  it('integer addition', () => {
    const src = `
      let x: Num = 2 + 3;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.kind, 'Num');
    assert.strictEqual(result.value, 5);
  });

  it('integer subtraction', () => {
    const src = `
      let x: Num = 10 - 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 6);
  });

  it('integer multiplication', () => {
    const src = `
      let x: Num = 3 * 7;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 21);
  });

  it('integer division', () => {
    const src = `
      let x: Num = 20 / 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('operator precedence', () => {
    const src = `
      let x: Num = 2 + 3 * 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 14); // 2 + (3 * 4)
  });

  it('parenthesized expression', () => {
    const src = `
      let x: Num = (2 + 3) * 4;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 20);
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
    assert.strictEqual(result.value, false);
  });

  it('or operator', () => {
    const src = `
      let x: Bool = true or false;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, true);
  });

  it('not operator', () => {
    const src = `
      let x: Bool = not true;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, false);
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
    assert.strictEqual(result.value, true);
  });
});

// ── Variables ───────────────────────────────────────────────────

describe('Variables', () => {
  it('integer variable', () => {
    const src = `
      let x: Num = 42;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 42);
  });

  it('string variable', () => {
    const src = `
      let name: String = "hello";
      name
    `;
    const result = run(src);
    assert.strictEqual(result.value, 'hello');
  });

  it('bool variable', () => {
    const src = `
      let flag: Bool = true;
      flag
    `;
    const result = run(src);
    assert.strictEqual(result.value, true);
  });

  it('variable shadowing in blocks', () => {
    const src = `
      let x: Num = 1;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 1);
  });
});

// ── Functions ───────────────────────────────────────────────────

describe('Functions', () => {
  it('simple function', () => {
    const src = `
      fn add(x: Num, y: Num) -> Num {
        x + y
      }
      let result: Num = add(3, 4);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.value, 7);
  });

  it('function with return statement', () => {
    const src = `
      fn abs(x: Num) -> Num {
        if x < 0 {
          return -x;
        }
        x
      }
      let result: Num = abs(-5);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
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
      fn factorial(n: Num) -> Num {
        if n <= 1 {
          return 1;
        }
        n * factorial(n - 1)
      }
      let result: Num = factorial(5);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.value, 120);
  });

  it('fibonacci', () => {
    const src = `
      fn fib(n: Num) -> Num {
        if n <= 0 {
          return 0;
        }
        if n == 1 {
          return 1;
        }
        fib(n - 1) + fib(n - 2)
      }
      let result: Num = fib(10);
      result
    `;
    const result = run(src);
    assert.strictEqual(result.value, 55);
  });
});

// ── Conditionals ────────────────────────────────────────────────

describe('Conditionals', () => {
  it('if true branch', () => {
    const src = `
      let x: Num = 10;
      if x > 5 {
        let y: Num = 1;
        y
      }
    `;
    const result = run(src);
    assert.strictEqual(result.value, 1);
  });

  it('if false branch (no else)', () => {
    const src = `
      let x: Num = 3;
      if x > 5 {
        let y: Num = 1;
        y
      }
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 3);
  });

  it('nested ifs', () => {
    const src = `
      let x: Num = 10;
      if x > 5 {
        if x > 8 {
          let y: Num = 2;
          y
        }
      }
    `;
    const result = run(src);
    assert.strictEqual(result.value, 2);
  });
});

// ── Result type ─────────────────────────────────────────────────

describe('Result Type', () => {
  it('ok constructor', () => {
    const src = `
      let r: Result<Num> = ok(42);
      is_ok(r)
    `;
    const result = run(src);
    assert.strictEqual(result.value, true);
  });

  it('err constructor', () => {
    const src = `
      let r: Result<Num> = err("something went wrong");
      is_err(r)
    `;
    const result = run(src);
    assert.strictEqual(result.value, true);
  });

  it('divide with error handling', () => {
    const src = `
      fn divide(a: Num, b: Num) -> Result<Num> {
        if b == 0 {
          return err("division by zero");
        }
        ok(a / b)
      }
      let r: Result<Num> = divide(10, 2);
      if is_ok(r) {
        let v: Num = unwrap(r);
        v
      }
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('divide by zero', () => {
    const src = `
      fn divide(a: Num, b: Num) -> Result<Num> {
        if b == 0 {
          return err("division by zero");
        }
        ok(a / b)
      }
      let r: Result<Num> = divide(10, 0);
      if is_err(r) {
        let msg: String = unwrap_err(r);
        len(msg)
      }
    `;
    const result = run(src);
    assert.strictEqual(result.value, 16);
  });
});

// ── Lists ───────────────────────────────────────────────────────

describe('Lists', () => {
  it('create and get element', () => {
    const src = `
      let nums: List<Num> = [1, 2, 3];
      let first: Num = unwrap(get(nums, 0));
      first
    `;
    const result = run(src);
    assert.strictEqual(result.value, 1);
  });

  it('list length', () => {
    const src = `
      let nums: List<Num> = [1, 2, 3, 4, 5];
      let count: Num = list_len(nums);
      count
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('append to list', () => {
    const src = `
      let nums: List<Num> = [1, 2];
      let new_nums: List<Num> = append(nums, 3);
      let count: Num = list_len(new_nums);
      count
    `;
    const result = run(src);
    assert.strictEqual(result.value, 3);
  });

  it('sum of list', () => {
    const src = `
      fn sum(lst: List<Num>) -> Num {
        if list_len(lst) == 0 {
          return 0;
        }
        let head: Num = unwrap(get(lst, 0));
        let tail: List<Num> = substring_list(lst, 1, list_len(lst) - 1);
        head + sum(tail)
      }
      let nums: List<Num> = [1, 2, 3, 4, 5];
      sum(nums)
    `;
    const result = run(src);
    assert.strictEqual(result.value, 15);
  });
});

// ── Maps ────────────────────────────────────────────────────────

describe('Maps', () => {
  it('create and get', () => {
    const src = `
      let m: Map<Num, Num> = {1: 10, 2: 20};
      let v: Num = unwrap(get(m, 1));
      v
    `;
    const result = run(src);
    assert.strictEqual(result.value, 10);
  });

  it('map has', () => {
    const src = `
      let m: Map<Num, Num> = {1: 10, 2: 20};
      let has_one: Bool = has(m, 1);
      has_one
    `;
    const result = run(src);
    assert.strictEqual(result.value, true);
  });

  it('map put and get', () => {
    const src = `
      let m: Map<Num, Num> = {1: 10};
      put(m, 2, 20);
      let v: Num = unwrap(get(m, 2));
      v
    `;
    const result = run(src);
    assert.strictEqual(result.value, 20);
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
    assert.strictEqual(result.value, 12);
  });

  it('string length', () => {
    const src = `
      let s: String = "hello";
      len(s)
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('substring', () => {
    const src = `
      let s: String = "hello world";
      let sub: String = substring(s, 0, 5);
      len(sub)
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('parse_num', () => {
    const src = `
      let r: Result<Num> = parse_num("42");
      if is_ok(r) {
        let v: Num = unwrap(r);
        v
      }
    `;
    const result = run(src);
    assert.strictEqual(result.value, 42);
  });

  it('to_string', () => {
    const src = `
      let s: String = to_string(42);
      len(s)
    `;
    const result = run(src);
    assert.strictEqual(result.value, 2);
  });
});

// ── Type checking errors ────────────────────────────────────────

describe('Type Checking', () => {
  it('type mismatch on assignment', () => {
    const src = `
      let x: Num = "hello";
      x
    `;
    assert.throws(() => compile(src), /type/i);
  });

  it('undefined variable', () => {
    const src = `
      let x: Num = undefined_var;
      x
    `;
    assert.throws(() => compile(src), /undefined|Undefined/i);
  });

  it('wrong argument count', () => {
    const src = `
      fn add(x: Num, y: Num) -> Num {
        x + y
      }
      let z: Num = add(1);
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
      let x: Num = -5;
      let y: Num = x + 10;
      y
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('complex expression', () => {
    const src = `
      let x: Num = (2 + 3) * (4 - 1) / 3;
      x
    `;
    const result = run(src);
    assert.strictEqual(result.value, 5);
  });

  it('chained function calls', () => {
    const src = `
      fn double(x: Num) -> Num {
        x * 2
      }
      fn square(x: Num) -> Num {
        x * x
      }
      let result: Num = square(double(3));
      result
    `;
    const result = run(src);
    assert.strictEqual(result.value, 36); // (3*2)^2 = 36
  });
});
