/**
 * Type checker for the Simplex language.
 * Static checking: types, scopes, fields, function signatures, recursion.
 * 
 * Design principles:
 * - Local checking: errors found in their immediate context
 * - No user-defined generics, only built-in parameterized types
 * - Concrete types only
 * - Explicit type annotations required everywhere
 */

import {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  MethodCallExpr, FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
} from '../ast/nodes.js';

// ── Built-in types ──────────────────────────────────────────────

const BUILTIN_TYPES = {
  Int: { kind: 'primitive', params: null },
  String: { kind: 'primitive', params: null },
  Bool: { kind: 'primitive', params: null },
  Unit: { kind: 'primitive', params: null },
  List: { kind: 'generic', params: 1 },      // List<T>
  Result: { kind: 'generic', params: 1 },     // Result<T>
  Map: { kind: 'generic', params: 2 },        // Map<K, V>
  Task: { kind: 'generic', params: 1 },       // Task<T>
};

const BUILTINS = new Set(Object.keys(BUILTIN_TYPES));

// ── Type checking error ─────────────────────────────────────────

class TypeError extends Error {
  line: any;
  column: any;
  name: any;

  constructor(message, line, column) {
    super(`Type error [${line}:${column}]: ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'TypeError';
  }
}

// ── Scope entry ─────────────────────────────────────────────────

class ScopeEntry {
  name: any;
  type: any;
  isMutable: any;

  constructor(name, type, isMutable = false) {
    this.name = name;
    this.type = type;           // TypeAnnotation
    this.isMutable = isMutable;
  }
}

// ── Type checker ────────────────────────────────────────────────

class TypeChecker {
  scopes: any;
  typeDecls: any;
  fnDecls: any;
  errors: any;
  program: any;
  imports: any;
  scopeBindings: any;
  _typeVarBindings: any;
  constructor() {
    this.scopes = [];           // Stack of scopes
    this.typeDecls = new Map(); // name -> TypeDecl
    this.fnDecls = new Map();   // name -> FnDecl
    this.errors = [];
  }

  check(program, options: { imports?: Map<string, any> } = {}) {
    this.program = program;

    // Import external module exports (from ModuleLoader)
    // key = module file path as loaded (absolute path)
    this.imports = options.imports || new Map();

    // Initialize scope stack
    this.enterScope();

    // First pass: collect type declarations and function declarations
    this.collectDeclarations();

    // Second pass: check top-level statements
    for (const stmt of program.stmts) {
      this.checkStmt(stmt);
    }

    // Third pass: check all function bodies
    for (const [_, fn] of this.fnDecls) {
      this.checkFnBody(fn);
    }

    // Fourth pass: check for mutually recursive types
    this.checkMutualRecursion();

    if (this.errors.length > 0) {
      const first = this.errors[0];
      throw first;
    }

    return program;
  }

  // ── Declaration collection ────────────────────────────────────

  collectDeclarations() {
    for (const stmt of this.program.stmts) {
      if (stmt instanceof TypeDecl) {
        this.typeDecls.set(stmt.name, stmt);
      }
      if (stmt instanceof FnDecl && stmt.name) {
        this.fnDecls.set(stmt.name, stmt);
      }
      if (stmt instanceof ExportStmt && stmt.decl instanceof FnDecl) {
        if (stmt.decl.name) {
          this.fnDecls.set(stmt.decl.name, stmt.decl);
        }
      }
    }
  }

  // ── Statement checking ────────────────────────────────────────

  checkStmt(stmt) {
    switch (stmt.constructor) {
      case LetStmt:
        return this.checkLet(stmt);
      case IfStmt:
        return this.checkIf(stmt);
      case ReturnStmt:
        return this.checkReturn(stmt);
      case ExpressionStmt:
        return this.checkExpr(stmt.expression);
      case FnDecl:
        return; // Checked in checkFnBody
      case TypeDecl:
        return; // Type declarations are collected in collectDeclarations
      case ImportStmt:
        return this.checkImport(stmt);
      case ExportStmt:
        return this.checkStmt(stmt.decl);
      default:
        throw new TypeError(`Unknown statement: ${stmt.constructor.name}`, stmt.line, stmt.column);
    }
  }

  checkLet(stmt) {
    this.checkExpr(stmt.init, stmt.type);
    this.scopeBindings.set(stmt.name, new ScopeEntry(stmt.name, stmt.type));
  }

  checkImport(stmt) {
    // Import path from source is relative; the loader stores moduleData by the import key
    const moduleData = this.imports.get(stmt.from);
    if (!moduleData || !moduleData.exports || moduleData.exports.size === 0) {
      throw new TypeError(
        `Module '${stmt.from}' has no exports`,
        stmt.line, stmt.column
      );
    }

    // Register the namespace identifier (e.g., 'math') as a record type
    // so that math.add, math.multiply are type-checked as field accesses
    const fieldTypes = [];
    for (const [name, fnDecl] of moduleData.exports) {
      const retType = fnDecl.returnType || new TypeAnnotation('Unit');
      const paramTypes = fnDecl.params.map(p => p.type);
      const fnType = new TypeAnnotation('Fn', [...paramTypes, retType], stmt.line, stmt.column);
      // Register qualified name in scope (e.g., math.add -> Fn<...>)
      const qualifiedName = `${stmt.name}.${name}`;
      this.scopeBindings.set(qualifiedName, new ScopeEntry(qualifiedName, fnType));
      // Track field types for the namespace record
      fieldTypes.push({ name, type: fnType });
    }

    // Register 'math' as a record type containing these function fields
    const namespaceType = new TypeAnnotation('Record', fieldTypes.map(f => f.type), stmt.line, stmt.column);
    this.scopeBindings.set(stmt.name, new ScopeEntry(stmt.name, namespaceType));
  }

  checkIf(stmt) {
    this.checkExpr(stmt.condition, new TypeAnnotation('Bool'));
    for (const s of stmt.thenBlock) {
      this.checkStmt(s);
    }
  }

  checkReturn(stmt) {
    if (stmt.value) {
      this.checkExpr(stmt.value);
    }
  }

  // ── Expression checking ───────────────────────────────────────

  checkExpr(expr, expectedType = null) {
    const inferred = this.inferType(expr, expectedType);
    if (expectedType && !this.typesMatch(inferred, expectedType)) {
      // If the inferred type has unresolvable type variables, try to
      // use the expected type to instantiate them.
      const resolved = this.resolveTypeVars(inferred, this._typeVarBindings);
      if (resolved && this.typesMatch(resolved, expectedType)) {
        return resolved;
      }
      throw new TypeError(
        `Expected type ${expectedType.toString()} but got ${inferred.toString()}`,
        expr.line, expr.column
      );
    }
    return inferred;
  }

  inferType(expr, expectedType = null) {
    switch (expr.constructor) {
      case LiteralExpr:
        return this.inferLiteralType(expr.value);

      case IdentifierExpr:
        return this.lookupIdentifier(expr.name);

      case BinOpExpr:
        return this.inferBinOp(expr);

      case LambdaExpr:
        return this.inferLambda(expr);

      case UnOpExpr:
        return this.inferUnOp(expr);

      case CallExpr:
        return this.inferCall(expr, expectedType);

      case MethodCallExpr:
        return this.inferMethodCall(expr);

      case FieldAccessExpr:
        return this.inferFieldAccess(expr);

      case IfExpr:
        return this.inferIfExpr(expr);

      case BlockExpr:
        return this.inferBlock(expr);

      case RecordCreateExpr:
        return this.inferRecordCreate(expr, expectedType);

      case ListCreateExpr:
        return this.inferListCreate(expr);

      case MapCreateExpr:
        return this.inferMapCreate(expr);

      case ResultOkExpr:
        return this.inferResultOk(expr, expectedType);

      case ResultErrExpr:
        return this.inferResultErr(expr, expectedType);

      case UnitExpr:
        return new TypeAnnotation('Unit');

      default:
        throw new TypeError(`Cannot infer type for: ${expr.constructor.name}`, expr.line, expr.column);
    }
  }

  inferLiteralType(value) {
    if (typeof value === 'number') {
      // Check if it's an integer or float
      if (Number.isInteger(value)) {
        return new TypeAnnotation('Int');
      }
      // Floats are coerced to Int for now
      return new TypeAnnotation('Int');
    }
    if (typeof value === 'string') {
      return new TypeAnnotation('String');
    }
    if (typeof value === 'boolean') {
      return new TypeAnnotation('Bool');
    }
    if (value === null) {
      return new TypeAnnotation('Unit');
    }
    throw new TypeError(`Unknown literal type`, 0, 0);
  }

  lookupIdentifier(name) {
    // Search through scope stack
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const scope = this.scopes[i];
      if (scope.has(name)) {
        return scope.get(name).type;
      }
    }

    // Check if it's a builtin function
    if (BUILTIN_FUNCTIONS.has(name)) {
      return BUILTIN_FUNCTIONS.get(name);
    }

    // Check if it's a known function
    if (this.fnDecls.has(name)) {
      return this.fnDecls.get(name).returnType;
    }

    throw new TypeError(`Undefined variable: ${name}`, 0, 0);
  }

  // ── Lambda type inference ──────────────────────────────────────

  inferLambda(expr) {
    // Build a scope for lambda params (one push for all params)
    this.enterScope();
    const paramTypes = [];
    for (const p of expr.params) {
      paramTypes.push(p.type);  // already a TypeAnnotation
      this.scopeBindings.set(p.name, new ScopeEntry(p.name, p.type));
    }

    // Infer return type from body
    let returnType = expr.returnType;
    if (!returnType) {
      const lastStmt = expr.body[expr.body.length - 1];
      if (lastStmt instanceof ReturnStmt && lastStmt.value) {
        returnType = this.inferExprType(lastStmt.value);
      } else if (lastStmt instanceof ExpressionStmt) {
        returnType = this.inferExprType(lastStmt.expression);
      } else {
        returnType = new TypeAnnotation('Unit');
      }
    }

    // Check all return statements match
    for (const stmt of expr.body) {
      if (stmt instanceof ReturnStmt) {
        if (stmt.value) {
          const retType = this.inferExprType(stmt.value);
          if (!this.typesMatch(retType, returnType)) {
            throw new TypeError(
              `Lambda return type: expected ${returnType.toString()} but got ${retType.toString()}`,
              stmt.line, stmt.column
            );
          }
        } else {
          if (!this.typesMatch(new TypeAnnotation('Unit'), returnType)) {
            throw new TypeError(
              `Lambda return type: expected ${returnType.toString()} but got Unit`,
              stmt.line, stmt.column
            );
          }
        }
      }
    }

    this.exitScope();

    // Fn type params: all param types + return type
    return new TypeAnnotation('Fn', [...paramTypes, returnType], expr.line, expr.column);
  }

  inferBinOp(expr) {
    const leftType = this.inferExprType(expr.left);
    const rightType = this.inferExprType(expr.right);

    // Arithmetic operators (Int only)
    if (['-', '*', '/'].includes(expr.op)) {
      if (!this.isNumeric(leftType) || !this.isNumeric(rightType)) {
        throw new TypeError(
          `Arithmetic operator '${expr.op}' requires numeric types, got ${leftType.toString()} and ${rightType.toString()}`,
          expr.line, expr.column
        );
      }
      return new TypeAnnotation('Int');
    }

    // Addition: Int + Int = Int, String + String = String
    if (expr.op === '+') {
      if (this.isNumeric(leftType) && this.isNumeric(rightType)) {
        return new TypeAnnotation('Int');
      }
      if (leftType.name === 'String' && rightType.name === 'String') {
        return new TypeAnnotation('String');
      }
      throw new TypeError(
        `Operator '+' requires matching numeric or string types, got ${leftType.toString()} and ${rightType.toString()}`,
        expr.line, expr.column
      );
    }

    // Comparison operators
    if (['==', '!=', '<', '>', '<=', '>='].includes(expr.op)) {
      if (!this.canCompare(leftType, rightType)) {
        throw new TypeError(
          `Comparison operator '${expr.op}' requires matching types, got ${leftType.toString()} and ${rightType.toString()}`,
          expr.line, expr.column
        );
      }
      return new TypeAnnotation('Bool');
    }

    // Boolean operators
    if (expr.op === 'and' || expr.op === 'or') {
      if (leftType.name !== 'Bool' || rightType.name !== 'Bool') {
        throw new TypeError(
          `Boolean operator '${expr.op}' requires Bool types, got ${leftType.toString()} and ${rightType.toString()}`,
          expr.line, expr.column
        );
      }
      return new TypeAnnotation('Bool');
    }

    throw new TypeError(`Unknown operator: ${expr.op}`, expr.line, expr.column);
  }

  inferUnOp(expr) {
    const operandType = this.inferExprType(expr.operand);

    if (expr.op === 'not') {
      if (operandType.name !== 'Bool') {
        throw new TypeError(`'not' operator requires Bool, got ${operandType.toString()}`, expr.line, expr.column);
      }
      return new TypeAnnotation('Bool');
    }

    if (expr.op === '-') {
      if (!this.isNumeric(operandType)) {
        throw new TypeError(`Negation requires numeric type, got ${operandType.toString()}`, expr.line, expr.column);
      }
      return new TypeAnnotation('Int');
    }

    throw new TypeError(`Unknown unary operator: ${expr.op}`, expr.line, expr.column);
  }

  inferCall(expr, expectedType = null) {
    // Handle: fnName(args)
    let fnType;

    if (expr.callee instanceof IdentifierExpr) {
      const fnName = expr.callee.name;

      // Polymorphic get/has/put — dispatch on first arg type
      if (fnName === 'get' || fnName === 'has' || fnName === 'put') {
        return this.inferPolyBuiltin(expr, fnName);
      }

      // Built-in function
      if (BUILTIN_FUNCTIONS.has(fnName)) {
        fnType = BUILTIN_FUNCTIONS.get(fnName);
        const sig = fnType;
        const typeVars = new Map();
        // Unify type variables from actual argument types
        for (let i = 0; i < expr.args.length; i++) {
          const inferredType = this.inferExprType(expr.args[i]);
          const expectedType = sig.paramTypes[i] instanceof TypeAnnotation
            ? sig.paramTypes[i]
            : new TypeAnnotation(String(sig.paramTypes[i]));
          this.unifyTypeVars(expectedType, inferredType, typeVars);
        }
        // Bind remaining type vars from expected type context if available
        const resolvedReturn = this.resolveTypeVars(sig.returnType, typeVars, expectedType);
        return resolvedReturn;
      }

      // User-defined function
      if (this.fnDecls.has(fnName)) {
        const fn = this.fnDecls.get(fnName);
        this.checkUserFunctionCall(fn, expr.args, expr);
        return fn.returnType;
      }

      // Lambda bound via let — lookupIdentifier returns Fn type annotation
      const maybeFn = this.lookupIdentifier(fnName);
      if (maybeFn && maybeFn.name === 'Fn') {
        // Fn has params as typeParams: Fn<A, B, C> means params [A, B] returns C
        const typeParams = maybeFn.typeParams || [];
        // Last type param is return type, rest are params
        if (expr.args.length !== typeParams.length - 1) {
          throw new TypeError(
            `Lambda expects ${typeParams.length - 1} args, got ${expr.args.length}`,
            expr.line, expr.column
          );
        }
        for (let i = 0; i < expr.args.length; i++) {
          const actual = this.inferExprType(expr.args[i]);
          const expected = typeParams[i];
          if (!this.typesMatch(actual, expected)) {
            throw new TypeError(
              `Lambda arg ${i}: expected ${expected.toString()} but got ${actual.toString()}`,
              expr.line, expr.column
            );
          }
        }
        // Return type is the last type param
        return typeParams[typeParams.length - 1];
      }

      throw new TypeError(`Undefined function: ${fnName}`, expr.callee.line, expr.callee.column);
    }

    throw new TypeError(`Cannot call non-function expression`, expr.line, expr.column);
  }

  inferMethodCall(expr) {
    const objectType = this.inferExprType(expr.object);
    const methodName = expr.method;

    // Check if it's a module namespace method (e.g., math.add)
    if (objectType.name === 'Record' && objectType.typeParams) {
      const qualifiedName = `${expr.object.name || 'unknown'}.${methodName}`;
      const qualifiedBinding = this.scopeBindings.get(qualifiedName);
      if (qualifiedBinding) {
        // It's a module function call - check args and return type
        const sig = qualifiedBinding.type;
        const expectedParams = sig.typeParams ? sig.typeParams.slice(0, -1) : [];
        const returnType = sig.typeParams ? sig.typeParams[sig.typeParams.length - 1] : new TypeAnnotation('Unit');
        if (expr.args.length !== expectedParams.length) {
          throw new TypeError(
            `${qualifiedName} expects ${expectedParams.length} args, got ${expr.args.length}`,
            expr.line, expr.column
          );
        }
        for (let i = 0; i < expr.args.length; i++) {
          const actual = this.inferExprType(expr.args[i]);
          const expected = expectedParams[i];
          if (!this.typesMatch(actual, expected)) {
            throw new TypeError(
              `${qualifiedName} arg ${i}: expected ${expected.toString()} but got ${actual.toString()}`,
              expr.line, expr.column
            );
          }
        }
        return returnType;
      }
    }

    // Built-in methods
    const methodKey = `${objectType.name}.${methodName}`;
    if (BUILTIN_METHODS.has(methodKey)) {
      const sig = BUILTIN_METHODS.get(methodKey);
      const typeVars = new Map();
      // Collect type vars from args
      for (let i = 0; i < expr.args.length; i++) {
        const inferredType = this.inferExprType(expr.args[i]);
        const expectedType = sig.paramTypes[i] instanceof TypeAnnotation
          ? sig.paramTypes[i]
          : new TypeAnnotation(String(sig.paramTypes[i]));
        this.unifyTypeVars(expectedType, inferredType, typeVars);
      }
      const resolvedReturn = this.resolveTypeVars(sig.returnType, typeVars);
      return resolvedReturn;
    }

    throw new TypeError(`Unknown method: ${methodKey}`, expr.line, expr.column);
  }

  inferFieldAccess(expr) {
    const objectType = this.inferExprType(expr.object);

    // Check if it's a known record type (from type declaration)
    const typeDecl = this.typeDecls.get(objectType.name);
    if (typeDecl) {
      const field = typeDecl.fields.find(f => f.name === expr.field);
      if (!field) {
        throw new TypeError(
          `Record type '${objectType.name}' has no field '${expr.field}'`,
          expr.line, expr.column
        );
      }
      return field.type;
    }

    // Check if it's a module namespace (e.g., math.add from import)
    const objBinding = this.lookupIdentifier(expr.object.name || 'unknown');
    if (objBinding && objBinding.name === 'Record' && objectType.typeParams) {
      // Module namespace - look up qualified name in scope
      const qualifiedName = `${expr.object.name}.${expr.field}`;
      const qualifiedBinding = this.scopeBindings.get(qualifiedName);
      if (qualifiedBinding) {
        return qualifiedBinding.type;
      }
    }

    throw new TypeError(
      `Cannot access field '${expr.field}' on type ${objectType.toString()}`,
      expr.line, expr.column
    );
  }

  inferIfExpr(expr) {
    this.checkExpr(expr.condition, new TypeAnnotation('Bool'));
    for (const s of expr.thenBlock) {
      this.checkStmt(s);
    }
    return new TypeAnnotation('Unit');
  }

  inferBlock(expr) {
    let lastType = new TypeAnnotation('Unit');
    for (const s of expr.stmts) {
      lastType = this.checkStmtWithReturn(s);
    }
    return lastType;
  }

  inferRecordCreate(expr, expectedType = null) {
    // If we have an expected type, use it
    let typeName = null;
    if (expectedType && expectedType.name) {
      typeName = expectedType.name;
    } else if (expr.fields.length > 0) {
      // Fallback: use the first field's key as the type name
      typeName = expr.fields[0].key;
    } else {
      typeName = 'Record';
    }

    const typeDecl = this.typeDecls.get(typeName);
    if (!typeDecl) {
      throw new TypeError(
        `Unknown record type: ${typeName}`,
        expr.line, expr.column
      );
    }

    const fields = {};
    for (const field of expr.fields) {
      const decl = typeDecl.fields.find(f => f.name === field.key);
      if (!decl) {
        throw new TypeError(
          `Record type has no field '${field.key}'`,
          field.key?.line || expr.line,
          field.key?.column || expr.column
        );
      }
      this.checkExpr(field.value, decl.type);
      fields[field.key] = this.inferExprType(field.value);
    }

    return new TypeAnnotation(typeName, null, expr.line, expr.column);
  }

  inferListCreate(expr) {
    if (expr.elements.length === 0) {
      throw new TypeError(`Empty list has no type information`, expr.line, expr.column);
    }

    const elementType = this.inferExprType(expr.elements[0]);
    for (let i = 1; i < expr.elements.length; i++) {
      const t = this.inferExprType(expr.elements[i]);
      if (!this.typesMatch(elementType, t)) {
        throw new TypeError(
          `List element type mismatch at index ${i}: expected ${elementType.toString()}, got ${t.toString()}`,
          expr.elements[i].line, expr.elements[i].column
        );
      }
    }

    return new TypeAnnotation('List', [elementType], expr.line, expr.column);
  }

  inferMapCreate(expr) {
    if (expr.entries.length === 0) {
      throw new TypeError(`Empty map has no type information`, expr.line, expr.column);
    }

    const keyType = this.inferExprType(expr.entries[0].key);
    const valueType = this.inferExprType(expr.entries[0].value);

    for (let i = 1; i < expr.entries.length; i++) {
      const kt = this.inferExprType(expr.entries[i].key);
      const vt = this.inferExprType(expr.entries[i].value);
      if (!this.typesMatch(keyType, kt) || !this.typesMatch(valueType, vt)) {
        throw new TypeError(
          `Map key/value type mismatch at index ${i}`,
          expr.entries[i].key.line, expr.entries[i].key.column
        );
      }
    }

    return new TypeAnnotation('Map', [keyType, valueType], expr.line, expr.column);
  }

  inferResultOk(expr, expectedType = null) {
    const innerType = this.inferExprType(expr.value);
    return new TypeAnnotation('Result', [innerType], expr.line, expr.column);
  }

  inferResultErr(expr, expectedType = null) {
    const msgType = this.inferExprType(expr.message);
    if (msgType.name !== 'String') {
      throw new TypeError(`err() requires String argument`, expr.line, expr.column);
    }
    if (expectedType && expectedType.name === 'Result' && expectedType.typeParams && expectedType.typeParams.length === 1) {
      return new TypeAnnotation('Result', [expectedType.typeParams[0]], expr.line, expr.column);
    }
    return new TypeAnnotation('Result', [new TypeAnnotation('Unit')], expr.line, expr.column);
  }

  // ── Helper methods ────────────────────────────────────────────

  inferExprType(expr) {
    return this.inferType(expr);
  }

  isNumeric(type) {
    return type.name === 'Int';
  }

  canCompare(left, right) {
    if (left.name !== right.name) return false;
    // Can compare primitives and same-parameterized types
    if (left.kind === 'generic' && right.kind === 'generic') {
      if (left.typeParams?.length !== right.typeParams?.length) return false;
      if (left.typeParams) {
        return left.typeParams.every((p, i) => p === right.typeParams[i]);
      }
    }
    return true;
  }

  typesMatch(a, b) {
    if (a.name !== b.name) return false;
    if (!a.typeParams && !b.typeParams) return true;
    if (!a.typeParams || !b.typeParams) return false;
    if (a.typeParams.length !== b.typeParams.length) return false;
    // Compare type parameters structurally
    for (let i = 0; i < a.typeParams.length; i++) {
      const p1 = a.typeParams[i];
      const p2 = b.typeParams[i];
      // Normalize: get the name string
      const name1 = typeof p1 === 'string' ? p1 : (p1 instanceof TypeAnnotation ? p1.name : String(p1));
      const name2 = typeof p2 === 'string' ? p2 : (p2 instanceof TypeAnnotation ? p2.name : String(p2));
      if (name1 !== name2) return false;
    }
    return true;
  }

  checkCallArgs(sig, args, fnName, expr) {
    if (args.length !== sig.paramTypes.length) {
      throw new TypeError(
        `Function '${fnName}' expects ${sig.paramTypes.length} arguments, got ${args.length}`,
        expr.line, expr.column
      );
    }

    // Build type variable substitution from actual argument types
    const typeVars = new Map();

    for (let i = 0; i < args.length; i++) {
      const expectedType = sig.paramTypes[i];
      const inferredType = this.inferExprType(args[i]);
      // Unify type variables in the expected type with inferred types
      this.unifyTypeVars(expectedType, inferredType, typeVars);
    }

    // Check arguments with resolved types
    for (let i = 0; i < args.length; i++) {
      const expectedType = this.resolveTypeVars(sig.paramTypes[i], typeVars);
      this.checkExpr(args[i], expectedType);
    }
  }

  /**
   * Unify a type variable in the expected type with the actual inferred type.
   * e.g., T -> Int means typeVars.set('T', Int).
   */
  unifyTypeVars(expectedType, inferredType, typeVars) {
    // Check if expected type contains type variables (names starting with $)
    if (expectedType.name.startsWith('$')) {
      const tv = expectedType.name;
      if (!typeVars.has(tv)) {
        typeVars.set(tv, inferredType);
      }
      return;
    }
    // For parameterized types, recurse into type params
    if (expectedType.typeParams && inferredType.typeParams) {
      for (let i = 0; i < expectedType.typeParams.length; i++) {
        const expParam = expectedType.typeParams[i] instanceof TypeAnnotation
          ? expectedType.typeParams[i]
          : new TypeAnnotation(String(expectedType.typeParams[i]));
        const infParam = inferredType.typeParams[i] instanceof TypeAnnotation
          ? inferredType.typeParams[i]
          : new TypeAnnotation(String(inferredType.typeParams[i]));
        this.unifyTypeVars(expParam, infParam, typeVars);
      }
    }
  }

  /**
   * Substitute type variables in a type with their resolved types.
   * If a type variable can't be resolved from typeVars, try the expected type context.
   */
  resolveTypeVars(type, typeVars, expectedFromContext = null) {
    if (type.name.startsWith('$')) {
      const resolved = typeVars.get(type.name);
      if (resolved) return resolved;
      // Try to get the variable from the expected type context (e.g., let x: Result<Int> = map_get(...))
      if (expectedFromContext && expectedFromContext.typeParams) {
        // Search expected type's params for matching variable name
        const idx = this.findTypeVarIndex(expectedFromContext, type.name);
        if (idx >= 0) {
          return expectedFromContext.typeParams[idx];
        }
      }
      return type;
    }
    if (type.typeParams) {
      const resolvedParams = type.typeParams.map(p => {
        const pa = p instanceof TypeAnnotation ? p : new TypeAnnotation(String(p));
        return this.resolveTypeVars(pa, typeVars, expectedFromContext);
      });
      return new TypeAnnotation(type.name, resolvedParams, type.line, type.column);
    }
    return type;
  }

  /**
   * Find the index of a type variable name in a parameterized type.
   */
  findTypeVarIndex(typeAnnotation, varName) {
    if (!typeAnnotation.typeParams) return -1;
    for (let i = 0; i < typeAnnotation.typeParams.length; i++) {
      const p = typeAnnotation.typeParams[i] instanceof TypeAnnotation
        ? typeAnnotation.typeParams[i]
        : new TypeAnnotation(String(typeAnnotation.typeParams[i]));
      if (p.name === varName) return i;
    }
    return -1;
  }

  checkUserFunctionCall(fn, args, expr) {
    if (args.length !== fn.params.length) {
      throw new TypeError(
        `Function '${fn.name}' expects ${fn.params.length} arguments, got ${args.length}`,
        expr.line, expr.column
      );
    }

    for (let i = 0; i < args.length; i++) {
      const expectedType = fn.params[i].type;
      this.checkExpr(args[i], expectedType);
    }
  }

  checkFnBody(fn) {
    this.enterScope();

    // Add parameters to scope
    for (const param of fn.params) {
      this.scopeBindings.set(param.name, new ScopeEntry(param.name, param.type));
    }

    // Check body statements (all except the last one)
    let hasExplicitReturn = false;
    for (let i = 0; i < fn.body.length - 1; i++) {
      const stmt = fn.body[i];
      this.checkStmt(stmt);
      if (stmt instanceof ReturnStmt) {
        hasExplicitReturn = true;
      }
    }

    // Check last statement separately with expected return type
    if (fn.body.length > 0) {
      const lastStmt = fn.body[fn.body.length - 1];
      if (lastStmt instanceof ReturnStmt) {
        // Explicit return - check its value type
        if (lastStmt.value) {
          this.checkExpr(lastStmt.value, fn.returnType);
        }
        hasExplicitReturn = true;
      } else if (lastStmt.expression) {
        // Last expression is the return value - check with expected type
        this.checkExpr(lastStmt.expression, fn.returnType);
      }
    }

    this.exitScope();
  }

  checkStmtWithReturn(stmt) {
    if (stmt instanceof ReturnStmt) {
      if (stmt.value) {
        return this.inferExprType(stmt.value);
      }
      return new TypeAnnotation('Unit');
    }

    if (stmt instanceof ExpressionStmt) {
      return this.inferExprType(stmt.expression);
    }

    if (stmt instanceof IfStmt) {
      return new TypeAnnotation('Unit');
    }

    if (stmt instanceof LetStmt) {
      return new TypeAnnotation('Unit');
    }

    return new TypeAnnotation('Unit');
  }

  checkMutualRecursion() {
    // Check for mutually recursive type declarations
    // Build dependency graph
    const deps = new Map();
    for (const [name, decl] of this.typeDecls) {
      const depSet = new Set();
      for (const field of decl.fields) {
        if (this.typeDecls.has(field.type.name)) {
          depSet.add(field.type.name);
        }
      }
      deps.set(name, depSet);
    }

    // Detect cycles using DFS
    const visited = new Set();
    const recStack = new Set();

    const dfs = (node) => {
      visited.add(node);
      recStack.add(node);

      const neighbors = deps.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          throw new TypeError(
            `Mutually recursive type declarations detected: ${node} <-> ${neighbor}`,
            0, 0
          );
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of deps.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
  }

  enterScope() {
    this.scopes.push(new Map());
    this.scopeBindings = this.scopes[this.scopes.length - 1];
  }

  exitScope() {
    this.scopes.pop();
    this.scopeBindings = this.scopes[this.scopes.length - 1] || new Map();
  }

  // ── Polymorphic builtins (get, has, put) ────────────────────────

  inferPolyBuiltin(expr, fnName) {
    if (expr.args.length < 1) {
      throw new TypeError(`${fnName} expects at least 1 argument`, expr.line, expr.column);
    }
    const firstType = this.inferExprType(expr.args[0]);

    if (fnName === 'get') {
      if (expr.args.length !== 2) {
        throw new TypeError(`get expects 2 arguments, got ${expr.args.length}`, expr.line, expr.column);
      }
      const keyType = this.inferExprType(expr.args[1]);

      if (firstType.name === 'List') {
        if (keyType.name !== 'Int') {
          throw new TypeError(`List index must be Int, got ${keyType.name}`, expr.line, expr.column);
        }
        const elemType = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation('$T');
        return elemType;
      }

      if (firstType.name === 'Map') {
        const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation('$K');
        if (!this.typesMatch(keyType, keyParam)) {
          throw new TypeError(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
        }
        const valType = firstType.typeParams && firstType.typeParams[1] || new TypeAnnotation('$V');
        return valType;
      }

      throw new TypeError(`get expects a List or Map, got ${firstType.name}`, expr.line, expr.column);
    }

    if (fnName === 'has') {
      if (expr.args.length !== 2) {
        throw new TypeError(`has expects 2 arguments, got ${expr.args.length}`, expr.line, expr.column);
      }
      const keyType = this.inferExprType(expr.args[1]);

      if (firstType.name !== 'Map') {
        throw new TypeError(`has expects a Map, got ${firstType.name}`, expr.line, expr.column);
      }
      const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation('$K');
      if (!this.typesMatch(keyType, keyParam)) {
        throw new TypeError(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
      }
      return new TypeAnnotation('Bool');
    }

    if (fnName === 'put') {
      if (expr.args.length !== 3) {
        throw new TypeError(`put expects 3 arguments, got ${expr.args.length}`, expr.line, expr.column);
      }
      const keyType = this.inferExprType(expr.args[1]);
      const valType = this.inferExprType(expr.args[2]);

      if (firstType.name !== 'Map') {
        throw new TypeError(`put expects a Map, got ${firstType.name}`, expr.line, expr.column);
      }
      const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation('$K');
      const valParam = firstType.typeParams && firstType.typeParams[1] || new TypeAnnotation('$V');
      if (!this.typesMatch(keyType, keyParam)) {
        throw new TypeError(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
      }
      if (!this.typesMatch(valType, valParam)) {
        throw new TypeError(`Map value must be ${valParam.toString()}, got ${valType.toString()}`, expr.line, expr.column);
      }
      return new TypeAnnotation('Unit');
    }

    throw new TypeError(`Unknown polymorphic builtin: ${fnName}`, expr.line, expr.column);
  }
}

// ── Built-in function signatures ────────────────────────────────

const BUILTIN_FUNCTIONS = new Map([
  // String builtins
  ['len', { paramTypes: [new TypeAnnotation('$T')], returnType: new TypeAnnotation('Int') }],
  ['concat', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String')], returnType: new TypeAnnotation('String') }],
  ['substring', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('Int'), new TypeAnnotation('Int')], returnType: new TypeAnnotation('String') }],
  ['parse_int', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('Int')]) }],
  ['to_string', { paramTypes: [new TypeAnnotation('$T')], returnType: new TypeAnnotation('String') }],
  ['print', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Unit') }],

  // List builtins (as functions)
  ['append', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('$T')], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],
  ['list_get', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Int')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('$T')]) }],
  ['list_len', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('Int') }],
  ['substring_list', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Int'), new TypeAnnotation('Int')], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],

  // Result builtins
  ['is_ok', { paramTypes: [new TypeAnnotation('Result', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('Bool') }],
  ['is_err', { paramTypes: [new TypeAnnotation('Result', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('Bool') }],
  ['unwrap', { paramTypes: [new TypeAnnotation('Result', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('$T') }],
  ['unwrap_err', { paramTypes: [new TypeAnnotation('Result', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('String') }],

  // Map builtins (fully generic)
  ['map_put', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K'), new TypeAnnotation('$V')], returnType: new TypeAnnotation('Unit') }],
  ['map_get', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('$V')]) }],
  ['map_has', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K')], returnType: new TypeAnnotation('Bool') }],
  ['map_remove', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K')], returnType: new TypeAnnotation('Unit') }],

  // File I/O
  ['file_read', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('String')]) }],
  ['file_read_lines', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('List', [new TypeAnnotation('String')])]) }],
  ['file_write', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('Unit')]) }],

  // Task builtins
  // spawn(expr) — wraps any expression into a Task<T> where T = expr's type
  ['spawn', { paramTypes: [new TypeAnnotation('$T')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('$T')]) }],
  ['join', { paramTypes: [new TypeAnnotation('Task', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('$T') }],
]);

// ── Built-in method signatures ──────────────────────────────────

const BUILTIN_METHODS = new Map([
  // String methods
  ['String.len', { paramTypes: [], returnType: new TypeAnnotation('Int') }],
  ['String.concat', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('String') }],
  ['String.substring', { paramTypes: [new TypeAnnotation('Int'), new TypeAnnotation('Int')], returnType: new TypeAnnotation('String') }],
  ['String.to_string', { paramTypes: [], returnType: new TypeAnnotation('String') }],
  ['String.print', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],

  // List methods
  ['List.append', { paramTypes: [new TypeAnnotation('$T')], returnType: new TypeAnnotation('Unit') }],
  ['List.get', { paramTypes: [new TypeAnnotation('Int')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('$T')]) }],
  ['List.len', { paramTypes: [], returnType: new TypeAnnotation('Int') }],

  // Result methods
  ['Result.is_ok', { paramTypes: [], returnType: new TypeAnnotation('Bool') }],
  ['Result.is_err', { paramTypes: [], returnType: new TypeAnnotation('Bool') }],
  ['Result.unwrap', { paramTypes: [], returnType: new TypeAnnotation('$T') }],
  ['Result.unwrap_err', { paramTypes: [], returnType: new TypeAnnotation('String') }],

  // Map methods
  ['Map.put', { paramTypes: [new TypeAnnotation('$K'), new TypeAnnotation('$V')], returnType: new TypeAnnotation('Unit') }],
  ['Map.get', { paramTypes: [new TypeAnnotation('$K')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('$V')]) }],
  ['Map.has', { paramTypes: [new TypeAnnotation('$K')], returnType: new TypeAnnotation('Bool') }],
  ['Map.remove', { paramTypes: [new TypeAnnotation('$K')], returnType: new TypeAnnotation('Unit') }],
]);

export { TypeChecker, TypeError, BUILTIN_FUNCTIONS, BUILTIN_METHODS };
