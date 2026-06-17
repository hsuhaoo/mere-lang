import {
  Value,
  NumberValue, StringValue, BooleanValue, ListValue,
  MapValue, TaskValue, RecordValue,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  list as mkList, map as mkMap,
  mkOk, mkErr, FnValue,
} from './values.js';
import { Scheduler } from './scheduler.js';
import type { Interpreter } from './interpreter.js';

type CallbackEntry = {
  type: string;
  handler: FnValue;
};

class BrowserBuiltins {
  fnMap: Map<string, { arity: number; fn: (args: any[]) => Value }>;
  scheduler: Scheduler | null;
  ctx: CanvasRenderingContext2D | null;
  canvasWidth: number;
  canvasHeight: number;

  callbacks: CallbackEntry[];
  interpreter: Interpreter | null;
  private _listenersSetup: boolean;
  private _isDragging: boolean;

  constructor(
    scheduler?: Scheduler,
    canvas?: CanvasRenderingContext2D | null,
    width?: number,
    height?: number
  ) {
    this.fnMap = new Map();
    this.scheduler = scheduler || null;
    this.ctx = canvas || null;
    this.canvasWidth = width || 0;
    this.canvasHeight = height || 0;
    this.callbacks = [];
    this.interpreter = null;
    this._listenersSetup = false;
    this._isDragging = false;
    this.registerBuiltins();
  }

  setInterpreter(i: Interpreter) {
    this.interpreter = i;
  }

