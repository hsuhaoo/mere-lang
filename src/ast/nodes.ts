/**
 * Abstract Syntax Tree (AST) nodes for the Simplex language.
 * 
 * Design principles:
 * - Each structure does one thing
 * - No implicit behavior, every node type is explicit
 * - Concrete types only, no user-defined generics in AST
 */

// ── Expression nodes (can produce a value) ──────────────────────

class LiteralExpr {
  value: any;
  line: any;
  column: any;

  constructor(value, line = 0, column = 0) {
    this.value = value;       // number | string | boolean | null
    this.line = line;
    this.column = column;
  }
}

class IdentifierExpr {
  name: any;
  line: any;
  column: any;

  constructor(name, line = 0, column = 0) {
    this.name = name;
    this.line = line;
    this.column = column;
  }
}

class BinOpExpr {
  op: any;
  left: any;
  right: any;
  line: any;
  column: any;

  constructor(op, left, right, line = 0, column = 0) {
    this.op = op;             // '+', '-', '*', '/', '==', '!=', '<', '>', '<=', '>=', 'and', 'or'
    this.left = left;
    this.right = right;
    this.line = line;
    this.column = column;
  }
}

class UnOpExpr {
  op: any;
  operand: any;
  line: any;
  column: any;

  constructor(op, operand, line = 0, column = 0) {
    this.op = op;             // 'not', '-' (negation)
    this.operand = operand;
    this.line = line;
    this.column = column;
  }
}

class CallExpr {
  callee: any;
  args: any;
  line: any;
  column: any;

  constructor(callee, args, line = 0, column = 0) {
    this.callee = callee;     // IdentifierExpr | MethodCallExpr
    this.args = args;         // Array<Expr>
    this.line = line;
    this.column = column;
  }
}

class MethodCallExpr {
  object: any;
  method: any;
  args: any;
  line: any;
  column: any;

