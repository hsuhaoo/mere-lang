import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const root = '/Users/xx/thou/mere';

// 1. Rename
execSync('find ' + root + '/src -name "*.js" ! -name "*.bak" -exec sh -c \'mv "$0" "${0%.js}.ts"\' {} \\;', { cwd: root });
console.log('1. Renamed .js → .ts');

// 2. Create tsconfig
writeFileSync(`${root}/tsconfig.json`, JSON.stringify({
  compilerOptions: {
    target: 'es2020',
    module: 'nodenext',
    moduleResolution: 'nodenext',
    outDir: 'dist',
    rootDir: 'src',
    declaration: true,
    strict: false,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
  },
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.bak'],
}, null, 2) + '\n');
console.log('2. Created tsconfig.json');

// 3. Process each .ts file
const tsFiles = execSync(`find ${root}/src -name "*.ts" ! -name "*.bak" | sort`, { cwd: root })
  .toString().trim().split('\n').filter(Boolean);

const RULES = [
  // === LEXER/TOKENS ===
  { file: 'lexer/tokens', from: "module.exports = { KEYWORDS, TokenType };", to: "export { KEYWORDS, TokenType };" },

  // === LEXER/INDEX ===
  { file: 'lexer/index', from: "const { KEYWORDS, TokenType } = require('./tokens');", to: "import { KEYWORDS, TokenType } from './tokens.js';" },
  { file: 'lexer/index', from: "module.exports = { Lexer, LexerError, Token };", to: "export { Lexer, LexerError, Token };" },

  // === PARSER/INDEX ===
  { file: 'parser/index', from: "const { TokenType } = require('../lexer/tokens');", to: "import { TokenType } from '../lexer/tokens.js';" },
  { file: 'parser/index', from: "const {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation, Program,\n} = require('../ast/nodes');",
    to: "import {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation, Program,\n} from '../ast/nodes.js';" },
  { file: 'parser/index', from: "module.exports = { Parser, ParseError };", to: "export { Parser, ParseError };" },

  // === AST/NODES ===
  { file: 'ast/nodes', from: "module.exports = {", to: "export {" },

  // === RUNTIME/VALUES ===
  { file: 'runtime/values', from: "module.exports = {", to: "export {" },

  // === RUNTIME/ENV ===
  { file: 'runtime/env', from: "module.exports = { Env };", to: "export { Env };" },

  // === RUNTIME/BUILTINS ===
  { file: 'runtime/builtins', from: "const {\n  ValueKind,\n  IntValue, StringValue, BoolValue, ListValue,\n  MapValue, ResultValue,\n  int: mkInt, string: mkString, bool: mkBool, unit: mkUnit,\n  list: mkList, map: mkMap, result: mkResult,\n} = require('./values');",
    to: "import {\n  ValueKind,\n  IntValue, StringValue, BoolValue, ListValue,\n  MapValue, ResultValue,\n  int as mkInt, string as mkString, bool as mkBool, unit as mkUnit,\n  list as mkList, map as mkMap, result as mkResult,\n} from './values.js';" },
  { file: 'runtime/builtins', from: "module.exports = { Builtins };", to: "export { Builtins };" },

  // === RUNTIME/SCHEDULER ===
  { file: 'runtime/scheduler', from: "const { TaskValue, value: mkTask } = require('./values');", to: "import { TaskValue, value as mkValue, task as mkTask } from './values.js';" },
  { file: 'runtime/scheduler', from: "module.exports = { Scheduler };", to: "export { Scheduler };" },

  // === RUNTIME/INTERPRETER ===
  { file: 'runtime/interpreter', from: "const {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation,\n} = require('../ast/nodes');",
    to: "import {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation,\n} from '../ast/nodes.js';" },
  { file: 'runtime/interpreter', from: "const {\n  Value, ValueKind,\n  int: mkInt, string: mkString, bool: mkBool, unit: mkUnit,\n  list: mkList, map: mkMap, record: mkRecord,\n  result: mkResult, fn: mkFn,\n  IntValue, StringValue, BoolValue, ListValue,\n  MapValue, RecordValue, ResultValue, FnValue,\n} = require('./values');",
    to: "import {\n  Value, ValueKind,\n  int as mkInt, string as mkString, bool as mkBool, unit as mkUnit,\n  list as mkList, map as mkMap, record as mkRecord,\n  result as mkResult, fn as mkFn,\n  IntValue, StringValue, BoolValue, ListValue,\n  MapValue, RecordValue, ResultValue, FnValue,\n} from './values.js';" },
  { file: 'runtime/interpreter', from: "const { Env } = require('./env');", to: "import { Env } from './env.js';" },
  { file: 'runtime/interpreter', from: "const { Builtins } = require('./builtins');", to: "import { Builtins } from './builtins.js';" },
  { file: 'runtime/interpreter', from: "const { Scheduler } = require('./scheduler');", to: "import { Scheduler } from './scheduler.js';" },
  { file: 'runtime/interpreter', from: "const { TypeError } = require('../typechecker');", to: "import { TypeError } from '../typechecker/index.js';" },
  { file: 'runtime/interpreter', from: "module.exports = { Interpreter, RuntimeError, ReturnSignal, TailCall };", to: "export { Interpreter, RuntimeError, ReturnSignal, TailCall };" },

  // === TYPECHECKER/INDEX ===
  { file: 'typechecker/index', from: "const {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation, Program,\n} = require('../ast/nodes');",
    to: "import {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation, Program,\n} from '../ast/nodes.js';" },
  { file: 'typechecker/index', from: "module.exports = { TypeChecker, TypeError, BUILTIN_FUNCTIONS, BUILTIN_METHODS };", to: "export { TypeChecker, TypeError, BUILTIN_FUNCTIONS };" },

  // === MODULE-LOADER ===
  { file: 'module-loader', from: "const fs = require('fs');", to: "import * as fs from 'fs';" },
  { file: 'module-loader', from: "const path = require('path');", to: "import * as path from 'path';" },
  { file: 'module-loader', from: "const { Lexer } = require('./lexer');", to: "import { Lexer } from './lexer/index.js';" },
  { file: 'module-loader', from: "const { Parser, ParseError } = require('./parser');", to: "import { Parser, ParseError } from './parser/index.js';" },
  { file: 'module-loader', from: "const { TypeChecker, TypeError } = require('./typechecker');", to: "import { TypeChecker, TypeError } from './typechecker/index.js';" },
  { file: 'module-loader', from: "const { Interpreter, RuntimeError } = require('./runtime/interpreter');", to: "import { Interpreter, RuntimeError } from './runtime/interpreter.js';" },
  { file: 'module-loader', from: "const { Builtins } = require('./runtime/builtins');", to: "import { Builtins } from './runtime/builtins.js';" },
  { file: 'module-loader', from: "const { Scheduler } = require('./runtime/scheduler');", to: "import { Scheduler } from './runtime/scheduler.js';" },
  { file: 'module-loader', from: "const { list: mkList, string: mkString } = require('./runtime/values');", to: "import { list as mkList, string as mkString } from './runtime/values.js';" },
  { file: 'module-loader', from: "module.exports = { ModuleLoader };", to: "export { ModuleLoader };" },

  // === INDEX (top-level) ===
  { file: 'index', from: "const { Lexer, LexerError, Token } = require('./lexer');", to: "import { Lexer, LexerError, Token } from './lexer/index.js';" },
  { file: 'index', from: "const {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation, Program,\n} = require('./ast/nodes');",
    to: "import {\n  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,\n  FieldAccessExpr, IfExpr, BlockExpr,\n  RecordCreateExpr, ListCreateExpr, MapCreateExpr,\n  ResultOkExpr, ResultErrExpr, UnitExpr,\n  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,\n  ImportStmt, ExportStmt, TypeDecl,\n  TypeAnnotation, Program,\n} from './ast/nodes.js';" },
  { file: 'index', from: "const { Parser, ParseError } = require('./parser');", to: "import { Parser, ParseError } from './parser/index.js';" },
  { file: 'index', from: "const { TypeChecker, TypeError } = require('./typechecker');", to: "import { TypeChecker, TypeError } from './typechecker/index.js';" },
  { file: 'index', from: "const { Value, ValueKind } = require('./runtime/values');", to: "import { Value, ValueKind } from './runtime/values.js';" },
  { file: 'index', from: "const { Env } = require('./runtime/env');", to: "import { Env } from './runtime/env.js';" },
  { file: 'index', from: "const { Builtins } = require('./runtime/builtins');", to: "import { Builtins } from './runtime/builtins.js';" },
  { file: 'index', from: "const { Scheduler } = require('./runtime/scheduler');", to: "import { Scheduler } from './runtime/scheduler.js';" },
  { file: 'index', from: "const { Interpreter, RuntimeError } = require('./runtime/interpreter');", to: "import { Interpreter, RuntimeError } from './runtime/interpreter.js';" },
  { file: 'index', from: "const { ModuleLoader } = require('./module-loader');", to: "import { ModuleLoader } from './module-loader.js';" },
  { file: 'index', from: "module.exports = {", to: "export {" },
];

