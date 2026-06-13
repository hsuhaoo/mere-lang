# Simplex — 设计哲学

> 一个极简、显式的编程语言，没有语法糖，没有隐式行为。

## 五个原则

1. **极简**：关键字极少 — 核心控制流 `fn`、`let`、`if`、`return`；类型 `type`；模块 `import`、`export`；字面量 `true`、`false`、`unit`、`ok`、`err`；逻辑 `and`、`or`、`not`；模块语法 `from`；预留 `in`
2. **显式**：没有类型转换、默认参数、隐式状态捕获或异常
3. **具体**：编译时类型已知，仅内置参数化类型，用户自定义类型仅限记录
4. **确定**：每个 token 有单一含义，解析器是确定性递归下降
5. **局部可校验**：类型错误在表达式的直接上下文中检测

## 内置类型

`Num`、`String`、`Bool`、`Unit`、`List<T>`、`Result<T>`、`Map<K,V>`、`Task<T>`

## 关键设计决策

- Lambda 表达式存在但**不捕获**外部变量
- 用 `Result<T>` 代替异常和 `try-catch`
- 用 `spawn(expr)` 代替 `spawn(fn, args)`
- 没有 `else`，只有 `if` 单分支
- 没有循环，使用递归
- 扁平模块系统，无嵌套

## 运行

```bash
node bin/simplex.js examples/hello.sim
node tests/run-tests.js
```

## License

MIT
