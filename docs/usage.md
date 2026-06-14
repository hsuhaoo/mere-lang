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
| `len` | `len(String) → Number` | 字符串长度（已废弃，使用 `s.len`） |
| `concat` | `concat(String, String) → String` | 拼接 |
| `substring` | `substring(String, Number, Number) → String` | 截取（起始位置 + 长度） |
| `indexOf` | `indexOf(String, String) → Result<Number>` | 查找子串位置 |
| `to_string` | `to_string($T) → String` | 转字符串 |
| `to_string_bool` | `to_string_bool(Boolean) → String` | 布尔转字符串 |
| `print` | `print(String) → Unit` | 打印到 stdout |

### 4.5 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `String.len` | `Number` | 字符串长度 |
| `List.len` | `Number` | 列表长度 |

**注意**：`.len` 是字段访问，无需括号：`"hello".len` 或 `[1,2,3].len`。

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
.  (field access)
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
| `concat` | `concat(String, String) → String` | 拼接 |
| `substring` | `substring(String, start, len) → String` | 截取 |
| `parse_num` | `parse_num(String) → Result<Number>` | 解析整数 |
| `to_string` | `to_string($T) → String` | 转字符串 |
| `append` | `append(List<T>, T) → List<T>` | 追加元素 |
| `list_get` | `list_get(List<T>, Number) → Result<T>` | 按索引取值 |
| `map_put` | `map_put(Map<K,V>, K, V) → Map<K,V>` | 插入/更新（返回新 Map） |
| `map_get` | `map_get(Map<K,V>, K) → Result<V>` | 按键取值 |
| `map_has` | `map_has(Map<K,V>, K) → Boolean` | 检查键 |
| `map_remove` | `map_remove(Map<K,V>, K) → Map<K,V>` | 删除（返回新 Map） |
| `abs` | `abs(Number) → Number` | 绝对值 |
| `max` | `max(Number, Number) → Number` | 最大值 |
| `min` | `min(Number, Number) → Number` | 最小值 |
| `spawn` | `spawn(Fn<.., RetT>) → Task<RetT>` | 包装零参 lambda 为 Task |
| `join` | `join(Task<T>) → T` | 获取 Task 结果 |
| `file_read` | `file_read(String) → Task<Result<String>>` | 异步读取文件 |
| `file_write` | `file_write(String, String) → Task<Result<Unit>>` | 异步写入文件 |
| `file_read_lines` | `file_read_lines(String) → Task<Result<List<String>>>` | 异步读行 |
| `read_line` | `read_line() → Task<Result<String>>` | 从标准输入读取一行 |
| `fetch` | `fetch(String, FetchOptions) → Task<Result<String>>` | HTTP 请求 |
| `map` | `map(List<T>, Fn<T, U>) → List<U>` | 列表映射 |
| `filter` | `filter(List<T>, Fn<T, Boolean>) → List<T>` | 列表过滤 |
| `fold` | `fold(List<T>, U, Fn<U, T, U>) → U` | 列表归约 |
| `indexOf` | `indexOf(String, String) → Result<Number>` | 查找子串位置 |

---

## 6. 网络与 I/O

### 6.1 fetch

发送 HTTP 请求：

```sim
// GET 请求
let resp: Task<Result<String>> = fetch("https://api.example.com/data", {
  method: "GET",
  headers: { "Authorization": "Bearer token" }
});
let body: Result<String> = join(resp);
```

`FetchOptions` 结构体：

```sim
struct FetchOptions {
  method: String,   // "GET" | "POST" | "PUT" | "DELETE"，默认 "GET"
  headers: Map<String, String>,  // 可选
  body: String,     // 可选，POST/PUT 使用
};
```

### 6.2 read_line

从标准输入读取一行：

```sim
let input: Task<Result<String>> = read_line();
let line: Result<String> = join(input);
```

---

## 7. 列表高阶函数

### 7.1 map

对列表每个元素应用函数：

```sim
let nums: List<Number> = [1, 2, 3];
let doubled: List<Number> = map(nums, fn(n: Number) -> Number { n * 2 });
// [2, 4, 6]
```

### 7.2 filter

过滤列表元素：

