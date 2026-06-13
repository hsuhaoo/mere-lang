import { TypeAnnotation } from '../ast/nodes.js';
import type { Stmt } from '../ast/nodes.js';
import { Env } from './env.js';

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

class Value {
  kind: string;

  constructor(kind: string) {
    this.kind = kind;
  }

  typeName(): string {
    return this.kind;
  }

  toString(): string {
    return `Value<${this.kind}>`;
  }
}

class IntValue extends Value {
  value: number;

  constructor(value: number) {
    super(ValueKind.INT);
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError(`Int value must be a finite number, got: ${value}`);
    }
    this.value = Math.trunc(value);
  }

  typeName(): string {
    return 'Int';
  }

  toString(): string {
    return String(this.value);
  }

  getNumber(): number {
    return this.value;
  }
}

class StringValue extends Value {
  value: string;

  constructor(value: string) {
    super(ValueKind.STRING);
    if (typeof value !== 'string') {
      throw new TypeError(`StringValue must be constructed with a string, got: ${value}`);
    }
    this.value = value;
  }

  typeName(): string {
    return 'String';
  }

  length(): number {
    return this.value.length;
  }

  toString(): string {
    return `"${this.value}"`;
  }

  get(): string {
    return this.value;
  }
}

class BoolValue extends Value {
  value: boolean;

  constructor(value: boolean) {
    super(ValueKind.BOOL);
    if (typeof value !== 'boolean') {
      throw new TypeError(`BoolValue must be constructed with a boolean, got: ${value}`);
    }
    this.value = value;
  }

  typeName(): string {
    return 'Bool';
  }

  toString(): string {
    return String(this.value);
  }

  get(): boolean {
    return this.value;
  }
}

class UnitValue extends Value {
  constructor() {
    super(ValueKind.UNIT);
  }

  typeName(): string {
    return 'Unit';
  }

  toString(): string {
    return '()';
  }
}

const UNIT_VALUE = new UnitValue();

class ListValue extends Value {
  _elements: Value[];
  _elementType: TypeAnnotation | null;

  constructor(elements: Value[] = [], elementType: TypeAnnotation | null = null) {
    super(ValueKind.LIST);
    this._elements = elements;
    this._elementType = elementType;
  }

  typeName(): string {
    const elemName = this._elementType ? this._elementType.name : '?';
    return `List<${elemName}>`;
  }

  length(): number {
    return this._elements.length;
  }

  get(index: number): Value | undefined {
    if (index < 0 || index >= this._elements.length) {
      return undefined;
    }
    return this._elements[index];
  }

  set(index: number, value: Value): void {
    if (index < 0 || index >= this._elements.length) {
      throw new RangeError(`Index ${index} out of range`);
    }
    this._elements[index] = value;
  }

  push(value: Value): void {
    this._elements.push(value);
  }

  _getElements(): Value[] {
    return this._elements;
  }

  toString(): string {
    return `[${this._elements.map(e => e.toString()).join(', ')}]`;
  }
}

class MapValue extends Value {
  _entries: Record<string, Value>;
  _keyType: TypeAnnotation | null;
  _valueType: TypeAnnotation | null;

  constructor(entries: Record<string, Value> = {}, keyType: TypeAnnotation | null = null, valueType: TypeAnnotation | null = null) {
    super(ValueKind.MAP);
    this._entries = entries;
    this._keyType = keyType;
    this._valueType = valueType;
  }

  typeName(): string {
    const k = this._keyType ? this._keyType.name : '?';
    const v = this._valueType ? this._valueType.name : '?';
    return `Map<${k}, ${v}>`;
  }

  get(key: string): Value | undefined {
    return this._entries[key] !== undefined ? this._entries[key] : undefined;
  }

  has(key: string): boolean {
    return this._entries.hasOwnProperty(key);
  }

  keys(): string[] {
    return Object.keys(this._entries);
  }

  size(): number {
    return Object.keys(this._entries).length;
  }

  _getEntries(): Record<string, Value> {
    return this._entries;
  }

  toString(): string {
    const pairs = Object.entries(this._entries)
      .map(([k, v]) => `${k}: ${v.toString()}`);
    return `{${pairs.join(', ')}}`;
  }
}

class RecordValue extends Value {
  _fields: Record<string, Value>;
  _typeName: string;

