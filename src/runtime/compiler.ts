import {
  Expr, Stmt, Program, FnDecl, TypeDecl, ImportStmt, ExportStmt,
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, MutDeclStmt, AssignStmt, WhileStmt, ReturnStmt, IfStmt, ExpressionStmt,
} from '../ast/nodes.js';
import {
  Value, unit as mkUnit,
  number as mkNumber, string as mkString, boolean as mkBoolean,
} from './values.js';
import { Opcode } from './opcodes.js';
import { Builtins } from './builtins.js';

class CBuffer {
  bytes: number[] = [];
  constants: Value[] = [];

  emit(op: Opcode) { this.bytes.push(op); }
  u8(v: number) { this.bytes.push(v & 0xFF); }
  u16(v: number) { this.bytes.push((v >> 8) & 0xFF, v & 0xFF); }
  i16(v: number) {
    const s = v < 0 ? v + 65536 : v;
    this.bytes.push((s >> 8) & 0xFF, s & 0xFF);
  }
  addConst(v: Value): number {
    const idx = this.constants.length;
    this.constants.push(v);
    return idx;
  }
  strConst(s: string): number { return this.addConst(mkString(s)); }
  numConst(n: number): number { return this.addConst(mkNumber(n)); }

  len() { return this.bytes.length; }
  patch(pos: number, v: number) {
    this.bytes[pos] = (v >> 8) & 0xFF;
    this.bytes[pos + 1] = v & 0xFF;
  }
  toCode(): Uint8Array { return new Uint8Array(this.bytes); }
}

interface CompiledFn {
  name: string;
  code: Uint8Array;
  constants: Value[];
  localCount: number;
  paramCount: number;
  subFns: { code: Uint8Array; constants: Value[]; localCount: number; paramCount: number }[];
}

class Compiler {
  private builtins: Builtins;
  private globals: Map<string, number> = new Map();
  private locals: Map<string, number> = new Map();
  private localCount: number = 0;
  private buf: CBuffer;
  private globalValues: Value[];
  private subFns: { code: Uint8Array; constants: Value[]; localCount: number; paramCount: number }[] = [];
  private moduleLevel: boolean = false;

  constructor(builtins: Builtins, globalNames: string[], globalValues: Value[]) {
    this.builtins = builtins;
    this.globalValues = globalValues;
    for (let i = 0; i < globalNames.length; i++) {
      this.globals.set(globalNames[i], i);
    }
  }

  compile(fn: FnDecl): CompiledFn {
    this.moduleLevel = false;
    this.buf = new CBuffer();
    this.locals = new Map();
    this.localCount = 0;
    this.subFns = [];

    for (const p of fn.params) {
      this.locals.set(p.name, this.localCount++);
    }

    this.compileBodyStmts(fn.body);
    this.buf.emit(Opcode.RET);

    return {
      name: fn.name,
      code: this.buf.toCode(),
      constants: this.buf.constants,
      localCount: this.localCount,
      paramCount: fn.params.length,
      subFns: this.subFns,
    };
  }

  compileMain(stmts: Stmt[]): CompiledFn {
    this.moduleLevel = true;
    this.buf = new CBuffer();
    this.locals = new Map();
    this.localCount = 0;
    this.subFns = [];

    this.compileBodyStmts(stmts);
    this.buf.emit(Opcode.RET);

    return {
      name: '__main__',
      code: this.buf.toCode(),
      constants: this.buf.constants,
      localCount: this.localCount,
      paramCount: 0,
      subFns: this.subFns,
    };
  }

  private compileLambda(params: { name: string; type: any }[], body: Stmt[]): number {
    const buf = new CBuffer();
    const locals = new Map<string, number>();
    let localCount = 0;

    for (const p of params) {
      locals.set(p.name, localCount++);
    }

    // Compile body into the lambda's buffer
    const savedBuf = this.buf;
    const savedLocals = this.locals;
    const savedLocalCount = this.localCount;

    this.buf = buf;
    this.locals = locals;
    this.localCount = localCount;

    if (body.length === 0) {
      this.buf.emit(Opcode.UNIT);
    } else {
      for (let i = 0; i < body.length; i++) {
        const isLast = i === body.length - 1;
        this.compileStmt(body[i], isLast);
        if (!isLast) this.cleanupStmt(body[i]);
      }
    }
    this.buf.emit(Opcode.RET);

    this.buf = savedBuf;
    this.locals = savedLocals;
    this.localCount = savedLocalCount;

    const idx = this.subFns.length;
    this.subFns.push({
      code: buf.toCode(),
      constants: buf.constants,
      localCount,
      paramCount: params.length,
    });
    return idx;
  }

