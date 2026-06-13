/**
 * Standard library for the Simplex language.
 * Built-in functions implemented in JavaScript.
 * 
 * All built-ins are explicit: no implicit conversions, no hidden behavior.
 * Every possible failure returns a Result value.
 */

import * as fs from 'fs';
import process from 'process';
import {
  Value, ValueKind,
  NumberValue, StringValue, BooleanValue, ListValue,
  MapValue,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  list as mkList, map as mkMap,
  mkOk, mkErr,
  task as mkTask,
} from './values.js';

class Builtins {
  fnMap: Map<string, { arity: number; fn: (args: any[]) => Value }>;

  constructor() {
    this.fnMap = new Map();
    this.registerBuiltins();
  }

  registerBuiltins() {
    // ═══════════════════════════════════════════════════════════
    // String builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('len', 1, (args) => {
      return mkNumber(args[0].length());
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

    this.registerFn('parse_num', 1, (args) => {
      const str = args[0].get();
      const num = parseFloat(str);
      if (isNaN(num)) {
        return mkErr(`Cannot parse '${str}' as number`);
      }
      return mkOk(mkNumber(num));
    });

    this.registerFn('to_string', 1, (args) => {
      return mkString(String(args[0].toString()));
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
        return mkOk(mkString(content));
      } catch (e) {
        return mkErr(`Cannot read file '${path}': ${e.message}`);
      }
    });

    this.registerFn('file_read_lines', 1, (args) => {
      const path = args[0].get();
      try {
        const content = fs.readFileSync(path, 'utf-8');
        const lines = content.split('\n');
        return mkOk(mkList(
          lines.map(line => mkString(line)),
          null
        ));
      } catch (e) {
        return mkErr(`Cannot read file '${path}': ${e.message}`);
      }
    });

    this.registerFn('file_write', 2, (args) => {
      const path = args[0].get();
      const content = args[1].get();
      try {
        fs.writeFileSync(path, content);
        return mkOk(mkUnit());
      } catch (e) {
        return mkErr(`Cannot write file '${path}': ${e.message}`);
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
        return mkErr(`Index ${index} out of bounds`);
      }
      return mkOk(list.get(index));
    });

    this.registerFn('list_len', 1, (args) => {
      return mkNumber(args[0].length());
    });

    this.registerFn('substring_list', 3, (args) => {
      const list = args[0];
      const start = args[1].getNumber();
      const length = args[2].getNumber();
      const newElements = list._getElements().slice(start, start + length);
      return mkList(newElements, list._elementType);
    });

    // ═══════════════════════════════════════════════════════════
    // Map builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('map_put', 3, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
      map._getEntries()[key] = args[2];
      return mkUnit();
    });

    this.registerFn('map_get', 2, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
      if (!(key in map._getEntries())) {
        return mkErr(`Key '${key}' not found`);
      }
      return mkOk(map._getEntries()[key]);
    });

    this.registerFn('map_has', 2, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
      return mkBoolean(map.has(key));
    });

    this.registerFn('map_remove', 2, (args) => {
      const map = args[0];
      const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
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
          return mkErr(`Index ${index} out of bounds`);
        }
        return mkOk(obj.get(index));
      }
      if (obj.kind === ValueKind.MAP) {
        const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
        if (!(key in obj._getEntries())) {
          return mkErr(`Key '${key}' not found`);
        }
        return mkOk(obj._getEntries()[key]);
      }
      throw new Error(`'get' expects a List or Map, got ${obj.kind}`);
    });

    this.registerFn('has', 2, (args) => {
      const obj = args[0];
      if (obj.kind !== ValueKind.MAP) {
        throw new Error(`'has' expects a Map, got ${obj.kind}`);
      }
      const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
      return mkBoolean(obj.has(key));
    });

    this.registerFn('put', 3, (args) => {
      const obj = args[0];
      if (obj.kind !== ValueKind.MAP) {
        throw new Error(`'put' expects a Map, got ${obj.kind}`);
      }
      const key = String(args[1].kind === ValueKind.NUMBER ? args[1].getNumber() : args[1].get());
      obj._getEntries()[key] = args[2];
      return mkUnit();
    });

    // ═══════════════════════════════════════════════════════════
    // Math builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('abs', 1, (args) => {
      return mkNumber(Math.abs(args[0].getNumber()));
    });

    this.registerFn('max', 2, (args) => {
      return mkNumber(Math.max(args[0].getNumber(), args[1].getNumber()));
    });

    this.registerFn('min', 2, (args) => {
      return mkNumber(Math.min(args[0].getNumber(), args[1].getNumber()));
    });

    // ── Task builtins ──────────────────────────────────────────────
    // spawn(expr) — wraps an evaluated expression into Task<T>
    // Since Simplex has no async IO, spawn is synchronous.
    // It captures the result of expr and returns it via join().
    this.registerFn('spawn', 1, (args) => {
      const result = args[0];
      return mkTask({
        id: 0,
        state: 'done',
        fn: () => result,
        result: result,
        error: null,
        resultType: null,
        isDone: () => true,
        isReady: () => false,
      });
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

  }

  registerFn(name: string, arity: number, fn: (args: any[]) => Value) {
    this.fnMap.set(name, { arity, fn });
  }

  getFn(name: string): { arity: number; fn: (args: any[]) => Value } | undefined {
    return this.fnMap.get(name);
  }

  isBuiltin(name: string): boolean {
    return this.fnMap.has(name);
  }

  getBuiltinNames(): string[] {
    return [...this.fnMap.keys()];
  }
}

export { Builtins };
