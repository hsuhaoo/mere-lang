import { Lexer } from './lexer/index.js';
import { Parser } from './parser/index.js';
import { TypeChecker, TypeError } from './typechecker/index.js';
import { BrowserBuiltins } from './runtime/browser-builtins.js';
import { Scheduler } from './runtime/scheduler.js';
import { Interpreter, RuntimeError } from './runtime/interpreter.js';
import { createBrowserRuntime } from './browser-runtime.js';
import { Env } from './runtime/env.js';
import {
  Value,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  mkOk, mkErr,
} from './runtime/values.js';

export {
  BrowserBuiltins,
  createBrowserRuntime,
  Scheduler,
  Interpreter,
  RuntimeError,
  Lexer,
  Parser,
  TypeChecker,
  TypeError,
  Value,
  Env,
  mkNumber,
  mkString,
  mkBoolean,
  mkUnit,
  mkOk,
  mkErr,
};

export function runBrowser(
  source: string,
  config: { target?: string; canvas?: CanvasRenderingContext2D | null; canvasWidth?: number; canvasHeight?: number } = {}
) {
  const lexer = new Lexer(source);
  const tokens = lexer.getTokens();

  const parser = new Parser(tokens);
  const program = parser.parse();

  const checker = new TypeChecker();
  checker.check(program);

  const interpreter = createBrowserRuntime(config.canvas, config.canvasWidth, config.canvasHeight);
  return interpreter.run(program);
}
