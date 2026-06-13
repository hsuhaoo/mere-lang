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
  constructor(value, line, column) {
    this.value = value;       // number | string | boolean | null
    this.line = line;
    this.column = column;
  }
}

class IdentifierExpr {
  constructor(name, line, column) {
    this.name = name;
    this.line = line;
    this.column = column;
  }
}

class BinOpExpr {
  constructor(op, left, right, line, column) {
    this.op = op;             // '+', '-', '*', '/', '==', '!=', '<', '>', '<=', '>=', 'and', 'or'
    this.left = left;
    this.right = right;
    this.line = line;
    this.column = column;
  }
}

class UnOpExpr {
  constructor(op, operand, line, column) {
    this.op = op;             // 'not', '-' (negation)
    this.operand = operand;
    this.line = line;
    this.column = column;
  }
}

class CallExpr {
  constructor(callee, args, line, column) {
    this.callee = callee;     // IdentifierExpr | MethodCallExpr
    this.args = args;         // Array<Expr>
    this.line = line;
    this.column = column;
  }
}

class MethodCallExpr {
  constructor(object, method, args, line, column) {
    this.object = object;
    this.method = method;     // string
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

class FieldAccessExpr {
  constructor(object, field, line, column) {
    this.object = object;
    this.field = field;
    this.line = line;
    this.column = column;
  }
}

class IfExpr {
  constructor(condition, thenBlock, line, column) {
    this.condition = condition;
    this.thenBlock = thenBlock; // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class BlockExpr {
  constructor(stmts, line, column) {
    this.stmts = stmts;       // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class LambdaExpr {
  constructor(params, returnType, body, line, column) {
    this.params = params;     // Array<{name: string, type: TypeAnnotation}>
    this.returnType = returnType; // TypeAnnotation | null
    this.body = body;         // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class RecordCreateExpr {
  constructor(fields, line, column) {
    this.fields = fields;     // Array<{key: string, value: Expr}>
    this.line = line;
    this.column = column;
  }
}

class ListCreateExpr {
  constructor(elements, line, column) {
    this.elements = elements; // Array<Expr>
    this.line = line;
    this.column = column;
  }
}

class MapCreateExpr {
  constructor(entries, line, column) {
    this.entries = entries;   // Array<{key: Expr, value: Expr}>
    this.line = line;
    this.column = column;
  }
}

class ResultOkExpr {
  constructor(value, line, column) {
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class ResultErrExpr {
  constructor(message, line, column) {
    this.message = message;
    this.line = line;
    this.column = column;
  }
}

class UnitExpr {
  constructor(line, column) {
    this.line = line;
    this.column = column;
  }
}

// ── Statement nodes (statements, not expressions) ───────────────

class LetStmt {
  constructor(name, type, init, line, column) {
    this.name = name;         // string
    this.type = type;         // string (type name)
    this.init = init;         // Expr or null (for built-in types without init)
    this.line = line;
    this.column = column;
  }
}

class FnDecl {
  constructor(name, params, returnType, body, line, column) {
    this.name = name;
    this.params = params;     // Array<{name: string, type: string}>
    this.returnType = returnType;
    this.body = body;         // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class ReturnStmt {
  constructor(value, line, column) {
    this.value = value;       // Expr or null
    this.line = line;
    this.column = column;
  }
}

class IfStmt {
  constructor(condition, thenBlock, line, column) {
    this.condition = condition;
    this.thenBlock = thenBlock; // Array<Statement>
    this.line = line;
    this.column = column;
  }
}

class ExpressionStmt {
  constructor(expression, line, column) {
    this.expression = expression;
    this.line = line;
    this.column = column;
  }
}

class ImportStmt {
  constructor(name, from, line, column) {
    this.name = name;         // string (imported name)
    this.from = from;         // string (module path)
    this.line = line;
    this.column = column;
  }
}

class ExportStmt {
  constructor(decl, line, column) {
    this.decl = decl;         // FnDecl
    this.line = line;
    this.column = column;
  }
}

class TypeDecl {
  constructor(name, fields, line, column) {
    this.name = name;         // string
    this.fields = fields;     // Array<{name: string, type: string}>
    this.line = line;
    this.column = column;
  }
}

// ── Type annotations ────────────────────────────────────────────

class TypeAnnotation {
  constructor(name, typeParams = null, line, column) {
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
  constructor(stmts, modules = new Map()) {
    this.stmts = stmts;       // Array<Statement>
    this.modules = modules;   // Map<moduleName, { exports: Map<name, FnDecl> }>
  }
}

module.exports = {
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
