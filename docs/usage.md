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
11.3 [网络 I/O](#11-3-网络-io)
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
let x: Number = 42;              // 语句以分号结尾（可选）
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
| 整数 | `Number` | `42`, `-7`, `0` |
| 字符串 | `String` | `"hello"`, `'single'` |
| 布尔 | `Boolean` | `true`, `false` |
| 单元 | `Unit` | `()` |

### 3.2 参数化类型

| 类型 | 描述 |
|------|------|
| `List<T>` | 同质列表，如 `List<Number>` |
| `Result<T>` | 错误处理类型，`ok(v)` 或 `err(msg)` |
| `Map<K, V>` | 字符串或整数键的映射 |
| `Task<T>` | 异步任务结果 |

### 3.3 变量绑定

```sim
// 必须显式标注类型
let x: Number = 42;
let name: String = "Simplex";
let flag: Boolean = true;
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
| `len` | `len(String) → Number` | 长度 |
| `concat` | `concat(String, String) → String` | 拼接 |
| `substring` | `substring(String, Number, Number) → String` | 截取 |
| `to_string` | `to_string($T) → String` | 转字符串 |
| `to_string_bool` | `to_string_bool(Boolean) → String` | 布尔转字符串 |
| `print` | `print(String) → Unit` | 打印到 stdout |

### 4.5 字符串方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `.len()` | `→ Number` | 长度 |
| `.concat(s)` | `(String) → String` | 拼接 |
| `.substring(s, n)` | `(Number, Number) → String` | 截取 |
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
fn add(a: Number, b: Number) -> Number {
  a + b
}
```

- 返回类型必须标注在箭头 `->` 后
- 函数体最后一个表达式即为返回值

### 5.2 提前返回

```sim
fn factorial(n: Number) -> Number {
  if n <= 1 {
    return 1;
  }
  n * factorial(n - 1)
}
```

### 5.3 调用

```sim
let x: Number = add(3, 4);       // 7
```

### 5.4 内置函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `len` | `len(String) → Number` | 字符串长度 |
| `concat` | `concat(String, String) → String` | 拼接 |
| `substring` | `substring(String, start, len) → String` | 截取 |
| `parse_num` | `parse_num(String) → Result<Number>` | 解析整数 |
| `to_string` | `to_string($T) → String` | 转字符串 |
| `list_len` | `list_len(List<T>) → Number` | 列表长度 |
| `append` | `append(List<T>, T) → List<T>` | 追加元素 |
| `list_get` | `list_get(List<T>, Number) → Result<T>` | 按索引取值 |
| `map_put` | `map_put(Map<K,V>, K, V) → Unit` | 插入/更新 |
| `map_get` | `map_get(Map<K,V>, K) → Result<V>` | 按键取值 |
| `map_has` | `map_has(Map<K,V>, K) → Boolean` | 检查键 |
| `map_remove` | `map_remove(Map<K,V>, K) → Unit` | 删除 |
| `abs` | `abs(Number) → Number` | 绝对值 |
| `max` | `max(Number, Number) → Number` | 最大值 |
| `min` | `min(Number, Number) → Number` | 最小值 |
| `spawn` | `spawn(Fn<.., RetT>) → Task<RetT>` | 包装零参 lambda 为 Task |
| `join` | `join(Task<T>) → T` | 获取 Task 结果 |
| `file_read` | `file_read(String) → Task<Result<String>>` | 异步读取文件 |
| `file_write` | `file_write(String, String) → Task<Result<Unit>>` | 异步写入文件 |
| `file_read_lines` | `file_read_lines(String) → Task<Result<List<String>>>` | 异步读行 |

---

## 6. Lambda 表达式

Lambda 是一等值：

```sim
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
let result: Number = add(3, 4);      // 7
```

### 6.1 参数说明

`Fn<A, B, ..., R>` — A、B 是参数类型，R 是返回类型：

```sim
// 零参数
let hello: Fn<String> = fn() -> String { "hello" };
print(hello());   // "hello"

// 单参数
let double: Fn<Number, Number> = fn(n: Number) -> Number { n * 2 };
let d: Number = double(21);   // 42

// 双参数
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
let s: Number = add(10, 20);  // 30
```

### 6.2 重要限制

**Lambda 不捕获外部变量**。所有数据必须作为参数显式传入：

```sim
let x: Number = 10;
let add_x: Fn<Number, Number> = fn(y: Number) -> Number { y + x };  // ❌ 错误：x 不是参数
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
let y: Number = if x > 5 {
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

使用 `Result<T>` 类型，通过 `ok(v)` 和 `err(msg)` 构造。Result 是一个字段类型，包含三个字段：

| 字段 | 类型 | Ok 时 | Err 时 |
|------|------|-------|--------|
| `isOk` | `Boolean` | `true` | `false` |
| `value` | `T` | 成功值 | `()` |
| `errMessage` | `String` | `""` | 错误信息 |

### 8.1 构造

```sim
let ok_val: Result<Number> = ok(42);
let err_val: Result<String> = err("something went wrong");
```

### 8.2 检查与解包

```sim
let r: Result<Number> = safe_divide(10, 0);

if r.isOk {
  let val: Number = r.value;
  print("Result: " + to_string(val));
}

if not r.isOk {
  let msg: String = r.errMessage;
  print("Error: " + msg);
}
```

### 8.3 完整示例

```sim
fn safe_divide(a: Number, b: Number) -> Result<Number> {
  if b == 0 {
    return err("division by zero");
  }
  ok(a / b)
}

fn handle_division(a: Number, b: Number) -> Unit {
  let result: Result<Number> = safe_divide(a, b);
  if result.isOk {
    let value: Number = result.value;
    print("Result: " + to_string(value));
  }
  if not result.isOk {
    let error: String = result.errMessage;
    print("Error: " + error);
  }
}
```

---

## 9. 数据结构

### 9.1 列表

```sim
// 创建
let nums: List<Number> = [1, 2, 3, 4, 5];

// 长度
let len: Number = list_len(nums);       // 5

// 按索引取值（返回 Result）
let first: Result<Number> = list_get(nums, 0);
if first.isOk {
  print("First: " + to_string(first.value));  // 1
}

// 追加元素
let extended: List<Number> = append(nums, 6);
```

### 9.2 列表方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `.append(e)` | `(T) → Unit` | 追加元素 |
| `.get(i)` | `(Number) → Result<T>` | 按索引取值 |
| `.len()` | `() → Number` | 长度 |

### 9.3 Map

```sim
// 整数键
let scores: Map<Number, String> = {
  1: "Alice",
  2: "Bob"
};

let name: Result<String> = map_get(scores, 1);
if name.isOk { print(name.value); }   // Alice

let has: Boolean = map_has(scores, 2);        // true

map_put(scores, 3, "Charlie");
map_remove(scores, 2);

// 字符串键
let ages: Map<String, Number> = {
  "Alice": 30,
  "Bob": 25
};
```

### 9.4 Map 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `.put(k, v)` | `(K, V) → Unit` | 插入/更新 |
| `.get(k)` | `(K) → Result<V>` | 按键取值 |
| `.has(k)` | `(K) → Boolean` | 检查键 |

---

## 10. 自定义记录

### 10.1 定义

```sim
type Point = { x: Number, y: Number };

type Rectangle = { top_left: Point, width: Number, height: Number };
```

### 10.2 创建

```sim
let origin: Point = { x: 0, y: 0 };
let p1: Point = { x: 10, y: 20 };
```

### 10.3 字段访问

```sim
let x: Number = p1.x;                         // 10
let area: Number = rect.width * rect.height;   // 20000
let left: Number = rect.top_left.x;            // 嵌套字段访问
```

### 10.4 完整示例

```sim
type Point = { x: Number, y: Number };
type Rectangle = { top_left: Point, width: Number, height: Number };

fn make_rect(x: Number, y: Number, w: Number, h: Number) -> Rectangle {
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

I/O 函数返回 `Task<Result<T>>`，需用 `join` 获取结果：

```sim
let task: Task<Result<Unit>> = file_write("output.txt", "Hello from Simplex!\n");
let result: Result<Unit> = join(task);
if result.isOk {
  print("File written successfully");
}
```

### 11.2 读取

```sim
// 读取全部内容
let task: Task<Result<String>> = file_read("output.txt");
let content: Result<String> = join(task);
if content.isOk {
  print("Contents: " + content.value);
}

// 读取为行
let task2: Task<Result<List<String>>> = file_read_lines("output.txt");
let lines: Result<List<String>> = join(task2);
if lines.isOk {
  let count: Number = list_len(lines.value);
  print("Line count: " + to_string(count));
}
```

### 11.3 网络 I/O

```sim
// GET 请求
let task: Task<Result<String>> = fetch("https://httpbin.org/get", "GET", {}, "");
let result: Result<String> = join(task);
if result.isOk {
  print("Response: " + result.value);
}

// POST 请求（带 body）
let task2: Task<Result<String>> = fetch("https://httpbin.org/post", "POST", {}, "Hello server");
let result2: Result<String> = join(task2);
if result2.isOk {
  print("Response: " + result2.value);
}

// 带自定义 Header
let headers: Record<String, String> = {
  "User-Agent": "MySimplexApp/1.0",
  "Authorization": "Bearer token123"
};
let task3: Task<Result<String>> = fetch("https://api.example.com/data", "GET", headers, "");
let result3: Result<String> = join(task3);
```

**签名**：
```
fetch(url: String, method: String, headers: Record<String, String>, body: String) -> Task<Result<String>>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | `String` | 完整 URL（含协议） |
| `method` | `String` | HTTP 方法：`GET`、`POST`、`PUT`、`DELETE` 等 |
| `headers` | `Record<String, String>` | 请求头，空对象 `{}` 表示无自定义头 |
| `body` | `String` | 请求体，`GET`/`HEAD` 时忽略 |

- 返回 `Task<Result<String>>`，需用 `join` 获取
- `Result<String>`：成功时 `ok(body)`，失败时 `err("HTTP 404: ...")` 或 `err("Fetch failed: ...")`
- 采用 Node.js 内置 `fetch` API（需 Node 18+）

---

## 12. 模块系统

### 12.1 导出

```sim
// math.sim
export fn add(a: Number, b: Number) -> Number {
  a + b
}

export fn multiply(a: Number, b: Number) -> Number {
  a * b
}
```

### 12.2 导入

```sim
// main.sim
import math from "./math.sim";

let x: Number = math.add(3, 4);       // 7
let y: Number = math.multiply(5, 6);  // 30
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

`spawn` 接受一个**零参 lambda**，返回 `Task<T>`。`join` 阻塞等待任务结果：

```sim
let task: Task<Number> = spawn(fn() -> Number { 10 + 20 });
let result: Number = join(task);   // 30
```

### 13.2 说明

- `spawn` 的函数在 `join` 时执行（同步任务）
- 异步 I/O 函数（`file_read`、`file_write`、`file_read_lines`）调用时立即启动后台 I/O，`join` 只等待结果
- 多个异步 I/O 可同时启动，再分别 `join` 实现并发

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
fn fib(n: Number) -> Number {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  fib(n - 1) + fib(n - 2)
}

fn print_fib(i: Number, max: Number) -> Unit {
  if i >= max { return; }
  let f: Number = fib(i);
  print("fib(" + to_string(i) + ") = " + to_string(f));
  print_fib(i + 1, max);
}

print_fib(0, 15);
```

### 14.3 模块：跨文件导入

```sim
// math.sim — 导出函数
export fn add(a: Number, b: Number) -> Number {
  a + b
}

export fn multiply(a: Number, b: Number) -> Number {
  a * b
}
```

```sim
// main.sim — 导入并使用
import math from "./math.sim";

let x: Number = math.add(3, 4);       // 7
let y: Number = math.multiply(5, 6);  // 30
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
fn fib(n: Number) -> Number {
  if n <= 0 { return 0; }
  if n == 1 { return 1; }
  fib(n - 1) + fib(n - 2)
}

fn print_fib(i: Number, max: Number) -> Unit {
  if i >= max { return; }
  let f: Number = fib(i);
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
