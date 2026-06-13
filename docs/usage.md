# Simplex 使用文档

Simplex 是一个极简、显式的编程语言。关键字分为几类：

- **控制流**：`fn`、`let`、`if`、`return`
- **类型**：`type`
- **模块**：`import`、`export`
- **字面量**：`true`、`false`、`unit`、`ok`、`err`
- **逻辑**：`and`、`or`、`not`
- **模块语法**：`from`
- **预留**：`in`

---

## 目录

1. [运行](#1-运行)
2. [基本语法](#2-基本语法)
3. [数据类型](#3-数据类型)
4. [表达式与运算符](#4-表达式与运算符)
5. [函数](#5-函数)
6. [Lambda 表达式](#6-lambda-表达式)
7. [条件](#7-条件)
8. [错误处理](#8-错误处理)
9. [数据结构](#9-数据结构)
10. [自定义记录](#10-自定义记录)
11. [文件 I/O](#11-文件-io)
12. [模块系统](#12-模块系统)
13. [任务与并发](#13-任务与并发)
14. [完整示例](#14-完整示例)

---

## 1. 运行

```bash
node bin/simplex.js <file.sim>
node tests/run-tests.js
```

---

## 2. 基本语法

```sim
// 单行注释
let x: Int = 42;              // 语句以分号结尾（可选）
print("Hello");               // 语句可以不用分号
```

- 注释：`//` 到行尾
- 语句以分号 `;` 结尾，但末尾分号可选
- 表达式以最后一个表达式作为返回值
- 大括号 `{ }` 用于函数体、条件块、块表达式

---

## 3. 数据类型

### 3.1 基础类型

| 类型 | 关键字 | 值 |
|------|--------|-----|
| 整数 | `Int` | `42`, `-7`, `0` |
| 字符串 | `String` | `"hello"`, `'single'` |
| 布尔 | `Bool` | `true`, `false` |
| 单元 | `Unit` | `()` |

### 3.2 参数化类型

| 类型 | 描述 |
|------|------|
| `List<T>` | 同质列表，如 `List<Int>` |
| `Result<T>` | 错误处理类型，`ok(v)` 或 `err(msg)` |
| `Map<K, V>` | 字符串或整数键的映射 |
| `Task<T>` | 异步任务结果 |

### 3.3 变量绑定

```sim
// 必须显式标注类型
let x: Int = 42;
let name: String = "Simplex";
let flag: Bool = true;
let empty: Unit = ();
```

---

## 4. 表达式与运算符

### 4.1 算术运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `+` | 加法 | `1 + 2` → `3` |
| `-` | 减法 / 负号 | `5 - 3` → `2` |
| `*` | 乘法 | `3 * 4` → `12` |
| `/` | 整数除法 | `7 / 2` → `3` |

### 4.2 比较运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `==` | 等于 | `1 == 1` → `true` |
| `!=` | 不等于 | `2 != 3` → `true` |
| `<` | 小于 | `1 < 2` → `true` |
| `>` | 大于 | `5 > 3` → `true` |
| `<=` | 小于等于 | |
| `>=` | 大于等于 | |

### 4.3 逻辑运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `and` | 与 | `true and false` → `false` |
| `or` | 或 | `true or false` → `true` |
| `not` | 非 | `not true` → `false` |

### 4.4 字符串操作

| 函数 | 签名 | 说明 |
|------|------|------|
| `+` | `String + String` | 拼接 |
| `len` | `len(String) → Int` | 长度 |
| `concat` | `concat(String, String) → String` | 拼接 |
| `substring` | `substring(String, Int, Int) → String` | 截取 |
| `to_string` | `to_string($T) → String` | 转字符串 |
| `to_string_bool` | `to_string_bool(Bool) → String` | 布尔转字符串 |
| `print` | `print(String) → Unit` | 打印到 stdout |

### 4.5 字符串方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `.len()` | `→ Int` | 长度 |
| `.concat(s)` | `(String) → String` | 拼接 |
| `.substring(s, n)` | `(Int, Int) → String` | 截取 |
| `.print()` | `→ Unit` | 打印 |

### 4.6 运算符优先级

从低到高：

```
or
and
<  >  <=  >=
==  !=
+  -
*  /
not  -  (negation)
.  (method call)
```

示例：`1 + 2 * 3` = `1 + (2 * 3)` = `7`

---

## 5. 函数

### 5.1 定义

```sim
fn add(a: Int, b: Int) -> Int {
  a + b
}
```

- 返回类型必须标注在箭头 `->` 后
- 函数体最后一个表达式即为返回值

### 5.2 提前返回

```sim
fn factorial(n: Int) -> Int {
  if n <= 1 {
    return 1;
  }
  n * factorial(n - 1)
}
```

### 5.3 调用

```sim
let x: Int = add(3, 4);       // 7
```

### 5.4 内置函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `len` | `len(String) → Int` | 字符串长度 |
| `concat` | `concat(String, String) → String` | 拼接 |
| `substring` | `substring(String, start, len) → String` | 截取 |
| `parse_int` | `parse_int(String) → Result<Int>` | 解析整数 |
| `to_string` | `to_string($T) → String` | 转字符串 |
| `list_len` | `list_len(List<T>) → Int` | 列表长度 |
| `append` | `append(List<T>, T) → List<T>` | 追加元素 |
| `list_get` | `list_get(List<T>, Int) → Result<T>` | 按索引取值 |
| `is_ok` | `is_ok(Result<T>) → Bool` | 是否 Ok |
| `is_err` | `is_err(Result<T>) → Bool` | 是否 Err |
| `unwrap` | `unwrap(Result<T>) → T` | 取 Ok 值 |
| `unwrap_err` | `unwrap_err(Result<T>) → String` | 取错误信息 |
| `map_put` | `map_put(Map<K,V>, K, V) → Unit` | 插入/更新 |
| `map_get` | `map_get(Map<K,V>, K) → Result<V>` | 按键取值 |
| `map_has` | `map_has(Map<K,V>, K) → Bool` | 检查键 |
| `map_remove` | `map_remove(Map<K,V>, K) → Unit` | 删除 |
| `abs` | `abs(Int) → Int` | 绝对值 |
| `max` | `max(Int, Int) → Int` | 最大值 |
| `min` | `min(Int, Int) → Int` | 最小值 |
| `spawn` | `spawn(T) → Task<T>` | 包装表达式为 Task |
| `join` | `join(Task<T>) → T` | 获取 Task 结果 |

---

## 6. Lambda 表达式

Lambda 是一等值：

```sim
let add: Fn<Int, Int, Int> = fn(x: Int, y: Int) -> Int { x + y };
let result: Int = add(3, 4);      // 7
```

### 6.1 参数说明

`Fn<A, B, ..., R>` — A、B 是参数类型，R 是返回类型：

```sim
// 零参数
let hello: Fn<String> = fn() -> String { "hello" };
print(hello());   // "hello"

// 单参数
let double: Fn<Int, Int> = fn(n: Int) -> Int { n * 2 };
let d: Int = double(21);   // 42

// 双参数
let add: Fn<Int, Int, Int> = fn(x: Int, y: Int) -> Int { x + y };
let s: Int = add(10, 20);  // 30
```

### 6.2 重要限制

**Lambda 不捕获外部变量**。所有数据必须作为参数显式传入：

```sim
let x: Int = 10;
let add_x: Fn<Int, Int> = fn(y: Int) -> Int { y + x };  // ❌ 错误：x 不是参数
```

---

## 7. 条件

### 7.1 if 语句

`if` 只有 then 分支，没有 `else`：

```sim
if x > 5 {
  print("big");
}
```

### 7.2 if 作为表达式

```sim
let y: Int = if x > 5 {
  100
};
```

### 7.3 嵌套 if

```sim
if condition1 {
  // branch 1
}
if condition2 {
  // branch 2
}
// 两个条件都检查，可以都不进入
```

---

## 8. 错误处理

使用 `Result<T>` 类型，通过 `ok(v)` 和 `err(msg)` 构造：

### 8.1 构造

```sim
let ok_val: Result<Int> = ok(42);
let err_val: Result<String> = err("something went wrong");
```

### 8.2 检查与解包

```sim
let r: Result<Int> = safe_divide(10, 0);

if is_ok(r) {
  let val: Int = unwrap(r);
  print("Result: " + to_string(val));
}

if is_err(r) {
  let msg: String = unwrap_err(r);
  print("Error: " + msg);
}
```

### 8.3 完整示例

```sim
fn safe_divide(a: Int, b: Int) -> Result<Int> {
  if b == 0 {
    return err("division by zero");
  }
  ok(a / b)
}

fn handle_division(a: Int, b: Int) -> Unit {
  let result: Result<Int> = safe_divide(a, b);
  if is_ok(result) {
    let value: Int = unwrap(result);
    print("Result: " + to_string(value));
  }
  if is_err(result) {
    let error: String = unwrap_err(result);
    print("Error: " + error);
  }
}
```

---

## 9. 数据结构

### 9.1 列表

```sim
// 创建
let nums: List<Int> = [1, 2, 3, 4, 5];

// 长度
let len: Int = list_len(nums);       // 5

// 按索引取值（返回 Result）
let first: Result<Int> = list_get(nums, 0);
if is_ok(first) {
  print("First: " + to_string(unwrap(first)));  // 1
}

// 追加元素
let extended: List<Int> = append(nums, 6);
```

### 9.2 列表方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `.append(e)` | `(T) → Unit` | 追加元素 |
| `.get(i)` | `(Int) → Result<T>` | 按索引取值 |
| `.len()` | `() → Int` | 长度 |

### 9.3 Map

```sim
// 整数键
let scores: Map<Int, String> = {
  1: "Alice",
  2: "Bob"
};

let name: Result<String> = map_get(scores, 1);
if is_ok(name) { print(unwrap(name)); }   // Alice

let has: Bool = map_has(scores, 2);        // true

map_put(scores, 3, "Charlie");
map_remove(scores, 2);

// 字符串键
let ages: Map<String, Int> = {
  "Alice": 30,
  "Bob": 25
};
```

### 9.4 Map 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `.put(k, v)` | `(K, V) → Unit` | 插入/更新 |
| `.get(k)` | `(K) → Result<V>` | 按键取值 |
| `.has(k)` | `(K) → Bool` | 检查键 |

---

## 10. 自定义记录

### 10.1 定义

```sim
type Point = { x: Int, y: Int };

type Rectangle = { top_left: Point, width: Int, height: Int };
```

### 10.2 创建

```sim
let origin: Point = { x: 0, y: 0 };
let p1: Point = { x: 10, y: 20 };
```

### 10.3 字段访问

```sim
let x: Int = p1.x;                         // 10
let area: Int = rect.width * rect.height;   // 20000
let left: Int = rect.top_left.x;            // 嵌套字段访问
```

### 10.4 完整示例

```sim
type Point = { x: Int, y: Int };
type Rectangle = { top_left: Point, width: Int, height: Int };

fn make_rect(x: Int, y: Int, w: Int, h: Int) -> Rectangle {
  let tl: Point = { x: x, y: y };
  { top_left: tl, width: w, height: h }
}

let rect: Rectangle = make_rect(0, 0, 100, 200);
print("width=" + to_string(rect.width));
print("top-left: x=" + to_string(rect.top_left.x));
```

---

## 11. 文件 I/O

### 11.1 写入

```sim
let result: Result<Unit> = file_write("output.txt", "Hello from Simplex!\n");
if is_ok(result) {
  print("File written successfully");
}
```

### 11.2 读取

```sim
// 读取全部内容
let content: Result<String> = file_read("output.txt");
if is_ok(content) {
  print("Contents: " + unwrap(content));
}

// 读取为行
let lines: Result<List<String>> = file_read_lines("output.txt");
if is_ok(lines) {
  let count: Int = list_len(unwrap(lines));
  print("Line count: " + to_string(count));
}
```

---

## 12. 模块系统

### 12.1 导出

```sim
// math.sim
export fn add(a: Int, b: Int) -> Int {
  a + b
}

export fn multiply(a: Int, b: Int) -> Int {
  a * b
}
```

### 12.2 导入

```sim
// main.sim
import math from "./math.sim";

let x: Int = math.add(3, 4);       // 7
let y: Int = math.multiply(5, 6);  // 30
```

### 12.3 规则

- 文件名 = 模块名（`math.sim` → 模块名 `math`）
- 只有 `export fn` 支持
- 导入创建命名空间，通过 `namespace.func` 访问
- 路径相对导入文件目录解析
- 不支持循环依赖

---

## 13. 任务与并发

### 13.1 基本概念

`spawn` 接受一个**已求值的表达式**，包装为 `Task<T>`。`join` 返回任务结果：

```sim
let task: Task<Int> = spawn(add(10, 20));
let result: Int = join(task);   // 30
```

### 13.2 说明

- `spawn` 接受已求值的值，返回类型自动推导
- 当前实现为同步任务（无异步 I/O）
- 为未来异步扩展预留接口

---

## 14. 完整示例

### 14.1 Hello World

```sim
print("Hello, Simplex!");
let name: String = "World";
print("Hello, " + name + "!");
```

### 14.2 递归：斐波那契

```sim
fn fib(n: Int) -> Int {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  fib(n - 1) + fib(n - 2)
}

fn print_fib(i: Int, max: Int) -> Unit {
  if i >= max { return; }
  let f: Int = fib(i);
  print("fib(" + to_string(i) + ") = " + to_string(f));
  print_fib(i + 1, max);
}

print_fib(0, 15);
```

### 14.3 模块：跨文件导入

```sim
// math.sim — 导出函数
export fn add(a: Int, b: Int) -> Int {
  a + b
}

export fn multiply(a: Int, b: Int) -> Int {
  a * b
}
```

```sim
// main.sim — 导入并使用
import math from "./math.sim";

let x: Int = math.add(3, 4);       // 7
let y: Int = math.multiply(5, 6);  // 30
print("add: " + to_string(x));
print("multiply: " + to_string(y));
```

```sim
print("Hello, Simplex!");
let name: String = "World";
print("Hello, " + name + "!");
```

### 14.2 递归：斐波那契

```sim
fn fib(n: Int) -> Int {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  fib(n - 1) + fib(n - 2)
}

fn print_fib(i: Int, max: Int) -> Unit {
  if i >= max { return; }
  let f: Int = fib(i);
  print("fib(" + to_string(i) + ") = " + to_string(f));
  print_fib(i + 1, max);
}

print_fib(0, 15);
```

---

## 附录：运行

```bash
node bin/simplex.js examples/hello.sim
node tests/run-tests.js
```

## License

MIT
