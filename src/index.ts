/**
 * Main entry point for the Simplex language runtime.
 * Exports all public APIs.
 */

import { Lexer, LexerError, Token } from './lexer/index.js';
import {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  FieldAccessExpr, IfExpr, BlockExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
} from './ast/nodes.js';
import { Parser, ParseError } from './parser/index.js';
import { TypeChecker, TypeError } from './typechecker/index.js';
import { Value, ValueKind } from './runtime/values.js';
import { Env } from './runtime/env.js';
import { Builtins } from './runtime/builtins.js';
import { Scheduler } from './runtime/scheduler.js';
import { Interpreter, RuntimeError } from './runtime/interpreter.js';
import { ModuleLoader } from './module-loader.js';

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
  const scheduler = new Scheduler();
  const builtins = new Builtins(scheduler);
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

export {
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
};
