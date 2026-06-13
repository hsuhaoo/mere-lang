import { TypeAnnotation } from '../ast/nodes.js';
import type { Stmt } from '../ast/nodes.js';

class Value {
  type: TypeAnnotation;

  constructor(type: TypeAnnotation) {
    this.type = type;
  }

  typeName(): string {
    return this.type.name;
  }

  toString(): string {
    return `Value<${this.type.name}>`;
  }

  isNumber(): boolean { return this.type.name === 'Number'; }
  isString(): boolean { return this.type.name === 'String'; }
  isBoolean(): boolean { return this.type.name === 'Boolean'; }
  isUnit(): boolean { return this.type.name === 'Unit'; }
  isList(): boolean { return this.type.name === 'List'; }
  isMap(): boolean { return this.type.name === 'Map'; }
  isRecord(): boolean { return this.type.name === 'Record'; }
  isResult(): boolean { return this.type.name === 'Result'; }
  isFn(): boolean { return this.type.name === 'Fn'; }
  isTask(): boolean { return this.type.name === 'Task'; }

  isTruthy(): boolean { return false; }

  equals(other: Value): boolean {
    if (this.type.name !== other.type.name) return false;
    return this._equalsSameType(other);
  }

  _equalsSameType(other: Value): boolean { return false; }

  // ── Boundary: explicit escape to host types ──
  toRawNumber(): number {
    throw new TypeError(`Cannot extract number from ${this.typeName()}`);
  }
  toRawString(): string {
    throw new TypeError(`Cannot extract string from ${this.typeName()}`);
  }
  toRawBoolean(): boolean {
    throw new TypeError(`Cannot extract boolean from ${this.typeName()}`);
  }

  // ── Operation methods (overridden per type) ──
  add(other: Value): Value {
    throw new TypeError(`+ not supported for ${this.typeName()}`);
  }
  subtract(other: Value): Value {
    throw new TypeError(`- not supported for ${this.typeName()}`);
  }
  multiply(other: Value): Value {
    throw new TypeError(`* not supported for ${this.typeName()}`);
  }
  divide(other: Value): Value {
    throw new TypeError(`/ not supported for ${this.typeName()}`);
  }
  negate(): Value {
    throw new TypeError(`Negation not supported for ${this.typeName()}`);
  }
  lt(other: Value): Value {
    throw new TypeError(`< not supported for ${this.typeName()}`);
  }
  gt(other: Value): Value {
    throw new TypeError(`> not supported for ${this.typeName()}`);
  }
  lte(other: Value): Value {
    throw new TypeError(`<= not supported for ${this.typeName()}`);
  }
  gte(other: Value): Value {
    throw new TypeError(`>= not supported for ${this.typeName()}`);
  }
  and(other: Value): Value {
    throw new TypeError(`'and' not supported for ${this.typeName()}`);
  }
  or(other: Value): Value {
    throw new TypeError(`'or' not supported for ${this.typeName()}`);
  }
  not(): Value {
    throw new TypeError(`'not' not supported for ${this.typeName()}`);
  }
  concat(other: Value): Value {
    throw new TypeError(`Concat not supported for ${this.typeName()}`);
  }
}

const NUM_TYPE = new TypeAnnotation('Number');

class NumberValue extends Value {
  _value: number;

  constructor(value: number) {
    super(NUM_TYPE);
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError(`Number value must be a finite number, got: ${value}`);
    }
    this._value = value;
  }

  toString(): string {
    return String(this._value);
  }

  _equalsSameType(other: Value): boolean {
    return this._value === (other as NumberValue)._value;
  }

  toRawNumber(): number { return this._value; }

  add(other: Value): NumberValue {
    return new NumberValue(this._value + (other as NumberValue)._value);
  }
  subtract(other: Value): NumberValue {
    return new NumberValue(this._value - (other as NumberValue)._value);
  }
  multiply(other: Value): NumberValue {
    return new NumberValue(this._value * (other as NumberValue)._value);
  }
  divide(other: Value): NumberValue {
    const rhs = (other as NumberValue)._value;
    if (rhs === 0) throw new TypeError('Division by zero');
    return new NumberValue(this._value / rhs);
  }
  negate(): NumberValue {
    return new NumberValue(-this._value);
  }
  lt(other: Value): BooleanValue {
    return new BooleanValue(this._value < (other as NumberValue)._value);
  }
  gt(other: Value): BooleanValue {
    return new BooleanValue(this._value > (other as NumberValue)._value);
  }
  lte(other: Value): BooleanValue {
    return new BooleanValue(this._value <= (other as NumberValue)._value);
  }
  gte(other: Value): BooleanValue {
    return new BooleanValue(this._value >= (other as NumberValue)._value);
  }
}

