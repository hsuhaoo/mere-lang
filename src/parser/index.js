/**
 * Parser for the Simplex language.
 * Recursive descent parser with clear error reporting.
 * 
 * Grammar:
 * 
 * program     ::= (import_stmt | export_stmt | type_decl | fn_decl | let_stmt)*
 * import_stmt ::= 'import' IDENTIFIER 'from' STRING
 * export_stmt ::= 'export' fn_decl
 * type_decl   ::= 'type' IDENTIFIER '=' '{' field_def (',' field_def)* '}'
 * fn_decl     ::= 'fn' IDENTIFIER '(' param_list? ')' ('->' type)? body
 * param       ::= IDENTIFIER ':' type
 * body        ::= '{' stmt* '}'
 * stmt        ::= let_stmt | if_stmt | return_stmt | expr_stmt
 * let_stmt    ::= 'let' IDENTIFIER ':' type '=' expr ';'
 * if_stmt     ::= 'if' expr '{' stmt* '}'
 * return_stmt ::= 'return' expr ';'
 * expr_stmt   ::= expr ';'
 * expr        ::= binary_expr
 * binary_expr ::= unary_expr (('+' | '-' | '*' | '/' | '==' | '!=' | '<' | '>' | '<=' | '>=' | 'and' | 'or') unary_expr)*
 * unary_expr  ::= 'not' unary_expr | '-' unary_expr | primary
 * primary     ::= INT | STRING | 'true' | 'false' | '()' | IDENTIFIER
 *              | '(' expr ')'
 *              | 'fn' '(' param_list? ')' '->' type? body
 *              | '[' elem_list? ']'
 *              | '{' field_list? '}'
 *              | 'ok' '(' expr ')'
 *              | 'err' '(' expr ')'
 *              | IDENTIFIER '.' IDENTIFIER '(' arg_list? ')'
 *              | expr '.' IDENTIFIER '(' arg_list? ')'
 *              | expr '.' IDENTIFIER
 * param_list  ::= param (',' param)*
 * arg_list    ::= expr (',' expr)*
 * field_def   ::= IDENTIFIER ':' type
 * field_list  ::= IDENTIFIER ':' expr (',' IDENTIFIER ':' expr)*
 * elem_list   ::= expr (',' expr)*
 */

const { Lexer, LexerError } = require('../lexer');
const { TokenType } = require('../lexer/tokens');
const {
  LiteralExpr, IdentifierExpr, BinOpExpr, UnOpExpr, CallExpr,
  MethodCallExpr, FieldAccessExpr, IfExpr, BlockExpr, LambdaExpr,
  RecordCreateExpr, ListCreateExpr, MapCreateExpr,
  ResultOkExpr, ResultErrExpr, UnitExpr,
  LetStmt, FnDecl, ReturnStmt, IfStmt, ExpressionStmt,
  ImportStmt, ExportStmt, TypeDecl,
  TypeAnnotation, Program,
} = require('../ast/nodes');

