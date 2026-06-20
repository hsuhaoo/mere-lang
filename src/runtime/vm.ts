import { Opcode } from './opcodes.js';
import {
  Value, NumberValue, StringValue, BooleanValue, ListValue,
  MapValue, RecordValue, ResultValue, FnValue,
  unit as mkUnit, number as mkNumber, string as mkString,
  boolean as mkBoolean,
  mkOk, mkErr, UNIT_VALUE,
} from './values.js';
import { Builtins } from './builtins.js';
import type { CompiledFn } from './compiler.js';

interface Frame {
  code: Uint8Array;
  constants: Value[];
  ip: number;
  locals: Value[];
  subFnIndices: number[];
  fnName?: string;
}

interface RegisteredFn {
  code: Uint8Array;
  constants: Value[];
  localCount: number;
  paramCount: number;
  name: string;
  subFnIndices: number[];
}

class VM {
  private builtins: Builtins;
  private functions: Map<string, RegisteredFn> = new Map();
  private funcList: RegisteredFn[] = [];
  private funcNameToIndex: Map<string, number> = new Map();
  private globals: Value[];
  private globalNames: string[];

  private stack: Value[] = [];
  private frames: Frame[] = [];

  constructor(builtins: Builtins, globalNames: string[], globalValues: Value[]) {
    this.builtins = builtins;
    this.globalNames = globalNames;
    this.globals = globalValues;
  }

  tryRegister(fn: CompiledFn) {
    if (this.functions.has(fn.name)) return false;

    const mainIdx = this.funcList.length;
    const subFnIndices: number[] = [];
    const entry: RegisteredFn = {
      code: fn.code,
      constants: fn.constants,
      localCount: fn.localCount,
      paramCount: fn.paramCount,
      name: fn.name,
      subFnIndices,
    };
    this.functions.set(fn.name, entry);
    this.funcNameToIndex.set(fn.name, mainIdx);
    this.funcList.push(entry);

    // Register sub-functions (lambdas)
    for (let i = 0; i < fn.subFns.length; i++) {
      const s = fn.subFns[i];
      const subIdx = this.funcList.length;
      subFnIndices.push(subIdx);
      const subEntry: RegisteredFn = {
        code: s.code,
        constants: s.constants,
        localCount: s.localCount,
        paramCount: s.paramCount,
        name: `%lambda.${fn.name}.${i}`,
        subFnIndices: [],
      };
      this.funcList.push(subEntry);
    }

    return true;
  }

  hasFunction(name: string): boolean { return this.functions.has(name); }
  getFunctionIndex(name: string): number { return this.funcNameToIndex.get(name) ?? -1; }
  setGlobal(index: number, value: Value) { this.globals[index] = value; }
  getGlobal(index: number): Value { return this.globals[index]; }
  getGlobalIndex(name: string): number {
    const idx = this.globalNames.indexOf(name);
    return idx >= 0 ? idx : -1;
  }

  callFunction(name: string, args: Value[]): Value {
    const fn = this.functions.get(name);
    if (!fn) throw new Error(`VM: function '${name}' not compiled`);
    return this.execute(fn, args);
  }

  callByIndex(index: number, args: Value[]): Value {
    if (index < 0 || index >= this.funcList.length) throw new Error(`VM: invalid function index ${index}`);
    return this.execute(this.funcList[index], args);
  }

  private execute(fn: RegisteredFn, args: Value[]): Value {
    const locals = new Array<Value>(fn.localCount);
    for (let i = 0; i < args.length; i++) locals[i] = args[i];
    for (let i = args.length; i < fn.localCount; i++) locals[i] = UNIT_VALUE;

    const targetDepth = this.frames.length;
    this.frames.push({ code: fn.code, constants: fn.constants, ip: 0, locals, subFnIndices: fn.subFnIndices, fnName: fn.name });
    const result = this.runLoop(targetDepth);
    return result;
  }