const STR_TYPE = new TypeAnnotation('String');

class StringValue extends Value {
  _value: string;

  constructor(value: string) {
    super(STR_TYPE);
    if (typeof value !== 'string') {
      throw new TypeError(`StringValue must be constructed with a string, got: ${value}`);
    }
    this._value = value;
  }

  length(): number {
    return this._value.length;
  }

  toString(): string {
    return `"${this._value}"`;
  }

  _equalsSameType(other: Value): boolean {
    return this._value === (other as StringValue)._value;
  }

  toRawString(): string { return this._value; }

  concat(other: Value): StringValue {
    return new StringValue(this._value + (other as StringValue)._value);
  }
}

const BOOL_TYPE = new TypeAnnotation('Boolean');

class BooleanValue extends Value {
  _value: boolean;

  constructor(value: boolean) {
    super(BOOL_TYPE);
    if (typeof value !== 'boolean') {
      throw new TypeError(`BooleanValue must be constructed with a boolean, got: ${value}`);
    }
    this._value = value;
  }

  toString(): string {
    return String(this._value);
  }

  _equalsSameType(other: Value): boolean {
    return this._value === (other as BooleanValue)._value;
  }

  toRawBoolean(): boolean { return this._value; }

  isTruthy(): boolean { return this._value; }

  and(other: Value): BooleanValue {
    return new BooleanValue(this._value && (other as BooleanValue)._value);
  }
  or(other: Value): BooleanValue {
    return new BooleanValue(this._value || (other as BooleanValue)._value);
  }
  not(): BooleanValue {
    return new BooleanValue(!this._value);
  }
}

const UNIT_TYPE = new TypeAnnotation('Unit');

class UnitValue extends Value {
  constructor() {
    super(UNIT_TYPE);
  }

  toString(): string {
    return '()';
  }

  _equalsSameType(other: Value): boolean {
    return other.isUnit();
  }
}

const UNIT_VALUE = new UnitValue();

const LIST_TYPE = new TypeAnnotation('List');

class ListValue extends Value {
  _elements: Value[];
  _elementType: TypeAnnotation | null;

  constructor(elements: Value[] = [], elementType: TypeAnnotation | null = null) {
    super(LIST_TYPE);
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

  append(elem: Value): ListValue {
    return new ListValue([...this._elements, elem], this._elementType);
  }

  slice(start: number, length: number): ListValue {
    return new ListValue(this._elements.slice(start, start + length), this._elementType);
  }

  toString(): string {
    return `[${this._elements.map(e => e.toString()).join(', ')}]`;
  }

  _equalsSameType(other: Value): boolean {
    const o = other as ListValue;
    if (this.length() !== o.length()) return false;
    for (let i = 0; i < this.length(); i++) {
      if (!this.get(i)!.equals(o.get(i)!)) return false;
    }
    return true;
  }
}

const MAP_TYPE = new TypeAnnotation('Map');

class MapValue extends Value {
  _entries: Record<string, Value>;
  _keyType: TypeAnnotation | null;
  _valueType: TypeAnnotation | null;

  constructor(entries: Record<string, Value> = {}, keyType: TypeAnnotation | null = null, valueType: TypeAnnotation | null = null) {
    super(MAP_TYPE);
    this._entries = entries;
    this._keyType = keyType;
    this._valueType = valueType;
  }

  typeName(): string {
    const k = this._keyType ? this._keyType.name : '?';
    const v = this._valueType ? this._valueType.name : '?';
    return `Map<${k}, ${v}>`;
  }

  _resolveKey(key: Value): string {
    return String(key.isNumber() ? key.toRawNumber() : key.toRawString());
  }

  getByValueKey(key: Value): Value | undefined {
    return this._entries[this._resolveKey(key)];
  }

  hasByValueKey(key: Value): boolean {
    return this._entries.hasOwnProperty(this._resolveKey(key));
  }

  set(key: Value, value: Value): void {
    this._entries[this._resolveKey(key)] = value;
  }

  remove(key: Value): void {
    delete this._entries[this._resolveKey(key)];
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

  toString(): string {
    const pairs = Object.entries(this._entries)
      .map(([k, v]) => `${k}: ${v.toString()}`);
    return `{${pairs.join(', ')}}`;
  }

  _equalsSameType(other: Value): boolean {
    const o = other as MapValue;
    if (this.size() !== o.size()) return false;
    for (const k of this.keys()) {
      const aVal = this.get(k);
      const bVal = o.get(k);
      if (!aVal || !bVal || !aVal.equals(bVal)) return false;
    }
    return true;
  }
}

class RecordValue extends Value {
  _fields: Record<string, Value>;
  _typeName: string;

