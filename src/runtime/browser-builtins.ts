import {
  Value,
  NumberValue, StringValue, BooleanValue, ListValue,
  MapValue, TaskValue, RecordValue, FnValue,
  number as mkNumber, string as mkString, boolean as mkBoolean, unit as mkUnit,
  list as mkList, map as mkMap,
  mkOk, mkErr,
} from './values.js';
import { Scheduler } from './scheduler.js';

class BrowserBuiltins {
  fnMap: Map<string, { arity: number; fn: (args: any[]) => Value }>;
  scheduler: Scheduler | null;
  callFn: ((fn: FnValue, args: Value[]) => Value) | null = null;
  ctx: CanvasRenderingContext2D | null;
  canvasWidth: number;
  canvasHeight: number;
  private _logicalWidth: number;
  private _logicalHeight: number;

  private _clickResolve: ((value: Value) => void) | null;
  private _dragState: { fromX: number; fromY: number; resolve: (value: Value) => void } | null;
  private _clickHandler: FnValue | null;
  private _dragHandler: FnValue | null;
  private _dblClickHandler: FnValue | null;
  private _clickListenerSet: boolean;
  private _dragListenerSet: boolean;
  private _dblClickListenerSet: boolean;
  private _images: Map<number, HTMLImageElement>;
  private _imageIdCounter: number;
  private _imageUrlToId: Map<string, number>;
  private _audios: Map<number, HTMLAudioElement>;
  private _audioIdCounter: number;
  private _audioUrlToId: Map<string, number>;
  private _gradients: Map<number, CanvasGradient>;
  private _gradientIdCounter: number;

  constructor(
    scheduler?: Scheduler,
    canvas?: CanvasRenderingContext2D | null,
    width?: number,
    height?: number
  ) {
    this.fnMap = new Map();
    this.scheduler = scheduler || null;
    this.ctx = canvas || null;
    this.canvasWidth = width ?? 800;
    this.canvasHeight = height ?? 600;
    this._logicalWidth = this.canvasWidth;
    this._logicalHeight = this.canvasHeight;
    this._clickResolve = null;
    this._dragState = null;
    this._clickHandler = null;
    this._dragHandler = null;
    this._dblClickHandler = null;
    this._clickListenerSet = false;
    this._dragListenerSet = false;
    this._dblClickListenerSet = false;
    this._images = new Map();
    this._imageIdCounter = 0;
    this._imageUrlToId = new Map();
    this._audios = new Map();
    this._audioIdCounter = 0;
    this._audioUrlToId = new Map();
    this._gradients = new Map();
    this._gradientIdCounter = 0;
    this.registerBuiltins();
  }

