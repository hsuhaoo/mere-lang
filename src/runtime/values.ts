/**
 * Runtime value classes for the Simplex language.
 * Each type is an independent class — no direct mapping to JS primitives.
 * 
 * Design principles:
 * - Concrete types only
 * - No implicit conversions
 * - Explicit type boundaries
 */

// ═══════════════════════════════════════════════════════════════════
// ValueKind enum
// ═══════════════════════════════════════════════════════════════════

const ValueKind = Object.freeze({
  INT: 'Int',
  STRING: 'String',
  BOOL: 'Bool',
  UNIT: 'Unit',
  LIST: 'List',
  MAP: 'Map',
  RECORD: 'Record',
  RESULT: 'Result',
  TASK: 'Task',
  FN: 'Fn',
});

// ═══════════════════════════════════════════════════════════════════
// Base: Value — all types inherit from this
// ═══════════════════════════════════════════════════════════════════

class Value {
  kind: any;

  constructor(kind) {
    this.kind = kind;
  }

  /** Type name for display and type-checking */
  typeName() {
    return this.kind;
  }

  /** Human-readable string */
  toString() {
    return `Value<${this.kind}>`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Int — a proper class wrapping a number, never JS number directly
// ═══════════════════════════════════════════════════════════════════

class IntValue extends Value {
  value: any;

  constructor(value) {
    super(ValueKind.INT);
    // Coerce to a finite integer on construction — never store NaN/Infinity
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError(`Int value must be a finite number, got: ${value}`);
    }
    this.value = Math.trunc(value);
  }

  typeName() {
    return 'Int';
  }

  toString() {
    return String(this.value);
  }

  /** Return the underlying JS number. Callers MUST know they are getting an Int. */
  getNumber() {
    return this.value;
  }
}

// ═══════════════════════════════════════════════════════════════════
// StringValue — a proper class wrapping a string
// ═══════════════════════════════════════════════════════════════════

class StringValue extends Value {
  value: any;

  constructor(value) {
    super(ValueKind.STRING);
    if (typeof value !== 'string') {
      throw new TypeError(`StringValue must be constructed with a string, got: ${value}`);
    }
    this.value = value;
  }

  typeName() {
    return 'String';
  }

  /** Return string length (for len() builtin). */
  length() {
    return this.value.length;
  }

  toString() {
    return `"${this.value}"`;
  }

  /** Underlying JS string. */
  get() {
    return this.value;
  }
}

// ═══════════════════════════════════════════════════════════════════
// BoolValue — distinct from JS boolean
// ═══════════════════════════════════════════════════════════════════

class BoolValue extends Value {
  value: any;

  constructor(value) {
    super(ValueKind.BOOL);
    if (typeof value !== 'boolean') {
      throw new TypeError(`BoolValue must be constructed with a boolean, got: ${value}`);
    }
    this.value = value;
  }

  typeName() {
    return 'Bool';
  }

  toString() {
    return String(this.value);
  }

  get() {
    return this.value;
  }
}

// ═══════════════════════════════════════════════════════════════════
// UnitValue — single instance (singleton)
// ═══════════════════════════════════════════════════════════════════

class UnitValue extends Value {
  constructor() {
    super(ValueKind.UNIT);
  }

  typeName() {
    return 'Unit';
  }

  toString() {
    return '()';
  }
}

// Singleton instance — no new UnitValue() ever
const UNIT_VALUE = new UnitValue();

// ═══════════════════════════════════════════════════════════════════
// ListValue — typed list, wraps JS array but never exposes it raw
// ═══════════════════════════════════════════════════════════════════

class ListValue extends Value {
  _elements: any;
  _elementType: any;

  constructor(elements = [], elementType = null) {
    super(ValueKind.LIST);
    // elements is a plain array of Value objects
    this._elements = elements;
    this._elementType = elementType;
  }

  typeName() {
    const elemName = this._elementType ? this._elementType.name : '?';
    return `List<${elemName}>`;
  }

  /** Number of elements. */
  length() {
    return this._elements.length;
  }

  /** Get element by index — returns a Value or undefined. */
  get(index) {
    if (index < 0 || index >= this._elements.length) {
      return undefined;
    }
    return this._elements[index];
  }

  /** Set element by index. */
  set(index, value) {
    if (index < 0 || index >= this._elements.length) {
      throw new RangeError(`Index ${index} out of range`);
    }
    this._elements[index] = value;
  }

  /** Push a value to the end. */
  push(value) {
    this._elements.push(value);
  }

  /** Return the underlying array for internal use only. */
  _getElements() {
    return this._elements;
  }

