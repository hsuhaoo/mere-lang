/**
 * Standard library for the Simplex language.
 * Built-in functions and methods implemented in JavaScript.
 * 
 * All built-ins are explicit: no implicit conversions, no hidden behavior.
 * Every possible failure returns a Result value.
 */

import * as fs from 'fs';
import process from 'process';
import {
  Value, ValueKind,
  IntValue, StringValue, BoolValue, ListValue,
  MapValue, ResultValue,
  int as mkInt, string as mkString, bool as mkBool, unit as mkUnit,
  list as mkList, map as mkMap, result as mkResult,
  task as mkTask,
} from './values.js';

class Builtins {
  fnMap: Map<string, { arity: number; fn: (args: any[]) => Value }>;
  methodMap: Map<string, { paramArities: number[]; fn: (obj: any, args: any[]) => Value }>;

  constructor() {
    this.fnMap = new Map();
    this.methodMap = new Map();
    this.registerBuiltins();
  }

  registerBuiltins() {
    // ═══════════════════════════════════════════════════════════
    // String builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('len', 1, (args) => {
      return mkInt(args[0].length());
    });

    this.registerFn('concat', 2, (args) => {
      return mkString(args[0].get() + args[1].get());
    });

    this.registerFn('substring', 3, (args) => {
      const str = args[0].get();
      const start = args[1].getNumber();
      const length = args[2].getNumber();
      return mkString(str.substring(start, start + length));
    });

    this.registerFn('parse_int', 1, (args) => {
      const str = args[0].get();
      const num = parseInt(str, 10);
      if (isNaN(num)) {
        return mkResult(false, mkString(`Cannot parse '${str}' as integer`), null);
      }
      return mkResult(true, mkInt(num), null);
    });

    this.registerFn('to_string', 1, (args) => {
      return mkString(String(args[0].toString()));
    });

    this.registerFn('to_string_bool', 1, (args) => {
      return mkString(String(args[0].get()));
    });

    this.registerFn('print', 1, (args) => {
      process.stdout.write(args[0].toString() + '\n');
      return mkUnit();
    });

    // ── File I/O ──────────────────────────────────────────────────
    // fs already imported at top

    this.registerFn('file_read', 1, (args) => {
      const path = args[0].get();
      try {
        const content = fs.readFileSync(path, 'utf-8');
        return mkResult(true, mkString(content), null);
      } catch (e) {
        return mkResult(false, mkString(`Cannot read file '${path}': ${e.message}`), null);
      }
    });

    this.registerFn('file_read_lines', 1, (args) => {
      const path = args[0].get();
      try {
        const content = fs.readFileSync(path, 'utf-8');
        const lines = content.split('\n');
        return mkResult(true, mkList(
          lines.map(line => mkString(line)),
          null
        ), null);
      } catch (e) {
        return mkResult(false, mkString(`Cannot read file '${path}': ${e.message}`), null);
      }
    });

    this.registerFn('file_write', 2, (args) => {
      const path = args[0].get();
      const content = args[1].get();
      try {
        fs.writeFileSync(path, content);
        return mkResult(true, mkUnit(), null);
      } catch (e) {
        return mkResult(false, mkString(`Cannot write file '${path}': ${e.message}`), null);
      }
    });

    // ═══════════════════════════════════════════════════════════
    // List builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('append', 2, (args) => {
      const list = args[0];
      const elem = args[1];
      const newElements = [...list._getElements(), elem];
      return mkList(newElements, list._elementType);
    });

    this.registerFn('list_get', 2, (args) => {
      const list = args[0];
      const index = args[1].getNumber();
      if (index < 0 || index >= list.length()) {
        return mkResult(false, mkString(`Index ${index} out of bounds`), null);
      }
      return mkResult(true, list.get(index), null);
    });

    this.registerFn('list_len', 1, (args) => {
      return mkInt(args[0].length());
    });

    this.registerFn('substring_list', 3, (args) => {
      const list = args[0];
      const start = args[1].getNumber();
      const length = args[2].getNumber();
      const newElements = list._getElements().slice(start, start + length);
      return mkList(newElements, list._elementType);
    });

    // ═══════════════════════════════════════════════════════════
    // Result builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('is_ok', 1, (args) => {
      return mkBool(args[0].isOk());
    });

    this.registerFn('is_err', 1, (args) => {
      return mkBool(args[0].isErr());
    });

    this.registerFn('unwrap', 1, (args) => {
      if (!args[0].isOk()) {
        throw new Error(`Called unwrap on err value: ${args[0].getErr()}`);
      }
      return args[0].getOk();
    });

    this.registerFn('unwrap_err', 1, (args) => {
      if (args[0].isOk()) {
        throw new Error('Called unwrap_err on ok value');
      }
      return args[0].getErr();
    });

    // ═══════════════════════════════════════════════════════════
    // Map builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('map_put', 3, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
      map._getEntries()[key] = args[2];
      return mkUnit();
    });

    this.registerFn('map_get', 2, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
      if (!(key in map._getEntries())) {
        return mkResult(false, mkString(`Key '${key}' not found`), null);
      }
      return mkResult(true, map._getEntries()[key], null);
    });

    this.registerFn('map_has', 2, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
      return mkBool(map.has(key));
    });

    this.registerFn('map_remove', 2, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
      delete map._getEntries()[key];
      return mkUnit();
    });

    // ═══════════════════════════════════════════════════════════
    // Polymorphic builtins (get, has, put)
    // ═══════════════════════════════════════════════════════════

    this.registerFn('get', 2, (args) => {
      const obj = args[0];
      if (obj.kind === ValueKind.LIST) {
        const index = args[1].getNumber();
        if (index < 0 || index >= obj.length()) {
          return mkResult(false, mkString(`Index ${index} out of bounds`), null);
        }
        return mkResult(true, obj.get(index), null);
      }
      if (obj.kind === ValueKind.MAP) {
        const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
        if (!(key in obj._getEntries())) {
          return mkResult(false, mkString(`Key '${key}' not found`), null);
        }
        return mkResult(true, obj._getEntries()[key], null);
      }
      throw new Error(`'get' expects a List or Map, got ${obj.kind}`);
    });

    this.registerFn('has', 2, (args) => {
      const obj = args[0];
      if (obj.kind !== ValueKind.MAP) {
        throw new Error(`'has' expects a Map, got ${obj.kind}`);
      }
      const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
      return mkBool(obj.has(key));
    });

    this.registerFn('put', 3, (args) => {
      const obj = args[0];
      if (obj.kind !== ValueKind.MAP) {
        throw new Error(`'put' expects a Map, got ${obj.kind}`);
      }
      const key = String(args[1].kind === ValueKind.INT ? args[1].getNumber() : args[1].get());
      obj._getEntries()[key] = args[2];
      return mkUnit();
    });

    // ═══════════════════════════════════════════════════════════
    // Math builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('abs', 1, (args) => {
      return mkInt(Math.abs(args[0].getNumber()));
    });

    this.registerFn('max', 2, (args) => {
      return mkInt(Math.max(args[0].getNumber(), args[1].getNumber()));
    });

    this.registerFn('min', 2, (args) => {
      return mkInt(Math.min(args[0].getNumber(), args[1].getNumber()));
    });

    // ── Task builtins ──────────────────────────────────────────────
    // spawn(expr) — wraps an evaluated expression into Task<T>
    // Since Simplex has no async IO, spawn is synchronous.
    // It captures the result of expr and returns it via join().
    this.registerFn('spawn', 1, (args) => {
      const result = args[0];  // already evaluated value
      return mkTask({
        id: 0,
        state: 'done',
        result: result,
      }, null);
    });

    this.registerFn('join', 1, (args) => {
      const task = args[0].handle;
      if (task.state === 'done') {
        if (task.error) {
          throw new Error(`Task failed: ${task.error}`);
        }
        return task.result;
      }
      throw new Error('Task not completed');
    });

    // ═══════════════════════════════════════════════════════════
    // Method bindings (object.method)
    // ═══════════════════════════════════════════════════════════

    // String methods
    this.registerMethod('String.len', [], () => {
      throw new Error('Method calls on literals not supported');
    });
    this.registerMethod('String.concat', [1], (obj, args) => {
      return mkString(obj.get() + args[0].get());
    });
    this.registerMethod('String.substring', [2], (obj, args) => {
      return mkString(obj.get().substring(args[0].getNumber(), args[0].getNumber() + args[1].getNumber()));
    });
    this.registerMethod('String.print', [], (obj) => {
      process.stdout.write(obj.get() + '\n');
      return mkUnit();
    });

    // List methods
    this.registerMethod('List.append', [1], (obj, args) => {
      obj.push(args[0]);
      return mkUnit();
    });
    this.registerMethod('List.get', [1], (obj, args) => {
      const index = args[0].getNumber();
      if (index < 0 || index >= obj.length()) {
        return mkResult(false, mkString(`Index ${index} out of bounds`), null);
      }
      return mkResult(true, obj.get(index), null);
    });
    this.registerMethod('List.len', [], (obj) => {
      return mkInt(obj.length());
    });

    // Result methods
    this.registerMethod('Result.is_ok', [], (obj) => {
      return mkBool(obj.isOk());
    });
    this.registerMethod('Result.is_err', [], (obj) => {
      return mkBool(obj.isErr());
    });
    this.registerMethod('Result.unwrap', [], (obj) => {
      if (!obj.isOk()) {
        throw new Error(`Called unwrap on err: ${obj.getErr()}`);
      }
      return obj.getOk();
    });
    this.registerMethod('Result.unwrap_err', [], (obj) => {
      if (obj.isOk()) {
        throw new Error('Called unwrap_err on ok value');
      }
      return obj.getErr();
    });

    // Map methods
    this.registerMethod('Map.put', [2], (obj, args) => {
      const key = String(args[0].kind === ValueKind.INT ? args[0].getNumber() : args[0].get());
      obj._getEntries()[key] = args[1];
      return mkUnit();
    });
    this.registerMethod('Map.get', [1], (obj, args) => {
      const key = String(args[0].kind === ValueKind.INT ? args[0].getNumber() : args[0].get());
      if (!(key in obj._getEntries())) {
        return mkResult(false, mkString(`Key '${key}' not found`), null);
      }
      return mkResult(true, obj._getEntries()[key], null);
    });
    this.registerMethod('Map.has', [1], (obj, args) => {
      const key = String(args[0].kind === ValueKind.INT ? args[0].getNumber() : args[0].get());
      return mkBool(obj.has(key));
    });
    this.registerMethod('Map.remove', [1], (obj, args) => {
      const key = String(args[0].kind === ValueKind.INT ? args[0].getNumber() : args[0].get());
      delete obj._getEntries()[key];
      return mkUnit();
    });
  }

  registerFn(name: string, arity: number, fn: (args: any[]) => Value) {
    this.fnMap.set(name, { arity, fn });
  }

  registerMethod(path: string, paramArities: number[], fn: (obj: any, args: any[]) => Value) {
    this.methodMap.set(path, { paramArities, fn });
  }

  getFn(name: string): { arity: number; fn: (args: any[]) => Value } | undefined {
    return this.fnMap.get(name);
  }

  getMethod(typeName: string, methodName: string): { paramArities: number[]; fn: (obj: any, args: any[]) => Value } | undefined {
    const path = `${typeName}.${methodName}`;
    return this.methodMap.get(path);
  }

  isBuiltin(name: string): boolean {
    return this.fnMap.has(name);
  }

  getBuiltinNames(): string[] {
    return [...this.fnMap.keys()];
  }
}

export { Builtins };