for (const rule of RULES) {
  // Find file that ends with the rule's relative path + .ts
  const candidates = tsFiles.filter(f => f.endsWith(rule.file + '.ts'));
  if (candidates.length !== 1) {
    console.error(`  ✗ ${rule.file}: ${candidates.length} matches`);
    continue;
  }
  const f = candidates[0];
  let code = readFileSync(f, 'utf8');
  if (code.includes(rule.from)) {
    code = code.replace(rule.from, rule.to);
    writeFileSync(f, code, 'utf8');
    console.log(`  ✓ ${rule.file.replace('src/', '')}`);
  } else {
    console.log(`  ? ${rule.file.replace('src/', '')}: pattern not found`);
  }
}

console.log('3. Import/export conversion done');

// 4. Fix remaining require() calls inside function bodies
for (const f of tsFiles) {
  let code = readFileSync(f, 'utf8');

  // Fix: const { task: mkTask } = require('./values'); → use already-imported mkTask
  code = code.replace("const { task: mkTask } = require('./values');\n      return mkTask({", "return mkTask({");
  code = code.replace("const { task: mkTask } = require('./values');\n    return mkTask({", "return mkTask({");
  code = code.replace("    const fs = require('fs');", "    // fs already imported at top");

  if (code !== readFileSync(f, 'utf8')) {
    writeFileSync(f, code, 'utf8');
    console.log(`  ✓ ${f.replace(root + '/src/', '')}: fixed inline require()`);
  }
}

console.log('4. Inline require() fixes done');