  private compileBodyStmts(stmts: Stmt[]) {
    if (stmts.length === 0) {
      this.buf.emit(Opcode.UNIT);
      return;
    }
    for (let i = 0; i < stmts.length; i++) {
      const isLast = i === stmts.length - 1;
      this.compileStmt(stmts[i], isLast);
      if (!isLast) this.cleanupStmt(stmts[i]);
    }
  }

  private cleanupStmt(stmt: Stmt) {
    if (stmt instanceof ExpressionStmt || stmt instanceof IfStmt || stmt instanceof WhileStmt || stmt instanceof LetStmt || stmt instanceof MutDeclStmt || stmt instanceof AssignStmt) {
      this.buf.emit(Opcode.POP);
    }
  }

  private compileStmt(stmt: Stmt, isLast: boolean) {
    if (stmt instanceof ExpressionStmt) {
      this.compileExpr(stmt.expression);
    } else if (stmt instanceof LetStmt) {
      if (stmt.init) this.compileExpr(stmt.init);
      else this.buf.emit(Opcode.UNIT);
      if (isLast) this.buf.emit(Opcode.DUP);
      if (this.moduleLevel && this.globals.has(stmt.name)) {
        this.buf.emit(Opcode.STORE_G);
        this.buf.u16(this.globals.get(stmt.name)!);
      } else {
        const idx = this.localCount++;
        this.locals.set(stmt.name, idx);
        this.buf.emit(Opcode.STORE);
        this.buf.u16(idx);
      }
      if (!isLast) this.buf.emit(Opcode.UNIT);
    } else if (stmt instanceof MutDeclStmt) {
      if (stmt.init) this.compileExpr(stmt.init);
      else this.buf.emit(Opcode.UNIT);
      if (isLast) this.buf.emit(Opcode.DUP);
      if (this.moduleLevel && this.globals.has(stmt.name)) {
        this.buf.emit(Opcode.STORE_G);
        this.buf.u16(this.globals.get(stmt.name)!);
      } else {
        const idx = this.localCount++;
        this.locals.set(stmt.name, idx);
        this.buf.emit(Opcode.STORE);
        this.buf.u16(idx);
      }
      if (!isLast) this.buf.emit(Opcode.UNIT);
    } else if (stmt instanceof AssignStmt) {
      this.compileExpr(stmt.value);
      if (isLast) this.buf.emit(Opcode.DUP);
      const localIdx = this.locals.get(stmt.name);
      if (localIdx !== undefined) {
        this.buf.emit(Opcode.STORE);
        this.buf.u16(localIdx);
      } else {
        this.buf.emit(Opcode.STORE_G);
        this.buf.u16(this.globals.get(stmt.name)!);
      }
      if (!isLast) this.buf.emit(Opcode.UNIT);
    } else if (stmt instanceof ReturnStmt) {
      if (stmt.value) this.compileExpr(stmt.value);
      else this.buf.emit(Opcode.UNIT);
      this.buf.emit(Opcode.RET);
    } else if (stmt instanceof WhileStmt) {
      const loopStart = this.buf.len();
      this.compileExpr(stmt.condition);
      const jmpPos = this.buf.len();
      this.buf.emit(Opcode.JMP_IF_NOT);
      this.buf.i16(0);
      for (const s of stmt.body) this.compileStmt(s, false);
      for (const s of stmt.body) this.cleanupStmt(s);
      const afterBody = this.buf.len();
      this.buf.emit(Opcode.JMP);
      this.buf.i16(loopStart - afterBody - 3);
      this.buf.patch(jmpPos + 1, this.buf.len() - jmpPos - 3);
      this.buf.emit(Opcode.UNIT);
    } else if (stmt instanceof IfStmt) {
      this.compileIf(stmt.condition, stmt.thenBlock, stmt.elifBlocks, stmt.elseBlock);
    } else if (stmt instanceof FnDecl || stmt instanceof TypeDecl || stmt instanceof ImportStmt || (stmt instanceof ExportStmt && stmt.decl instanceof FnDecl)) {
    } else if (stmt instanceof ExportStmt) {
      this.compileStmt(stmt.decl, isLast);
    } else if ((stmt as any).constructor) {
      console.warn(`[Compiler] unimplemented stmt: ${(stmt as any).constructor.name}`);
    }
  }