class ParseError extends Error {
  constructor(message, line, column) {
    super(`Parse error [${line}:${column}]: ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'ParseError';
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1]; // EOF
  }

  advance() {
    const token = this.tokens[this.pos];
    if (!token) {
      throw new ParseError('Unexpected end of input', 0, 0);
    }
    this.pos++;
    return token;
  }

  expect(type) {
    const token = this.peek();
    if (token.type !== type) {
      throw new ParseError(`Expected ${type} but found ${token.type}`, token.line, token.column);
    }
    return this.advance();
  }

  check(type) {
    return this.peek().type === type;
  }

  match(...types) {
    if (types.includes(this.peek().type)) {
      return this.advance();
    }
    return null;
  }

  // ── Program ───────────────────────────────────────────────────

  parse() {
    const stmts = [];
    while (!this.check(TokenType.EOF)) {
      stmts.push(this.parseTopLevelStmt());
    }
    return new Program(stmts);
  }

  parseTopLevelStmt() {
    const token = this.peek();

    // Import statement
    if (this.check(TokenType.IMPORT)) {
      return this.parseImport();
    }

    // Export statement
    if (this.check(TokenType.EXPORT)) {
      return this.parseExport();
    }

    // Type declaration
    if (this.check(TokenType.TYPE)) {
      return this.parseTypeDecl();
    }

    // Function declaration
    if (this.check(TokenType.FN)) {
      return this.parseFnDecl(true);
    }

    // Let statement (top-level bindings)
    if (this.check(TokenType.LET)) {
      return this.parseLet();
    }

    // If statement (top-level)
    if (this.check(TokenType.IF)) {
      return this.parseIf();
    }

    // Bare expression statement (for top-level expressions)
    return this.parseExprStmt();
  }

  // ── Helpers ───────────────────────────────────────────────────
  consumeSemicolon() {
    this.match(TokenType.SEMICOLON);
  }

  // ── Import ────────────────────────────────────────────────────

  parseImport() {
    this.expect(TokenType.IMPORT);
    const nameToken = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.FROM);
    const fromToken = this.expect(TokenType.STRING);
    this.match(TokenType.SEMICOLON);
    return new ImportStmt(nameToken.value, fromToken.value, nameToken.line, nameToken.column);
  }

  // ── Export ────────────────────────────────────────────────────

  parseExport() {
    this.expect(TokenType.EXPORT);
    const fnDecl = this.parseFnDecl(false);
    return new ExportStmt(fnDecl);
  }

  // ── Type declaration ──────────────────────────────────────────

  parseTypeDecl() {
    this.expect(TokenType.TYPE);
    const nameToken = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.ASSIGN);
    this.expect(TokenType.LBRACE);

    const fields = [];
    while (!this.check(TokenType.RBRACE)) {
      if (fields.length > 0) {
        this.expect(TokenType.COMMA);
      }
      const fieldName = this.expect(TokenType.IDENTIFIER);
      this.expect(TokenType.COLON);
      const fieldType = this.parseType();
      fields.push({ name: fieldName.value, type: fieldType });
    }

    this.expect(TokenType.RBRACE);
    this.match(TokenType.SEMICOLON); // Optional semicolon
    return new TypeDecl(nameToken.value, fields, nameToken.line, nameToken.column);
  }

  // ── Function declaration ──────────────────────────────────────

  parseFnDecl(isTopLevel) {
    const fnToken = this.expect(TokenType.FN);
    const nameToken = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.LPAREN);

    const params = [];
    if (!this.check(TokenType.RPAREN)) {
      params.push(this.parseParam());
      while (this.match(TokenType.COMMA)) {
        params.push(this.parseParam());
      }
    }

    this.expect(TokenType.RPAREN);

    let returnType = null;
    if (this.match(TokenType.ARROW)) {
      returnType = this.parseType();
    }

    const body = this.parseBody();

    if (isTopLevel) {
      this.match(TokenType.SEMICOLON);
    }

    return new FnDecl(
      nameToken.value,
      params.map(p => ({ name: p.name, type: p.type })),
      returnType,
      body,
      fnToken.line,
      fnToken.column
    );
  }

  parseParam() {
    const nameToken = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.COLON);
    const type = this.parseType();
    return { name: nameToken.value, type };
  }

  parseBody() {
    this.expect(TokenType.LBRACE);
    const stmts = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      stmts.push(this.parseStmt());
    }

    this.expect(TokenType.RBRACE);
    return stmts;
  }

  // ── Statements ────────────────────────────────────────────────

  parseStmt() {
    const token = this.peek();

    if (this.check(TokenType.LET)) {
      return this.parseLet();
    }

    if (this.check(TokenType.IF)) {
      return this.parseIf();
    }

    if (this.check(TokenType.RETURN)) {
      return this.parseReturn();
    }

    return this.parseExprStmt();
  }

  parseLet() {
    const letToken = this.expect(TokenType.LET);
    const nameToken = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.COLON);
    const type = this.parseType();
    this.expect(TokenType.ASSIGN);
    const init = this.parseExpr();
    this.match(TokenType.SEMICOLON);

    return new LetStmt(nameToken.value, type, init, letToken.line, letToken.column);
  }

  parseIf() {
    const ifToken = this.expect(TokenType.IF);
    const condition = this.parseExpr();
    this.expect(TokenType.LBRACE);

    const thenBlock = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      thenBlock.push(this.parseStmt());
    }

    this.expect(TokenType.RBRACE);
    return new IfStmt(condition, thenBlock, ifToken.line, ifToken.column);
  }

  parseReturn() {
    const retToken = this.expect(TokenType.RETURN);
    let value = null;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      value = this.parseExpr();
    }
    this.match(TokenType.SEMICOLON);
    return new ReturnStmt(value, retToken.line, retToken.column);
  }

  parseExprStmt() {
    const expr = this.parseExpr();
    this.match(TokenType.SEMICOLON);
    return new ExpressionStmt(expr);
  }

  // ── Expressions ───────────────────────────────────────────────

  parseExpr() {
    return this.parseBinaryExpr(0);
  }

  parseBinaryExpr(minPrecedence) {
    let left = this.parseUnary();

    while (!this.check(TokenType.EOF) && !this.check(TokenType.RBRACE) &&
           !this.check(TokenType.RPAREN) && !this.check(TokenType.COMMA) &&
           !this.check(TokenType.SEMICOLON)) {
      const opToken = this.peek();
      const prec = this.getBinOpPrecedence(opToken.type);

      if (prec < minPrecedence) break;

      this.advance();
      const right = this.parseBinaryExpr(prec + 1);
      left = new BinOpExpr(opToken.value, left, right, opToken.line, opToken.column);
    }

    return left;
  }

  parseUnary() {
    const token = this.peek();

    if (token.type === TokenType.NOT) {
      this.advance();
      const operand = this.parseUnary();
      return new UnOpExpr('not', operand, token.line, token.column);
    }

    if (token.type === TokenType.SUB) {
      this.advance();
      const operand = this.parseUnary();
      return new UnOpExpr('-', operand, token.line, token.column);
    }

    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();

    // Literals
    if (token.type === TokenType.INTEGER) {
      this.advance();
      return new LiteralExpr(token.value, token.line, token.column);
    }

    if (token.type === TokenType.FLOAT) {
      this.advance();
      return new LiteralExpr(token.value, token.line, token.column);
    }

    if (token.type === TokenType.STRING) {
      this.advance();
      return new LiteralExpr(token.value, token.line, token.column);
    }

    if (token.type === TokenType.TRUE) {
      this.advance();
      return new LiteralExpr(true, token.line, token.column);
    }

    if (token.type === TokenType.FALSE) {
      this.advance();
      return new LiteralExpr(false, token.line, token.column);
    }

    // Unit
    if (token.type === TokenType.LPAREN &&
        this.pos + 1 < this.tokens.length &&
        this.tokens[this.pos + 1].type === TokenType.RPAREN) {
      this.advance(); // consume (
      this.advance(); // consume )
      return new UnitExpr(token.line, token.column);
    }

    // Parenthesized expression
    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    // ok(...) / err(...)
    if (token.type === TokenType.OK) {
      this.advance();
      this.expect(TokenType.LPAREN);
      const value = this.parseExpr();
      this.expect(TokenType.RPAREN);
      return new ResultOkExpr(value, token.line, token.column);
    }

    if (token.type === TokenType.ERR) {
      this.advance();
      this.expect(TokenType.LPAREN);
      const message = this.parseExpr();
      this.expect(TokenType.RPAREN);
      return new ResultErrExpr(message, token.line, token.column);
    }

    // List literal [...]
    if (token.type === TokenType.LBRACKET) {
      return this.parseListLiteral();
    }

    // Record literal {...}
    if (token.type === TokenType.LBRACE) {
      return this.parseRecordLiteral();
    }

    // Function literal (anonymous)
    if (token.type === TokenType.FN) {
      return this.parseFnLiteral();
    }

    // Map literal {key: value, ...} - only if contains colon among braces
    if (token.type === TokenType.LBRACE) {
      return this.parseMapLiteral();
    }

    // Identifier (possibly with method call or field access)
    if (token.type === TokenType.IDENTIFIER) {
      let expr = new IdentifierExpr(token.value, token.line, token.column);
      this.advance();

      // Function call: identifier(...)
      if (this.check(TokenType.LPAREN)) {
        // This is a function call, not a method call
        this.advance(); // consume (
        const args = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpr());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseExpr());
          }
        }
        this.expect(TokenType.RPAREN);
        return new CallExpr(expr, args, token.line, token.column);
      }
      // Field/method access: identifier.field or identifier.method(...)
      else if (this.check(TokenType.DOT)) {
        expr = this.parseFieldChain(expr);
      }

      return expr;
    }

    throw new ParseError(`Unexpected token: ${token.type}`, token.line, token.column);
  }

  parseListLiteral() {
    const token = this.expect(TokenType.LBRACKET);
    const elements = [];

    if (!this.check(TokenType.RBRACKET)) {
      elements.push(this.parseExpr());
      while (this.match(TokenType.COMMA)) {
        elements.push(this.parseExpr());
      }
    }

    this.expect(TokenType.RBRACKET);
    return new ListCreateExpr(elements, token.line, token.column);
  }

  parseRecordLiteral() {
    const token = this.expect(TokenType.LBRACE);
    const fields = [];

    if (this.check(TokenType.RBRACE)) {
      this.expect(TokenType.RBRACE);
      return new RecordCreateExpr([], token.line, token.column);
    }

    // Check if it's a record or map by looking ahead
    const isMap = this.looksLikeMap();

    if (isMap) {
      // Parse as map: { expr: expr, ... }
      while (!this.check(TokenType.RBRACE)) {
        if (fields.length > 0) {
          this.expect(TokenType.COMMA);
        }
        const key = this.parseExpr();
        this.expect(TokenType.COLON);
        const value = this.parseExpr();
        fields.push({ key, value });
      }
      this.expect(TokenType.RBRACE);
      return new MapCreateExpr(fields, token.line, token.column);
    } else {
      // Parse as record: { IDENTIFIER: expr, ... }
      while (!this.check(TokenType.RBRACE)) {
        if (fields.length > 0) {
          this.expect(TokenType.COMMA);
        }
        const keyToken = this.expect(TokenType.IDENTIFIER);
        this.expect(TokenType.COLON);
        const value = this.parseExpr();
        fields.push({ key: keyToken.value, value });
      }
      this.expect(TokenType.RBRACE);
      return new RecordCreateExpr(fields, token.line, token.column);
    }
  }

  looksLikeMap() {
    // We're already inside the braces (LBRACE was consumed by caller)
    // Check if the next token is NOT an identifier (i.e., it's an expression key)
    // If the next token IS an identifier followed by colon, it's a record, not a map
    if (this.check(TokenType.IDENTIFIER)) {
      const savedPos = this.pos;
      this.advance(); // consume identifier
      if (this.check(TokenType.COLON)) {
        this.pos = savedPos; // restore
        return false; // It's a record, not a map
      }
      this.pos = savedPos; // restore
    }
    // Not an identifier, so it's a map
    return true;
  }

  parseMapLiteral() {
    const token = this.expect(TokenType.LBRACE);
    const entries = [];

    if (!this.check(TokenType.RBRACE)) {
      entries.push({ key: this.parseExpr(), value: this.parseExpr() });
      while (this.match(TokenType.COMMA)) {
        entries.push({ key: this.parseExpr(), value: this.parseExpr() });
      }
    }

    this.expect(TokenType.RBRACE);
    return new MapCreateExpr(entries, token.line, token.column);
  }

  parseFnLiteral() {
    const fnToken = this.expect(TokenType.FN);
    this.expect(TokenType.LPAREN);

    const params = [];
    if (!this.check(TokenType.RPAREN)) {
      params.push(this.parseParam());
      while (this.match(TokenType.COMMA)) {
        params.push(this.parseParam());
      }
    }

    this.expect(TokenType.RPAREN);

    let returnType = null;
    if (this.match(TokenType.ARROW)) {
      returnType = this.parseType();
    }

    const body = this.parseBody();

    return new LambdaExpr(
      params.map(p => ({ name: p.name, type: p.type })),
      returnType,
      body,
      fnToken.line,
      fnToken.column
    );
  }

  parseMethodCall(base) {
    this.expect(TokenType.LPAREN);
    const args = [];
    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseExpr());
      while (this.match(TokenType.COMMA)) {
        args.push(this.parseExpr());
      }
    }
    this.expect(TokenType.RPAREN);

    // Check if base is already a MethodCallExpr or IdentifierExpr
    if (base instanceof MethodCallExpr) {
      return new MethodCallExpr(base.object, base.method, args, base.line, base.column);
    }

    if (base instanceof IdentifierExpr) {
      return new MethodCallExpr(base, base.name, args, base.line, base.column);
    }

    if (base instanceof FieldAccessExpr) {
      return new MethodCallExpr(base.object, base.field, args, base.line, base.column);
    }

    // For complex expressions, wrap in a temporary approach
    return new MethodCallExpr(base, base.name || '', args, base.line, base.column);
  }

  parseFieldChain(base) {
    let expr = base;

    while (this.check(TokenType.DOT)) {
      this.advance();
      const fieldToken = this.expect(TokenType.IDENTIFIER);

      // Check if it's a method call
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpr());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseExpr());
          }
        }
        this.expect(TokenType.RPAREN);
        expr = new MethodCallExpr(expr, fieldToken.value, args, fieldToken.line, fieldToken.column);
      } else {
        expr = new FieldAccessExpr(expr, fieldToken.value, fieldToken.line, fieldToken.column);
      }
    }

    return expr;
  }

  // ── Type parsing ──────────────────────────────────────────────

  parseType() {
    const token = this.expect(TokenType.IDENTIFIER);
    let typeParams = null;

    if (this.check(TokenType.LT)) {
      this.advance(); // consume <
      typeParams = [];
      typeParams.push(this.parseType()); // recursive: supports nested generics
      while (this.match(TokenType.COMMA)) {
        typeParams.push(this.parseType());
      }
      this.expect(TokenType.GT);
    }

    return new TypeAnnotation(token.value, typeParams, token.line, token.column);
  }

  // ── Operator precedence ───────────────────────────────────────

  getBinOpPrecedence(type) {
    const opMap = {
      '+': 5,
      '-': 5,
      '*': 6,
      '/': 6,
      '==': 3,
      '!=': 3,
      '<': 4,
      '>': 4,
      '<=': 4,
      '>=': 4,
      'AND': 2,
      'OR': 1,
    };
    return opMap[type] ?? -1;
  }
}

module.exports = { Parser, ParseError };