```sim
let nums: List<Number> = [1, 2, 3, 4, 5];
let evens: List<Number> = filter(nums, fn(n: Number) -> Boolean { n % 2 == 0 });
// [2, 4]
```

### 7.3 fold

归约列表为单个值：

```sim
let nums: List<Number> = [1, 2, 3, 4];
let sum: Number = fold(nums, 0, fn(acc: Number, n: Number) -> Number { acc + n });
// 10

// 构建 JSON 数组
let items: List<String> = ["a", "b", "c"];
let json: String = fold(items, "[", fn(acc: String, item: String) -> String {
  if (item != "") {
    let prefix = if (substring(acc, 0, 1) == "[") { "" } else { ", " };
    acc + prefix + item
  } else {
    acc
  }
});
// "[a, b, c]"
```

---

## 8. Lambda 表达式

Lambda 是一等值：

```sim
let add: Fn<Number, Number, Number> = fn(x: Number, y: Number) -> Number { x + y };
let result: Number = add(3, 4);      // 7
```

### 8.1 参数说明

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

### 8.2 重要限制

**Lambda 不捕获外部变量**。所有数据必须作为参数显式传入：

```sim
let x: Number = 10;
let add_x: Fn<Number, Number> = fn(y: Number) -> Number { y + x };  // ❌ 错误：x 不是参数
```

---

## 9. 条件

### 9.1 if 语句

`if` 只有 then 分支，没有 `else`：

```sim
if x > 5 {
  print("big");
}
```

### 9.2 if 作为表达式

```sim
let y: Number = if x > 5 {
  100
};
```

### 9.3 嵌套 if

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

## 10. 错误处理

使用 `Result<T>` 类型，通过 `ok(v)` 和 `err(msg)` 构造。Result 是一个字段类型，包含三个字段：

| 字段 | 类型 | Ok 时 | Err 时 |
|------|------|-------|--------|
| `isOk` | `Boolean` | `true` | `false` |
| `value` | `T` | 成功值 | `()` |
| `errMessage` | `String` | `""` | 错误信息 |

### 10.1 构造

```sim
let ok_val: Result<Number> = ok(42);
let err_val: Result<String> = err("something went wrong");
```

### 10.2 检查与解包

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

### 10.3 完整示例

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

## 11. 数据结构

### 11.1 列表

```sim
// 创建
let nums: List<Number> = [1, 2, 3, 4, 5];

// 长度
let len: Number = nums.len;       // 5

// 按索引取值（返回 Result）
let first: Result<Number> = list_get(nums, 0);
if first.isOk {
  print("First: " + to_string(first.value));  // 1
}

// 追加元素
let extended: List<Number> = append(nums, 6);
```

### 11.2 列表操作

| 函数 | 签名 | 说明 |
|------|------|------|
| `append` | `append(List<T>, T) → List<T>` | 追加元素 |
| `list_get` | `list_get(List<T>, Number) → Result<T>` | 按索引取值 |

**注意**：列表长度用 `l.len` 字段访问。

### 11.3 Map

```sim
// 整数键
let scores: Map<Number, String> = {
  1: "Alice",
  2: "Bob"
};

let name: Result<String> = map_get(scores, 1);
if name.isOk { print(name.value); }   // Alice

let has: Boolean = map_has(scores, 2);        // true

let scores2: Map<Number, String> = map_put(scores, 3, "Charlie");
let scores3: Map<Number, String> = map_remove(scores2, 2);

// 字符串键
let ages: Map<String, Number> = {
  "Alice": 30,
  "Bob": 25
};
```

### 11.4 Map 操作

| 函数 | 签名 | 说明 |
|------|------|------|
| `map_put` | `map_put(Map<K,V>, K, V) → Map<K,V>` | 插入/更新（返回新 Map） |
| `map_get` | `map_get(Map<K,V>, K) → Result<V>` | 按键取值 |
| `map_has` | `map_has(Map<K,V>, K) → Boolean` | 检查键 |
| `map_remove` | `map_remove(Map<K,V>, K) → Map<K,V>` | 删除（返回新 Map） |

**注意**：`map_put` 和 `map_remove` 返回新 Map，原 Map 不变。

---

## 12. 自定义记录

### 12.1 定义