  constructor(object, method, args, line = 0, column = 0) {
    this.object = object;
    this.method = method;     // string
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

class FieldAccessExpr {
  object: any;
  field: any;
  line: any;
  column: any;

  constructor(object, field, line = 0, column = 0) {
    this.object = object;
    this.field = field;
    this.line = line;
    this.column = column;
  }
}

class IfExpr {
  condition: any;
  thenBlock: any;
  line: any;
  column: any;

  constructor(condition, thenBlock, line = 0, column = 0) {
    this.condition = condition;
    this.thenBlock = thenBlock; // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class BlockExpr {
  stmts: any;
  line: any;
  column: any;

  constructor(stmts, line = 0, column = 0) {
    this.stmts = stmts;       // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class LambdaExpr {
  params: any;
  returnType: any;
  body: any;
  line: any;
  column: any;

  constructor(params, returnType, body, line = 0, column = 0) {
    this.params = params;     // Array<{name: string, type: TypeAnnotation}>
    this.returnType = returnType; // TypeAnnotation | null
    this.body = body;         // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class RecordCreateExpr {
  fields: any;
  line: any;
  column: any;

  constructor(fields, line = 0, column = 0) {
    this.fields = fields;     // Array<{key: string, value: Expr}>
    this.line = line;
    this.column = column;
  }
}

class ListCreateExpr {
  elements: any;
  line: any;
  column: any;

  constructor(elements, line = 0, column = 0) {
    this.elements = elements; // Array<Expr>
    this.line = line;
    this.column = column;
  }
}

class MapCreateExpr {
  entries: any;
  line: any;
  column: any;

  constructor(entries, line = 0, column = 0) {
    this.entries = entries;   // Array<{key: Expr, value: Expr}>
    this.line = line;
    this.column = column;
  }
}

class ResultOkExpr {
  value: any;
  line: any;
  column: any;

  constructor(value, line = 0, column = 0) {
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class ResultErrExpr {
  message: any;
  line: any;
  column: any;

  constructor(message, line = 0, column = 0) {
    this.message = message;
    this.line = line;
    this.column = column;
  }
}

class UnitExpr {
  line: any;
  column: any;

  constructor(line = 0, column = 0) {
    this.line = line;
    this.column = column;
  }
}

// ── Statement nodes (statements, not expressions) ───────────────

class LetStmt {
  name: any;
  type: any;
  init: any;
  line: any;
  column: any;

  constructor(name, type, init, line = 0, column = 0) {
    this.name = name;         // string
    this.type = type;         // string (type name)
    this.init = init;         // Expr or null (for built-in types without init)
    this.line = line;
    this.column = column;
  }
}

class FnDecl {
  name: any;
  params: any;
  returnType: any;
  body: any;
  line: any;
  column: any;

  constructor(name, params, returnType, body, line = 0, column = 0) {
    this.name = name;
    this.params = params;     // Array<{name: string, type: string}>
    this.returnType = returnType;
    this.body = body;         // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class ReturnStmt {
  value: any;
  line: any;
  column: any;

  constructor(value, line = 0, column = 0) {
    this.value = value;       // Expr or null
    this.line = line;
    this.column = column;
  }
}

class IfStmt {
  condition: any;
  thenBlock: any;
  line: any;
  column: any;

  constructor(condition, thenBlock, line = 0, column = 0) {
    this.condition = condition;
    this.thenBlock = thenBlock; // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class ExpressionStmt {
  expression: any;
  line: any;
  column: any;

  constructor(expression, line = 0, column = 0) {
    this.expression = expression;
    this.line = line;
    this.column = column;
  }
}

class ImportStmt {
  name: any;
  from: any;
  line: any;
  column: any;

  constructor(name, from, line = 0, column = 0) {
    this.name = name;         // string (imported name)
    this.from = from;         // string (module path)
    this.line = line;
    this.column = column;
  }
}

class ExportStmt {
  decl: any;
  line: any;
  column: any;

  constructor(decl, line = 0, column = 0) {
    this.decl = decl;         // FnDecl
    this.line = line;
    this.column = column;
  }
}

class TypeDecl {
  name: any;
  fields: any;
  line: any;
  column: any;

  constructor(name, fields, line = 0, column = 0) {
    this.name = name;         // string
    this.fields = fields;     // Array<{name: string, type: string}>
    this.line = line;
    this.column = column;
  }
}

// ── Type annotations ────────────────────────────────────────────

class TypeAnnotation {
  name: any;
  typeParams: any;
  line: any;
  column: any;

  constructor(name, typeParams = null, line = 0, column = 0) {
    this.name = name;         // string (e.g., 'Int', 'List', 'Result')
    this.typeParams = typeParams; // Array<string> or null
    this.line = line;
    this.column = column;
  }

  toString() {
    if (this.typeParams) {
      return `${this.name}<${this.typeParams.join(', ')}>`;
    }
    return this.name;
  }

  equals(other) {
    if (!other) return false;
    if (this.name !== other.name) return false;
    if (!this.typeParams && !other.typeParams) return true;
    if (!this.typeParams || !other.typeParams) return false;
    if (this.typeParams.length !== other.typeParams.length) return false;
    return this.typeParams.every((p, i) => p === other.typeParams[i]);
  }
}

// ── AST root ────────────────────────────────────────────────────

class Program {
  stmts: any;
  modules: any;

  constructor(stmts, modules = new Map()) {
    this.stmts = stmts;       // Array<Statement>
    this.modules = modules;   // Map<moduleName, { exports: Map<name, FnDecl> }>
  }
}

export {
  // Expression nodes
  LiteralExpr,
  IdentifierExpr,
  BinOpExpr,
  UnOpExpr,
  CallExpr,
  MethodCallExpr,
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

  // Statement nodes
  LetStmt,
  FnDecl,
  ReturnStmt,
  IfStmt,
  ExpressionStmt,
  ImportStmt,
  ExportStmt,
  TypeDecl,

  // Type annotation
  TypeAnnotation,

  // Root
  Program,
};
