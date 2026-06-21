import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer/index.js';
import { Parser, ParseError } from './parser/index.js';
import { TypeChecker, TypeError } from './typechecker/index.js';
import { Interpreter, RuntimeError } from './runtime/interpreter.js';
import { Builtins } from './runtime/builtins.js';
import { Scheduler } from './runtime/scheduler.js';
import { list as mkList, string as mkString } from './runtime/values.js';
import { FnDecl, Program } from './ast/nodes.js';

export type SourceReader = (resolvedPath: string) => string;

class ModuleLoader {
  baseDir: string;
  loadedModules: Map<string, { name: string; path: string; program: Program; exports: Map<string, FnDecl>; rawSource: string }>;
  readSource: SourceReader;

  constructor(baseDir = process.cwd(), readSource?: SourceReader) {
    this.baseDir = baseDir;
    this.readSource = readSource || ((p) => fs.readFileSync(p, 'utf-8'));
    this.loadedModules = new Map();
  }

  loadModule(filePath, key, parentDir = undefined) {
    const resolveBase = parentDir || this.baseDir;
    const resolved = path.resolve(resolveBase, filePath);
    const moduleKey = key || filePath;

    if (this.loadedModules.has(moduleKey)) {
      return this.loadedModules.get(moduleKey);
    }

    const source = this.readSource(resolved);

    const lexer = new Lexer(source);
    const parser = new Parser(lexer.getTokens());
    const program = parser.parse();

    this._preloadImports(program, path.dirname(resolved));

    const exports = this.extractExports(program);
    const entry = {
      name: path.basename(filePath, path.extname(filePath)),
      path: resolved,
      program: program,
      exports: exports,
      rawSource: source,
    };
    this.loadedModules.set(moduleKey, entry);

    const checker = new TypeChecker();
    checker.check(program, { imports: this.loadedModules });

    return this.loadedModules.get(moduleKey);
  }

  extractExports(program) {
    const exports = new Map();
    for (const stmt of program.stmts) {
      if (stmt.constructor.name === 'ExportStmt' && stmt.decl && stmt.decl.name) {
        exports.set(stmt.decl.name, stmt.decl);
      }
    }
    return exports;
  }

  runModule(filePath) {
    const moduleData = this.loadModule(filePath, filePath);

    const scheduler = new Scheduler();
    const builtins = new Builtins(scheduler);
    const interpreter = new Interpreter(builtins, scheduler);

    this._injectImports(moduleData, interpreter);

    return interpreter.run(moduleData.program);
  }

  _injectImports(moduleData, interpreter) {
    for (const stmt of moduleData.program.stmts) {
      if (stmt.constructor.name === 'ImportStmt') {
        const external = this.loadModule(stmt.from, stmt.from);
        const namespace = new Map();
        for (const [name, fnDecl] of external.exports) {
          interpreter.userFns.set(`${stmt.name}__${name}`, fnDecl);
          interpreter.userFns.set(name, fnDecl);
          namespace.set(name, fnDecl);
        }
        interpreter.rootEnv.define(stmt.name, { _module: namespace } as any);
      }
    }
  }

  _preloadImports(program, moduleDir) {
    for (const stmt of program.stmts) {
      if (stmt.constructor.name === 'ImportStmt') {
        if (!this.loadedModules.has(stmt.from)) {
          this.loadModule(stmt.from, stmt.from, moduleDir);
        }
      }
    }
  }

  runMain(filePath) {
    return this.runModule(filePath);
  }

  collectSources(mainFile: string): Record<string, string> {
    this.loadModule(mainFile, mainFile);
    const sources: Record<string, string> = {};
    for (const [key, mod] of this.loadedModules) {
      sources[key] = mod.rawSource;
    }
    return sources;
  }
}

export { ModuleLoader };
