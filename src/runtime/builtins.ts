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
  MapValue, TaskValue, RecordValue,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  list as mkList, map as mkMap,
  mkOk, mkErr,
} from './values.js';
import { Scheduler } from './scheduler.js';
import fs from 'fs';

class Builtins {
  fnMap: Map<string, { arity: number; fn: (args: any[]) => Value }>;
  scheduler: Scheduler | null;

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

    this.registerFn('substring_list', 3, (args) => {
      const list = args[0] as ListValue;
      const start = args[1].toRawNumber();
      const length = args[2].toRawNumber();
      return list.slice(start, length);
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
