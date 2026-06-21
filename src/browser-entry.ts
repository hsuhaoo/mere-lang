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

type ModuleData = {
  name: string;
  path: string;
  program: any;
  exports: Map<string, any>;
};

export function runBrowser(
  source: string,
  config: {
    target?: string;
    canvas?: CanvasRenderingContext2D | null;
    canvasWidth?: number;
    canvasHeight?: number;
    sources?: Record<string, string>;
    mainKey?: string;
  } = {}
) {
  if (config.sources) {
    return runWithModules(config.sources, config.mainKey || '', config);
  }

  const lexer = new Lexer(source);
  const tokens = lexer.getTokens();

  const parser = new Parser(tokens);
  const program = parser.parse();

  const checker = new TypeChecker();
  checker.check(program);

  const interpreter = createBrowserRuntime(config.canvas, config.canvasWidth, config.canvasHeight);
  return interpreter.run(program);
}

function runWithModules(
  sources: Record<string, string>,
  mainKey: string,
  config: {
    canvas?: CanvasRenderingContext2D | null;
    canvasWidth?: number;
    canvasHeight?: number;
  }
) {
  const loaded = new Map<string, ModuleData>();

  function resolveModule(importPath: string): ModuleData {
    if (loaded.has(importPath)) {
      return loaded.get(importPath)!;
    }

    const src = sources[importPath];
    if (!src) {
      throw new Error(`Module not found: ${importPath}`);
    }

    const lexer = new Lexer(src);
    const parser = new Parser(lexer.getTokens());
    const program = parser.parse();

    for (const stmt of program.stmts) {
      const s = stmt as any;
      if (stmt.constructor.name === 'ImportStmt') {
        if (!loaded.has(s.from)) {
          resolveModule(s.from);
        }
      }
    }

    const exports = new Map<string, any>();
    for (const stmt of program.stmts) {
      const s = stmt as any;
      if (stmt.constructor.name === 'ExportStmt' && s.decl && s.decl.name) {
        exports.set(s.decl.name, s.decl);
      }
    }

    const entry: ModuleData = { name: importPath, path: importPath, program, exports };
    loaded.set(importPath, entry);

    const checker = new TypeChecker();
    checker.check(program, { imports: loaded });

    return loaded.get(importPath)!;
  }

  const mainData = resolveModule(mainKey);

  const interpreter = createBrowserRuntime(config.canvas, config.canvasWidth, config.canvasHeight);

  for (const stmt of mainData.program.stmts) {
    const s = stmt as any;
    if (stmt.constructor.name === 'ImportStmt') {
      const external = resolveModule(s.from);
      const namespace = new Map<string, any>();
      for (const [name, fnDecl] of external.exports) {
        interpreter.userFns.set(`${s.name}__${name}`, fnDecl);
        interpreter.userFns.set(name, fnDecl);
        namespace.set(name, fnDecl);
      }
      interpreter.rootEnv.define(s.name, { _module: namespace } as any);
    }
  }

  return interpreter.run(mainData.program);
}
