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
import { Value } from './runtime/values.js';
import { Env } from './runtime/env.js';
import { Builtins } from './runtime/builtins.js';
import { BrowserBuiltins } from './runtime/browser-builtins.js';
import { Scheduler } from './runtime/scheduler.js';
import { Interpreter, RuntimeError } from './runtime/interpreter.js';
import { ModuleLoader } from './module-loader.js';
import { createRuntime, RuntimeConfig } from './runtime/runtime.js';

/**
 * High-level compile-and-run API.
 * Takes source code string and returns the result value.
 */
function run(source, filePath = 'main.sim') {
  const lexer = new Lexer(source);
  const tokens = lexer.getTokens();

  const parser = new Parser(tokens);
  const program = parser.parse();

  const checker = new TypeChecker();
  checker.check(program);

  const interpreter = createRuntime({ target: 'node' });
  return interpreter.run(program);
}

/**
 * Run in browser mode with Canvas support.
 */
function runBrowser(source, config: RuntimeConfig = { target: 'browser' }) {
  const lexer = new Lexer(source);
  const tokens = lexer.getTokens();

  const parser = new Parser(tokens);
  const program = parser.parse();

  const checker = new TypeChecker();
  checker.check(program);

  const interpreter = createRuntime(config);
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
  BrowserBuiltins,
  Scheduler,
  createRuntime,

  // Value system
  Value,
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
  runBrowser,
  compile,
};