  registerBuiltins() {
    this.registerFn('concat', 2, (args) => {
      return args[0].concat(args[1]);
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
      console.log(args[0].toString());
      return mkUnit();
    });

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

    if (this.scheduler) {
      this.registerFn('fetch', 4, (args) => {
        const url = args[0].toRawString();
        const method = args[1].toRawString();
        const headersValue = args[2];
        const body = args[3].toRawString();

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

    // ── IndexedDB storage (async — returns Task) ──
    if (this.scheduler) {
      this.registerFn('db_store', 2, (args) => {
        const key = args[0].toRawString();
        const value = args[1].toRawString();
        const promise = new Promise<Value>((resolve) => {
          const req = indexedDB.open('simplex_store', 1);
          req.onupgradeneeded = () => {
            req.result.createObjectStore('data');
          };
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('data', 'readwrite');
            tx.objectStore('data').put(value, key);
            tx.oncomplete = () => { db.close(); resolve(mkOk(mkUnit())); };
            tx.onerror = () => { db.close(); resolve(mkErr(`db_store failed: ${tx.error?.message || 'unknown'}`)); };
          };
          req.onerror = () => resolve(mkErr(`db_store open failed: ${req.error?.message || 'unknown'}`));
        });
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('db_load', 1, (args) => {
        const key = args[0].toRawString();
        const promise = new Promise<Value>((resolve) => {
          const req = indexedDB.open('simplex_store', 1);
          req.onupgradeneeded = () => {
            req.result.createObjectStore('data');
          };
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('data', 'readonly');
            const getReq = tx.objectStore('data').get(key);
            getReq.onsuccess = () => {
              db.close();
              if (getReq.result !== undefined) {
                resolve(mkOk(mkString(String(getReq.result))));
              } else {
                resolve(mkErr(`Key '${key}' not found`));
              }
            };
            getReq.onerror = () => { db.close(); resolve(mkErr(`db_load failed: ${getReq.error?.message || 'unknown'}`)); };
          };
          req.onerror = () => resolve(mkErr(`db_load open failed: ${req.error?.message || 'unknown'}`));
        });
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('db_delete', 1, (args) => {
        const key = args[0].toRawString();
        const promise = new Promise<Value>((resolve) => {
          const req = indexedDB.open('simplex_store', 1);
          req.onupgradeneeded = () => {
            req.result.createObjectStore('data');
          };
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('data', 'readwrite');
            tx.objectStore('data').delete(key);
            tx.oncomplete = () => { db.close(); resolve(mkOk(mkUnit())); };
            tx.onerror = () => { db.close(); resolve(mkErr(`db_delete failed: ${tx.error?.message || 'unknown'}`)); };
          };
          req.onerror = () => resolve(mkErr(`db_delete open failed: ${req.error?.message || 'unknown'}`));
        });
        return this.scheduler!.spawnAsync(promise, null);
      });
    }

    this.registerFn('canvas_on_click', 1, (args) => {
      this._registerHandler('click', args[0] as FnValue);
      this._ensureClickListeners();
      return mkUnit();
    });

    this.registerFn('canvas_on_drag', 1, (args) => {
      this._registerHandler('drag', args[0] as FnValue);
      this._ensureClickListeners();
      return mkUnit();
    });

    this.registerCanvasBuiltins();
  }

  private _ensureClickListeners() {
    if (this._listenersSetup) return;
    this._listenersSetup = true;
    if (!this.ctx) return;
    const canvas = this.ctx.canvas;
    if (!canvas) return;

    canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this._fireCallbacks('click', e.clientX - rect.left, e.clientY - rect.top);
    });

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this._isDragging = true;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      this._fireCallbacks('drag', e.clientX - rect.left, e.clientY - rect.top);
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this._isDragging) return;
      const rect = canvas.getBoundingClientRect();
      this._fireCallbacks('drag', e.clientX - rect.left, e.clientY - rect.top);
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      const rect = canvas.getBoundingClientRect();
      this._fireCallbacks('drag', e.clientX - rect.left, e.clientY - rect.top);
    });
  }

  private _fireCallbacks(type: string, x: number, y: number) {
    if (!this.interpreter) return;
    for (const cb of this.callbacks) {
      if (cb.type === type) {
        try {
          this.interpreter.executeLambdaFromValue(cb.handler, type, [mkNumber(x), mkNumber(y)]);
        } catch (e) {
          console.error('Simplex event handler error:', e);
        }
      }
    }
  }

  private registerCanvasBuiltins() {
    this.registerFn('canvas_clear', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      return mkUnit();
    });

    this.registerFn('canvas_get_width', 0, () => {
      return mkNumber(this.canvasWidth);
    });

    this.registerFn('canvas_get_height', 0, () => {
      return mkNumber(this.canvasHeight);
    });

    this.registerFn('canvas_fill_rect', 4, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.fillRect(
        args[0].toRawNumber(),
        args[1].toRawNumber(),
        args[2].toRawNumber(),
        args[3].toRawNumber()
      );
      return mkUnit();
    });

    this.registerFn('canvas_stroke_rect', 4, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.strokeRect(
        args[0].toRawNumber(),
        args[1].toRawNumber(),
        args[2].toRawNumber(),
        args[3].toRawNumber()
      );
      return mkUnit();
    });

    this.registerFn('canvas_clear_rect', 4, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.clearRect(
        args[0].toRawNumber(),
        args[1].toRawNumber(),
        args[2].toRawNumber(),
        args[3].toRawNumber()
      );
      return mkUnit();
    });

    this.registerFn('canvas_fill_text', 3, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.fillText(
        args[0].toRawString(),
        args[1].toRawNumber(),
        args[2].toRawNumber()
      );
      return mkUnit();
    });

    this.registerFn('canvas_stroke_text', 3, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.strokeText(
        args[0].toRawString(),
        args[1].toRawNumber(),
        args[2].toRawNumber()
      );
      return mkUnit();
    });

    this.registerFn('canvas_measure_text', 1, (args) => {
      if (!this.ctx) return mkNumber(0);
      return mkNumber(this.ctx.measureText(args[0].toRawString()).width);
    });

    this.registerFn('canvas_set_fill_color', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.fillStyle = args[0].toRawString();
      return mkUnit();
    });

    this.registerFn('canvas_set_stroke_color', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.strokeStyle = args[0].toRawString();
      return mkUnit();
    });

    this.registerFn('canvas_set_font', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.font = args[0].toRawString();
      return mkUnit();
    });

    this.registerFn('canvas_set_line_width', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.lineWidth = args[0].toRawNumber();
      return mkUnit();
    });

    this.registerFn('canvas_begin_path', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.beginPath();
      return mkUnit();
    });

    this.registerFn('canvas_close_path', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.closePath();
      return mkUnit();
    });

    this.registerFn('canvas_move_to', 2, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.moveTo(args[0].toRawNumber(), args[1].toRawNumber());
      return mkUnit();
    });

    this.registerFn('canvas_line_to', 2, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.lineTo(args[0].toRawNumber(), args[1].toRawNumber());
      return mkUnit();
    });

    this.registerFn('canvas_arc', 5, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.arc(
        args[0].toRawNumber(),
        args[1].toRawNumber(),
        args[2].toRawNumber(),
        args[3].toRawNumber(),
        args[4].toRawNumber()
      );
      return mkUnit();
    });

    this.registerFn('canvas_stroke', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.stroke();
      return mkUnit();
    });

    this.registerFn('canvas_fill', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.fill();
      return mkUnit();
    });

    this.registerFn('canvas_save', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.save();
      return mkUnit();
    });

    this.registerFn('canvas_restore', 0, () => {
      if (!this.ctx) return mkUnit();
      this.ctx.restore();
      return mkUnit();
    });

    this.registerFn('canvas_rotate', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.rotate(args[0].toRawNumber());
      return mkUnit();
    });

    this.registerFn('canvas_translate', 2, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.translate(args[0].toRawNumber(), args[1].toRawNumber());
      return mkUnit();
    });

    this.registerFn('canvas_scale', 2, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.scale(args[0].toRawNumber(), args[1].toRawNumber());
      return mkUnit();
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

  /**
   * Register a callback for a future event system.
   * type: event name (e.g. "click", "keydown")
   * handler: FnValue to execute when event fires
   *
   * When the event system is implemented, callers will:
   *   1. Call _registerHandler to store the callback
   *   2. Listen for DOM/browser events
   *   3. On event, construct a fresh Interpreter with the handler's env
   *      and call executeLambdaFromValue(handler, type, args)
   */
  _registerHandler(type: string, handler: FnValue) {
    this.callbacks.push({ type, handler });
  }

  get callbacksList(): readonly CallbackEntry[] {
    return this.callbacks;
  }
}

export { BrowserBuiltins };
