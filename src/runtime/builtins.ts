/**
 * Standard library for the Simplex language.
 * Built-in functions implemented in JavaScript.
 * 
 * All built-ins are explicit: no implicit conversions, no hidden behavior.
 * Every possible failure returns a Result value.
 */

import process from 'process';
import {
  Value,
  NumberValue, StringValue, BooleanValue, ListValue,
  MapValue, TaskValue, RecordValue, FnValue,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  list as mkList, map as mkMap,
  mkOk, mkErr,
} from './values.js';
import { Scheduler } from './scheduler.js';
import fs from 'fs';

class Builtins {
  fnMap: Map<string, { arity: number; fn: (args: any[]) => Value }>;
  scheduler: Scheduler | null;
  callFn: ((fn: FnValue, args: Value[]) => Value) | null = null;

  constructor(scheduler?: Scheduler) {
    this.fnMap = new Map();
    this.scheduler = scheduler || null;
    this.registerBuiltins();
  }

  registerBuiltins() {
    // ═══════════════════════════════════════════════════════════
    // String builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('concat', 2, (args) => {
      return args[0].concat(args[1]);
    });

    this.registerFn('concat_all', 2, (args) => {
      const list = args[0];
      const sep = args[1].toRawString();
      const strs = [];
      for (let i = 0; i < list.length(); i++) {
        strs.push(list.get(i).toRawString());
      }
      return mkString(strs.join(sep));
    });

    this.registerFn('substring', 3, (args) => {
      const str = args[0].toRawString();
      const start = args[1].toRawNumber();
      const length = args[2].toRawNumber();
      return mkString(str.substring(start, start + length));
    });

    this.registerFn('indexOf', 2, (args) => {
      const haystack = args[0].toRawString();
      const needle = args[1].toRawString();
      return mkNumber(haystack.indexOf(needle));
    });

    this.registerFn('parse_num', 1, (args) => {
      const str = args[0].toRawString();
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

    // ═══════════════════════════════════════════════════════════
    // List builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('append', 2, (args) => {
      return args[0].append(args[1]);
    });

    this.registerFn('list_get', 2, (args) => {
      const list = args[0] as ListValue;
      const index = args[1].toRawNumber();
      if (index < 0 || index >= list.length()) {
        return mkErr(`Index ${index} out of bounds`);
      }
      return mkOk(list.get(index));
    });

    this.registerFn('range', 2, (args) => {
      const start = args[0].toRawNumber();
      const end = args[1].toRawNumber();
      const elems = [];
      for (let i = start; i < end; i++) {
        elems.push(mkNumber(i));
      }
      return mkList(elems, null);
    });

    this.registerFn('substring_list', 3, (args) => {
      const list = args[0] as ListValue;
      const start = args[1].toRawNumber();
      const length = args[2].toRawNumber();
      return list.slice(start, length);
    });

    this.registerFn('list_pop', 1, (args) => {
      const list = args[0] as ListValue;
      const len = list.length();
      if (len <= 1) return mkList([], list._elementType);
      return list.slice(0, len - 1);
    });

    this.registerFn('list_remove_at', 2, (args) => {
      const list = args[0] as ListValue;
      const idx = args[1].toRawNumber();
      const len = list.length();
      if (idx < 0 || idx >= len) return list;
      const left = [];
      for (let i = 0; i < len; i++) {
        if (i !== idx) left.push(list.get(i));
      }
      return new ListValue(left, list._elementType);
    });

    this.registerFn('list_index_of', 2, (args) => {
      const list = args[0] as ListValue;
      const item = args[1];
      for (let i = 0; i < list.length(); i++) {
        if (list.get(i)!.equals(item)) return mkNumber(i);
      }
      return mkNumber(-1);
    });

    // ═══════════════════════════════════════════════════════════
    // Map builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('map_put', 3, (args) => {
      const map = args[0] as MapValue;
      const key = args[1];
      const value = args[2];
      return map.set(key, value);
    });

    this.registerFn('map_get', 2, (args) => {
      const map = args[0] as MapValue;
      if (!map.hasByValueKey(args[1])) {
        return mkErr(`Key '${args[1].toString()}' not found`);
      }
      return mkOk(map.getByValueKey(args[1]));
    });

    this.registerFn('map_has', 2, (args) => {
      return mkBoolean((args[0] as MapValue).hasByValueKey(args[1]));
    });

    this.registerFn('map_remove', 2, (args) => {
      const map = args[0] as MapValue;
      const key = args[1];
      return map.remove(key);
    });

    this.registerFn('map_keys', 1, (args) => {
      const map = args[0] as MapValue;
      return mkList(Object.keys(map._entries || {}).map(k => mkString(k)), null);
    });

    this.registerFn('map_values', 1, (args) => {
      const map = args[0] as MapValue;
      return mkList(Object.values(map._entries || {}), null);
    });

    // ═══════════════════════════════════════════════════════════
    // Polymorphic builtins (get, has, put)
    // ═══════════════════════════════════════════════════════════

    this.registerFn('get', 2, (args) => {
      const obj = args[0];
      if (obj.isList()) {
        const list = obj as ListValue;
        const index = args[1].toRawNumber();
        if (index < 0 || index >= list.length()) {
          return mkErr(`Index ${index} out of bounds`);
        }
        return mkOk(list.get(index));
      }
      if (obj.isMap()) {
        const map = obj as MapValue;
        if (!map.hasByValueKey(args[1])) {
          return mkErr(`Key '${args[1].toString()}' not found`);
        }
        return mkOk(map.getByValueKey(args[1]));
      }
      throw new Error(`'get' expects a List or Map, got ${obj.typeName()}`);
    });

    this.registerFn('has', 2, (args) => {
      const obj = args[0];
      if (!obj.isMap()) {
        throw new Error(`'has' expects a Map, got ${obj.typeName()}`);
      }
      return mkBoolean((obj as MapValue).hasByValueKey(args[1]));
    });

    this.registerFn('put', 3, (args) => {
      const obj = args[0];
      if (!obj.isMap()) {
        throw new Error(`'put' expects a Map, got ${obj.typeName()}`);
      }
      (obj as MapValue).set(args[1], args[2]);
      return mkUnit();
    });

    // ═══════════════════════════════════════════════════════════
    // Math builtins
    // ═══════════════════════════════════════════════════════════

    this.registerFn('abs', 1, (args) => {
      return mkNumber(Math.abs(args[0].toRawNumber()));
    });

    this.registerFn('max', 2, (args) => {
      return mkNumber(Math.max(args[0].toRawNumber(), args[1].toRawNumber()));
    });

    this.registerFn('min', 2, (args) => {
      return mkNumber(Math.min(args[0].toRawNumber(), args[1].toRawNumber()));
    });

    this.registerFn('random', 1, (args) => {
      return mkNumber(Math.floor(Math.random() * args[0].toRawNumber()));
    });

    this.registerFn('sin', 1, (args) => {
      return mkNumber(Math.sin(args[0].toRawNumber()));
    });

    this.registerFn('cos', 1, (args) => {
      return mkNumber(Math.cos(args[0].toRawNumber()));
    });

    this.registerFn('pi', 0, () => {
      return mkNumber(Math.PI);
    });

    this.registerFn('lerp', 3, (args) => {
      let a = args[0].toRawNumber();
      let b = args[1].toRawNumber();
      let t = args[2].toRawNumber();
      return mkNumber(a + (b - a) * t);
    });

    this.registerFn('clamp', 3, (args) => {
      let v = args[0].toRawNumber();
      let lo = args[1].toRawNumber();
      let hi = args[2].toRawNumber();
      return mkNumber(Math.max(lo, Math.min(hi, v)));
    });

    this.registerFn('ease_in', 1, (args) => {
      let t = args[0].toRawNumber();
      return mkNumber(t * t);
    });

    this.registerFn('ease_out', 1, (args) => {
      let t = args[0].toRawNumber();
      return mkNumber(t * (2 - t));
    });

    this.registerFn('ease_in_out', 1, (args) => {
      let t = args[0].toRawNumber();
      if (t < 0.5) {
        return mkNumber(2 * t * t);
      }
      return mkNumber(-1 + (4 - 2 * t) * t);
    });

    this.registerFn('sort', 1, (args) => {
      const list = args[0];
      const elems = [];
      for (let i = 0; i < list.length(); i++) {
        elems.push(list.get(i));
      }
      if (elems.length > 1) {
        const first = elems[0];
        if (first.type.name === 'Number') {
          elems.sort((a, b) => a.toRawNumber() - b.toRawNumber());
        } else {
          elems.sort((a, b) => {
            if (a.toRawString() < b.toRawString()) return -1;
            if (a.toRawString() > b.toRawString()) return 1;
            return 0;
          });
        }
      }
      return new ListValue(elems, list._elementType);
    });

    this.registerFn('sleep', 1, (args) => {
      const ms = args[0].toRawNumber();
      const promise: Promise<Value> = new Promise(resolve => setTimeout(() => resolve(mkUnit()), ms));
      return this.scheduler!.spawnAsync(promise, null);
    });

    // ═══════════════════════════════════════════════════════════
    // I/O builtins (async — returns Task, I/O starts immediately)
    // ═══════════════════════════════════════════════════════════

    if (this.scheduler) {
      this.registerFn('file_read', 1, (args) => {
        const path = args[0].toRawString();
        const promise = fs.promises.readFile(path, 'utf-8')
          .then(content => mkOk(mkString(content)))
          .catch(e => mkErr(`Cannot read file '${path}': ${e.message}`));
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('file_read_lines', 1, (args) => {
        const path = args[0].toRawString();
        const promise = fs.promises.readFile(path, 'utf-8')
          .then(content => {
            const raw = content.split('\n');
            if (raw.length > 0 && raw[raw.length - 1] === '') raw.pop();
            return mkOk(mkList(raw.map(line => mkString(line)), null));
          })
          .catch(e => mkErr(`Cannot read file '${path}': ${e.message}`));
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('file_write', 2, (args) => {
        const path = args[0].toRawString();
        const content = args[1].toRawString();
        const promise = fs.promises.writeFile(path, content)
          .then(() => mkOk(mkUnit()))
          .catch(e => mkErr(`Cannot write file '${path}': ${e.message}`));
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('read_line', 0, (args) => {
        const promise = new Promise<Value>((resolve) => {
          process.stdin.once('data', (data) => {
            const line = data.toString('utf-8').replace(/\n$/, '');
            resolve(mkOk(mkString(line)));
          });
          process.stdin.once('error', (e) => {
            resolve(mkErr(`stdin error: ${e.message}`));
          });
        });
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('fetch', 4, (args) => {
        const url = args[0].toRawString();
        const method = args[1].toRawString();
        const headersValue = args[2]; // Record<string, string> | Map<string, string>
        const body = args[3].toRawString();
        
        // Convert RecordValue/MapValue to plain JS object for fetch
        const headers: Record<string, string> = {};
        if (headersValue instanceof RecordValue) {
          for (const key of headersValue.fieldNames()) {
            const val = headersValue.get(key);
            if (val && val instanceof StringValue) {
              headers[key] = val.toRawString();
            }
          }
        } else if (headersValue instanceof MapValue) {
          for (const key of Object.keys((headersValue as any)._entries)) {
            const val = (headersValue as any)._entries[key];
            if (val instanceof StringValue) {
              headers[key] = val.toRawString();
            }
          }
        }
        
        const promise = globalThis.fetch(url, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
        })
          .then(async (response) => {
            if (!response.ok) {
              return mkErr(`HTTP ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            return mkOk(mkString(text));
          })
          .catch((e: Error) => mkErr(`Fetch failed: ${e.message}`));
        return this.scheduler!.spawnAsync(promise, null);
      });
    }

    // ═══════════════════════════════════════════════════════════
    // Record operations
    // ═══════════════════════════════════════════════════════════

    this.registerFn('record_update', 3, (args) => {
      const rec = args[0];
      if (!(rec instanceof RecordValue)) {
        throw new Error(`'record_update' expects a Record, got ${rec.typeName()}`);
      }
      const fieldName = args[1].toRawString();
      const newValue = args[2];
      const newFields: Record<string, Value> = {};
      for (const key of rec.fieldNames()) {
        newFields[key] = rec.get(key)!;
      }
      newFields[fieldName] = newValue;
      return new RecordValue(newFields, rec.typeName());
    });

    // ═══════════════════════════════════════════════════════════
    // Higher-order list functions (map/filter/fold/find/for_each/sort_by)
    // ═══════════════════════════════════════════════════════════

    this.registerFn('map', 2, (args) => {
      const list = args[0] as ListValue;
      if (!(list instanceof ListValue)) throw new Error('map expects a List');
      const fn = args[1] as FnValue;
      if (!(fn instanceof FnValue)) throw new Error('map expects a function');
      const results: Value[] = [];
      for (let i = 0; i < list.length(); i++) {
        results.push(this.callFn!(fn, [list.get(i)]));
      }
      return mkList(results, null);
    });

    this.registerFn('filter', 2, (args) => {
      const list = args[0] as ListValue;
      if (!(list instanceof ListValue)) throw new Error('filter expects a List');
      const fn = args[1] as FnValue;
      if (!(fn instanceof FnValue)) throw new Error('filter expects a function');
      const results: Value[] = [];
      for (let i = 0; i < list.length(); i++) {
        const elem = list.get(i);
        if (this.callFn!(fn, [elem]).toRawBoolean()) {
          results.push(elem);
        }
      }
      return mkList(results, null);
    });

    this.registerFn('fold', 3, (args) => {
      const list = args[0] as ListValue;
      if (!(list instanceof ListValue)) throw new Error('fold expects a List');
      let acc = args[1];
      const fn = args[2] as FnValue;
      if (!(fn instanceof FnValue)) throw new Error('fold expects a function');
      for (let i = 0; i < list.length(); i++) {
        acc = this.callFn!(fn, [acc, list.get(i)]);
      }
      return acc;
    });

    this.registerFn('find', 2, (args) => {
      const list = args[0] as ListValue;
      if (!(list instanceof ListValue)) throw new Error('find expects a List');
      const fn = args[1] as FnValue;
      if (!(fn instanceof FnValue)) throw new Error('find expects a function');
      for (let i = 0; i < list.length(); i++) {
        const elem = list.get(i);
        if (this.callFn!(fn, [elem]).toRawBoolean()) {
          return mkOk(elem);
        }
      }
      return mkErr('Not found');
    });

    this.registerFn('for_each', 2, (args) => {
      const list = args[0] as ListValue;
      if (!(list instanceof ListValue)) throw new Error('for_each expects a List');
      const fn = args[1] as FnValue;
      if (!(fn instanceof FnValue)) throw new Error('for_each expects a function');
      for (let i = 0; i < list.length(); i++) {
        this.callFn!(fn, [list.get(i)]);
      }
      return mkUnit();
    });

    this.registerFn('sort_by', 2, (args) => {
      const list = args[0] as ListValue;
      if (!(list instanceof ListValue)) throw new Error('sort_by expects a List');
      const fn = args[1] as FnValue;
      if (!(fn instanceof FnValue)) throw new Error('sort_by expects a function');
      const elements: Value[] = [];
      for (let i = 0; i < list.length(); i++) {
        elements.push(list.get(i));
      }
      elements.sort((a, b) => {
        const result = this.callFn!(fn, [a, b]);
        return result.toRawNumber();
      });
      return mkList(elements, null);
    });

    // ═══════════════════════════════════════════════════════════
    // Async / Task builtins (spawn, join)
    // ═══════════════════════════════════════════════════════════

    this.registerFn('spawn', 1, (args) => {
      const fnValue = args[0] as FnValue;
      if (!(fnValue instanceof FnValue)) throw new Error('spawn expects a function');
      const thunk = () => this.callFn!(fnValue, []);
      return this.scheduler!.spawn(thunk, null);
    });

    this.registerFn('join', 1, (args) => {
      const taskValue = args[0] as TaskValue;
      if (!(taskValue instanceof TaskValue)) throw new Error('join expects a Task');
      return this.scheduler!.join(taskValue);
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
