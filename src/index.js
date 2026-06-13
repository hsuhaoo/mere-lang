/**
 * Main entry point for the Simplex language runtime.
 * Exports all public APIs.
 */

const { Lexer, LexerError, Token } = require('./lexer');
const {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  MethodCallExpr, FieldAccessExpr, IfExpr, BlockExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
} = require('./ast/nodes');
const { Parser, ParseError } = require('./parser');
const { TypeChecker, TypeError } = require('./typechecker');
const { Value, ValueKind } = require('./runtime/values');
const { Env } = require('./runtime/env');
const { Builtins } = require('./runtime/builtins');
const { Scheduler } = require('./runtime/scheduler');
const { Interpreter, RuntimeError } = require('./runtime/interpreter');
const { ModuleLoader } = require('./module-loader');

/**
 * High-level compile-and-run API.
 * Takes source code string and returns the result value.
 */
function run(source, filePath = 'main.sim') {
  // 1. Lex
  const lexer = new Lexer(source);
  const tokens = lexer.getTokens();

  // 2. Parse
  const parser = new Parser(tokens);
  const program = parser.parse();

  // 3. Type check
  const checker = new TypeChecker();
  checker.check(program);

  // 4. Interpret
  const builtins = new Builtins();
  const scheduler = new Scheduler();
  const interpreter = new Interpreter(builtins, scheduler);

  return interpreter.run(program);
}

/**
 * Compile-only API. Returns the typed AST.
 */
function compile(source) {
  const lexer = new Lexer(source);
  const tokens = lexer.getTokens();

  const parser = new Parser(tokens);
  const program = parser.parse();

  const checker = new TypeChecker();
  checker.check(program);

  return program;
}

/**
 * Quick evaluation of a single expression.
 */
function evalExpr(source) {
  const sourceWithReturn = `let x: Int = ${source}; x`;
  return run(sourceWithReturn);
}

module.exports = {
  // Low-level components
  Lexer,
  Parser,
  TypeChecker,
  Interpreter,
  ModuleLoader,
  Builtins,
  Scheduler,

  // Value system
  Value,
  ValueKind,
  Env,

  // AST nodes
  Program,
  FnDecl,
  LetStmt,
  IfStmt,
  ReturnStmt,
  ExpressionStmt,
  LiteralExpr,
  IdentifierExpr,
  BinOpExpr,
  UnOpExpr,
  CallExpr,
  MethodCallExpr,
  FieldAccessExpr,
  RecordCreateExpr,
  ListCreateExpr,
  MapCreateExpr,
  ResultOkExpr,
  ResultErrExpr,
  TypeAnnotation,

  // Types
  LexerError,
  ParseError,
  TypeError,
  RuntimeError,

  // High-level API
  run,
  compile,
  evalExpr,
};