  private compileIf(
    condition: Expr,
    thenBlock: Stmt[],
    elifBlocks: Array<{ condition: Expr; thenBlock: Stmt[] }>,
    elseBlock: Stmt[] | null,
  ) {
    this.compileExpr(condition);
    const jmpPos = this.buf.len();
    this.buf.emit(Opcode.JMP_IF_NOT);
    this.buf.i16(0);
    this.compileBodyStmts(thenBlock);

    // JMP to skip the rest (elif/else/no-else) when thenBlock was taken
    const thenJmp = this.buf.len();
    this.buf.emit(Opcode.JMP);
    this.buf.i16(0);
    const bodyJmps: number[] = [thenJmp];

    let lastJmpPos = -1;
    let prevElifJmp = -1;
    for (const elif of elifBlocks) {
      const endJmpPos = this.buf.len();
      this.buf.emit(Opcode.JMP);
      this.buf.i16(0);
      if (lastJmpPos < 0) {
        this.buf.patch(jmpPos + 1, this.buf.len() - jmpPos - 3);
      } else {
        this.buf.patch(lastJmpPos + 1, this.buf.len() - lastJmpPos - 3);
      }

      if (prevElifJmp >= 0) {
        const offset = endJmpPos - prevElifJmp;
        this.buf.patch(prevElifJmp + 1, offset);
      }

      this.compileExpr(elif.condition);
      const elifJmpPos = this.buf.len();
      this.buf.emit(Opcode.JMP_IF_NOT);
      this.buf.i16(0);
      this.compileBodyStmts(elif.thenBlock);
      const elifBodyJmp = this.buf.len();
      this.buf.emit(Opcode.JMP);
      this.buf.i16(0);
      bodyJmps.push(elifBodyJmp);
      lastJmpPos = endJmpPos;
      prevElifJmp = elifJmpPos;
    }

    const patchBodyJmps = (endAddr: number) => {
      for (const p of bodyJmps) {
        this.buf.patch(p + 1, endAddr - p - 3);
      }
    };

    if (elseBlock) {
      const endPos = this.buf.len();
      this.buf.emit(Opcode.JMP);
      this.buf.i16(0);
      if (lastJmpPos < 0) {
        this.buf.patch(jmpPos + 1, this.buf.len() - jmpPos - 3);
      } else {
        this.buf.patch(lastJmpPos + 1, this.buf.len() - lastJmpPos - 3);
      }
      if (prevElifJmp >= 0) {
        this.buf.patch(prevElifJmp + 1, this.buf.len() - prevElifJmp - 3);
      }
      this.compileBodyStmts(elseBlock);
      const afterEnd = this.buf.len();
      this.buf.patch(endPos + 1, afterEnd - endPos - 3);
      patchBodyJmps(afterEnd);
    } else {
      this.buf.emit(Opcode.UNIT);
      if (lastJmpPos < 0) {
        this.buf.patch(jmpPos + 1, (this.buf.len() - 1) - jmpPos - 3);
      }
      const afterEnd = this.buf.len();
      patchBodyJmps(afterEnd);
      if (lastJmpPos >= 0) {
        this.buf.patch(lastJmpPos + 1, afterEnd - lastJmpPos - 3);
      }
      if (prevElifJmp >= 0) {
        this.buf.patch(prevElifJmp + 1, afterEnd - prevElifJmp - 3);
      }
    }
  }