  registerBuiltins() {
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

    this.registerFn('sin', 1, (args) => {
      return mkNumber(Math.sin(args[0].toRawNumber()));
    });

    this.registerFn('floor', 1, (args) => {
      return mkNumber(Math.floor(args[0].toRawNumber()));
    });

    this.registerFn('round', 1, (args) => {
      return mkNumber(Math.round(args[0].toRawNumber()));
    });

    this.registerFn('pi', 0, () => {
      return mkNumber(Math.PI);
    });

    this.registerFn('now', 0, () => {
      return mkNumber(Date.now());
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

    if (this.scheduler) {
      this.registerFn('next_frame', 0, (args) => {
        const promise: Promise<Value> = new Promise(resolve => requestAnimationFrame(ts => resolve(mkNumber(ts))));
        return this.scheduler!.spawnAsync(promise, null);
      });

      this.registerFn('await_font_loaded', 1, (args) => {
        const fontSpec = args[0].toRawString();
        if (typeof document === 'undefined' || !document.fonts) {
          return this.scheduler!.spawnAsync(Promise.resolve(mkUnit()), null);
        }
        const promise = document.fonts.load(fontSpec)
          .then(() => mkUnit())
          .catch(() => mkUnit());
        return this.scheduler!.spawnAsync(promise, null);
      });

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

    this.registerFn('canvas_wait_click', 0, (args) => {
      const promise = new Promise<Value>((resolve) => {
        if (!this.ctx) {
          resolve(mkErr('No canvas context'));
          return;
        }
        const canvas = this.ctx.canvas;
        const handler = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = this._logicalWidth / rect.width;
          const scaleY = this._logicalHeight / rect.height;
          canvas.removeEventListener('click', handler);
          resolve(mkMap({
            x: mkNumber((e.clientX - rect.left) * scaleX),
            y: mkNumber((e.clientY - rect.top) * scaleY),
          }));
        };
        canvas.addEventListener('click', handler);
      });
      return this.scheduler!.spawnAsync(promise, null);
    });

    this.registerFn('canvas_wait_drag', 0, (args) => {
      const promise = new Promise<Value>((resolve) => {
        if (!this.ctx) {
          resolve(mkErr('No canvas context'));
          return;
        }
        const canvas = this.ctx.canvas;
        let fromX: number, fromY: number;

        const onPointerDown = (e: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = this._logicalWidth / rect.width;
          const scaleY = this._logicalHeight / rect.height;
          fromX = (e.clientX - rect.left) * scaleX;
          fromY = (e.clientY - rect.top) * scaleY;
          canvas.addEventListener('pointermove', onPointerMove);
          canvas.addEventListener('pointerup', onPointerUp);
          canvas.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
        };

        const onPointerUp = (e: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = this._logicalWidth / rect.width;
          const scaleY = this._logicalHeight / rect.height;
          canvas.removeEventListener('pointerdown', onPointerDown);
          canvas.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerup', onPointerUp);
          resolve(mkMap({
            from_x: mkNumber(fromX),
            from_y: mkNumber(fromY),
            to_x: mkNumber((e.clientX - rect.left) * scaleX),
            to_y: mkNumber((e.clientY - rect.top) * scaleY),
          }));
        };

        canvas.addEventListener('pointerdown', onPointerDown);
      });
      return this.scheduler!.spawnAsync(promise, null);
    });

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

    // ── Image loading (synchronous ID allocation, async load) ──
    this.registerFn('canvas_load_image', 1, (args) => {
      const url = args[0].toRawString();
      const cachedId = this._imageUrlToId.get(url);
      if (cachedId !== undefined) return mkNumber(cachedId);

      const id = this._imageIdCounter++;
      if (typeof Image !== 'undefined') {
        const img = new Image();
        img.src = url;
        this._images.set(id, img);
      }
      this._imageUrlToId.set(url, id);
      return mkNumber(id);
    });

    this.registerFn('canvas_draw_image', 5, (args) => {
      if (!this.ctx) return mkUnit();
      const id = args[0].toRawNumber();
      const x = args[1].toRawNumber();
      const y = args[2].toRawNumber();
      const w = args[3].toRawNumber();
      const h = args[4].toRawNumber();
      const img = this._images.get(id);
      if (img && img.complete && img.naturalWidth > 0) {
        this.ctx.drawImage(img, x, y, w, h);
      }
      return mkUnit();
    });

    this.registerFn('canvas_image_loaded', 1, (args) => {
      const id = args[0].toRawNumber();
      const img = this._images.get(id);
      return mkBoolean(!!(img && img.complete && img.naturalWidth > 0));
    });

    // ── Audio (synchronous ID allocation, async load) ──
    this.registerFn('audio_load', 1, (args) => {
      const url = args[0].toRawString();
      const cachedId = this._audioUrlToId.get(url);
      if (cachedId !== undefined) return mkNumber(cachedId);

      const audio = new Audio(url);
      audio.preload = 'auto';
      const id = this._audioIdCounter++;
      this._audios.set(id, audio);
      this._audioUrlToId.set(url, id);
      return mkNumber(id);
    });

    this.registerFn('audio_play', 1, (args) => {
      const id = args[0].toRawNumber();
      const audio = this._audios.get(id);
      if (audio) audio.play().catch(() => {});
      return mkUnit();
    });

    this.registerFn('audio_stop', 1, (args) => {
      const id = args[0].toRawNumber();
      const audio = this._audios.get(id);
      if (audio) { audio.pause(); audio.currentTime = 0; }
      return mkUnit();
    });

    this.registerFn('audio_pause', 1, (args) => {
      const id = args[0].toRawNumber();
      const audio = this._audios.get(id);
      if (audio) audio.pause();
      return mkUnit();
    });

    this.registerFn('audio_resume', 1, (args) => {
      const id = args[0].toRawNumber();
      const audio = this._audios.get(id);
      if (audio) audio.play().catch(() => {});
      return mkUnit();
    });

    this.registerFn('audio_set_volume', 2, (args) => {
      const id = args[0].toRawNumber();
      const vol = args[1].toRawNumber();
      const audio = this._audios.get(id);
      if (audio) audio.volume = Math.max(0, Math.min(1, vol));
      return mkUnit();
    });

    this.registerFn('audio_set_loop', 2, (args) => {
      const id = args[0].toRawNumber();
      const loop = args[1] instanceof BooleanValue ? args[1]._value : args[1].toRawString() === 'true';
      const audio = this._audios.get(id);
      if (audio) audio.loop = loop;
      return mkUnit();
    });

    this.registerCallbackBuiltins();
    this.registerCanvasBuiltins();
  }

  private registerCallbackBuiltins() {
    this.registerFn('canvas_on_click', 1, (args) => {
      if (!(args[0] instanceof FnValue)) {
        throw new Error('canvas_on_click expects a function');
      }
      this._clickHandler = args[0] as FnValue;
      if (!this._clickListenerSet && this.ctx) {
        this._clickListenerSet = true;
        const canvas = this.ctx.canvas;
        canvas.addEventListener('click', (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = this._logicalWidth / rect.width;
          const scaleY = this._logicalHeight / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          if (this._clickHandler && this._clickHandler.vm && this._clickHandler.vmFuncIndex >= 0) {
            this._clickHandler.vm.callByIndex(this._clickHandler.vmFuncIndex, [mkNumber(x), mkNumber(y)]);
          }
        });
      }
      return mkUnit();
    });
    this.registerFn('canvas_on_drag', 1, (args) => {
      if (!(args[0] instanceof FnValue)) {
        throw new Error('canvas_on_drag expects a function');
      }
      this._dragHandler = args[0] as FnValue;
      if (!this._dragListenerSet && this.ctx) {
        this._dragListenerSet = true;
        const canvas = this.ctx.canvas;
        canvas.addEventListener('mousemove', (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = this._logicalWidth / rect.width;
          const scaleY = this._logicalHeight / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          if (this._dragHandler && this._dragHandler.vm && this._dragHandler.vmFuncIndex >= 0) {
            try {
              this._dragHandler.vm.callByIndex(this._dragHandler.vmFuncIndex, [mkNumber(x), mkNumber(y)]);
            } catch (err) {
              console.error('canvas_on_drag error:', err);
            }
          }
        });
      }
      return mkUnit();
    });
    this.registerFn('canvas_on_dblclick', 1, (args) => {
      if (!(args[0] instanceof FnValue)) {
        throw new Error('canvas_on_dblclick expects a function');
      }
      this._dblClickHandler = args[0] as FnValue;
      if (!this._dblClickListenerSet && this.ctx) {
        this._dblClickListenerSet = true;
        const canvas = this.ctx.canvas;
        canvas.addEventListener('dblclick', (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = this._logicalWidth / rect.width;
          const scaleY = this._logicalHeight / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          if (this._dblClickHandler && this._dblClickHandler.vm && this._dblClickHandler.vmFuncIndex >= 0) {
            this._dblClickHandler.vm.callByIndex(this._dblClickHandler.vmFuncIndex, [mkNumber(x), mkNumber(y)]);
          }
        });
      }
      return mkUnit();
    });
  }

  private registerCanvasBuiltins() {
    this.registerFn('canvas_clear', 0, () => {
      if (!this.ctx || !this.ctx.canvas) return mkUnit();
      const canvas = this.ctx.canvas;
      const sx = canvas.width / this._logicalWidth;
      const sy = canvas.height / this._logicalHeight;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.setTransform(sx, 0, 0, sy, 0, 0);
      return mkUnit();
    });

    this.registerFn('canvas_get_width', 0, () => {
      return mkNumber(this._logicalWidth);
    });

    this.registerFn('canvas_get_height', 0, () => {
      return mkNumber(this._logicalHeight);
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

    // ── Gradients ──
    this.registerFn('canvas_create_linear_gradient', 4, (args) => {
      if (!this.ctx) return mkNumber(-1);
      const grad = this.ctx.createLinearGradient(
        args[0].toRawNumber(), args[1].toRawNumber(),
        args[2].toRawNumber(), args[3].toRawNumber()
      );
      const id = this._gradientIdCounter++;
      this._gradients.set(id, grad);
      return mkNumber(id);
    });

    this.registerFn('canvas_create_radial_gradient', 6, (args) => {
      if (!this.ctx) return mkNumber(-1);
      const grad = this.ctx.createRadialGradient(
        args[0].toRawNumber(), args[1].toRawNumber(), args[2].toRawNumber(),
        args[3].toRawNumber(), args[4].toRawNumber(), args[5].toRawNumber()
      );
      const id = this._gradientIdCounter++;
      this._gradients.set(id, grad);
      return mkNumber(id);
    });

    this.registerFn('canvas_add_color_stop', 3, (args) => {
      const id = args[0].toRawNumber();
      const grad = this._gradients.get(id);
      if (!grad) return mkUnit();
      grad.addColorStop(args[1].toRawNumber(), args[2].toRawString());
      return mkUnit();
    });

    this.registerFn('canvas_set_fill_gradient', 1, (args) => {
      if (!this.ctx) return mkUnit();
      const id = args[0].toRawNumber();
      const grad = this._gradients.get(id);
      if (grad) this.ctx.fillStyle = grad;
      return mkUnit();
    });

    this.registerFn('canvas_set_stroke_gradient', 1, (args) => {
      if (!this.ctx) return mkUnit();
      const id = args[0].toRawNumber();
      const grad = this._gradients.get(id);
      if (grad) this.ctx.strokeStyle = grad;
      return mkUnit();
    });

    // ── Shadows ──
    this.registerFn('canvas_set_shadow_color', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.shadowColor = args[0].toRawString();
      return mkUnit();
    });

    this.registerFn('canvas_set_shadow_blur', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.shadowBlur = args[0].toRawNumber();
      return mkUnit();
    });

    this.registerFn('canvas_set_shadow_offset_x', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.shadowOffsetX = args[0].toRawNumber();
      return mkUnit();
    });

    this.registerFn('canvas_set_shadow_offset_y', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.shadowOffsetY = args[0].toRawNumber();
      return mkUnit();
    });

    // ── Text style ──
    this.registerFn('canvas_set_text_align', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.textAlign = args[0].toRawString() as CanvasTextAlign;
      return mkUnit();
    });

