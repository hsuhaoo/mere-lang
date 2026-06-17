class LiteralExpr {
  value: number | string | boolean | null;
  line: number;
  column: number;

  constructor(value: number | string | boolean | null, line = 0, column = 0) {
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class IdentifierExpr {
  name: string;
  line: number;
  column: number;

  constructor(name: string, line = 0, column = 0) {
    this.name = name;
    this.line = line;
    this.column = column;
  }
}

class BinOpExpr {
  op: string;
  left: Expr;
  right: Expr;
  line: number;
  column: number;

  constructor(op: string, left: Expr, right: Expr, line = 0, column = 0) {
    this.op = op;
    this.left = left;
    this.right = right;
    this.line = line;
    this.column = column;
  }
}

class UnOpExpr {
  op: string;
  operand: Expr;
  line: number;
  column: number;

  constructor(op: string, operand: Expr, line = 0, column = 0) {
    this.op = op;
    this.operand = operand;
    this.line = line;
    this.column = column;
  }
}

class CallExpr {
  callee: IdentifierExpr | LambdaExpr | FieldAccessExpr | FnDecl;
  args: Expr[];
  line: number;
  column: number;

  constructor(callee: IdentifierExpr | LambdaExpr | FieldAccessExpr | FnDecl, args: Expr[], line = 0, column = 0) {
    this.callee = callee;
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

class FieldAccessExpr {
  object: Expr;
  field: string;
  line: number;
  column: number;

  constructor(object: Expr, field: string, line = 0, column = 0) {
    this.object = object;
    this.field = field;
    this.line = line;
    this.column = column;
  }
}

export type ElifBlock = {
  condition: Expr;
  thenBlock: Stmt[];
};

class IfExpr {
  condition: Expr;
  thenBlock: Stmt[];
  elifBlocks: ElifBlock[];
  elseBlock: Stmt[] | null;
  line: number;
  column: number;

  constructor(condition: Expr, thenBlock: Stmt[], elifBlocks: ElifBlock[] = [], elseBlock: Stmt[] | null = null, line = 0, column = 0) {
    this.condition = condition;
    this.thenBlock = thenBlock;
    this.elifBlocks = elifBlocks;
    this.elseBlock = elseBlock;
    this.line = line;
    this.column = column;
  }
}

class BlockExpr {
  stmts: Stmt[];
  line: number;
  column: number;

  constructor(stmts: Stmt[], line = 0, column = 0) {
    this.stmts = stmts;
    this.line = line;
    this.column = column;
  }
}

class LambdaExpr {
  params: Array<{ name: string; type: TypeAnnotation }>;
  returnType: TypeAnnotation | null;
  body: Stmt[];
  line: number;
  column: number;

  constructor(
    params: Array<{ name: string; type: TypeAnnotation }>,
    returnType: TypeAnnotation | null,
    body: Stmt[],
    line = 0,
    column = 0
  ) {
    this.params = params;
    this.returnType = returnType;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

class RecordCreateExpr {
  fields: Array<{ key: string; value: Expr }>;
  line: number;
  column: number;

  constructor(fields: Array<{ key: string; value: Expr }>, line = 0, column = 0) {
    this.fields = fields;
    this.line = line;
    this.column = column;
  }
}

class ListCreateExpr {
  elements: Expr[];
  line: number;
  column: number;

  constructor(elements: Expr[], line = 0, column = 0) {
    this.elements = elements;
    this.line = line;
    this.column = column;
  }
}

class MapCreateExpr {
  entries: Array<{ key: Expr; value: Expr }>;
  line: number;
  column: number;

  constructor(entries: Array<{ key: Expr; value: Expr }>, line = 0, column = 0) {
    this.entries = entries;
    this.line = line;
    this.column = column;
  }
}

class ResultOkExpr {
  value: Expr;
  line: number;
  column: number;

  constructor(value: Expr, line = 0, column = 0) {
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class ResultErrExpr {
  message: Expr;
  line: number;
  column: number;

  constructor(message: Expr, line = 0, column = 0) {
    this.message = message;
    this.line = line;
    this.column = column;
  }
}

class UnitExpr {
  line: number;
  column: number;

  constructor(line = 0, column = 0) {
    this.line = line;
    this.column = column;
  }
}

// ── Statement nodes ────────────────────────────────────────────

class LetStmt {
  name: string;
  type: TypeAnnotation;
  init: Expr | null;
  line: number;
  column: number;

  constructor(name: string, type: TypeAnnotation, init: Expr | null, line = 0, column = 0) {
    this.name = name;
    this.type = type;
    this.init = init;
    this.line = line;
    this.column = column;
  }
}

class MutDeclStmt {
  name: string;
  type: TypeAnnotation;
  init: Expr | null;
  line: number;
  column: number;

  constructor(name: string, type: TypeAnnotation, init: Expr | null, line = 0, column = 0) {
    this.name = name;
    this.type = type;
    this.init = init;
    this.line = line;
    this.column = column;
  }
}

class AssignStmt {
  name: string;
  value: Expr;
  line: number;
  column: number;

  constructor(name: string, value: Expr, line = 0, column = 0) {
    this.name = name;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class FnDecl {
  name: string;
  params: Array<{ name: string; type: TypeAnnotation }>;
  returnType: TypeAnnotation | null;
  body: Stmt[];
  line: number;
  column: number;

  constructor(
    name: string,
    params: Array<{ name: string; type: TypeAnnotation }>,
    returnType: TypeAnnotation | null,
    body: Stmt[],
    line = 0,
    column = 0
  ) {
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

class WhileStmt {
  condition: Expr;
  body: Stmt[];
  line: number;
  column: number;

  constructor(condition: Expr, body: Stmt[], line = 0, column = 0) {
    this.condition = condition;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

class ReturnStmt {
  value: Expr | null;
  line: number;
  column: number;

  constructor(value: Expr | null, line = 0, column = 0) {
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class IfStmt {
  condition: Expr;
  thenBlock: Stmt[];
  elifBlocks: ElifBlock[];
  elseBlock: Stmt[] | null;
  line: number;
  column: number;

  constructor(condition: Expr, thenBlock: Stmt[], elifBlocks: ElifBlock[] = [], elseBlock: Stmt[] | null = null, line = 0, column = 0) {
    this.condition = condition;
    this.thenBlock = thenBlock;
    this.elifBlocks = elifBlocks;
    this.elseBlock = elseBlock;
    this.line = line;
    this.column = column;
  }
}

class ExpressionStmt {
  expression: Expr;
  line: number;
  column: number;

  constructor(expression: Expr, line = 0, column = 0) {
    this.expression = expression;
    this.line = line;
    this.column = column;
  }
}

class ImportStmt {
  name: string;
  from: string;
  line: number;
  column: number;

  constructor(name: string, from: string, line = 0, column = 0) {
    this.name = name;
    this.from = from;
    this.line = line;
    this.column = column;
  }
}

class ExportStmt {
  decl: FnDecl;
  line: number;
  column: number;

  constructor(decl: FnDecl, line = 0, column = 0) {
    this.decl = decl;
    this.line = line;
    this.column = column;
  }
}

class TypeDecl {
  name: string;
  fields: Array<{ name: string; type: TypeAnnotation }>;
  line: number;
  column: number;

  constructor(name: string, fields: Array<{ name: string; type: TypeAnnotation }>, line = 0, column = 0) {
    this.name = name;
    this.fields = fields;
    this.line = line;
    this.column = column;
  }
}

// ── Type annotations ───────────────────────────────────────────

class TypeAnnotation {
  name: string;
  typeParams: TypeAnnotation[] | null;
  line: number;
  column: number;

  constructor(name: string, typeParams: TypeAnnotation[] | null = null, line = 0, column = 0) {
    this.name = name;
    this.typeParams = typeParams;
    this.line = line;
    this.column = column;
  }

  toString() {
    if (this.typeParams) {
      return `${this.name}<${this.typeParams.join(', ')}>`;
    }
    return this.name;
  }

  equals(other: TypeAnnotation | null) {
    if (!other) return false;
    if (this.name !== other.name) return false;
    if (!this.typeParams && !other.typeParams) return true;
    if (!this.typeParams || !other.typeParams) return false;
    if (this.typeParams.length !== other.typeParams.length) return false;
    return this.typeParams.every((p, i) => p === other.typeParams![i]);
  }
}

// ── AST root ───────────────────────────────────────────────────

class Program {
  stmts: Stmt[];
  modules: Map<string, { exports: Map<string, FnDecl> }>;

  constructor(stmts: Stmt[], modules: Map<string, { exports: Map<string, FnDecl> }> = new Map()) {
    this.stmts = stmts;
    this.modules = modules;
  }
}

// ── Union types ────────────────────────────────────────────────

type Expr =
  | LiteralExpr
  | IdentifierExpr
  | BinOpExpr
  | UnOpExpr
  | CallExpr
  | FieldAccessExpr
  | IfExpr
  | BlockExpr
  | LambdaExpr
  | RecordCreateExpr
  | ListCreateExpr
  | MapCreateExpr
  | ResultOkExpr
  | ResultErrExpr
  | UnitExpr;

type Stmt =
  | LetStmt
  | MutDeclStmt
  | AssignStmt
  | WhileStmt
  | FnDecl
  | ReturnStmt
  | IfStmt
  | ExpressionStmt
  | ImportStmt
  | ExportStmt
  | TypeDecl;

export {
  LiteralExpr,
  IdentifierExpr,
  BinOpExpr,
  UnOpExpr,
  CallExpr,
  FieldAccessExpr,
  IfExpr,
  BlockExpr,
  LambdaExpr,
  RecordCreateExpr,
  ListCreateExpr,
  MapCreateExpr,
  ResultOkExpr,
  ResultErrExpr,
  UnitExpr,
  LetStmt,
  MutDeclStmt,
  AssignStmt,
  WhileStmt,
  FnDecl,
  ReturnStmt,
  IfStmt,
  ExpressionStmt,
  ImportStmt,
  ExportStmt,
  TypeDecl,
  TypeAnnotation,
  Program,
};
export type { Expr, Stmt };
