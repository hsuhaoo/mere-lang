# Simplex - A Minimal Explicit Language

Simplex is a minimal, explicit programming language with both Node.js and browser runtimes. It embodies the following design principles:

## Design Principles

- **极简 (Minimal)**: 6 keywords, no syntax sugar, no implicit behavior
- **显式 (Explicit)**: No hidden behavior, no automatic cleanup, no default values
- **具体 (Concrete)**: No user-defined generics, all types are concrete
- **确定 (Deterministic)**: Each structure does one thing, each token has a clear role
- **局部可校验 (Locally Checkable)**: Errors detected in local scope
- **闭包无关 (Closure-free)**: Functions capture no scope; all dependencies are explicit parameters
- **递归优先 (Recursion-first)**: No loop syntax; iteration expressed through recursion with TCO

## Language Features

### Keywords (6 total)
`fn` `let` `if` `type` `import` `export`

### Types
- **Built-in**: `Number`, `String`, `Boolean`, `Unit`, `List<T>`, `Result<T>`, `Map<K,V>`, `Task<T>`
- **User-defined**: Records only (`type Point = { x: Number, y: Number }`)

### Control Flow
- `if` statements (no `else`, no返回值)
- No loops - use recursion instead
- No exceptions - use `Result<T>` for error handling

### Functions
- Last expression in function body is the return value
- Explicit `return` for early returns
- Parameters and return types are explicitly annotated
- Lambda expressions with `fn(args) expr` syntax (no closure capture)

### Error Handling
- All fallible operations return `Result<T>`
- Explicit field access with `r.isOk`, `r.value`, `r.errMessage`
- No `try-catch`, no `?` operator

### Concurrency
- `spawn` creates a lightweight task, returns `Task<T>`
- `join` waits for task completion
- Cooperative scheduling (synchronous appearance)

### Browser / Canvas API

Simplex supports browser-based 2D drawing via 25 built-in `canvas_*` functions:

| Function | Params | Description |
|----------|--------|-------------|
| `canvas_clear` | — | Clear entire canvas |
| `canvas_get_width` | — | Canvas width in px |
| `canvas_get_height` | — | Canvas height in px |
| `canvas_set_fill_color` | `String` | Fill color (CSS color string) |
| `canvas_set_stroke_color` | `String` | Stroke color |
| `canvas_set_font` | `String` | Font spec (e.g. `"bold 48px sans-serif"`) |
| `canvas_set_line_width` | `Number` | Line thickness |
| `canvas_fill_rect` | `Number x4` | Filled rectangle (x, y, w, h) |
| `canvas_stroke_rect` | `Number x4` | Outlined rectangle |
| `canvas_clear_rect` | `Number x4` | Clear rectangle area |
| `canvas_fill_text` | `String, Number, Number` | Filled text at (x, y) |
| `canvas_stroke_text` | `String, Number, Number` | Outlined text |
| `canvas_measure_text` | `String` | Text width in px |
| `canvas_begin_path` | — | Start path |
| `canvas_close_path` | — | Close path |
| `canvas_move_to` | `Number, Number` | Move pen to (x, y) |
| `canvas_line_to` | `Number, Number` | Line to (x, y) |
| `canvas_arc` | `Number x5` | Arc (x, y, r, startAngle, endAngle) |
| `canvas_stroke` | — | Stroke current path |
| `canvas_fill` | — | Fill current path |
| `canvas_save` | — | Save state stack |
| `canvas_restore` | — | Restore state |
| `canvas_rotate` | `Number` | Rotate (radians) |
| `canvas_translate` | `Number, Number` | Translate origin |
| `canvas_scale` | `Number, Number` | Scale transform |

Use `simplex build` to produce a standalone HTML file that inlines the runtime and your `.sim` code.

<p align="center">
  <img src="https://via.placeholder.com/800x600/1a1a2e/FFFFFF?text=Simplex+Canvas" alt="Canvas demo" width="400">
</p>

## Module System
- Flat modules (no nesting)
- Explicit `export` and `import`
- File name = module name

## Installation

```bash
cd simplex
npm install
npm run build            # Compile TypeScript + build browser bundle
```

## Usage

```bash
# Run a Simplex program (Node.js)
simplex examples/hello.sim

# Run tests
npm test

# Build for browser — produces standalone HTML
simplex build examples/browser/rectangles.sim
open rectangles.html   # Works directly in browser

# Options
simplex build input.sim -o output.html --width 1024 --height 768
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
| `examples/browser/rectangles.sim` | Canvas drawing (browser target) |

## Architecture

```
simplex/
├── bin/
│   └── simplex.js              # CLI entry point (run + build)
├── src/
│   ├── index.ts                # Public API (Node.js)
│   ├── browser-entry.ts        # Public API (browser)
│   ├── browser-runtime.ts      # Browser interpreter factory
│   ├── lexer/
│   │   └── index.ts            # Lexer
│   ├── parser/
│   │   └── index.ts            # Recursive descent parser
│   ├── ast/
│   │   └── nodes.ts            # AST node classes
│   ├── typechecker/
│   │   └── index.ts            # Static type checker
│   ├── runtime/
│   │   ├── values.ts           # Value representation
│   │   ├── env.ts              # Scope management
│   │   ├── builtins.ts         # Node.js built-in functions
│   │   ├── browser-builtins.ts # Browser built-in (25× Canvas API)
│   │   ├── runtime.ts          # Runtime factory (Node/Browser)
│   │   ├── scheduler.ts        # Task scheduler
│   │   └── interpreter.ts      # AST interpreter
│   └── module-loader.ts        # Module loading
├── shims/                      # Node built-in stubs for browser build
├── tests/
│   ├── run-tests.ts            # Runtime tests (67)
│   ├── typechecker.test.js     # Type checker tests (67)
│   ├── modules.test.js         # Module system tests (17)
│   └── browser.test.js         # Browser runtime tests (132)
└── examples/                   # Example programs
    └── browser/                # Browser-specific examples
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

- No operator overloading
- No reflection/metaprogramming
- No channels (use file I/O)

## License

MIT