  private compileExpr(expr: Expr) {
    if (expr instanceof LiteralExpr) {
      const v = expr.value;
      if (v === null) { this.buf.emit(Opcode.UNIT); return; }
      if (typeof v === 'number') { this.buf.emit(Opcode.CONST); this.buf.u16(this.buf.numConst(v)); return; }
      if (typeof v === 'string') { this.buf.emit(Opcode.CONST); this.buf.u16(this.buf.strConst(v)); return; }
      if (typeof v === 'boolean') { this.buf.emit(v ? Opcode.TRUE : Opcode.FALSE); return; }
    }
    if (expr instanceof IdentifierExpr) {
      const localIdx = this.locals.get(expr.name);
      if (localIdx !== undefined) {
        this.buf.emit(Opcode.LOAD); this.buf.u16(localIdx);
      } else {
        this.buf.emit(Opcode.LOAD_G); this.buf.u16(this.globals.get(expr.name)!);
      }
      return;
    }
    if (expr instanceof BinOpExpr) {
      this.compileExpr(expr.left); this.compileExpr(expr.right);
      switch (expr.op) {
        case '+': this.buf.emit(Opcode.ADD); break;
        case '-': this.buf.emit(Opcode.SUB); break;
        case '*': this.buf.emit(Opcode.MUL); break;
        case '/': this.buf.emit(Opcode.DIV); break;
        case '==': this.buf.emit(Opcode.EQ); break;
        case '!=': this.buf.emit(Opcode.NEQ); break;
        case '<': this.buf.emit(Opcode.LT); break;
        case '>': this.buf.emit(Opcode.GT); break;
        case '<=': this.buf.emit(Opcode.LTE); break;
        case '>=': this.buf.emit(Opcode.GTE); break;
        case 'and': this.buf.emit(Opcode.AND); break;
        case 'or': this.buf.emit(Opcode.OR); break;
        default: throw new Error(`Unknown binop: ${expr.op}`);
      }
      return;
    }
    if (expr instanceof UnOpExpr) {
      this.compileExpr(expr.operand);
      if (expr.op === 'not') this.buf.emit(Opcode.NOT);
      else if (expr.op === '-') this.buf.emit(Opcode.NEG);
      return;
    }
    if (expr instanceof CallExpr) {
      if (expr.callee instanceof IdentifierExpr) {
        const name = expr.callee.name;
        if (this.locals.has(name) || this.globals.has(name)) {
          // Function pointer call — push callee then args
          this.compileExpr(expr.callee);
          for (const a of expr.args) this.compileExpr(a);
          this.buf.emit(Opcode.CALL_VAL);
          this.buf.u8(expr.args.length);
        } else {
          // Named function / builtin call
          for (const a of expr.args) this.compileExpr(a);
          this.buf.emit(Opcode.CALL);
          this.buf.u16(this.buf.strConst(name));
          this.buf.u8(expr.args.length);
        }
      } else if (expr.callee instanceof FieldAccessExpr) {
        this.compileExpr(expr.callee.object);
        const fieldName = expr.callee.field;
        for (const a of expr.args) this.compileExpr(a);
        this.buf.emit(Opcode.CALL);
        this.buf.u16(this.buf.strConst(fieldName));
        this.buf.u8(expr.args.length);
      } else {
        throw new Error(`Unsupported callee type: ${expr.callee.constructor.name}`);
      }
      return;
    }
    if (expr instanceof FieldAccessExpr) {
      this.compileExpr(expr.object);
      this.buf.emit(Opcode.FIELD);
      this.buf.u16(this.buf.strConst(expr.field));
      return;
    }
    if (expr instanceof IfExpr) {
      this.compileIf(expr.condition, expr.thenBlock, expr.elifBlocks, expr.elseBlock);
      return;
    }
    if (expr instanceof BlockExpr) {
      this.compileBodyStmts(expr.stmts);
      return;
    }
    if (expr instanceof RecordCreateExpr) {
      for (const f of expr.fields) this.compileExpr(f.value);
      this.buf.emit(Opcode.MAKE_REC);
      this.buf.u8(expr.fields.length);
      for (const f of expr.fields) this.buf.u16(this.buf.strConst(f.key));
      return;
    }
    if (expr instanceof ListCreateExpr) {
      for (const e of expr.elements) this.compileExpr(e);
      this.buf.emit(Opcode.MAKE_LIST);
      this.buf.u16(expr.elements.length);
      return;
    }
    if (expr instanceof MapCreateExpr) {
      for (const entry of expr.entries) {
        this.compileExpr(entry.key);
        this.compileExpr(entry.value);
      }
      this.buf.emit(Opcode.MAKE_MAP);
      this.buf.u16(expr.entries.length);
      return;
    }
    if (expr instanceof LambdaExpr) {
      const idx = this.compileLambda(expr.params, expr.body);
      this.buf.emit(Opcode.FN);
      this.buf.u16(idx);
      return;
    }
    if (expr instanceof UnitExpr) { this.buf.emit(Opcode.UNIT); return; }
    if (expr instanceof ResultOkExpr) {
      this.compileExpr(expr.value);
      this.buf.emit(Opcode.CALL);
      this.buf.u16(this.buf.strConst('mkOk'));
      this.buf.u8(1);
      return;
    }
    if (expr instanceof ResultErrExpr) {
      this.compileExpr(expr.message);
      this.buf.emit(Opcode.CALL);
      this.buf.u16(this.buf.strConst('mkErr'));
      this.buf.u8(1);
      return;
    }
    console.warn(`[Compiler] unimplemented expr: ${expr.constructor.name}`);
    this.buf.emit(Opcode.UNIT);
  }
}

export { Compiler, CompiledFn, CBuffer };