  private runLoop(targetDepth: number = 0): Value {
    let stepCount = 0;
    while (this.frames.length > targetDepth) {
      const frame = this.frames[this.frames.length - 1];
      const code = frame.code;
      const constants = frame.constants;
      let ip = frame.ip;

      const op = code[ip] as Opcode;
      ip++;
      stepCount++;

      if (stepCount < 20 || stepCount % 5000 === 0) {
        // console.log(`[VM] step=${stepCount} fn=${frame.fnName} op=${Opcode[op]} ip=${ip-1} stack=${this.stack.length}`);
      }

      switch (op) {
        case Opcode.NOP: break;

        case Opcode.CONST: {
          const idx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          const val = constants[idx];
          if (!val) {
            console.error(`[VM] CONST idx=${idx} is undefined! constants.len=${constants.length}`);
          }
          this.stack.push(val);
          break;
        }

        case Opcode.UNIT: this.stack.push(UNIT_VALUE); break;
        case Opcode.TRUE: this.stack.push(mkBoolean(true)); break;
        case Opcode.FALSE: this.stack.push(mkBoolean(false)); break;

        case Opcode.LOAD: {
          const idx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          this.stack.push(frame.locals[idx]);
          break;
        }

        case Opcode.STORE: {
          const idx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          frame.locals[idx] = this.stack.pop()!;
          break;
        }

        case Opcode.LOAD_G: {
          const idx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          this.stack.push(this.globals[idx]);
          break;
        }

        case Opcode.STORE_G: {
          const idx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          this.globals[idx] = this.stack.pop()!;
          break;
        }

        case Opcode.ADD: case Opcode.SUB: case Opcode.MUL: case Opcode.DIV: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          if (a === undefined || b === undefined) {
            const fnName = (frame as any).fnName || '?';
            console.error(`[VM] ${Opcode[op]} stack underflow in '${fnName}' at ip=${ip-1}: a=${typeof a} b=${typeof b} stack_len=${this.stack.length}`);
            console.error(`[VM] prev ip instr: ${code.slice(Math.max(0,ip-10), ip+5).join(',')}`);
            this.stack.push(mkUnit());
            break;
          }
          if (a.isString() && b.isString()) {
            this.stack.push(a.concat(b));
          } else {
            const nb = b.toRawNumber();
            const na = a.toRawNumber();
            switch (op) {
              case Opcode.ADD: this.stack.push(mkNumber(na + nb)); break;
              case Opcode.SUB: this.stack.push(mkNumber(na - nb)); break;
              case Opcode.MUL: this.stack.push(mkNumber(na * nb)); break;
              case Opcode.DIV: this.stack.push(mkNumber(na / nb)); break;
            }
          }
          break;
        }

        case Opcode.EQ: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(mkBoolean(a.equals(b)));
          break;
        }
        case Opcode.NEQ: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(mkBoolean(!a.equals(b)));
          break;
        }
        case Opcode.LT: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(a.lt(b));
          break;
        }
        case Opcode.GT: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(a.gt(b));
          break;
        }
        case Opcode.LTE: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(a.lte(b));
          break;
        }
        case Opcode.GTE: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(a.gte(b));
          break;
        }

        case Opcode.AND: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(a.and(b));
          break;
        }
        case Opcode.OR: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push(a.or(b));
          break;
        }
        case Opcode.NOT: {
          this.stack.push(this.stack.pop()!.not());
          break;
        }
        case Opcode.NEG: {
          this.stack.push(this.stack.pop()!.negate());
          break;
        }

        case Opcode.JMP: {
          const offset = (code[ip] << 8) | code[ip + 1];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          ip += 2;
          ip += signedOffset;
          break;
        }

        case Opcode.JMP_IF: {
          const offset = (code[ip] << 8) | code[ip + 1];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          ip += 2;
          const val = this.stack.pop()!;
          if (val.isTruthy()) ip += signedOffset;
          break;
        }

        case Opcode.JMP_IF_NOT: {
          const offset = (code[ip] << 8) | code[ip + 1];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          ip += 2;
          const val = this.stack.pop()!;
          if (!val.isTruthy()) ip += signedOffset;
          break;
        }

        case Opcode.CALL: {
          const nameIdx = (code[ip] << 8) | code[ip + 1];
          const argc = code[ip + 2];
          ip += 3;
          const name = constants[nameIdx].toRawString();

          const args: Value[] = [];
          for (let i = argc - 1; i >= 0; i--) args[i] = this.stack.pop()!;

          const builtinEntry = this.builtins.getFn(name);
          if (builtinEntry) {
            const result = builtinEntry.fn(args);
            this.stack.push(result);
          } else if (name === 'mkOk') {
            this.stack.push(mkOk(args[0]));
          } else if (name === 'mkErr') {
            this.stack.push(mkErr(args[0] as StringValue));
          } else if (this.functions.has(name)) {
            if (this.stack.length > 0) {
              const top = this.stack[this.stack.length - 1];
              if (top && typeof top === 'object' && (top as any)._module) {
                this.stack.pop();
              }
            }
            const target = this.functions.get(name)!;
            const newLocals = new Array<Value>(target.localCount);
            for (let i = 0; i < args.length; i++) newLocals[i] = args[i];
            for (let i = args.length; i < target.localCount; i++) newLocals[i] = UNIT_VALUE;
            this.frames.push({ code: target.code, constants: target.constants, ip: 0, locals: newLocals, subFnIndices: target.subFnIndices, fnName: target.name });
            // Continue outer loop — the new frame is at the top
          } else {
            throw new Error(`VM: unknown function '${name}'`);
          }
          break;
        }

        case Opcode.FN: {
          const subIdx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          const funcIdx = frame.subFnIndices[subIdx];
          const fnVal = new FnValue([], [], null);
          fnVal.vm = this;
          fnVal.vmFuncIndex = funcIdx;
          this.stack.push(fnVal);
          break;
        }

        case Opcode.CALL_VAL: {
          const argc = code[ip];
          ip += 1;
          const args: Value[] = [];
          for (let i = argc - 1; i >= 0; i--) args[i] = this.stack.pop()!;
          const callee = this.stack.pop()!;

          if (callee instanceof FnValue) {
            const callerName = (this.frames[this.frames.length - 1] as any).fnName || '?';
            if (callee.vm && callee.vmFuncIndex >= 0) {
              const vmTarget = this.funcList[callee.vmFuncIndex];
              if (!vmTarget) throw new Error(`VM: invalid func index ${callee.vmFuncIndex}`);
              const newLocals = new Array<Value>(vmTarget.localCount);
              for (let i = 0; i < args.length; i++) newLocals[i] = args[i];
              for (let i = args.length; i < vmTarget.localCount; i++) newLocals[i] = UNIT_VALUE;
              this.frames.push({ code: vmTarget.code, constants: vmTarget.constants, ip: 0, locals: newLocals, subFnIndices: vmTarget.subFnIndices, fnName: vmTarget.name });
            } else {
              throw new Error(`VM: FnValue has no VM reference (${callee.typeName()})`);
            }
          } else {
            const fnName = (this.frames[this.frames.length - 1] as any).fnName || '?';
            console.error(`[VM] CALL_VAL fail in '${fnName}': callee=${callee.typeName()} (${callee.toString().slice(0,50)}) stack before pop=${this.stack.length}`);
            throw new Error(`VM: cannot call non-function value (${callee.typeName()})`);
          }
          break;
        }

        case Opcode.RET: {
          const retVal = this.stack.pop() || UNIT_VALUE;
          this.frames.pop();
          if (this.frames.length > 0) {
            this.stack.push(retVal);
          } else {
            return retVal;
          }
          break;
        }

        case Opcode.FIELD: {
          const nameIdx = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          const fieldName = constants[nameIdx].toRawString();
          const obj = this.stack.pop()!;

          if (obj instanceof ResultValue) {
            if (fieldName === 'isOk') { this.stack.push(mkBoolean(obj.isOkValue())); break; }
            if (fieldName === 'value') { this.stack.push(obj._value); break; }
            if (fieldName === 'errMessage') { this.stack.push(obj._errMessage); break; }
            throw new Error(`Result has no field '${fieldName}'`);
          }
          if (obj instanceof StringValue) {
            if (fieldName === 'len') { this.stack.push(obj.len); break; }
            throw new Error(`String has no field '${fieldName}'`);
          }
          if (obj instanceof ListValue) {
            if (fieldName === 'len') { this.stack.push(obj.len); break; }
            throw new Error(`List has no field '${fieldName}'`);
          }
          if (obj instanceof RecordValue) {
            const val = obj.get(fieldName);
            if (val === undefined) throw new Error(`Record has no field '${fieldName}'`);

            this.stack.push(val);
            break;
          }
          console.error(`[VM] FIELD '${fieldName}' on ${obj.typeName()} in '${(frame as any).fnName || '?'}' at ip=${ip-1}`);
          throw new Error(`Cannot access field on ${obj.typeName()}`);
        }

        case Opcode.MAKE_REC: {
          const count = code[ip];
          ip++;
          const nameIndices: number[] = [];
          for (let i = 0; i < count; i++) {
            nameIndices.push((code[ip] << 8) | code[ip + 1]);
            ip += 2;
          }
          const values: Value[] = [];
          for (let i = 0; i < count; i++) values.push(this.stack.pop()!);
          const fields: Record<string, Value> = {};
          for (let i = 0; i < count; i++) {
            const name = constants[nameIndices[i]].toRawString();
            fields[name] = values[count - 1 - i];
          }
          const typeName = 'Record';
          this.stack.push(new RecordValue(fields, typeName));
          break;
        }

        case Opcode.MAKE_LIST: {
          const count = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          const elems: Value[] = [];
          for (let i = 0; i < count; i++) elems.push(this.stack.pop()!);
          elems.reverse();
          this.stack.push(new ListValue(elems, null));
          break;
        }

        case Opcode.MAKE_MAP: {
          const entryCount = (code[ip] << 8) | code[ip + 1];
          ip += 2;
          const entries: Record<string, Value> = {};
          for (let i = 0; i < entryCount; i++) {
            const val = this.stack.pop()!;
            const key = this.stack.pop()!;
            const keyStr = key.isNumber() ? String(key.toRawNumber()) : key.toRawString();
            entries[keyStr] = val;
          }
          this.stack.push(new MapValue(entries, null, null));
          break;
        }

        case Opcode.DUP: {
          this.stack.push(this.stack[this.stack.length - 1]);
          break;
        }

        case Opcode.POP: {
          this.stack.pop();
          break;
        }

        default: {
          console.warn(`[VM] unknown opcode: ${op} at ip=${ip - 1}`);
          this.stack.push(UNIT_VALUE);
          break;
        }
      }

      frame.ip = ip;
    }

    return this.stack.pop() || UNIT_VALUE;
  }
}

export { VM, Frame };