```sim
type Point = { x: Number, y: Number };

type Rectangle = { top_left: Point, width: Number, height: Number };
```

### 12.2 创建

```sim
let origin: Point = { x: 0, y: 0 };
let p1: Point = { x: 10, y: 20 };
```

### 12.3 字段访问

```sim
let x: Number = p1.x;                         // 10
let area: Number = rect.width * rect.height;   // 20000
let left: Number = rect.top_left.x;            // 嵌套字段访问
```

### 12.4 完整示例

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

## 13. 文件 I/O

### 13.1 写入

I/O 函数返回 `Task<Result<T>>`，需用 `join` 获取结果：

```sim
let task: Task<Result<Unit>> = file_write("output.txt", "Hello from Simplex!\n");
let result: Result<Unit> = join(task);
if result.isOk {
  print("File written successfully");
}
```

### 13.2 读取

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
  let count: Number = lines.value.len;
  print("Line count: " + to_string(count));
}
```

### 13.3 网络 I/O

```sim
// GET 请求
let task: Task<Result<String>> = fetch("https://httpbin.org/get", { method: "GET" });
let result: Result<String> = join(task);
if result.isOk {
  print("Response: " + result.value);
}

// POST 请求（带 body）
let task2: Task<Result<String>> = fetch("https://httpbin.org/post", {
  method: "POST",
  body: "Hello server"
});
let result2: Result<String> = join(task2);
if result2.isOk {
  print("Response: " + result2.value);
}

// 带自定义 Header
let headers: Map<String, String> = {
  "User-Agent": "MySimplexApp/1.0",
  "Authorization": "Bearer token123"
};
let task3: Task<Result<String>> = fetch("https://api.example.com/data", {
  method: "GET",
  headers: headers
});
let result3: Result<String> = join(task3);
```

**签名**：
```
fetch(url: String, options: FetchOptions) -> Task<Result<String>>
```

`FetchOptions` 结构体：

```sim
struct FetchOptions {
  method: String,   // "GET" | "POST" | "PUT" | "DELETE"，默认 "GET"
  headers: Map<String, String>,  // 可选
  body: String,     // 可选，POST/PUT 使用
};
```

示例：

```sim
// GET 请求
let resp: Task<Result<String>> = fetch("https://api.example.com/data", {
  method: "GET",
  headers: { "Authorization": "Bearer token" }
});
let body: Result<String> = join(resp);

// POST 请求
let post_resp: Task<Result<String>> = fetch("https://api.example.com/data", {
  method: "POST",
  body: "Hello server"
});
```

---

## 14. 模块系统

### 14.1 导出

```sim
// math.sim
export fn add(a: Number, b: Number) -> Number {
  a + b
}

export fn multiply(a: Number, b: Number) -> Number {
  a * b
}
```

### 14.2 导入

```sim
// main.sim
import math from "./math.sim";

let x: Number = math.add(3, 4);       // 7
let y: Number = math.multiply(5, 6);  // 30
```

### 14.3 规则

- 文件名 = 模块名（`math.sim` → 模块名 `math`）
- 只有 `export fn` 支持
- 导入创建命名空间，通过 `namespace.func` 访问
- 路径相对导入文件目录解析
- 不支持循环依赖

---

## 15. 任务与并发

### 15.1 基本概念

`spawn` 接受一个**零参 lambda**，返回 `Task<T>`。`join` 阻塞等待任务结果：

```sim
let task: Task<Number> = spawn(fn() -> Number { 10 + 20 });
let result: Number = join(task);   // 30
```

### 15.2 说明

- `spawn` 的函数在 `join` 时执行（同步任务）
- 异步 I/O 函数（`file_read`、`file_write`、`file_read_lines`）调用时立即启动后台 I/O，`join` 只等待结果
- 多个异步 I/O 可同时启动，再分别 `join` 实现并发

---

## 16. 完整示例

### 16.1 Hello World

```sim
print("Hello, Simplex!");
let name: String = "World";
print("Hello, " + name + "!");
```

### 16.2 递归：斐波那契

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

### 16.3 模块：跨文件导入

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

---

## 附录：运行

```bash
node bin/simplex.js examples/hello.sim
node tests/run-tests.js
```

## License

MIT
