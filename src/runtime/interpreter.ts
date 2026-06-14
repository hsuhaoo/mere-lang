import {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
  Expr, Stmt,
} from '../ast/nodes.js';
import {
  Value,
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
  userFns: Map<string, FnDecl>;
  typeDecls: Map<string, TypeDecl>;
  modules: Map<string, { exports: Map<string, FnDecl> }>;
  currentModule: string;

  constructor(builtins?: Builtins, scheduler?: Scheduler) {
    this.scheduler = scheduler || new Scheduler();
    this.builtins = builtins || new Builtins(this.scheduler);
    this.rootEnv = new Env();
    this.userFns = new Map();
    this.typeDecls = new Map();
    this.modules = new Map();
    this.currentModule = 'main';
  }

  run(program: Program): Value {
    for (const stmt of program.stmts) {
      if (stmt instanceof FnDecl) this.userFns.set(stmt.name, stmt);
      if (stmt instanceof TypeDecl) this.typeDecls.set(stmt.name, stmt);
      if (stmt instanceof ImportStmt) this.loadModule(stmt.name, stmt.from);
    }

    let lastResult: Value = mkUnit();
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

  execStmt(stmt: Stmt): Value {
    switch (stmt.constructor) {
      case LetStmt:       return this.execLet(stmt as LetStmt);
      case IfStmt:        return this.execIf(stmt as IfStmt);
      case ReturnStmt: {
        const value = (stmt as ReturnStmt).value ? this.execExpr((stmt as ReturnStmt).value!) : mkUnit();
        throw new ReturnSignal(value);
      }
      case ExpressionStmt: return this.execExpr((stmt as ExpressionStmt).expression);
      case FnDecl:
        this.userFns.set((stmt as FnDecl).name, stmt as FnDecl);
        return mkUnit();
      case TypeDecl:
        this.typeDecls.set((stmt as TypeDecl).name, stmt as TypeDecl);
        return mkUnit();
      case ImportStmt:
      case ExportStmt:
        return mkUnit();
      default:
        throw new RuntimeError(`Unknown statement: ${(stmt as any).constructor.name}`, (stmt as any).line, (stmt as any).column);
    }
  }

  execExpr(expr: Expr): Value {
    switch (expr.constructor) {
      case LiteralExpr:     return this.execLiteral(expr as LiteralExpr);
      case IdentifierExpr:  return this.rootEnv.lookup((expr as IdentifierExpr).name);
      case BinOpExpr:       return this.execBinOp(expr as BinOpExpr);
      case UnOpExpr:        return this.execUnOp(expr as UnOpExpr);
      case CallExpr:        return this.execCall(expr as CallExpr);
      case FieldAccessExpr: return this.execFieldAccess(expr as FieldAccessExpr);
      case IfExpr:          return this.execIfExpr(expr as IfExpr);
      case LambdaExpr:      return this.execLambdaExpr(expr as LambdaExpr);
      case BlockExpr:       return this.execBlock(expr as BlockExpr);
      case RecordCreateExpr: return this.execRecordCreate(expr as RecordCreateExpr);
      case ListCreateExpr:  return this.execListCreate(expr as ListCreateExpr);
      case MapCreateExpr:   return this.execMapCreate(expr as MapCreateExpr);
      case ResultOkExpr:    return mkOk(this.execExpr((expr as ResultOkExpr).value));
      case ResultErrExpr: {
        const msg = this.execExpr((expr as ResultErrExpr).message);
        return mkErr(msg as StringValue);
      }
      case UnitExpr:   return mkUnit();
      default:
        throw new RuntimeError(`Unknown expression: ${(expr as any).constructor.name}`, (expr as any).line, (expr as any).column);
    }
  }

  execLiteral(expr: LiteralExpr): Value {
    const value = expr.value;
    if (typeof value === 'number') return mkNumber(value);
    if (typeof value === 'string') return mkString(value);
    if (typeof value === 'boolean') return mkBoolean(value);
    if (value === null) return mkUnit();
    throw new RuntimeError(`Unknown literal: ${value}`, 0, 0);
  }

  execBinOp(expr: BinOpExpr): Value {
    const left = this.execExpr(expr.left);
    const right = this.execExpr(expr.right);

    switch (expr.op) {
      case '+':
        if (left.isString() && right.isString()) {
          return left.concat(right);
        }
        return left.add(right);
      case '-': return left.subtract(right);
      case '*': return left.multiply(right);
      case '/': return left.divide(right);
      case '==': return mkBoolean(left.equals(right));
      case '!=': return mkBoolean(!left.equals(right));
      case '<': return left.lt(right);
      case '>': return left.gt(right);
      case '<=': return left.lte(right);
      case '>=': return left.gte(right);
      case 'and': return left.and(right);
      case 'or': return left.or(right);
      default:
        throw new RuntimeError(`Unknown operator: ${expr.op}`, expr.line, expr.column);
    }
  }

  execUnOp(expr: UnOpExpr): Value {
    const operand = this.execExpr(expr.operand);
    switch (expr.op) {
      case 'not': return operand.not();
      case '-': return operand.negate();
      default:
        throw new RuntimeError(`Unknown unary operator: ${expr.op}`, expr.line, expr.column);
    }
  }

  execCall(expr: CallExpr): Value {
    if (expr.callee instanceof LambdaExpr) {
      return this._dispatchLambda(expr.callee, expr.args);
    }

    if (expr.callee instanceof FieldAccessExpr) {
      const obj = this.execExpr(expr.callee.object);
      if (obj && typeof obj === 'object' && (obj as any)._module) {
        const fnDecl = (obj as any)._module.get(expr.callee.field);
        if (fnDecl) {
          const args = expr.args.map(a => this.execExpr(a));
          return this.callUserFunction(fnDecl, args);
        }
      }
      throw new RuntimeError(`Cannot call '${expr.callee.field}' on non-module object`, expr.line, expr.column);
    }

    if (expr.callee instanceof FnDecl && !expr.callee.name) {
      const args = expr.args.map(a => this.execExpr(a));
      return this.callUserFunction(expr.callee, args);
    }

    if (expr.callee instanceof IdentifierExpr) {
      return this._dispatchByIdentifier(expr.callee.name, expr.args, expr);
    }

    throw new RuntimeError(`Cannot call non-identifier`, expr.line, expr.column);
  }

  _dispatchLambda(lambdaExpr: LambdaExpr, argExprs: Expr[]): Value {
    const args = argExprs.map(a => this.execExpr(a));
    return this.executeLambda(lambdaExpr, args);
  }

  _dispatchByIdentifier(name: string, argExprs: Expr[], expr: CallExpr): Value {
    let envVal: Value | null = null;
    try { envVal = this.rootEnv.lookup(name); } catch (e) {}

    if (envVal) {
      if (envVal instanceof FnValue) {
        const args = argExprs.map(a => this.execExpr(a));
        return this.executeLambdaFromValue(envVal, name, args);
      }
      throw new RuntimeError(`'${name}' is not callable`, expr.callee.line, expr.callee.column);
    }

    // spawn fn → Task<RetT>: fn executed lazily on join
    if (name === 'spawn') {
      const fnValue = this.execExpr(argExprs[0]);
      if (!(fnValue instanceof FnValue)) {
        throw new RuntimeError('spawn expects a function', expr.line, expr.column);
      }
      const thunk = () => this.executeLambdaFromValue(fnValue, 'spawned', []);
      return this.scheduler.spawn(thunk, null);
    }

    // join Task → RetT: retrieve the task's result
    if (name === 'join') {
      const taskValue = this.execExpr(argExprs[0]);
      if (!(taskValue instanceof TaskValue)) {
        throw new RuntimeError('join expects a Task', expr.line, expr.column);
      }
      return this.scheduler.join(taskValue);
    }

    // join Task → RetT: retrieve the task's result
    if (name === 'join') {
      const taskValue = this.execExpr(argExprs[0]);
      if (!(taskValue instanceof TaskValue)) {
        throw new RuntimeError('join expects a Task', expr.line, expr.column);
      }
      return this.scheduler.join(taskValue);
    }

    // map List<T> (T -> U) -> List<U>
    if (name === 'map') {
      const listValue = this.execExpr(argExprs[0]);
      if (!(listValue instanceof ListValue)) {
        throw new RuntimeError('map expects a List', expr.line, expr.column);
      }
      const fnValue = this.execExpr(argExprs[1]);
      if (!(fnValue instanceof FnValue)) {
        throw new RuntimeError('map expects a function', expr.line, expr.column);
      }
      const elements = [];
      for (let i = 0; i < listValue.length(); i++) {
        const elem = listValue.get(i);
        const result = this.executeLambdaFromValue(fnValue, 'map', [elem]);
        elements.push(result);
      }
      return mkList(elements, null);
    }

    // filter List<T> (T -> Boolean) -> List<T>
    if (name === 'filter') {
      const listValue = this.execExpr(argExprs[0]);
      if (!(listValue instanceof ListValue)) {
        throw new RuntimeError('filter expects a List', expr.line, expr.column);
      }
      const fnValue = this.execExpr(argExprs[1]);
      if (!(fnValue instanceof FnValue)) {
        throw new RuntimeError('filter expects a function', expr.line, expr.column);
      }
      const elements = [];
      for (let i = 0; i < listValue.length(); i++) {
        const elem = listValue.get(i);
        const result = this.executeLambdaFromValue(fnValue, 'filter', [elem]);
        if (result.toRawBoolean()) {
          elements.push(elem);
        }
      }
      return mkList(elements, listValue._elementType);
    }

    // fold List<T> U (U, T) -> U -> U
    if (name === 'fold') {
      const listValue = this.execExpr(argExprs[0]);
      if (!(listValue instanceof ListValue)) {
        throw new RuntimeError('fold expects a List', expr.line, expr.column);
      }
      const initValue = this.execExpr(argExprs[1]);
      const fnValue = this.execExpr(argExprs[2]);
      if (!(fnValue instanceof FnValue)) {
        throw new RuntimeError('fold expects a function', expr.line, expr.column);
      }
      let acc = initValue;
      for (let i = 0; i < listValue.length(); i++) {
        const elem = listValue.get(i);
        acc = this.executeLambdaFromValue(fnValue, 'fold', [acc, listValue.get(i)]);
      }
      return acc;
    }

    const builtin = this.builtins.getFn(name);
    if (builtin) {
      const args = argExprs.map(a => this.execExpr(a));
      if (args.length !== builtin.arity) {
        throw new RuntimeError(`Function '${name}' expects ${builtin.arity} args, got ${args.length}`, expr.line, expr.column);
      }
      return builtin.fn(args);
    }

    const fn = this.userFns.get(name);
    if (fn) {
      const args = argExprs.map(a => this.execExpr(a));
      return this.callUserFunction(fn, args);
    }

    throw new RuntimeError(`Undefined function: ${name}`, expr.callee.line, expr.callee.column);
  }

  _execBody(body: Stmt[]): Value | TailCall {
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

        if (isLast && stmt instanceof ExpressionStmt) {
          const expr = stmt.expression;
          if (expr instanceof CallExpr) {
            const fn = this._resolveTailCallTarget(expr);
            if (fn) {
              return new TailCall(fn, expr.args.map(a => this.execExpr(a)));
            }
          }
          return this.execExpr(expr);
        }

        const result = this.execStmt(stmt);
        if (result instanceof ReturnSignal) {
          throw new ReturnSignal(result.returnValue !== undefined ? result.returnValue : mkUnit());
        }

        if (isLast) return result;
      } catch (e) {
        if (e instanceof ReturnSignal) throw e;
        throw e;
      }
    }
    return mkUnit();
  }

  _resolveTailCallTarget(callExpr: CallExpr): FnDecl | null {
    if (callExpr.callee instanceof IdentifierExpr) {
      return this.userFns.get(callExpr.callee.name) || null;
    }
    if (callExpr.callee instanceof FieldAccessExpr) {
      const obj = this.execExpr(callExpr.callee.object);
      if (obj && typeof obj === 'object' && (obj as any)._module) {
        return (obj as any)._module.get(callExpr.callee.field) || null;
      }
    }
    return null;
  }

  callUserFunction(fn: FnDecl, args: Value[]): Value {
    let currentFn: FnDecl = fn;
    let currentArgs: Value[] = args;

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

  execFieldAccess(expr: FieldAccessExpr): Value {
    const obj = this.execExpr(expr.object);

    if (obj && typeof obj === 'object' && (obj as any)._module) {
      if ((obj as any)._module.has(expr.field)) {
        return (obj as any)._module.get(expr.field);
      }
      throw new RuntimeError(`Module has no export '${expr.field}'`, expr.line, expr.column);
    }

    if (obj instanceof ResultValue) {
      if (expr.field === 'isOk') return mkBoolean(obj.isOkValue());
      if (expr.field === 'value') return obj._value;
      if (expr.field === 'errMessage') return obj._errMessage;
      throw new RuntimeError(`Result has no field '${expr.field}'`, expr.line, expr.column);
    }

    if (obj instanceof StringValue) {
      if (expr.field === 'len') return obj.len;
      throw new RuntimeError(`String has no field '${expr.field}'`, expr.line, expr.column);
    }

    if (!(obj instanceof RecordValue)) {
      throw new RuntimeError(`Cannot access field on non-record type ${obj.typeName()}`, expr.line, expr.column);
    }
    if (!obj.hasField(expr.field)) {
      throw new RuntimeError(`Record has no field '${expr.field}'`, expr.line, expr.column);
    }
    return obj.get(expr.field);
  }

  execIfExpr(expr: IfExpr): Value {
    const condition = this.execExpr(expr.condition);
    if (condition.isTruthy()) {
      for (const stmt of expr.thenBlock) {
        this.execStmt(stmt);
      }
    }
    return mkUnit();
  }

  execIf(stmt: IfStmt): Value {
    const condition = this.execExpr(stmt.condition);
    if (condition.isTruthy()) {
      return this.execBlock({ stmts: stmt.thenBlock } as BlockExpr);
    }
    return mkUnit();
  }

  execBlock(expr: BlockExpr): Value {
    let lastValue: Value = mkUnit();
    for (const stmt of expr.stmts) {
      lastValue = this.execStmt(stmt);
    }
    return lastValue;
  }

  execLet(stmt: LetStmt): Value {
    const value = stmt.init ? this.execExpr(stmt.init) : mkUnit();
    this.rootEnv.define(stmt.name, value);
    return mkUnit();
  }

  execRecordCreate(expr: RecordCreateExpr): Value {
    const fields: Record<string, Value> = {};
    for (const field of expr.fields) {
      fields[field.key] = this.execExpr(field.value);
    }
    const typeName = expr.fields.length > 0 ? expr.fields[0].key : 'Record';
    const typeDecl = this.typeDecls.get(typeName);
    return mkRecord(fields, typeDecl ? typeDecl.name : 'Record');
  }

  execListCreate(expr: ListCreateExpr): Value {
    const elements = expr.elements.map(e => this.execExpr(e));
    return mkList(elements, null);
  }

  execMapCreate(expr: MapCreateExpr): Value {
    const entries: Record<string, Value> = {};
    for (const entry of expr.entries) {
      const key = this.execExpr(entry.key);
      const value = this.execExpr(entry.value);
      entries[key.isNumber() ? String(key.toRawNumber()) : key.toRawString()] = value;
    }
    return mkMap(entries, null, null);
  }

  execLambdaExpr(expr: LambdaExpr): Value {
    return new FnValue(expr.params, expr.body);
  }

  executeLambda(lambdaExpr: LambdaExpr, argValues: Value[]): Value {
    const env = new Env();

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

  executeLambdaFromValue(fnValue: FnValue, name: string, argValues: Value[]): Value {
    const env = new Env();

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

  loadModule(name: string, path: string) {
    this.modules.set(path, { exports: new Map() });
  }

}

class ReturnSignal extends Error {
  returnValue: Value;

  constructor(returnValue: Value) {
    super('return');
    this.returnValue = returnValue;
  }
}

class TailCall {
  fn: FnDecl;
  args: Value[];

  constructor(fn: FnDecl, args: Value[]) {
    this.fn = fn;
    this.args = args;
  }
}

export { Interpreter, RuntimeError, ReturnSignal, TailCall };