    this.registerFn('canvas_set_text_baseline', 1, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.textBaseline = args[0].toRawString() as CanvasTextBaseline;
      return mkUnit();
    });

    // ── Path extensions ──
    this.registerFn('canvas_arc_to', 5, (args) => {
      if (!this.ctx) return mkUnit();
      this.ctx.arcTo(
        args[0].toRawNumber(), args[1].toRawNumber(),
        args[2].toRawNumber(), args[3].toRawNumber(),
        args[4].toRawNumber()
      );
      return mkUnit();
    });

    // ── Cursor ──
    this.registerFn('canvas_set_cursor', 1, (args) => {
      if (!this.ctx || !this.ctx.canvas) return mkUnit();
      this.ctx.canvas.style.cursor = args[0].toRawString();
      return mkUnit();
    });

    // ── Line dash ──
    this.registerFn('canvas_set_line_dash', 1, (args) => {
      if (!this.ctx) return mkUnit();
      const list = args[0] as ListValue;
      const segments: number[] = [];
      for (let i = 0; i < list.length(); i++) {
        segments.push(list.get(i).toRawNumber());
      }
      this.ctx.setLineDash(segments);
      return mkUnit();
    });
  }

  registerFn(name: string, arity: number, fn: (args: any[]) => Value) {
    this.fnMap.set(name, { arity, fn });
  }

  getFn(name: string): { arity: number; fn: (args: any[]) => Value } | undefined {
    const result = this.fnMap.get(name);
    return result;
  }

  isBuiltin(name: string): boolean {
    return this.fnMap.has(name);
  }

  getBuiltinNames(): string[] {
    return [...this.fnMap.keys()];
  }
}

export { BrowserBuiltins };
