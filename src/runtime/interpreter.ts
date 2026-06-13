/**
 * AST Interpreter for the Simplex language.
 * Direct tree traversal execution - no bytecode VM.
 *
 * Design principles:
 * - One pass through the AST
 * - No intermediate representation
 * - Errors converted to Result values where appropriate
 * - All state explicit: env, builtins, scheduler, types
 * - Tail call optimization: tail-recursive calls use a loop
 *   instead of stack frames — infinite depth with O(1) stack
 */

import {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  MethodCallExpr, FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation,
} from '../ast/nodes.js';
import {
  Value, ValueKind,
  int as mkInt, string as mkString, bool as mkBool, unit as mkUnit,
  list as mkList, map as mkMap, record as mkRecord,
  result as mkResult, fn as mkFn,
  IntValue, StringValue, BoolValue, ListValue,
  MapValue, RecordValue, ResultValue, FnValue,
} from './values.js';
import { Env } from './env.js';
import { Builtins } from './builtins.js';
import { Scheduler } from './scheduler.js';
import { TypeError } from '../typechecker/index.js';

class RuntimeError extends Error {
  line: any;
  column: any;
  name: any;

  constructor(message, line = 0, column = 0) {
    super(`Runtime error [${line}:${column}]: ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'RuntimeError';
  }
}

class Interpreter {
  builtins: any;
  scheduler: any;
  rootEnv: any;
  userFns: any;
  typeDecls: any;
  modules: any;
  currentModule: any;

  constructor(builtins, scheduler) {
    this.builtins = builtins || new Builtins();
    this.scheduler = scheduler || new Scheduler();
    this.rootEnv = new Env();
    this.userFns = new Map();
    this.typeDecls = new Map();
    this.modules = new Map();
    this.currentModule = 'main';
  }

  run(program) {
    for (const stmt of program.stmts) {
      if (stmt instanceof FnDecl) this.userFns.set(stmt.name, stmt);
      if (stmt instanceof TypeDecl) this.typeDecls.set(stmt.name, stmt);
      if (stmt instanceof ImportStmt) this.loadModule(stmt.name, stmt.from);
    }

    let lastResult = mkUnit();
    for (const stmt of program.stmts) {
      try {
        lastResult = this.execStmt(stmt);
      } catch (e) {
        if (e instanceof ReturnSignal) {
          lastResult = e.returnValue !== undefined ? e.returnValue : mkUnit();
        } else {
          throw e;
        }
      }
    }
    return lastResult;
  }

  // ── Statement execution ───────────────────────────────────────

  execStmt(stmt) {
    switch (stmt.constructor) {
      case LetStmt:       return this.execLet(stmt);
      case IfStmt:        return this.execIf(stmt);
      case ReturnStmt: {
        const value = stmt.value ? this.execExpr(stmt.value) : mkUnit();
        throw new ReturnSignal(value);
      }
      case ExpressionStmt: return this.execExpr(stmt.expression);
      case FnDecl:
        this.userFns.set(stmt.name, stmt);
        return mkUnit();
      case TypeDecl:
        this.typeDecls.set(stmt.name, stmt);
        return mkUnit();
      case ImportStmt:
      case ExportStmt:
        return mkUnit();
      default:
        throw new RuntimeError(`Unknown statement: ${stmt.constructor.name}`, stmt.line, stmt.column);
    }
  }

  // ── Expression evaluation ─────────────────────────────────────

  execExpr(expr) {
    switch (expr.constructor) {
      case LiteralExpr:     return this.execLiteral(expr.value);
      case IdentifierExpr:  return this.rootEnv.lookup(expr.name);
      case BinOpExpr:       return this.execBinOp(expr);
      case UnOpExpr:        return this.execUnOp(expr);
      case CallExpr:        return this.execCall(expr);
      case MethodCallExpr:  return this.execMethodCall(expr);
      case FieldAccessExpr: return this.execFieldAccess(expr);
      case IfExpr:          return this.execIfExpr(expr);
      case LambdaExpr:      return this.execLambdaExpr(expr);
      case BlockExpr:       return this.execBlock(expr);
      case RecordCreateExpr: return this.execRecordCreate(expr);
      case ListCreateExpr:  return this.execListCreate(expr);
      case MapCreateExpr:   return this.execMapCreate(expr);
      case ResultOkExpr:    return mkResult(true, this.execExpr(expr.value), null);
      case ResultErrExpr: {
        const msg = this.execExpr(expr.message);
        return mkResult(false, msg, null);
      }
      case UnitExpr:   return mkUnit();
      case FnDecl:       return this.execFnLiteral(expr);
      default:
        throw new RuntimeError(`Unknown expression: ${expr.constructor.name}`, expr.line, expr.column);
    }
  }

  execLiteral(value) {
    if (typeof value === 'number') return mkInt(Math.trunc(value));
    if (typeof value === 'string') return mkString(value);
    if (typeof value === 'boolean') return mkBool(value);
    if (value === null) return mkUnit();
    throw new RuntimeError(`Unknown literal: ${value}`, 0, 0);
  }

  execBinOp(expr) {
    const left = this.execExpr(expr.left);
    const right = this.execExpr(expr.right);

    switch (expr.op) {
      case '+':
        if (left.kind === ValueKind.STRING && right.kind === ValueKind.STRING) {
          return mkString(left.get() + right.get());
        }
        return mkInt(left.getNumber() + right.getNumber());
      case '-': return mkInt(left.getNumber() - right.getNumber());
      case '*': return mkInt(left.getNumber() * right.getNumber());
      case '/':
        if (right.getNumber() === 0)
          throw new RuntimeError('Division by zero', expr.line, expr.column);
        return mkInt(Math.trunc(left.getNumber() / right.getNumber()));
      case '==': return mkBool(this.valuesEqual(left, right));
      case '!=': return mkBool(!this.valuesEqual(left, right));
      case '<': return mkBool(left.getNumber() < right.getNumber());
      case '>': return mkBool(left.getNumber() > right.getNumber());
      case '<=': return mkBool(left.getNumber() <= right.getNumber());
      case '>=': return mkBool(left.getNumber() >= right.getNumber());
      case 'and': return mkBool(
        left.kind === ValueKind.BOOL && left.get() &&
        right.kind === ValueKind.BOOL && right.get());
      case 'or': return mkBool(
        left.kind === ValueKind.BOOL && left.get() ||
        right.kind === ValueKind.BOOL && right.get());
      default:
        throw new RuntimeError(`Unknown operator: ${expr.op}`, expr.line, expr.column);
    }
  }

  execUnOp(expr) {
    const operand = this.execExpr(expr.operand);
    switch (expr.op) {
      case 'not': return mkBool(operand.kind === ValueKind.BOOL && !operand.get());
      case '-': return mkInt(-operand.getNumber());
      default:
        throw new RuntimeError(`Unknown unary operator: ${expr.op}`, expr.line, expr.column);
    }
  }

  // ── Function call (non-tail, normal path) ────────────────────

  execCall(expr) {
    // Lambda as callee
    if (expr.callee instanceof LambdaExpr) {
      return this._dispatchLambda(expr.callee, expr.args);
    }

    // FieldAccessExpr callee (math.add)
    if (expr.callee instanceof FieldAccessExpr) {
      const obj = this.execExpr(expr.callee.object);
      if (obj && typeof obj === 'object' && obj._module) {
        const fnDecl = obj._module.get(expr.callee.field);
        if (fnDecl) {
          const args = expr.args.map(a => this.execExpr(a));
          return this.callUserFunction(fnDecl, args);
        }
      }
      throw new RuntimeError(`Cannot call '${expr.callee.field}' on non-module object`, expr.line, expr.column);
    }

    // FnDecl callee
    if (expr.callee instanceof FnDecl && !expr.callee.name) {
      const args = expr.args.map(a => this.execExpr(a));
      return this.callUserFunction(expr.callee, args);
    }

    // IdentifierExpr callee
    if (expr.callee instanceof IdentifierExpr) {
      return this._dispatchByIdentifier(expr.callee.name, expr.args, expr);
    }

    throw new RuntimeError(`Cannot call non-identifier`, expr.line, expr.column);
  }

  _dispatchLambda(lambdaExpr, argExprs) {
    const args = argExprs.map(a => this.execExpr(a));
    return this.executeLambda(lambdaExpr, args);
  }

  _dispatchByIdentifier(name, argExprs, expr) {
    // Check env first
    let envVal = null;
    try { envVal = this.rootEnv.lookup(name); } catch (e) {}

    if (envVal) {
      if (envVal instanceof FnValue) {
        const args = argExprs.map(a => this.execExpr(a));
        return this.executeLambdaFromValue(envVal, name, args);
      }
      throw new RuntimeError(`'${name}' is not callable`, expr.callee.line, expr.callee.column);
    }

    // Check builtins
    const builtin = this.builtins.getFn(name);
    if (builtin) {
      const args = argExprs.map(a => this.execExpr(a));
      if (args.length !== builtin.arity) {
        throw new RuntimeError(`Function '${name}' expects ${builtin.arity} args, got ${args.length}`, expr.line, expr.column);
      }
      return builtin.fn(args);
    }

    // Check user functions
    const fn = this.userFns.get(name);
    if (fn) {
      const args = argExprs.map(a => this.execExpr(a));
      return this.callUserFunction(fn, args);
    }

    throw new RuntimeError(`Undefined function: ${name}`, expr.callee.line, expr.callee.column);
  }

  // ── Tail call optimized invocation ───────────────────────────

  /**
   * Execute a function body with TCO.
   * The `args` are already-evaluated Value objects.
   * If the last statement is a function call, we invoke it via `invokeTailCall`
   * which directly binds args and loops instead of recursing.
   */
  _execBody(body) {
    for (let i = 0; i < body.length; i++) {
      const stmt = body[i];
      const isLast = (i === body.length - 1);

      try {
        if (stmt instanceof ReturnStmt) {
          if (isLast && stmt.value instanceof CallExpr) {
            const tailFn = this._resolveTailCallTarget(stmt.value);
            if (tailFn) {
              return new TailCall(tailFn, stmt.value.args.map(a => this.execExpr(a)));
            }
          }
          const value = stmt.value ? this.execExpr(stmt.value) : mkUnit();
          throw new ReturnSignal(value);
        }

        // Last ExpressionStmt: check for TCO before executing
        if (isLast && stmt instanceof ExpressionStmt) {
          const expr = stmt.expression;
          if (expr instanceof CallExpr) {
            const fn = this._resolveTailCallTarget(expr);
            if (fn) {
              return new TailCall(fn, expr.args.map(a => this.execExpr(a)));
            }
          }
          // Non-tail-call last expression: return its value
          return this.execExpr(expr);
        }

        const result = this.execStmt(stmt);
        if (result instanceof ReturnSignal) {
          throw new ReturnSignal(result.returnValue !== undefined ? result.returnValue : mkUnit());
        }

        // Non-last statement or non-expression last statement: track result
        if (isLast) return result;
      } catch (e) {
        if (e instanceof ReturnSignal) throw e;
        throw e;
      }
    }
    return mkUnit();
  }

  /**
   * Resolve the FnDecl from a CallExpr's callee for TCO.
   */
  _resolveTailCallTarget(callExpr) {
    if (callExpr.callee instanceof IdentifierExpr) {
      return this.userFns.get(callExpr.callee.name);
    }
    if (callExpr.callee instanceof FieldAccessExpr) {
      const obj = this.execExpr(callExpr.callee.object);
      if (obj && typeof obj === 'object' && obj._module) {
        return obj._module.get(callExpr.callee.field);
      }
    }
    return null;
  }


  callUserFunction(fn, args) {
    let currentFn = fn;
    let currentArgs = args;

    while (true) {
      const callEnv = new Env(this.rootEnv);

      if (currentArgs.length !== currentFn.params.length) {
        throw new RuntimeError(
          `Function '${currentFn.name}' expects ${currentFn.params.length} arguments, got ${currentArgs.length}`,
          currentFn.line, currentFn.column
        );
      }

      for (let i = 0; i < currentFn.params.length; i++) {
        callEnv.define(currentFn.params[i].name, currentArgs[i]);
      }

      const savedEnv = this.rootEnv;
      this.rootEnv = callEnv;

      try {
        const result = this._execBody(currentFn.body);

        if (result instanceof TailCall) {
          currentFn = result.fn;
          currentArgs = result.args;
          this.rootEnv = savedEnv;
          continue;
        }

        return result;
      } catch (e) {
        if (e instanceof ReturnSignal) {
          return e.returnValue !== undefined ? e.returnValue : mkUnit();
        }
        throw e;
      } finally {
        this.rootEnv = savedEnv;
      }
    }
  }

  // ── Method calls (built-in methods, not tail-optimized) ──────

  execMethodCall(expr) {
    const obj = this.execExpr(expr.object);
    const methodName = expr.method;
    const args = expr.args.map(a => this.execExpr(a));

    if (obj && typeof obj === 'object' && obj._module) {
      const fnDecl = obj._module.get(methodName);
      if (fnDecl) {
        const argValues = expr.args.map(a => this.execExpr(a));
        return this.callUserFunction(fnDecl, argValues);
      }
    }

    const method = this.builtins.getMethod(obj.kind, methodName);
    if (method) {
      if (args.length !== method.paramArities.length) {
        throw new RuntimeError(
          `Method '${obj.kind}.${methodName}' expects ${method.paramArities.length} args, got ${args.length}`,
          expr.line, expr.column
        );
      }
      return method.fn(obj, args);
    }

    throw new RuntimeError(
      `Unknown method: ${obj.kind}.${methodName}`,
      expr.line, expr.column
    );
  }

  execFieldAccess(expr) {
    const obj = this.execExpr(expr.object);

    if (obj && typeof obj === 'object' && obj._module) {
      if (obj._module.has(expr.field)) {
        return obj._module.get(expr.field);
      }
      throw new RuntimeError(`Module has no export '${expr.field}'`, expr.line, expr.column);
    }

    if (obj.kind !== ValueKind.RECORD) {
      throw new RuntimeError(`Cannot access field on non-record type ${obj.typeName()}`, expr.line, expr.column);
    }
    if (!(expr.field in obj._getFields())) {
      throw new RuntimeError(`Record has no field '${expr.field}'`, expr.line, expr.column);
    }
    return obj.get(expr.field);
  }

  // ── Control flow ──────────────────────────────────────────────

  execIfExpr(expr) {
    const condition = this.execExpr(expr.condition);
    if (condition.kind === ValueKind.BOOL && condition.get()) {
      for (const stmt of expr.thenBlock) {
        this.execStmt(stmt);
      }
    }
    return mkUnit();
  }

  execIf(stmt) {
    const condition = this.execExpr(stmt.condition);
    if (condition.kind === ValueKind.BOOL && condition.get()) {
      return this.execBlock({ stmts: stmt.thenBlock });
    }
    return mkUnit();
  }

  execBlock(expr) {
    let lastValue = mkUnit();
    for (const stmt of expr.stmts) {
      lastValue = this.execStmt(stmt);
    }
    return lastValue;
  }

  execLet(stmt) {
    const value = stmt.init ? this.execExpr(stmt.init) : mkUnit();
    this.rootEnv.define(stmt.name, value);
    return mkUnit();
  }

  // ── Data constructors ─────────────────────────────────────────

  execRecordCreate(expr) {
    const fields = {};
    for (const field of expr.fields) {
      fields[field.key] = this.execExpr(field.value);
    }
    const typeName = expr.fields.length > 0 ? expr.fields[0].key : 'Record';
    const typeDecl = this.typeDecls.get(typeName);
    return mkRecord(fields, typeDecl ? typeDecl.name : 'Record');
  }

  execListCreate(expr) {
    const elements = expr.elements.map(e => this.execExpr(e));
    return mkList(elements, null);
  }

  execMapCreate(expr) {
    const entries = {};
    for (const entry of expr.entries) {
      const key = this.execExpr(entry.key);
      const value = this.execExpr(entry.value);
      entries[String(key.kind === ValueKind.INT ? key.getNumber() : key.get())] = value;
    }
    return mkMap(entries, null, null);
  }

  execFnLiteral(fnDecl) {
    return mkFn(fnDecl.params, fnDecl.body, this.rootEnv);
  }

  execLambdaExpr(expr) {
    const closure = new Env(this.rootEnv);
    return new FnValue(expr.params, expr.body, closure);
  }

  /**
   * Execute a lambda with pre-evaluated arguments.
   * Lambda expressions don't use TCO — they capture their arguments as values.
   */
  executeLambda(lambdaExpr, argValues) {
    const env = new Env(this.rootEnv);

    if (argValues.length !== lambdaExpr.params.length) {
      throw new RuntimeError(
        `Lambda expects ${lambdaExpr.params.length} args, got ${argValues.length}`,
        lambdaExpr.line, lambdaExpr.column
      );
    }

    for (let i = 0; i < lambdaExpr.params.length; i++) {
      env.define(lambdaExpr.params[i].name, argValues[i]);
    }

    const savedEnv = this.rootEnv;
    this.rootEnv = env;

    try {
      for (const stmt of lambdaExpr.body) {
        const result = this.execStmt(stmt);
        if (result instanceof ReturnSignal) {
          return result.returnValue;
        }
      }

      const lastStmt = lambdaExpr.body[lambdaExpr.body.length - 1];
      if (lastStmt instanceof ExpressionStmt) {
        return this.execExpr(lastStmt.expression);
      }

      return mkUnit();
    } finally {
      this.rootEnv = savedEnv;
    }
  }

  executeLambdaFromValue(fnValue, name, argValues) {
    const env = new Env(fnValue.closure);

    if (argValues.length !== fnValue.params.length) {
      throw new RuntimeError(
        `Function '${name}' expects ${fnValue.params.length} args, got ${argValues.length}`,
        0, 0
      );
    }

    for (let i = 0; i < fnValue.params.length; i++) {
      env.define(fnValue.params[i].name, argValues[i]);
    }

    const savedEnv = this.rootEnv;
    this.rootEnv = env;

    try {
      for (const stmt of fnValue.body) {
        const result = this.execStmt(stmt);
        if (result instanceof ReturnSignal) {
          return result.returnValue;
        }
      }

      const lastStmt = fnValue.body[fnValue.body.length - 1];
      if (lastStmt instanceof ExpressionStmt) {
        return this.execExpr(lastStmt.expression);
      }

      return mkUnit();
    } finally {
      this.rootEnv = savedEnv;
    }
  }

  // ── Module loading ────────────────────────────────────────────

  loadModule(name, path) {
    this.modules.set(path, { exports: new Map() });
  }

  // ── Equality ──────────────────────────────────────────────────

  valuesEqual(a, b) {
    if (a.kind !== b.kind) return false;

    switch (a.kind) {
      case ValueKind.INT:     return a.getNumber() === b.getNumber();
      case ValueKind.STRING:  return a.get() === b.get();
      case ValueKind.BOOL:    return a.get() === b.get();
      case ValueKind.UNIT:    return true;
      case ValueKind.LIST:
        if (a.length() !== b.length()) return false;
        for (let i = 0; i < a.length(); i++) {
          if (!this.valuesEqual(a.get(i), b.get(i))) return false;
        }
        return true;
      case ValueKind.RECORD: {
        if (a.typeName() !== b.typeName()) return false;
        const keys = a.fieldNames();
        if (keys.length !== b.fieldNames().length) return false;
        for (const k of keys) {
          const aVal = a.get(k);
          const bVal = b.get(k);
          if (!aVal || !bVal || !this.valuesEqual(aVal, bVal)) return false;
        }
        return true;
      }
      case ValueKind.RESULT:
        if (a.isOk() !== b.isOk()) return false;
        if (a.isOk()) return this.valuesEqual(a.getOk(), b.getOk());
        return this.valuesEqual(a.getErr(), b.getErr());
      default: return false;
    }
  }
}

// ── Return signal for early returns ─────────────────────────────

class ReturnSignal extends Error {
  returnValue: any;

  constructor(returnValue) {
    super('return');
    this.returnValue = returnValue;
  }
}

// ── Tail call sentinel ──────────────────────────────────────────

class TailCall {
  fn: any;
  args: any;

  constructor(fn, args) {
    this.fn = fn;
    this.args = args;
  }
}

export { Interpreter, RuntimeError, ReturnSignal, TailCall };