  toString() {
    return `[${this._elements.map(e => e.toString()).join(', ')}]`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MapValue — typed map, wraps an object but enforces Key -> Value constraints
// ═══════════════════════════════════════════════════════════════════

class MapValue extends Value {
  _entries: any;
  _keyType: any;
  _valueType: any;

  constructor(entries = {}, keyType = null, valueType = null) {
    super(ValueKind.MAP);
    this._entries = entries;
    this._keyType = keyType;
    this._valueType = valueType;
  }

  typeName() {
    const k = this._keyType ? this._keyType.name : '?';
    const v = this._valueType ? this._valueType.name : '?';
    return `Map<${k}, ${v}>`;
  }

  /** Get a value by key string. */
  get(key) {
    return this._entries[key] !== undefined ? this._entries[key] : undefined;
  }

  /** Check if a key exists. */
  has(key) {
    return this._entries.hasOwnProperty(key);
  }

  /** Get all keys. */
  keys() {
    return Object.keys(this._entries);
  }

  /** Get the number of entries. */
  size() {
    return Object.keys(this._entries).length;
  }

  /** Return entries for internal use only. */
  _getEntries() {
    return this._entries;
  }

  toString() {
    const pairs = Object.entries(this._entries)
      .map(([k, v]) => `${k}: ${v.toString()}`);
    return `{${pairs.join(', ')}}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// RecordValue — user-defined record types
// ═══════════════════════════════════════════════════════════════════

class RecordValue extends Value {
  _fields: any;
  _typeName: any;

  constructor(fields, typeName) {
    super(ValueKind.RECORD);
    this._fields = fields;       // { fieldName: Value }
    this._typeName = typeName;
  }

  typeName() {
    return this._typeName;
  }

  /** Get a field value by name. */
  get(fieldName) {
    return this._fields[fieldName] !== undefined
      ? this._fields[fieldName]
      : undefined;
  }

  /** Check if a field exists. */
  has(fieldName) {
    return this._fields.hasOwnProperty(fieldName);
  }

  /** Return fields for internal use only. */
  _getFields() {
    return this._fields;
  }

  /** List field names in definition order. */
  fieldNames() {
    return Object.keys(this._fields);
  }

  toString() {
    const fields = Object.entries(this._fields)
      .map(([k, v]) => `${k}: ${v.toString()}`);
    return `${this._typeName}{${fields.join(', ')}}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ResultValue — either Ok or Err, never both
// ═══════════════════════════════════════════════════════════════════

class ResultValue extends Value {
  _ok: any;
  _value: any;
  _resultType: any;

  constructor(ok, value, resultType = null) {
    super(ValueKind.RESULT);
    this._ok = ok;
    this._value = value;        // always a Value (IntValue, StringValue, etc.)
    this._resultType = resultType;
  }

  typeName() {
    const inner = this._resultType ? this._resultType.name : '?';
    return `Result<${inner}>`;
  }

  /** Is this an Ok value? */
  isOk() {
    return this._ok;
  }

  /** Is this an Err value? */
  isErr() {
    return !this._ok;
  }

  /** Get the wrapped Value — valid only when Ok. */
  getOk() {
    if (!this._ok) {
      throw new TypeError('Called getOk() on an Err value');
    }
    return this._value;
  }

  /** Get the error string — valid only when Err. */
  getErr() {
    if (this._ok) {
      throw new TypeError('Called getErr() on an Ok value');
    }
    return this._value;
  }

  toString() {
    return this._ok
      ? `ok(${this._value.toString()})`
      : `err(${this._value.toString()})`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FnValue — first-class function, captures closure
// ═══════════════════════════════════════════════════════════════════

class FnValue extends Value {
  params: any;
  body: any;
  closure: any;

  constructor(params, body, closure) {
    super(ValueKind.FN);
    this.params = params;       // Array of { name, type }
    this.body = body;           // Array of AST statements
    this.closure = closure;     // Env captured at definition
  }

  typeName() {
    return 'Fn';
  }

  toString() {
    return `fn(${this.params.map(p => p.name).join(', ')}) -> ...`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TaskValue — represents a pending computation
// ═══════════════════════════════════════════════════════════════════

class TaskValue extends Value {
  handle: any;
  _taskType: any;

  constructor(handle, taskType = null) {
    super(ValueKind.TASK);
    this.handle = handle;       // { resolve, reject } or internal handle
    this._taskType = taskType;
  }

  typeName() {
    const inner = this._taskType ? this._taskType.name : '?';
    return `Task<${inner}>`;
  }

  toString() {
    return 'Task(pending)';
  }
}

// ═══════════════════════════════════════════════════════════════════
// Convenience constructors — the factory functions
// ═══════════════════════════════════════════════════════════════════

function int(v) {
  return new IntValue(v);
}

function string(v) {
  return new StringValue(v);
}

function bool(v) {
  return new BoolValue(v);
}

function unit() {
  return UNIT_VALUE;
}

function list(elements, elementType) {
  return new ListValue(elements, elementType);
}

function map(entries, keyType, valueType) {
  return new MapValue(entries, keyType, valueType);
}

function record(fields, typeName) {
  return new RecordValue(fields, typeName);
}

function result(ok, value, resultType) {
  return new ResultValue(ok, value, resultType);
}

function fn(params, body, closure) {
  return new FnValue(params, body, closure);
}

function task(handle, taskType) {
  return new TaskValue(handle, taskType);
}

export {
  // Kinds
  ValueKind,

  // Classes
  Value,
  IntValue,
  StringValue,
  BoolValue,
  UnitValue,
  ListValue,
  MapValue,
  RecordValue,
  ResultValue,
  FnValue,
  TaskValue,

  // Singleton
  UNIT_VALUE,

  // Factory functions
  int,
  string,
  bool,
  unit,
  list,
  map,
  record,
  result,
  fn,
  task,
};
