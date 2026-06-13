# Simplex - A Minimal Explicit Language

Simplex is a minimal, explicit programming language with a Node.js runtime. It embodies the following design principles:

## Design Principles

- **极简 (Minimal)**: 6 keywords, no syntax sugar, no implicit behavior
- **显式 (Explicit)**: No hidden behavior, no automatic cleanup, no default values
- **具体 (Concrete)**: No user-defined generics, all types are concrete
- **确定 (Deterministic)**: Each structure does one thing, each token has a clear role
- **局部可校验 (Locally Checkable)**: Errors detected in local scope

## Language Features

### Keywords (6 total)
`fn` `let` `if` `type` `import` `export`

### Types
- **Built-in**: `Num`, `String`, `Bool`, `Unit`, `List<T>`, `Result<T>`, `Map<K,V>`, `Task<T>`
- **User-defined**: Records only (`type Point = { x: Num, y: Num }`)

### Control Flow
- `if` statements (no `else`, no返回值)
- No loops - use recursion instead
- No exceptions - use `Result<T>` for error handling

### Functions
- Last expression in function body is the return value
- Explicit `return` for early returns
- Parameters and return types are explicitly annotated

### Error Handling
- All fallible operations return `Result<T>`
- Explicit handling with `is_ok`, `is_err`, `unwrap`, `unwrap_err`
- No `try-catch`, no `?` operator

### Concurrency
- `spawn` creates a lightweight task, returns `Task<T>`
- `join` waits for task completion
- Cooperative scheduling (synchronous appearance)

### Module System
- Flat modules (no nesting)
- Explicit `export` and `import`
- File name = module name

## Installation

```bash
cd simplex
npm install
```

## Usage

```bash
# Run a Simplex program
node bin/simplex.js examples/hello.sim

# Run tests
node tests/run-tests.js
```

## Examples

| File | Description |
|------|-------------|
| `examples/hello.sim` | Hello World |
| `examples/factorial.sim` | Recursive factorial |
| `examples/fibonacci.sim` | Recursive Fibonacci |
| `examples/error_handling.sim` | Result-based error handling |
| `examples/data_structures.sim` | Lists and Maps |
| `examples/records.sim` | Custom record types |

## Architecture

```
simplex/
├── bin/
│   └── simplex.js          # CLI entry point
├── src/
│   ├── index.js            # Public API
│   ├── lexer/
│   │   ├── tokens.js       # Token type definitions
│   │   └── index.js        # Lexer implementation
│   ├── parser/
│   │   └── index.js        # Recursive descent parser
│   ├── ast/
│   │   └── nodes.js        # AST node classes
│   ├── typechecker/
│   │   └── index.js        # Static type checker
│   ├── runtime/
│   │   ├── values.js       # Value representation
│   │   ├── env.js          # Scope management
│   │   ├── builtins.js     # Built-in functions
│   │   ├── scheduler.js    # Task scheduler
│   │   └── interpreter.js  # AST interpreter
│   └── module-loader.js    # Module loading
├── tests/
│   └── run-tests.js        # Test suite
└── examples/               # Example programs
```

## Language Specification

See the original design document for the complete language specification.

## Limitations (Intentional)

- No user-defined generics
- No pattern matching
- No exceptions
- No automatic resource management
- No inheritance/interfaces/polymorphism
- No loops (use recursion)
- No lambda expressions (use named functions)
- No operator overloading
- No reflection/metaprogramming
- No channels (use file I/O)

## License

MIT
