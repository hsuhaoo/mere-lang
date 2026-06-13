/**
 * Module loader for the Simplex language.
 * Flat module system: no nesting, file-name = module-name.
 * 
 * Design principles:
 * - Explicit imports/exports
 * - No circular dependencies (checked statically)
 * - Path-based module resolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer/index.js';
import { Parser, ParseError } from './parser/index.js';
import { TypeChecker, TypeError } from './typechecker/index.js';
import { Interpreter, RuntimeError } from './runtime/interpreter.js';
import { Builtins } from './runtime/builtins.js';
import { Scheduler } from './runtime/scheduler.js';
import { list as mkList, string as mkString } from './runtime/values.js';

class ModuleLoader {
  baseDir: any;
  loadedModules: any;

  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    this.loadedModules = new Map(); // path -> { program, exports: Map<name, FnDecl> }
  }

  /**
   * Load and compile a module file. Returns program + exports map.
   * The `key` parameter is the import path used to reference this module.
   */
  loadModule(filePath, key, parentDir = undefined) {
    // Resolve file path relative to baseDir (or parent module's directory)
    const resolveBase = parentDir || this.baseDir;
    const resolved = path.resolve(resolveBase, filePath);
    const moduleKey = key || filePath;

    // Check cache
    if (this.loadedModules.has(moduleKey)) {
      return this.loadedModules.get(moduleKey);
    }

    // Read source
    const source = fs.readFileSync(resolved, 'utf-8');

    // Parse
    const lexer = new Lexer(source);
    const parser = new Parser(lexer.getTokens());
    const program = parser.parse();

    // Pre-scan and load all imported modules before type checking
    this._preloadImports(program, path.dirname(resolved));

    // Pre-register this module's exports so dependent modules can reference it
    const exports = this.extractExports(program);
    this.loadedModules.set(moduleKey, {
      name: path.basename(filePath, path.extname(filePath)),
      path: resolved,
      program: program,
      exports: exports,
    });

    // Type check with known imports (including pre-registered modules)
    const checker = new TypeChecker();
    checker.check(program, { imports: this.loadedModules });

    const moduleData = {
      name: path.basename(filePath, path.extname(filePath)),
      path: resolved,
      program: program,
      exports: exports,
    };

    return moduleData;
  }

  /**
   * Extract exported FnDecl symbols from a program.
   */
  extractExports(program) {
    const exports = new Map();
    for (const stmt of program.stmts) {
      if (stmt.constructor.name === 'ExportStmt' && stmt.decl && stmt.decl.name) {
        exports.set(stmt.decl.name, stmt.decl);
      }
    }
    return exports;
  }

  /**
   * Run a module with interpreter that has imported symbols injected.
   */
  runModule(filePath) {
    // Load with relative path as key so type checker can find it
    const moduleData = this.loadModule(filePath, filePath);

    const builtins = new Builtins();
    const scheduler = new Scheduler();
    const interpreter = new Interpreter(builtins, scheduler);

    // Inject imported functions into the interpreter's environment
    this._injectImports(moduleData, interpreter);

    return interpreter.run(moduleData.program);
  }

  /**
   * Inject imported symbols from external modules into interpreter.
   */
  _injectImports(moduleData, interpreter) {
    // Build a namespace object for each import
    for (const stmt of moduleData.program.stmts) {
      if (stmt.constructor.name === 'ImportStmt') {
        // Load and inject each exported function
        const external = this.loadModule(stmt.from, stmt.from);
        const namespace = new Map();
        for (const [name, fnDecl] of external.exports) {
          // Register function in userFns for direct calling
          interpreter.userFns.set(`${stmt.name}__${name}`, fnDecl);
          // Also store in namespace for field access
          namespace.set(name, fnDecl);
        }
        // Register namespace object in env (used for field access)
        interpreter.rootEnv.define(stmt.name, { _module: namespace }, false);
      }
    }
  }

  /**
   * Pre-load all imported modules so they're available for type checking.
   */
  _preloadImports(program, moduleDir) {
    for (const stmt of program.stmts) {
      if (stmt.constructor.name === 'ImportStmt') {
        // Load with the import path as key (relative path from source)
        // Resolve relative to the importing module's directory
        if (!this.loadedModules.has(stmt.from)) {
          this.loadModule(stmt.from, stmt.from, moduleDir);
        }
      }
    }
  }

  /**
   * Run the main program (entry point).
   */
  runMain(filePath) {
    return this.runModule(filePath);
  }
}

export { ModuleLoader };
