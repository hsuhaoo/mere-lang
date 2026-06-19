# Simplex - A Minimal Explicit Language

Simplex is a minimal, explicit programming language with both Node.js and browser runtimes. It embodies the following design principles:

## Design Principles

- **极简 (Minimal)**: Minimal keywords, no syntax sugar, no implicit behavior
- **显式 (Explicit)**: No hidden behavior, no automatic cleanup, no default values
- **具体 (Concrete)**: No user-defined generics, all types are concrete
- **确定 (Deterministic)**: Each structure does one thing, each token has a clear role
- **局部可校验 (Locally Checkable)**: Errors detected in local scope
- **闭包无关 (Closure-free)**: Functions capture no scope; all dependencies are explicit parameters

## Language Features

### Keywords
`fn` `let` `mut` `if` `elif` `else` `while` `return` `type` `import` `export` `from` `true` `false` `unit` `ok` `err` `and` `or` `not`

### Types
- **Built-in**: `Number`, `String`, `Boolean`, `Unit`, `List<T>`, `Result<T>`, `Map<K,V>`, `Task<T>`, `Fn<A,B,...,R>`
- **User-defined**: Records only (`type Point = { x: Number, y: Number }`)

### Variables
- `let x = expr` — immutable binding
- `let mut x = expr` — mutable binding
- `x = newExpr` — reassignment (mutable only)

### Control Flow
- `if` / `elif` / `else` — both as statements and as expressions (returns a value)
- `while condition { body }` — loops
- No exceptions — use `Result<T>` for error handling

### Functions
- Last expression in function body is the return value
- Explicit `return` for early returns
- Parameters and return types are explicitly annotated
- Named functions with `fn`, lambda expressions with `fn(args) expr`
- Tail-call optimization (TCO) for recursive calls

### Error Handling
- All fallible operations return `Result<T>`
- Explicit field access with `r.isOk`, `r.value`, `r.errMessage`
- No `try-catch`, no `?` operator

### Concurrency
- `spawn` creates a lightweight task, returns `Task<T>`
- `join` waits for task completion
- Cooperative scheduling (synchronous appearance)

### Browser / Canvas API

Simplex supports browser-based 2D drawing via built-in `canvas_*` functions:

| Category | Function | Params | Description |
|----------|----------|--------|-------------|
| **Clear** | `canvas_clear` | — | Clear entire canvas |
| **Size** | `canvas_get_width` | — | Canvas width in logical px |
| | `canvas_get_height` | — | Canvas height in logical px |
| **Color** | `canvas_set_fill_color` | `String` | Fill color (CSS string) |
| | `canvas_set_stroke_color` | `String` | Stroke color |
| **Gradient** | `canvas_create_linear_gradient` | `Number x4` | Create linear gradient, returns id |
| | `canvas_create_radial_gradient` | `Number x6` | Create radial gradient, returns id |
| | `canvas_add_color_stop` | `Number, Number, String` | Add color stop to gradient |
| | `canvas_set_fill_gradient` | `Number` | Use gradient as fill |
| | `canvas_set_stroke_gradient` | `Number` | Use gradient as stroke |
| **Font** | `canvas_set_font` | `String` | Font spec (e.g. `"bold 48px sans-serif"`) |
| **Text** | `canvas_fill_text` | `String, Number, Number` | Filled text at (x, y) |
| | `canvas_stroke_text` | `String, Number, Number` | Outlined text |
| | `canvas_measure_text` | `String` | Text width in px |
| | `canvas_set_text_align` | `String` | `"left"`/`"center"`/`"right"` |
| | `canvas_set_text_baseline` | `String` | `"top"`/`"middle"`/`"bottom"` |
| **Rect** | `canvas_fill_rect` | `Number x4` | Filled rectangle (x, y, w, h) |
| | `canvas_stroke_rect` | `Number x4` | Outlined rectangle |
| | `canvas_clear_rect` | `Number x4` | Clear rectangle area |
| **Path** | `canvas_begin_path` | — | Start path |
| | `canvas_close_path` | — | Close path |
| | `canvas_move_to` | `Number, Number` | Move pen to (x, y) |
| | `canvas_line_to` | `Number, Number` | Line to (x, y) |
| | `canvas_arc` | `Number x5` | Arc (x, y, r, startAngle, endAngle) |
| | `canvas_arc_to` | `Number x5` | Arc with control points |
| | `canvas_stroke` | — | Stroke current path |
| | `canvas_fill` | — | Fill current path |
| | `canvas_set_line_width` | `Number` | Line thickness |
| | `canvas_set_line_dash` | `List<Number>` | Line dash pattern |
| **Shadow** | `canvas_set_shadow_color` | `String` | Shadow color |
| | `canvas_set_shadow_blur` | `Number` | Shadow blur radius |
| | `canvas_set_shadow_offset_x` | `Number` | Shadow X offset |
| | `canvas_set_shadow_offset_y` | `Number` | Shadow Y offset |
| **Transform** | `canvas_save` | — | Save state stack |
| | `canvas_restore` | — | Restore state |
| | `canvas_rotate` | `Number` | Rotate (radians) |
| | `canvas_translate` | `Number, Number` | Translate origin |
| | `canvas_scale` | `Number, Number` | Scale transform |
| **Image** | `canvas_load_image` | `String` | Load image from URL, returns id |
| | `canvas_draw_image` | `Number x5` | Draw image (id, x, y, w, h) |
| | `canvas_image_loaded` | `Number` | Check if image is loaded |
| **Audio** | `audio_load` | `String` | Load audio from URL, returns id |
| | `audio_play` | `Number` | Play audio |
| | `audio_pause` | `Number` | Pause audio |
| | `audio_resume` | `Number` | Resume audio |
| | `audio_stop` | `Number` | Stop and reset audio |
| | `audio_set_volume` | `Number, Number` | Set volume (id, 0-1) |
| | `audio_set_loop` | `Number, Boolean` | Set loop mode |
| **Events** | `canvas_on_click` | `Fn` | Register click handler (x, y) |
| | `canvas_on_drag` | `Fn` | Register hover/mousemove handler (x, y) |
| | `canvas_on_dblclick` | `Fn` | Register double-click handler (x, y) |
| | `canvas_wait_click` | — | Wait for click, returns `Task<Map>` |
| | `canvas_wait_drag` | — | Wait for drag, returns `Task<Map>` |
| **Cursor** | `canvas_set_cursor` | `String` | Set CSS cursor style |
| **Math** | `sin` | `Number` | Sine |
| | `floor` | `Number` | Floor |
| | `round` | `Number` | Round |
| | `pi` | — | Pi constant |
| | `now` | — | Current timestamp (ms) |
| | `random` | `Number` | Random int in [0, n) |
| **Await** | `await_font_loaded` | — | Wait for font loading |
| | `next_frame` | — | Wait until next animation frame |

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
| `examples/browser/game.html` | Browser game (Touhou-themed card game) |
| `examples/browser/events.sim` | Click/drag event handling |

## Language Specification

See `docs/usage.md` for the complete language reference.

## Limitations (Intentional)

- No user-defined generics
- No pattern matching
- No exceptions
- No automatic resource management
- No inheritance/interfaces/polymorphism
- No operator overloading
- No reflection/metaprogramming
- No channels (use file I/O)

## License

MIT