  constructor(fields: Record<string, Value>, typeName: string) {
    super(ValueKind.RECORD);
    this._fields = fields;
    this._typeName = typeName;
  }

  typeName(): string {
    return this._typeName;
  }

  get(fieldName: string): Value | undefined {
    return this._fields[fieldName] !== undefined
      ? this._fields[fieldName]
      : undefined;
  }

  has(fieldName: string): boolean {
    return this._fields.hasOwnProperty(fieldName);
  }

  _getFields(): Record<string, Value> {
    return this._fields;
  }

  fieldNames(): string[] {
    return Object.keys(this._fields);
  }

  toString(): string {
    const fields = Object.entries(this._fields)
      .map(([k, v]) => `${k}: ${v.toString()}`);
    return `${this._typeName}{${fields.join(', ')}}`;
  }
}

class ResultValue extends Value {
  _ok: boolean;
  _value: Value;
  _resultType: TypeAnnotation | null;

  constructor(ok: boolean, value: Value, resultType: TypeAnnotation | null = null) {
    super(ValueKind.RESULT);
    this._ok = ok;
    this._value = value;
    this._resultType = resultType;
  }

  typeName(): string {
    const inner = this._resultType ? this._resultType.name : '?';
    return `Result<${inner}>`;
  }

  isOk(): boolean {
    return this._ok;
  }

  isErr(): boolean {
    return !this._ok;
  }

  getOk(): Value {
    if (!this._ok) {
      throw new TypeError('Called getOk() on an Err value');
    }
    return this._value;
  }

  getErr(): Value {
    if (this._ok) {
      throw new TypeError('Called getErr() on an Ok value');
    }
    return this._value;
  }

  toString(): string {
    return this._ok
      ? `ok(${this._value.toString()})`
      : `err(${this._value.toString()})`;
  }
}

class FnValue extends Value {
  params: Array<{ name: string; type: TypeAnnotation }>;
  body: Stmt[];
  closure: Env;

  constructor(params: Array<{ name: string; type: TypeAnnotation }>, body: Stmt[], closure: Env) {
    super(ValueKind.FN);
    this.params = params;
    this.body = body;
    this.closure = closure;
  }

  typeName(): string {
    return 'Fn';
  }

  toString(): string {
    return `fn(${this.params.map(p => p.name).join(', ')}) -> ...`;
  }
}

export interface TaskHandle {
  id: number;
  state: 'pending' | 'ready' | 'done';
  fn: () => Value;
  result: Value | null;
  error: string | null;
  resultType: TypeAnnotation | null;
  isDone(): boolean;
  isReady(): boolean;
}

class TaskValue extends Value {
  handle: TaskHandle;
  _taskType: TypeAnnotation | null;

  constructor(handle: TaskHandle, taskType: TypeAnnotation | null = null) {
    super(ValueKind.TASK);
    this.handle = handle;
    this._taskType = taskType;
  }

  typeName(): string {
    const inner = this._taskType ? this._taskType.name : '?';
    return `Task<${inner}>`;
  }

  toString(): string {
    return 'Task(pending)';
  }
}

function int(v: number): IntValue {
  return new IntValue(v);
}

function string(v: string): StringValue {
  return new StringValue(v);
}

function bool(v: boolean): BoolValue {
  return new BoolValue(v);
}

function unit(): UnitValue {
  return UNIT_VALUE;
}

function list(elements: Value[] = [], elementType: TypeAnnotation | null = null): ListValue {
  return new ListValue(elements, elementType);
}

function map(entries: Record<string, Value> = {}, keyType: TypeAnnotation | null = null, valueType: TypeAnnotation | null = null): MapValue {
  return new MapValue(entries, keyType, valueType);
}

function record(fields: Record<string, Value>, typeName: string): RecordValue {
  return new RecordValue(fields, typeName);
}

function result(ok: boolean, value: Value, resultType: TypeAnnotation | null = null): ResultValue {
  return new ResultValue(ok, value, resultType);
}

function fn(params: Array<{ name: string; type: TypeAnnotation }>, body: Stmt[], closure: Env): FnValue {
  return new FnValue(params, body, closure);
}

function task(handle: TaskHandle, taskType: TypeAnnotation | null = null): TaskValue {
  return new TaskValue(handle, taskType);
}

export {
  ValueKind,
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
  UNIT_VALUE,
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