  constructor(fields: Record<string, Value>, typeName: string) {
    super(new TypeAnnotation(typeName));
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

  hasField(fieldName: string): boolean {
    return this._fields.hasOwnProperty(fieldName);
  }

  fieldNames(): string[] {
    return Object.keys(this._fields);
  }

  toString(): string {
    const fields = Object.entries(this._fields)
      .map(([k, v]) => `${k}: ${v.toString()}`);
    return `${this._typeName}{${fields.join(', ')}}`;
  }

  _equalsSameType(other: Value): boolean {
    const o = other as RecordValue;
    if (this.typeName() !== o.typeName()) return false;
    const keys = this.fieldNames();
    if (keys.length !== o.fieldNames().length) return false;
    for (const k of keys) {
      const aVal = this.get(k);
      const bVal = o.get(k);
      if (!aVal || !bVal || !aVal.equals(bVal)) return false;
    }
    return true;
  }
}

class ResultValue extends Value {
  _isOk: BooleanValue;
  _value: Value;
  _errMessage: StringValue;
  _resultType: TypeAnnotation | null;

  constructor(isOk: BooleanValue, value: Value, errMessage: StringValue, resultType: TypeAnnotation | null = null) {
    super(new TypeAnnotation('Result'));
    this._isOk = isOk;
    this._value = value;
    this._errMessage = errMessage;
    this._resultType = resultType;
  }

  typeName(): string {
    const inner = this._resultType ? this._resultType.name : '?';
    return `Result<${inner}>`;
  }

  isOkValue(): boolean {
    return this._isOk._value;
  }

  isErr(): boolean {
    return !this._isOk._value;
  }

  getOk(): Value {
    if (this.isErr()) {
      throw new TypeError('Called getOk() on an Err value');
    }
    return this._value;
  }

  getErr(): Value {
    if (this.isOkValue()) {
      throw new TypeError('Called getErr() on an Ok value');
    }
    return this._errMessage;
  }

  toString(): string {
    return this.isOkValue()
      ? `ok(${this._value.toString()})`
      : `err(${this._errMessage.toString()})`;
  }

  _equalsSameType(other: Value): boolean {
    const o = other as ResultValue;
    if (this.isOkValue() !== o.isOkValue()) return false;
    if (this.isOkValue()) return this.getOk().equals(o.getOk());
    return this.getErr().equals(o.getErr());
  }
}

const FN_TYPE = new TypeAnnotation('Fn');

class FnValue extends Value {
  params: Array<{ name: string; type: TypeAnnotation }>;
  body: Stmt[];

  constructor(params: Array<{ name: string; type: TypeAnnotation }>, body: Stmt[]) {
    super(FN_TYPE);
    this.params = params;
    this.body = body;
  }

  toString(): string {
    return `fn(${this.params.map(p => p.name).join(', ')}) -> ...`;
  }
}

export interface TaskHandle {
  id: number;
  state: 'pending' | 'done';
  fn: () => Value | Promise<Value>;
  result: Value | null;
  error: string | null;
  resultType: TypeAnnotation | null;
  isDone(): boolean;
}

const TASK_TYPE = new TypeAnnotation('Task');

class TaskValue extends Value {
  handle: TaskHandle;
  _taskType: TypeAnnotation | null;

  constructor(handle: TaskHandle, taskType: TypeAnnotation | null = null) {
    super(TASK_TYPE);
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

function number(v: number): NumberValue {
  return new NumberValue(v);
}

function string(v: string): StringValue {
  return new StringValue(v);
}

function boolean(v: boolean): BooleanValue {
  return new BooleanValue(v);
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

function mkOk(value: Value, resultType: TypeAnnotation | null = null): ResultValue {
  return new ResultValue(boolean(true), value, string(""), resultType);
}

function mkErr(message: string | StringValue, resultType: TypeAnnotation | null = null): ResultValue {
  const msg = typeof message === 'string' ? string(message) : message;
  return new ResultValue(boolean(false), UNIT_VALUE, msg, resultType);
}

function fn(params: Array<{ name: string; type: TypeAnnotation }>, body: Stmt[]): FnValue {
  return new FnValue(params, body);
}

function task(handle: TaskHandle, taskType: TypeAnnotation | null = null): TaskValue {
  return new TaskValue(handle, taskType);
}

export {
  Value,
  NumberValue,
  StringValue,
  BooleanValue,
  UnitValue,
  ListValue,
  MapValue,
  RecordValue,
  ResultValue,
  FnValue,
  TaskValue,
  UNIT_VALUE,
  number,
  string,
  boolean,
  unit,
  list,
  map,
  record,
  mkOk,
  mkErr,
  fn,
  task,
};
