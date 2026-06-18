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
  FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, MutDeclStmt, AssignStmt, WhileStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
} from '../ast/nodes.js';

// ── Built-in types ──────────────────────────────────────────────

const BUILTIN_TYPES = {
  Number: { kind: 'primitive', params: null },
  String: { kind: 'primitive', params: null },
  Boolean: { kind: 'primitive', params: null },
  Unit: { kind: 'primitive', params: null },
  List: { kind: 'generic', params: 1 },      // List<T>
  Result: { kind: 'generic', params: 1 },     // Result<T>
  Map: { kind: 'generic', params: 2 },        // Map<K, V>
  Task: { kind: 'generic', params: 1 },       // Task<T>
};

const BUILTINS = new Set(Object.keys(BUILTIN_TYPES));

// ── Type checking error ─────────────────────────────────────────

class TypeError extends Error {
  line: number;
  column: number;
  name: string;

  constructor(message: string, line: number, column: number) {
    super(`Type error [${line}:${column}]: ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'TypeError';
  }
}

// ── Scope entry ─────────────────────────────────────────────────

class ScopeEntry {
  name: string;
  type: TypeAnnotation;
  isMutable: boolean;

  constructor(name: string, type: TypeAnnotation, isMutable = false) {
    this.name = name;
    this.type = type;
    this.isMutable = isMutable;
  }
}

// ── Type checker ────────────────────────────────────────────────

class TypeChecker {
  scopes: Map<string, ScopeEntry>[];
  typeDecls: Map<string, TypeDecl>;
  fnDecls: Map<string, FnDecl>;
  errors: TypeError[];
  program: Program;
  imports: Map<string, any>;
  scopeBindings: Map<string, ScopeEntry>;
  _typeVarBindings: Map<string, TypeAnnotation>;
  constructor() {
    this.scopes = [];           // Stack of scopes
    this.typeDecls = new Map(); // name -> TypeDecl
    this.fnDecls = new Map();   // name -> FnDecl
    this.errors = [];
    this._typeVarBindings = new Map();
  }

  check(program: Program, options: { imports?: Map<string, any> } = {}) {
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
      case MutDeclStmt:
        return this.checkMutDecl(stmt);
      case AssignStmt:
        return this.checkAssign(stmt);
      case WhileStmt:
        return this.checkWhile(stmt);
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
    if (this.scopeBindings.has(stmt.name)) {
      throw new TypeError(
        `Variable '${stmt.name}' is already defined in this scope`,
        stmt.line, stmt.column
      );
    }
    this.checkExpr(stmt.init, stmt.type);
    this.scopeBindings.set(stmt.name, new ScopeEntry(stmt.name, stmt.type));
  }

  checkMutDecl(stmt) {
    if (this.scopeBindings.has(stmt.name)) {
      throw new TypeError(
        `Variable '${stmt.name}' is already defined in this scope`,
        stmt.line, stmt.column
      );
    }
    this.checkExpr(stmt.init, stmt.type);
    this.scopeBindings.set(stmt.name, new ScopeEntry(stmt.name, stmt.type, true));
  }

  checkAssign(stmt) {
    const name = stmt.name;
    let entry = null;
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        entry = this.scopes[i].get(name);
        break;
      }
    }
    if (!entry) {
      throw new TypeError(`Undefined variable: '${name}'`, stmt.line, stmt.column);
    }
    if (!entry.isMutable) {
      throw new TypeError(
        `Cannot assign to immutable variable '${name}'`,
        stmt.line, stmt.column
      );
    }
    this.checkExpr(stmt.value, entry.type);
  }

  checkWhile(stmt) {
    this.checkExpr(stmt.condition, new TypeAnnotation('Boolean'));
    for (const s of stmt.body) {
      this.checkStmt(s);
    }
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
    this.checkExpr(stmt.condition, new TypeAnnotation('Boolean'));
    for (const s of stmt.thenBlock) {
      this.checkStmt(s);
    }
    for (const elif of stmt.elifBlocks) {
      this.checkExpr(elif.condition, new TypeAnnotation('Boolean'));
      for (const s of elif.thenBlock) {
        this.checkStmt(s);
      }
    }
    if (stmt.elseBlock) {
      for (const s of stmt.elseBlock) {
        this.checkStmt(s);
      }
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
        return this.inferLiteralType(expr);

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

      case FieldAccessExpr:
        return this.inferFieldAccess(expr);

      case IfExpr:
        return this.inferIfExpr(expr);

      case BlockExpr:
        return this.inferBlock(expr);

      case RecordCreateExpr:
        return this.inferRecordCreate(expr, expectedType);

      case ListCreateExpr:
        return this.inferListCreate(expr, expectedType);

      case MapCreateExpr:
        return this.inferMapCreate(expr, expectedType);

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

  inferLiteralType(expr) {
    const value = expr.value;
    if (typeof value === 'number') {
      return new TypeAnnotation('Number');
    }
    if (typeof value === 'string') {
      return new TypeAnnotation('String');
    }
    if (typeof value === 'boolean') {
      return new TypeAnnotation('Boolean');
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

    // Check if it's a known function — return full Fn type for first-class use
    if (this.fnDecls.has(name)) {
      const fn = this.fnDecls.get(name);
      const paramTypes = fn.params.map(p => p.type);
      const returnType = fn.returnType || new TypeAnnotation('Unit');
      return new TypeAnnotation('Fn', [...paramTypes, returnType]);
    }

    throw new TypeError(`Undefined variable: ${name}`, 0, 0);
  }

  // ── Lambda type inference ──────────────────────────────────────

  inferLambda(expr) {
    // Lambda does NOT capture outer scope — replace scope stack with
    // an isolated scope containing only the lambda's own params.
    const savedScopes = this.scopes;
    this.scopes = [new Map()];
    this.scopeBindings = this.scopes[0];

    const paramTypes = [];
    for (const p of expr.params) {
      paramTypes.push(p.type);
      this.scopeBindings.set(p.name, new ScopeEntry(p.name, p.type));
    }

    // Process body statements and infer return type
    let returnType = expr.returnType;
    for (let i = 0; i < expr.body.length; i++) {
      const stmt = expr.body[i];

      if (stmt instanceof ReturnStmt) {
        // Check return value type matches return type
        if (stmt.value) {
          const retType = this.inferExprType(stmt.value);
          if (!returnType) {
            returnType = retType;
          } else if (!this.typesMatch(retType, returnType)) {
            throw new TypeError(
              `Lambda return type: expected ${returnType.toString()} but got ${retType.toString()}`,
              stmt.line, stmt.column
            );
          }
        } else {
          if (returnType && !this.typesMatch(new TypeAnnotation('Unit'), returnType)) {
            throw new TypeError(
              `Lambda return type: expected ${returnType.toString()} but got Unit`,
              stmt.line, stmt.column
            );
          }
          if (!returnType) {
            returnType = new TypeAnnotation('Unit');
          }
        }
      } else if (i === expr.body.length - 1 && stmt instanceof ExpressionStmt) {
        // Last expression is the implicit return
        const actualType = this.inferExprType(stmt.expression);
        if (!returnType) {
          returnType = actualType;
        } else if (!this.typesMatch(actualType, returnType)) {
          throw new TypeError(
            `Lambda return type: expected ${returnType.toString()} but got ${actualType.toString()}`,
            stmt.line, stmt.column
          );
        }
      } else {
        // Non-return, non-last statements (let bindings, side effects)
        this.checkStmt(stmt);
      }
    }

    if (!returnType) {
      returnType = new TypeAnnotation('Unit');
    }

    this.scopes = savedScopes;
    this.scopeBindings = savedScopes.length > 0 ? savedScopes[savedScopes.length - 1] : new Map();

    // Fn type params: all param types + return type
    return new TypeAnnotation('Fn', [...paramTypes, returnType], expr.line, expr.column);
  }

  inferBinOp(expr) {
    const leftType = this.inferExprType(expr.left);
    const rightType = this.inferExprType(expr.right);

    // Arithmetic operators (Number only)
    if (['-', '*', '/'].includes(expr.op)) {
      if (!this.isNumeric(leftType) || !this.isNumeric(rightType)) {
        throw new TypeError(
          `Arithmetic operator '${expr.op}' requires numeric types, got ${leftType.toString()} and ${rightType.toString()}`,
          expr.line, expr.column
        );
      }
      return new TypeAnnotation('Number');
    }

    // Addition: Number + Number = Number, String + String = String
    if (expr.op === '+') {
      if (this.isNumeric(leftType) && this.isNumeric(rightType)) {
        return new TypeAnnotation('Number');
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
      return new TypeAnnotation('Boolean');
    }

    // Boolean operators
    if (expr.op === 'and' || expr.op === 'or') {
      if (leftType.name !== 'Boolean' || rightType.name !== 'Boolean') {
        throw new TypeError(
          `Boolean operator '${expr.op}' requires Boolean types, got ${leftType.toString()} and ${rightType.toString()}`,
          expr.line, expr.column
        );
      }
      return new TypeAnnotation('Boolean');
    }

    throw new TypeError(`Unknown operator: ${expr.op}`, expr.line, expr.column);
  }

  inferUnOp(expr) {
    const operandType = this.inferExprType(expr.operand);

    if (expr.op === 'not') {
      if (operandType.name !== 'Boolean') {
        throw new TypeError(`'not' operator requires Boolean, got ${operandType.toString()}`, expr.line, expr.column);
      }
      return new TypeAnnotation('Boolean');
    }

    if (expr.op === '-') {
      if (!this.isNumeric(operandType)) {
        throw new TypeError(`Negation requires numeric type, got ${operandType.toString()}`, expr.line, expr.column);
      }
      return new TypeAnnotation('Number');
    }

    throw new TypeError(`Unknown unary operator: ${expr.op}`, expr.line, expr.column);
  }

  inferCall(expr, expectedType = null) {
    // Handle: fnName(args)
    let fnType;

    if (expr.callee instanceof IdentifierExpr) {
      const fnName = expr.callee.name;

      // Polymorphic builtins — dispatch on first arg type
      if (fnName === 'get' || fnName === 'has' || fnName === 'put') {
        return this.inferPolyBuiltin(expr, fnName);
      }

      // spawn: Fn<RetT> → Task<RetT>
      if (fnName === 'spawn') {
        const fnType = this.inferExprType(expr.args[0]);
        if (fnType.name !== 'Fn') {
          throw new TypeError('spawn expects a function', expr.line, expr.column);
        }
        const typeParams = fnType.typeParams || [];
        if (typeParams.length === 0) {
          throw new TypeError('spawn expects a function with a return type', expr.line, expr.column);
        }
        const retType = typeParams[typeParams.length - 1];
        return new TypeAnnotation('Task', [retType], expr.line, expr.column);
      }

      // join: Task<RetT> → RetT
      if (fnName === 'join') {
        const taskType = this.inferExprType(expr.args[0]);
        if (taskType.name !== 'Task') {
          throw new TypeError('join expects a Task', expr.line, expr.column);
        }
        const typeParams = taskType.typeParams || [];
        if (typeParams.length === 0) {
          throw new TypeError('join expects a Task with a type parameter', expr.line, expr.column);
        }
        return typeParams[0];
      }

      // Built-in function
      if (BUILTIN_FUNCTIONS.has(fnName)) {
        fnType = BUILTIN_FUNCTIONS.get(fnName);
        const sig = fnType;
        const typeVars = new Map();
        // Pass 1: infer types and bind type variables
        for (let i = 0; i < expr.args.length; i++) {
          const expectedParamType = sig.paramTypes[i] instanceof TypeAnnotation
            ? sig.paramTypes[i]
            : new TypeAnnotation(String(sig.paramTypes[i]));
          const inferredType = this.inferExprType(expr.args[i]);
          this.unifyTypeVars(expectedParamType, inferredType, typeVars);
        }
        // Pass 2: resolve type variables and validate concrete types
        for (let i = 0; i < expr.args.length; i++) {
          const resolvedParamType = this.resolveTypeVars(sig.paramTypes[i], typeVars);
          if (!resolvedParamType.name.startsWith('$')) {
            this.checkExpr(expr.args[i], resolvedParamType);
          }
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
      if (maybeFn instanceof TypeAnnotation && maybeFn.name === 'Fn') {
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

    if (expr.callee instanceof FieldAccessExpr) {
      const fnType = this.inferExprType(expr.callee);
      if (fnType.name === 'Fn') {
        const typeParams = fnType.typeParams || [];
        if (expr.args.length !== typeParams.length - 1) {
          throw new TypeError(
            `Function expects ${typeParams.length - 1} args, got ${expr.args.length}`,
            expr.line, expr.column
          );
        }
        for (let i = 0; i < expr.args.length; i++) {
          const actual = this.inferExprType(expr.args[i]);
          const expected = typeParams[i];
          if (!this.typesMatch(actual, expected)) {
            throw new TypeError(
              `Arg ${i}: expected ${expected.toString()} but got ${actual.toString()}`,
              expr.line, expr.column
            );
          }
        }
        return typeParams[typeParams.length - 1];
      }
      throw new TypeError(`Cannot call non-function expression`, expr.line, expr.column);
    }

    throw new TypeError(`Cannot call non-function expression`, expr.line, expr.column);
  }

  inferFieldAccess(expr) {
    const objectType = this.inferExprType(expr.object);

    // Result fields: isOk, value, errMessage
    if (objectType.name === 'Result') {
      if (expr.field === 'isOk') return new TypeAnnotation('Boolean');
      if (expr.field === 'value') {
        const innerType = objectType.typeParams && objectType.typeParams.length > 0
          ? objectType.typeParams[0]
          : new TypeAnnotation('Unit');
        return innerType;
      }
      if (expr.field === 'errMessage') return new TypeAnnotation('String');
      throw new TypeError(
        `Result has no field '${expr.field}'`,
        expr.line, expr.column
      );
    }

    // String fields
    if (objectType.name === 'String') {
      if (expr.field === 'len') return new TypeAnnotation('Number');
      throw new TypeError(
        `String has no field '${expr.field}'`,
        expr.line, expr.column
      );
    }

    // List fields
    if (objectType.name === 'List') {
      if (expr.field === 'len') return new TypeAnnotation('Number');
      throw new TypeError(
        `List has no field '${expr.field}'`,
        expr.line, expr.column
      );
    }

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
    if (objBinding instanceof TypeAnnotation && objBinding.name === 'Record' && objectType.typeParams) {
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
    this.checkExpr(expr.condition, new TypeAnnotation('Boolean'));
    const thenType = this.inferBlockType(expr.thenBlock);
    for (const elif of expr.elifBlocks) {
      this.checkExpr(elif.condition, new TypeAnnotation('Boolean'));
      this.inferBlockType(elif.thenBlock);
    }
    if (expr.elseBlock) {
      this.inferBlockType(expr.elseBlock);
    }
    return thenType;
  }

  inferBlockType(stmts) {
    let lastType = new TypeAnnotation('Unit');
    for (let i = 0; i < stmts.length; i++) {
      if (i === stmts.length - 1) {
        lastType = this.checkStmtWithReturn(stmts[i]);
      } else {
        this.checkStmt(stmts[i]);
      }
    }
    return lastType;
  }

  inferBlock(expr) {
    let lastType = new TypeAnnotation('Unit');
    for (let i = 0; i < expr.stmts.length; i++) {
      if (i === expr.stmts.length - 1) {
        lastType = this.checkStmtWithReturn(expr.stmts[i]);
      } else {
        this.checkStmt(expr.stmts[i]);
      }
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
      // Empty record with no expected type — use generic 'Record'
      typeName = 'Record';
    }

    // For empty records with an expected type (e.g., Record<String,String> for fetch headers),
    // just return the expected type without checking fields
    if (expr.fields.length === 0 && expectedType) {
      if (expectedType.name === typeName) {
        return expectedType;
      }
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

  inferListCreate(expr, expectedType = null) {
    if (expr.elements.length === 0) {
      if (expectedType && expectedType.name === 'List' && expectedType.typeParams && expectedType.typeParams.length > 0) {
        return new TypeAnnotation('List', [expectedType.typeParams[0]], expr.line, expr.column);
      }
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

  inferMapCreate(expr, expectedType = null) {
    if (expr.entries.length === 0) {
      // Empty map — use expected type if available
      if (expectedType && expectedType.name === 'Map' && expectedType.typeParams && expectedType.typeParams.length === 2) {
        return expectedType;
      }
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

  inferExprType(expr, expectedType = null) {
    return this.inferType(expr, expectedType);
  }

  isNumeric(type) {
    return type.name === 'Number';
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

    if (stmt instanceof LetStmt || stmt instanceof MutDeclStmt || stmt instanceof AssignStmt || stmt instanceof WhileStmt) {
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
        if (keyType.name !== 'Number') {
          throw new TypeError(`List index must be Number, got ${keyType.name}`, expr.line, expr.column);
        }
        const elemType = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation('$T');
        return new TypeAnnotation('Result', [elemType]);
      }

      if (firstType.name === 'Map') {
        const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation('$K');
        if (!this.typesMatch(keyType, keyParam)) {
          throw new TypeError(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
        }
        const valType = firstType.typeParams && firstType.typeParams[1] || new TypeAnnotation('$V');
        return new TypeAnnotation('Result', [valType]);
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
      return new TypeAnnotation('Boolean');
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

  collectTypeVarNames(type: TypeAnnotation): string[] {
    const names: string[] = [];
    if (type.name.startsWith('$') && !names.includes(type.name)) {
      names.push(type.name);
    }
    if (type.typeParams) {
      for (const p of type.typeParams) {
        const pa = p instanceof TypeAnnotation ? p : new TypeAnnotation(String(p));
        names.push(...this.collectTypeVarNames(pa));
      }
    }
    return names;
  }
}

// ── Built-in function signatures ────────────────────────────────

const BUILTIN_FUNCTIONS = new Map([
  // String builtins
  ['concat', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String')], returnType: new TypeAnnotation('String') }],
  ['concat_all', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('String')]), new TypeAnnotation('String')], returnType: new TypeAnnotation('String') }],
  ['substring', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('String') }],
  ['indexOf', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String')], returnType: new TypeAnnotation('Number') }],
  ['parse_num', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('Number')]) }],
  ['to_string', { paramTypes: [new TypeAnnotation('$T')], returnType: new TypeAnnotation('String') }],
  ['print', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Unit') }],

  // List builtins (as functions)
  ['append', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('$T')], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],
  ['list_get', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('$T')]) }],
  ['substring_list', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],

  // Map builtins (fully generic)
  ['map_put', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K'), new TypeAnnotation('$V')], returnType: new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]) }],
  ['map_get', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K')], returnType: new TypeAnnotation('Result', [new TypeAnnotation('$V')]) }],
  ['map_has', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K')], returnType: new TypeAnnotation('Boolean') }],
  ['map_remove', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]), new TypeAnnotation('$K')], returnType: new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')]) }],
  ['map_keys', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')])], returnType: new TypeAnnotation('List', [new TypeAnnotation('String')]) }],
  ['map_values', { paramTypes: [new TypeAnnotation('Map', [new TypeAnnotation('$K'), new TypeAnnotation('$V')])], returnType: new TypeAnnotation('List', [new TypeAnnotation('$V')]) }],

  // List higher-order functions
  ['map', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Fn', [new TypeAnnotation('$T'), new TypeAnnotation('$U')])], returnType: new TypeAnnotation('List', [new TypeAnnotation('$U')]) }],
  ['filter', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Fn', [new TypeAnnotation('$T'), new TypeAnnotation('Boolean')])], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],
  ['fold', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('$U'), new TypeAnnotation('Fn', [new TypeAnnotation('$U'), new TypeAnnotation('$T'), new TypeAnnotation('$U')])], returnType: new TypeAnnotation('$U') }],
  ['sort_by', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')]), new TypeAnnotation('Fn', [new TypeAnnotation('$T'), new TypeAnnotation('$T'), new TypeAnnotation('Number')])], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],

  // Timing (async — returns Task)
  ['sleep', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Unit')]) }],
  ['next_frame', { paramTypes: [], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Number')]) }],

  // File I/O (async — returns Task, I/O happens on join)
  ['file_read', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('String')])]) }],
  ['file_read_lines', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('List', [new TypeAnnotation('String')])])]) }],
  ['file_write', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('Unit')])]) }],
  ['read_line', { paramTypes: [], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('String')])]) }],

  // Network I/O (async — returns Task, I/O happens on join)
  ['fetch', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String'), new TypeAnnotation('Map', [new TypeAnnotation('String'), new TypeAnnotation('String')]), new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('String')])]) }],

  // ── Canvas builtins (browser runtime) ──
  ['canvas_clear', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_get_width', { paramTypes: [], returnType: new TypeAnnotation('Number') }],
  ['canvas_get_height', { paramTypes: [], returnType: new TypeAnnotation('Number') }],
  ['canvas_fill_rect', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_stroke_rect', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_clear_rect', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_fill_text', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_stroke_text', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_measure_text', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Number') }],
  ['canvas_set_fill_color', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_set_stroke_color', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_set_font', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_set_line_width', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_begin_path', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_close_path', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_move_to', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_line_to', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_arc', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_stroke', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_fill', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_save', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_restore', { paramTypes: [], returnType: new TypeAnnotation('Unit') }],
  ['canvas_rotate', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_translate', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_scale', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_on_click', { paramTypes: [new TypeAnnotation('Fn', [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Unit')])], returnType: new TypeAnnotation('Unit') }],
  ['canvas_on_drag', { paramTypes: [new TypeAnnotation('Fn', [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Unit')])], returnType: new TypeAnnotation('Unit') }],

  // Image loading/drawing
  ['canvas_load_image', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Number') }],
  ['canvas_draw_image', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['canvas_image_loaded', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Boolean') }],

  // Audio
  ['audio_load', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Number') }],
  ['audio_play', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['audio_stop', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['audio_pause', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['audio_resume', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['audio_set_volume', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Unit') }],
  ['audio_set_loop', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Boolean')], returnType: new TypeAnnotation('Unit') }],

  // Math builtins
  ['abs', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Number') }],
  ['max', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Number') }],
  ['min', { paramTypes: [new TypeAnnotation('Number'), new TypeAnnotation('Number')], returnType: new TypeAnnotation('Number') }],
  ['random', { paramTypes: [new TypeAnnotation('Number')], returnType: new TypeAnnotation('Number') }],

  ['sort', { paramTypes: [new TypeAnnotation('List', [new TypeAnnotation('$T')])], returnType: new TypeAnnotation('List', [new TypeAnnotation('$T')]) }],

  // IndexedDB storage (browser only, async — returns Task)
  ['db_store', { paramTypes: [new TypeAnnotation('String'), new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('Unit')])]) }],
  ['db_load', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('String')])]) }],
  ['db_delete', { paramTypes: [new TypeAnnotation('String')], returnType: new TypeAnnotation('Task', [new TypeAnnotation('Result', [new TypeAnnotation('Unit')])]) }],

  // Record update (returns new record with field changed)
  ['record_update', { paramTypes: [new TypeAnnotation('$Record'), new TypeAnnotation('String'), new TypeAnnotation('$T')], returnType: new TypeAnnotation('$Record') }],
]);

export { TypeChecker, TypeError, BUILTIN_FUNCTIONS };
