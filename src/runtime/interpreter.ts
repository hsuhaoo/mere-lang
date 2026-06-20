import {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, MutDeclStmt, AssignStmt, WhileStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
  Expr, Stmt,
} from '../ast/nodes.js';
import {
  Value, UNIT_VALUE,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  list as mkList, map as mkMap, record as mkRecord,
  task as mkTask,

  mkOk, mkErr,
  NumberValue, StringValue, BooleanValue, ListValue,
  MapValue, RecordValue, ResultValue, FnValue, TaskValue,
} from './values.js';
import { Env } from './env.js';
import { Builtins } from './builtins.js';
import { Scheduler } from './scheduler.js';
import { Compiler, CompiledFn } from './compiler.js';
import { VM } from './vm.js';
import { TypeError } from '../typechecker/index.js';

class RuntimeError extends Error {
  line: number;
  column: number;
  name: string;

  constructor(message: string, line = 0, column = 0) {
    super(`Runtime error [${line}:${column}]: ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'RuntimeError';
  }
}

class Interpreter {
  builtins: Builtins;
  scheduler: Scheduler;
  rootEnv: Env;
  programRootEnv: Env;
  userFns: Map<string, FnDecl>;
  typeDecls: Map<string, TypeDecl>;
  modules: Map<string, { exports: Map<string, FnDecl> }>;
  currentModule: string;
  vm: VM | null;

  constructor(builtins?: Builtins, scheduler?: Scheduler) {
    this.scheduler = scheduler || new Scheduler();
    this.builtins = builtins || new Builtins(this.scheduler);
    this.rootEnv = new Env();
    this.programRootEnv = this.rootEnv;
    this.userFns = new Map();
    this.typeDecls = new Map();
    this.modules = new Map();
    this.currentModule = 'main';
    this.vm = null;
  }

  run(program: Program): Value {
    for (const stmt of program.stmts) {
      if (stmt instanceof FnDecl) this.userFns.set(stmt.name, stmt);
      if (stmt instanceof TypeDecl) this.typeDecls.set(stmt.name, stmt);
      if (stmt instanceof ImportStmt) this.loadModule(stmt.name, stmt.from);
    }

    // ── Collect global variable / function names from module level ──
    const globalNames: string[] = [];
    const globalValues: Value[] = [];
    for (const stmt of program.stmts) {
      if (stmt instanceof MutDeclStmt) { globalNames.push(stmt.name); globalValues.push(UNIT_VALUE); }
      if (stmt instanceof LetStmt) { globalNames.push(stmt.name); globalValues.push(UNIT_VALUE); }
      if (stmt instanceof FnDecl) { globalNames.push(stmt.name); globalValues.push(UNIT_VALUE); }
    }
    // Add names injected into rootEnv (e.g. by module loader for imports)
    for (const key of this.rootEnv.getNames()) {
      if (!globalNames.includes(key)) {
        globalNames.push(key);
        const val = this.rootEnv.bindings.get(key)!;
        globalValues.push(val instanceof Value ? val : (val as any));
      }
    }

    // ── Compile all user functions to bytecode ──
    const compiler = new Compiler(this.builtins, globalNames, globalValues);
    const compiledFns: CompiledFn[] = [];
    for (const [name, fnDecl] of this.userFns) {
      try {
        compiledFns.push(compiler.compile(fnDecl));
      } catch (e) {
        console.warn(`[${name}] compile error: ${e}`);
      }
    }

    // ── Create VM and register compiled functions ──
    this.vm = new VM(this.builtins, globalNames, globalValues);
    for (const cf of compiledFns) this.vm.tryRegister(cf);

    // ── Set up builtins.callFn for higher-order functions ──
    this.builtins.callFn = (fn: FnValue, args: Value[]): Value => {
      if (!fn.vm || fn.vmFuncIndex < 0) {
        throw new Error(`FnValue lacks VM reference: cannot call ${fn.typeName()}`);
      }
      return this.vm!.callByIndex(fn.vmFuncIndex, args);
    };

    // ── Create FnValues for FnDecl so they're accessible as globals ──
    for (const stmt of program.stmts) {
      if (stmt instanceof FnDecl) {
        const fnDecl = stmt;
        const fnValue = new FnValue(fnDecl.params, fnDecl.body, this.programRootEnv);
        if (this.vm.hasFunction(fnDecl.name)) {
          fnValue.vm = this.vm;
          fnValue.vmFuncIndex = this.vm.getFunctionIndex(fnDecl.name);
        }
        this.rootEnv.define(fnDecl.name, fnValue);
        const idx = this.vm.getGlobalIndex(fnDecl.name);
        if (idx >= 0) this.vm.setGlobal(idx, fnValue);
      }
    }

    // ── Compile __main__ from module-level statments ──
    const mainStmts = program.stmts.filter(
      s => !(s instanceof FnDecl || s instanceof TypeDecl || s instanceof ImportStmt || s instanceof ExportStmt)
    );
    if (mainStmts.length > 0) {
      const mainCompiled = compiler.compileMain(mainStmts);
      this.vm.tryRegister(mainCompiled);
    }

    // ── Execute __main__ via VM ──
    let lastValue: Value = this.vm.hasFunction('__main__')
      ? this.vm.callFunction('__main__', [])
      : mkUnit();

    // ── Auto-call main() via VM (overrides lastValue) ──
    if (this.vm.hasFunction('main')) {
      lastValue = this.vm.callFunction('main', []);
    }

    return lastValue;
  }

  loadModule(name: string, path: string) {
    this.modules.set(path, { exports: new Map() });
  }

}

export { Interpreter, RuntimeError };
