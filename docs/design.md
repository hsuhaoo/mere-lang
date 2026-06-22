# Mere — 设计哲学

> 一个极简、显式的编程语言，没有语法糖，没有隐式行为。

## 五个原则

1. **极简**：关键字极少 — 核心控制流 `fn`、`let`、`mut`、`if`、`elif`、`else`、`while`、`return`；类型 `type`；模块 `import`、`export`；字面量 `true`、`false`、`unit`、`ok`、`err`；逻辑 `and`、`or`、`not`；模块语法 `from`
2. **显式**：没有类型转换、默认参数、隐式状态捕获或异常
3. **具体**：编译时类型已知，仅内置参数化类型，用户自定义类型仅限记录
4. **确定**：每个 token 有单一含义，解析器是确定性递归下降
5. **局部可校验**：类型错误在表达式的直接上下文中检测

## 内置类型

`Number`、`String`、`Boolean`、`Unit`、`List<T>`、`Result<T>`、`Map<K,V>`、`Task<T>`

## 关键设计决策

- Lambda 表达式存在但**不捕获**外部变量
- 用 `Result<T>` 代替异常和 `try-catch`
- `spawn` 接受零参 lambda，`join` 等待结果
- 异步 I/O（`file_read`、`file_write`、`file_read_lines`）返回 `Task`，调用即启动，`join` 等待
- 网络 I/O（`fetch`）支持 HTTP GET/POST/PUT/DELETE，自定义 Header，返回 `Task<Result<String>>`
- `if`/`elif`/`else` 多分支，且可作为表达式返回值
- `while` 循环
- 扁平模块系统，无嵌套

## 运行

```bash
node bin/mere.js examples/hello.sim
node tests/run-tests.js
```

## License

MIT
