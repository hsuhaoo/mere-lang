# Simplex 使用文档

Simplex 是一个极简、显式的编程语言。关键字分为几类：

- **控制流**：`fn`、`let`、`if`、`elif`、`else`、`while`、`return`
- **类型**：`type`
- **模块**：`import`、`export`
- **字面量**：`true`、`false`、`unit`、`ok`、`err`
- **逻辑**：`and`、`or`、`not`
- **模块语法**：`from`

---

## 目录

1. [运行](#1-运行)
2. [基本语法](#2-基本语法)
3. [数据类型](#3-数据类型)
4. [表达式与运算符](#4-表达式与运算符)
5. [函数](#5-函数)
6. [网络 I/O](#6-网络-io)
7. [列表高阶函数](#7-列表高阶函数)
8. [Lambda 表达式](#8-lambda-表达式)
9. [条件](#9-条件)
10. [错误处理](#10-错误处理)
11. [数据结构](#11-数据结构)
12. [自定义记录](#12-自定义记录)
13. [文件 I/O](#13-文件-io)
14. [模块系统](#14-模块系统)
15. [任务与并发](#15-任务与并发)
16. [Canvas 图形 API](#16-canvas-图形-apibrowser)
17. [事件系统](#17-事件系统browser)
18. [IndexedDB 存储](#18-indexeddb-存储browser)
19. [浏览器运行时与 CLI 构建](#19-浏览器运行时与-cli-构建)
20. [完整示例](#20-完整示例)

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
- `let mut` 声明可变量，`x = expr` 原地赋值（详情见 [§5.5](#55-可变量)）

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
| `concat_all` | `concat_all(List<String>) → String` | 拼接列表中所有字符串 |
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
| `sort` | `sort(List<Number>) → List<Number>` | 数字列表升序排序 |
| `sort_by` | `sort_by(List<T>, Fn<T, Number>) → List<T>` | 按映射值排序列表 |
| `spawn` | `spawn(Fn<.., RetT>) → Task<RetT>` | 包装零参 lambda 为 Task |
| `join` | `join(Task<T>) → T` | 获取 Task 结果 |
| `sleep` | `sleep(Number) → Task<Unit>` | 等待指定毫秒数 |
| `next_frame` | `next_frame() → Task<Number>` | 等待下一动画帧（浏览器） |
| `file_read` | `file_read(String) → Task<Result<String>>` | 异步读取文件 |
| `file_write` | `file_write(String, String) → Task<Result<Unit>>` | 异步写入文件 |
| `file_read_lines` | `file_read_lines(String) → Task<Result<List<String>>>` | 异步读行 |
| `read_line` | `read_line() → Task<Result<String>>` | 从标准输入读取一行 |
| `fetch` | `fetch(String, String, Map<String,String>, String) → Task<Result<String>>` | HTTP 请求（url, method, headers, body） |
| `random` | `random(Number) → Number` | 返回 `[0, n)` 随机整数 |
| `db_store` | `db_store(String, String) → Task<Result<Unit>>` | IndexedDB 存储（浏览器） |
| `db_load` | `db_load(String) → Task<Result<String>>` | IndexedDB 读取（浏览器） |
| `db_delete` | `db_delete(String) → Task<Result<Unit>>` | IndexedDB 删除（浏览器） |
| `map` | `map(List<T>, Fn<T, U>) → List<U>` | 列表映射 |
| `filter` | `filter(List<T>, Fn<T, Boolean>) → List<T>` | 列表过滤 |
| `fold` | `fold(List<T>, U, Fn<U, T, U>) → U` | 列表归约 |
| `concat_all` | `concat_all(List<String>) → String` | 拼接列表中所有字符串 |
| `indexOf` | `indexOf(String, String) → Result<Number>` | 查找子串位置 |

### 5.5 可变量

Simplex 默认不可变，但支持 `let mut` 声明可变量并用 `=` 赋值：

```sim
let mut x: Number = 10;
x = x + 5;          // 15
let mut name: String = "hello";
name = name + " world";
```

- `let mut x: T = expr` 声明可变量
- `x = expr` 原地赋值（仅可变量可用）
- 尝试对不可变变量赋值会在类型检查时报错

---

## 6. 网络 I/O

### 6.1 fetch

发送 HTTP 请求。4 个位置参数：`fetch(url, method, headers, body)`。

```sim
// GET 请求
let resp: Task<Result<String>> = fetch(
  "https://api.example.com/data",
  "GET",
  { "Authorization": "Bearer token" },
  ""
);
let body: Result<String> = join(resp);

// POST 请求
let post_resp: Task<Result<String>> = fetch(
  "https://api.example.com/data",
  "POST",
  {},
  "Hello server"
);
```

**签名**：
```
fetch(url: String, method: String, headers: Map<String, String> | Record<String, String>, body: String) -> Task<Result<String>>
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

### 7.3 sort_by

按映射值排序：

```sim
let people: List<{ name: String, age: Number }> = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
let sorted: List<{ name: String, age: Number }> = sort_by(people, fn(p: { name: String, age: Number }) -> Number { p.age });
```

### 7.4 fold

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

### 9.1 if / elif / else

```sim
let x: Number = 42;

if x > 100 {
  print("very big");
} elif x > 10 {
  print("big");
} else {
  print("small");
}
```

- `if` 必须有 then 分支
- `elif`（0 个或多个）和 `else`（可选）可链式使用

### 9.2 if 作为表达式

```sim
let y: Number = if x > 5 { 100 } else { 0 };
```

### 9.3 while 循环

```sim
let mut i: Number = 0;
let mut sum: Number = 0;
while i < 10 {
  sum = sum + i;
  i = i + 1;
}
print(to_string(sum));
```

- 条件必须是 Boolean
- 循环体零次或多次执行
- 只在 `let mut` 变量上配合赋值才有意义

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
| `sort` | `sort(List<Number>) → List<Number>` | 数字列表升序排序 |
| `sort_by` | `sort_by(List<T>, Fn<T, Number>) → List<T>` | 按映射值排序列表 |

**注意**：列表长度用 `l.len` 字段访问。

### 11.3 排序示例

```sim
let nums: List<Number> = [3, 1, 4, 1, 5, 9, 2];
let sorted: List<Number> = sort(nums);
// [1, 1, 2, 3, 4, 5, 9]

type Person = { name: String, age: Number };
let people: List<Person> = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 35 }
];
let by_age: List<Person> = sort_by(people, fn(p: Person) -> Number { p.age });
```

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
let task: Task<Result<String>> = fetch(
  "https://httpbin.org/get",
  "GET",
  {},
  ""
);
let result: Result<String> = join(task);
if result.isOk {
  print("Response: " + result.value);
}

// POST 请求（带 body）
let task2: Task<Result<String>> = fetch(
  "https://httpbin.org/post",
  "POST",
  {},
  "Hello server"
);
let result2: Result<String> = join(task2);
if result2.isOk {
  print("Response: " + result2.value);
}

// 带自定义 Header
let headers: Map<String, String> = {
  "User-Agent": "MySimplexApp/1.0",
  "Authorization": "Bearer token123"
};
let task3: Task<Result<String>> = fetch(
  "https://api.example.com/data",
  "GET",
  headers,
  ""
);
let result3: Result<String> = join(task3);
```

**签名**：
```
fetch(url: String, method: String, headers: Map<String, String> | Record<String, String>, body: String) -> Task<Result<String>>
```

`headers` 可以是 Map 或 Record。`method` 为 `"GET"` 或 `"HEAD"` 时 `body` 会被忽略。

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

### 15.3 sleep / next_frame

```sim
// 等待 1 秒
join(sleep(1000));

// 等待下一动画帧（仅浏览器）
let ts: Number = join(next_frame());
print("Frame time: " + to_string(ts));
```

`sleep` 在所有运行时可用，`next_frame` 仅在浏览器运行时可用。

---

## 16. Canvas 图形 API（浏览器）

Canvas API 仅在浏览器运行时可用。需要在 canvas 上绘图时，先通过 CLI 构建 HTML 文件或直接使用 `runBrowser`。

### 16.1 颜色与样式

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_set_fill_color` | `canvas_set_fill_color(String) → Unit` | 设置填充颜色（CSS 颜色字符串） |
| `canvas_set_stroke_color` | `canvas_set_stroke_color(String) → Unit` | 设置描边颜色 |
| `canvas_set_font` | `canvas_set_font(String) → Unit` | 设置字体（如 `"20px Arial"`） |
| `canvas_set_line_width` | `canvas_set_line_width(Number) → Unit` | 设置线宽 |

### 16.2 矩形

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_clear` | `canvas_clear() → Unit` | 清除整个 canvas |
| `canvas_fill_rect` | `canvas_fill_rect(x, y, w, h) → Unit` | 填充矩形 |
| `canvas_stroke_rect` | `canvas_stroke_rect(x, y, w, h) → Unit` | 描边矩形 |
| `canvas_clear_rect` | `canvas_clear_rect(x, y, w, h) → Unit` | 清除矩形区域 |

### 16.3 文本

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_fill_text` | `canvas_fill_text(String, x, y) → Unit` | 填充文本 |
| `canvas_stroke_text` | `canvas_stroke_text(String, x, y) → Unit` | 描边文本 |
| `canvas_measure_text` | `canvas_measure_text(String) → Number` | 测量文本宽度（像素） |

### 16.4 路径

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_begin_path` | `canvas_begin_path() → Unit` | 开始新路径 |
| `canvas_close_path` | `canvas_close_path() → Unit` | 闭合路径 |
| `canvas_move_to` | `canvas_move_to(x, y) → Unit` | 移动到指定点 |
| `canvas_line_to` | `canvas_line_to(x, y) → Unit` | 画线到指定点 |
| `canvas_arc` | `canvas_arc(x, y, r, startAngle, endAngle) → Unit` | 画圆弧 |
| `canvas_stroke` | `canvas_stroke() → Unit` | 描边当前路径 |
| `canvas_fill` | `canvas_fill() → Unit` | 填充当前路径 |

### 16.5 变换

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_save` | `canvas_save() → Unit` | 保存当前状态 |
| `canvas_restore` | `canvas_restore() → Unit` | 恢复状态 |
| `canvas_rotate` | `canvas_rotate(angle: Number) → Unit` | 旋转（弧度） |
| `canvas_translate` | `canvas_translate(x, y) → Unit` | 平移 |
| `canvas_scale` | `canvas_scale(x, y) → Unit` | 缩放 |

### 16.6 尺寸

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_get_width` | `canvas_get_width() → Number` | 获取 canvas 宽度 |
| `canvas_get_height` | `canvas_get_height() → Number` | 获取 canvas 高度 |

### 16.7 示例

```sim
fn draw() {
  canvas_set_fill_color("skyblue");
  canvas_fill_rect(50, 50, 200, 150);
  canvas_set_fill_color("white");
  canvas_set_font("24px sans-serif");
  canvas_fill_text("Hello Canvas!", 70, 120);
}
draw()
```

---

## 17. 事件系统（浏览器）

通过 `canvas_on_click` 和 `canvas_on_drag` 注册事件处理器。处理器必须是 `Number, Number → Unit` 类型的函数（接收 canvas 坐标）。

### 17.1 API

| 函数 | 签名 | 说明 |
|------|------|------|
| `canvas_on_click` | `canvas_on_click(Fn<Number, Number, Unit>) → Unit` | 注册点击事件处理器 |
| `canvas_on_drag` | `canvas_on_drag(Fn<Number, Number, Unit>) → Unit` | 注册拖动事件处理器 |

### 17.2 示例

```sim
fn handle_click(x: Number, y: Number) -> Unit {
  canvas_set_fill_color("red");
  canvas_fill_rect(x - 10, y - 10, 20, 20);
}

fn handle_drag(x: Number, y: Number) -> Unit {
  canvas_set_fill_color("blue");
  canvas_begin_path();
  canvas_arc(x, y, 5, 0, 6.283);
  canvas_fill();
}

let _: Unit = canvas_on_click(handle_click);
let _: Unit = canvas_on_drag(handle_drag);
```

**注意**：Event handler 必须是命名函数（`fn`），不支持 lambda。命名函数可以访问顶层 `let` 变量。

---

## 18. IndexedDB 存储（浏览器）

浏览器运行时提供简单的 IndexedDB 持久化存储。所有操作返回 `Task<Result<...>>`，需要使用 `join` 获取结果。

数据库名 `simplex_store`，使用单一的 `data` 对象存储。

### 18.1 API

| 函数 | 签名 | 说明 |
|------|------|------|
| `db_store` | `db_store(key: String, value: String) → Task<Result<Unit>>` | 存储键值对 |
| `db_load` | `db_load(key: String) → Task<Result<String>>` | 按 key 加载值 |
| `db_delete` | `db_delete(key: String) → Task<Result<Unit>>` | 删除 key |

### 18.2 示例

```sim
let t1: Task<Result<Unit>> = db_store("name", "Alice");
let r1: Result<Unit> = join(t1);
if r1.isOk {
  print("saved");
}

let t2: Task<Result<String>> = db_load("name");
let r2: Result<String> = join(t2);
if r2.isOk {
  print("loaded: " + r2.value);
}

let t3: Task<Result<Unit>> = db_delete("name");
let _: Result<Unit> = join(t3);
```

---

## 19. 浏览器运行时与 CLI 构建

### 19.1 构建自包含 HTML

```bash
node bin/simplex.js build examples/my_app.sim
```

生成 `my_app.sim.html`，是包含运行时和 canvas 的自包含 HTML 文件。Canvas 自动全屏铺满视口。

指定输出路径：

```bash
node bin/simplex.js build examples/my_app.sim --output dist/index.html
```

### 19.2 直接运行

在 Node.js 中可通过 `runBrowser` API 执行 Simplex 源码（带 canvas 上下文）：

```js
const { runBrowser } = require('simplex-lang');
const canvas = document.getElementById('myCanvas');
runBrowser(sourceCode, { target: 'browser', canvas });
```

### 19.3 内置函数

以下函数仅在浏览器运行时可用：

- 所有 `canvas_*` 函数（见第 16 节）
- `canvas_on_click` / `canvas_on_drag`（见第 17 节）
- `db_store` / `db_load` / `db_delete`（见第 18 节）
- `fetch(url, method, headers, body) → Task<Result<String>>`
- `sleep(ms) → Task<Unit>`（见第 15 节）
- `next_frame() → Task<Number>`（见第 15 节）

### 19.4 Node 与浏览器差异

| 函数 | Node | 浏览器 |
|------|------|--------|
| `file_read` / `file_write` / `file_read_lines` | ✅ | ❌ |
| `canvas_*` | ❌ | ✅ |
| `canvas_on_click` / `canvas_on_drag` | ❌ | ✅ |
| `db_store` / `db_load` / `db_delete` | ❌ | ✅ |
| `fetch` | ✅ | ✅ |
| `read_line` | ✅ | ❌ |
| `random` | ✅ | ✅ |
| `sleep` | ✅ | ✅ |
| `next_frame` | ❌ | ✅ |

---

## 20. 完整示例

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
# Node.js 运行
node bin/simplex.js run examples/hello.sim

# 构建浏览器 HTML
node bin/simplex.js build examples/browser/events.sim

# 运行测试
node tests/run-tests.js
node tests/typechecker.test.js
node tests/browser.test.js
```

## License

MIT
