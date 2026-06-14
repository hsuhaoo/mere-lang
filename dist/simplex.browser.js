var simplex = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/browser-entry.ts
  var browser_entry_exports = {};
  __export(browser_entry_exports, {
    BrowserBuiltins: () => BrowserBuiltins,
    Env: () => Env,
    Interpreter: () => Interpreter,
    Lexer: () => Lexer,
    Parser: () => Parser,
    RuntimeError: () => RuntimeError,
    Scheduler: () => Scheduler,
    TypeChecker: () => TypeChecker,
    TypeError: () => TypeError2,
    Value: () => Value,
    createBrowserRuntime: () => createBrowserRuntime,
    mkBoolean: () => boolean,
    mkErr: () => mkErr,
    mkNumber: () => number,
    mkOk: () => mkOk,
    mkString: () => string,
    mkUnit: () => unit,
    runBrowser: () => runBrowser
  });

  // src/lexer/tokens.ts
  var KEYWORDS = {
    fn: "FN",
    let: "LET",
    if: "IF",
    type: "TYPE",
    import: "IMPORT",
    export: "EXPORT",
    return: "RETURN",
    true: "TRUE",
    false: "FALSE",
    unit: "UNIT",
    ok: "OK",
    err: "ERR",
    and: "AND",
    or: "OR",
    not: "NOT",
    from: "FROM",
    in: "IN"
    // reserved for future `for item in list`
  };
  var TokenType = {
    // Literals
    INTEGER: "INTEGER",
    FLOAT: "FLOAT",
    STRING: "STRING",
    IDENTIFIER: "IDENTIFIER",
    EOF: "EOF",
    // Keywords (uppercase keys → uppercase values)
    FN: "FN",
    LET: "LET",
    IF: "IF",
    TYPE: "TYPE",
    IMPORT: "IMPORT",
    EXPORT: "EXPORT",
    RETURN: "RETURN",
    TRUE: "TRUE",
    FALSE: "FALSE",
    UNIT: "UNIT",
    OK: "OK",
    ERR: "ERR",
    AND: "AND",
    OR: "OR",
    NOT: "NOT",
    FROM: "FROM",
    IN: "IN",
    // Delimiters
    LBRACE: "{",
    RBRACE: "}",
    LPAREN: "(",
    RPAREN: ")",
    LBRACKET: "[",
    RBRACKET: "]",
    SEMICOLON: ";",
    COMMA: ",",
    COLON: ":",
    ASSIGN: "=",
    // Operators
    ADD: "+",
    SUB: "-",
    MUL: "*",
    DIV: "/",
    EQ: "==",
    NEQ: "!=",
    LT: "<",
    GT: ">",
    LE: "<=",
    GE: ">=",
    DOT: ".",
    ARROW: "->"
  };

  // src/lexer/index.ts
  var OPERATOR_2CHAR = {
    "==": TokenType.EQ,
    "!=": TokenType.NEQ,
    "<=": TokenType.LE,
    ">=": TokenType.GE,
    "->": TokenType.ARROW
  };
  var OPERATOR_1CHAR = {
    "+": TokenType.ADD,
    "-": TokenType.SUB,
    "*": TokenType.MUL,
    "/": TokenType.DIV,
    "<": TokenType.LT,
    ">": TokenType.GT,
    "=": TokenType.ASSIGN,
    "!": TokenType.NOT,
    ".": TokenType.DOT,
    "{": TokenType.LBRACE,
    "}": TokenType.RBRACE,
    "(": TokenType.LPAREN,
    ")": TokenType.RPAREN,
    "[": TokenType.LBRACKET,
    "]": TokenType.RBRACKET,
    ";": TokenType.SEMICOLON,
    ",": TokenType.COMMA,
    ":": TokenType.COLON
  };
  var Token = class {
    constructor(type, value, line, column) {
      this.type = type;
      this.value = value;
      this.line = line;
      this.column = column;
    }
    toString() {
      return `Token(${this.type}, ${JSON.stringify(this.value)}, ${this.line}:${this.column})`;
    }
  };
  var LexerError = class extends Error {
    constructor(message, line = 0, column = 0) {
      super(`[${line}:${column}] ${message}`);
      this.line = line;
      this.column = column;
      this.name = "LexerError";
    }
  };
  var Lexer = class {
    constructor(source) {
      this.source = source;
      this.pos = 0;
      this.line = 1;
      this.column = 1;
      this.tokens = [];
      this.tokenize();
    }
    peek() {
      if (this.pos < this.source.length) {
        return this.source[this.pos];
      }
      return "\0";
    }
    advance() {
      const ch = this.peek();
      if (ch === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
      return ch;
    }
    skipWhitespace() {
      while (this.pos < this.source.length) {
        const ch = this.peek();
        if (ch === " " || ch === "	" || ch === "\r" || ch === "\n") {
          this.advance();
        } else {
          break;
        }
      }
    }
    skipComment() {
      while (this.pos < this.source.length && this.peek() !== "\n") {
        this.advance();
      }
    }
    readString() {
      const startLine = this.line;
      const startCol = this.column;
      const quote = this.advance();
      let str = "";
      while (this.pos < this.source.length) {
        const ch = this.peek();
        if (ch === "\\") {
          this.advance();
          const esc = this.advance();
          switch (esc) {
            case "n":
              str += "\n";
              break;
            case "t":
              str += "	";
              break;
            case '"':
              str += '"';
              break;
            case "\\":
              str += "\\";
              break;
            case "'":
              str += "'";
              break;
            default:
              str += "\\" + esc;
              break;
          }
        } else if (ch === quote) {
          this.advance();
          return new Token(TokenType.STRING, str, startLine, startCol);
        } else {
          str += this.advance();
        }
      }
      throw new LexerError("Unterminated string literal", startLine, startCol);
    }
    readNumber() {
      const startLine = this.line;
      const startCol = this.column;
      let num = "";
      while (this.pos < this.source.length) {
        const ch = this.peek();
        if (ch >= "0" && ch <= "9" || ch === ".") {
          num += this.advance();
        } else {
          break;
        }
      }
      if (num.includes(".")) {
        const val2 = parseFloat(num);
        if (isNaN(val2)) {
          throw new LexerError(`Invalid number: ${num}`, startLine, startCol);
        }
        return new Token(TokenType.FLOAT, val2, startLine, startCol);
      }
      const val = parseInt(num, 10);
      if (isNaN(val)) {
        throw new LexerError(`Invalid integer: ${num}`, startLine, startCol);
      }
      return new Token(TokenType.INTEGER, val, startLine, startCol);
    }
    readIdentifierOrKeyword() {
      const startLine = this.line;
      const startCol = this.column;
      let ident = "";
      while (this.pos < this.source.length) {
        const ch = this.peek();
        if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch >= "0" && ch <= "9" || ch === "_") {
          ident += this.advance();
        } else {
          break;
        }
      }
      if (KEYWORDS.hasOwnProperty(ident)) {
        return new Token(KEYWORDS[ident], ident, startLine, startCol);
      }
      return new Token(TokenType.IDENTIFIER, ident, startLine, startCol);
    }
    readOperator() {
      const startLine = this.line;
      const startCol = this.column;
      const ch = this.peek();
      if (this.pos + 1 < this.source.length) {
        const two = this.source.substring(this.pos, this.pos + 2);
        if (OPERATOR_2CHAR.hasOwnProperty(two)) {
          this.pos += 2;
          this.column += 2;
          return new Token(OPERATOR_2CHAR[two], two, startLine, startCol);
        }
      }
      const singleMap = {
        "+": "ADD",
        "-": "SUB",
        "*": "MUL",
        "/": "DIV",
        "<": "LT",
        ">": "GT",
        "=": "ASSIGN",
        " ": "SPACE"
      };
      if (OPERATOR_1CHAR.hasOwnProperty(ch)) {
        this.advance();
        return new Token(OPERATOR_1CHAR[ch], ch, startLine, startCol);
      }
      throw new LexerError(`Unexpected character: ${ch}`, startLine, startCol);
    }
    tokenize() {
      while (this.pos < this.source.length) {
        this.skipWhitespace();
        if (this.pos >= this.source.length) break;
        const ch = this.peek();
        if (ch === "/") {
          if (this.pos + 1 < this.source.length && this.source[this.pos + 1] === "/") {
            this.skipComment();
            continue;
          }
        }
        const startLine = this.line;
        const startCol = this.column;
        if (ch === '"' || ch === "'") {
          this.tokens.push(this.readString());
          continue;
        }
        if (ch >= "0" && ch <= "9" || ch === "." && this.pos + 1 < this.source.length && this.source[this.pos + 1] >= "0" && this.source[this.pos + 1] <= "9") {
          this.tokens.push(this.readNumber());
          continue;
        }
        if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch === "_") {
          this.tokens.push(this.readIdentifierOrKeyword());
          continue;
        }
        if (ch === "{" || ch === "}" || ch === "(" || ch === ")" || ch === "[" || ch === "]" || ch === ";" || ch === "," || ch === ":" || ch === "." || ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "!" || ch === "<" || ch === ">" || ch === "=") {
          this.tokens.push(this.readOperator());
          continue;
        }
        throw new LexerError(`Unexpected character: ${ch}`, startLine, startCol);
      }
      this.tokens.push(new Token(TokenType.EOF, null, this.line, this.column));
    }
    getTokens() {
      return this.tokens;
    }
  };

  // src/ast/nodes.ts
  var LiteralExpr = class {
    constructor(value, line = 0, column = 0) {
      this.value = value;
      this.line = line;
      this.column = column;
    }
  };
  var IdentifierExpr = class {
    constructor(name, line = 0, column = 0) {
      this.name = name;
      this.line = line;
      this.column = column;
    }
  };
  var BinOpExpr = class {
    constructor(op, left, right, line = 0, column = 0) {
      this.op = op;
      this.left = left;
      this.right = right;
      this.line = line;
      this.column = column;
    }
  };
  var UnOpExpr = class {
    constructor(op, operand, line = 0, column = 0) {
      this.op = op;
      this.operand = operand;
      this.line = line;
      this.column = column;
    }
  };
  var CallExpr = class {
    constructor(callee, args, line = 0, column = 0) {
      this.callee = callee;
      this.args = args;
      this.line = line;
      this.column = column;
    }
  };
  var FieldAccessExpr = class {
    constructor(object, field, line = 0, column = 0) {
      this.object = object;
      this.field = field;
      this.line = line;
      this.column = column;
    }
  };
  var IfExpr = class {
    constructor(condition, thenBlock, line = 0, column = 0) {
      this.condition = condition;
      this.thenBlock = thenBlock;
      this.line = line;
      this.column = column;
    }
  };
  var BlockExpr = class {
    constructor(stmts, line = 0, column = 0) {
      this.stmts = stmts;
      this.line = line;
      this.column = column;
    }
  };
  var LambdaExpr = class {
    constructor(params, returnType, body, line = 0, column = 0) {
      this.params = params;
      this.returnType = returnType;
      this.body = body;
      this.line = line;
      this.column = column;
    }
  };
  var RecordCreateExpr = class {
    constructor(fields, line = 0, column = 0) {
      this.fields = fields;
      this.line = line;
      this.column = column;
    }
  };
  var ListCreateExpr = class {
    constructor(elements, line = 0, column = 0) {
      this.elements = elements;
      this.line = line;
      this.column = column;
    }
  };
  var MapCreateExpr = class {
    constructor(entries, line = 0, column = 0) {
      this.entries = entries;
      this.line = line;
      this.column = column;
    }
  };
  var ResultOkExpr = class {
    constructor(value, line = 0, column = 0) {
      this.value = value;
      this.line = line;
      this.column = column;
    }
  };
  var ResultErrExpr = class {
    constructor(message, line = 0, column = 0) {
      this.message = message;
      this.line = line;
      this.column = column;
    }
  };
  var UnitExpr = class {
    constructor(line = 0, column = 0) {
      this.line = line;
      this.column = column;
    }
  };
  var LetStmt = class {
    constructor(name, type, init, line = 0, column = 0) {
      this.name = name;
      this.type = type;
      this.init = init;
      this.line = line;
      this.column = column;
    }
  };
  var FnDecl = class {
    constructor(name, params, returnType, body, line = 0, column = 0) {
      this.name = name;
      this.params = params;
      this.returnType = returnType;
      this.body = body;
      this.line = line;
      this.column = column;
    }
  };
  var ReturnStmt = class {
    constructor(value, line = 0, column = 0) {
      this.value = value;
      this.line = line;
      this.column = column;
    }
  };
  var IfStmt = class {
    constructor(condition, thenBlock, line = 0, column = 0) {
      this.condition = condition;
      this.thenBlock = thenBlock;
      this.line = line;
      this.column = column;
    }
  };
  var ExpressionStmt = class {
    constructor(expression, line = 0, column = 0) {
      this.expression = expression;
      this.line = line;
      this.column = column;
    }
  };
  var ImportStmt = class {
    constructor(name, from, line = 0, column = 0) {
      this.name = name;
      this.from = from;
      this.line = line;
      this.column = column;
    }
  };
  var ExportStmt = class {
    constructor(decl, line = 0, column = 0) {
      this.decl = decl;
      this.line = line;
      this.column = column;
    }
  };
  var TypeDecl = class {
    constructor(name, fields, line = 0, column = 0) {
      this.name = name;
      this.fields = fields;
      this.line = line;
      this.column = column;
    }
  };
  var TypeAnnotation = class {
    constructor(name, typeParams = null, line = 0, column = 0) {
      this.name = name;
      this.typeParams = typeParams;
      this.line = line;
      this.column = column;
    }
    toString() {
      if (this.typeParams) {
        return `${this.name}<${this.typeParams.join(", ")}>`;
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
  };
  var Program = class {
    constructor(stmts, modules = /* @__PURE__ */ new Map()) {
      this.stmts = stmts;
      this.modules = modules;
    }
  };

  // src/parser/index.ts
  var ParseError = class extends Error {
    constructor(message, line = 0, column = 0) {
      super(`Parse error [${line}:${column}]: ${message}`);
      this.line = line;
      this.column = column;
      this.name = "ParseError";
    }
  };
  var Parser = class {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
    }
    peek() {
      return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
    }
    advance() {
      const token = this.tokens[this.pos];
      if (!token) {
        throw new ParseError("Unexpected end of input", 0, 0);
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
      if (this.check(TokenType.IMPORT)) {
        return this.parseImport();
      }
      if (this.check(TokenType.EXPORT)) {
        return this.parseExport();
      }
      if (this.check(TokenType.TYPE)) {
        return this.parseTypeDecl();
      }
      if (this.check(TokenType.FN)) {
        return this.parseFnDecl(true);
      }
      if (this.check(TokenType.LET)) {
        return this.parseLet();
      }
      if (this.check(TokenType.IF)) {
        return this.parseIf();
      }
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
      this.match(TokenType.SEMICOLON);
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
        params.map((p) => ({ name: p.name, type: p.type })),
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
      while (!this.check(TokenType.EOF) && !this.check(TokenType.RBRACE) && !this.check(TokenType.RPAREN) && !this.check(TokenType.COMMA) && !this.check(TokenType.SEMICOLON)) {
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
        return new UnOpExpr("not", operand, token.line, token.column);
      }
      if (token.type === TokenType.SUB) {
        this.advance();
        const operand = this.parseUnary();
        return new UnOpExpr("-", operand, token.line, token.column);
      }
      return this.parsePrimary();
    }
    parsePrimary() {
      const token = this.peek();
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
      if (token.type === TokenType.LPAREN && this.pos + 1 < this.tokens.length && this.tokens[this.pos + 1].type === TokenType.RPAREN) {
        this.advance();
        this.advance();
        return new UnitExpr(token.line, token.column);
      }
      if (token.type === TokenType.LPAREN) {
        this.advance();
        const expr = this.parseExpr();
        this.expect(TokenType.RPAREN);
        return expr;
      }
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
      if (token.type === TokenType.LBRACKET) {
        return this.parseListLiteral();
      }
      if (token.type === TokenType.LBRACE) {
        return this.parseRecordLiteral();
      }
      if (token.type === TokenType.FN) {
        return this.parseFnLiteral();
      }
      if (token.type === TokenType.LBRACE) {
        return this.parseMapLiteral();
      }
      if (token.type === TokenType.IDENTIFIER) {
        let expr = new IdentifierExpr(token.value, token.line, token.column);
        this.advance();
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
          expr = new CallExpr(expr, args, token.line, token.column);
          if (this.check(TokenType.DOT)) {
            expr = this.parseFieldChain(expr);
          }
          return expr;
        } else if (this.check(TokenType.DOT)) {
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
      const isMap = this.looksLikeMap();
      if (isMap) {
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
      if (this.check(TokenType.IDENTIFIER)) {
        const savedPos = this.pos;
        this.advance();
        if (this.check(TokenType.COLON)) {
          this.pos = savedPos;
          return false;
        }
        this.pos = savedPos;
      }
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
        params.map((p) => ({ name: p.name, type: p.type })),
        returnType,
        body,
        fnToken.line,
        fnToken.column
      );
    }
    parseFieldChain(base) {
      let expr = base;
      while (this.check(TokenType.DOT)) {
        this.advance();
        const fieldToken = this.expect(TokenType.IDENTIFIER);
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
          expr = new CallExpr(new FieldAccessExpr(expr, fieldToken.value, fieldToken.line, fieldToken.column), args, fieldToken.line, fieldToken.column);
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
        this.advance();
        typeParams = [];
        typeParams.push(this.parseType());
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
        "+": 5,
        "-": 5,
        "*": 6,
        "/": 6,
        "==": 3,
        "!=": 3,
        "<": 4,
        ">": 4,
        "<=": 4,
        ">=": 4,
        "AND": 2,
        "OR": 1
      };
      return opMap[type] ?? -1;
    }
  };

  // src/typechecker/index.ts
  var BUILTIN_TYPES = {
    Number: { kind: "primitive", params: null },
    String: { kind: "primitive", params: null },
    Boolean: { kind: "primitive", params: null },
    Unit: { kind: "primitive", params: null },
    List: { kind: "generic", params: 1 },
    // List<T>
    Result: { kind: "generic", params: 1 },
    // Result<T>
    Map: { kind: "generic", params: 2 },
    // Map<K, V>
    Task: { kind: "generic", params: 1 }
    // Task<T>
  };
  var BUILTINS = new Set(Object.keys(BUILTIN_TYPES));
  var TypeError2 = class extends Error {
    constructor(message, line, column) {
      super(`Type error [${line}:${column}]: ${message}`);
      this.line = line;
      this.column = column;
      this.name = "TypeError";
    }
  };
  var ScopeEntry = class {
    constructor(name, type, isMutable = false) {
      this.name = name;
      this.type = type;
      this.isMutable = isMutable;
    }
  };
  var TypeChecker = class {
    constructor() {
      this.scopes = [];
      this.typeDecls = /* @__PURE__ */ new Map();
      this.fnDecls = /* @__PURE__ */ new Map();
      this.errors = [];
      this._typeVarBindings = /* @__PURE__ */ new Map();
    }
    check(program, options = {}) {
      this.program = program;
      this.imports = options.imports || /* @__PURE__ */ new Map();
      this.enterScope();
      this.collectDeclarations();
      for (const stmt of program.stmts) {
        this.checkStmt(stmt);
      }
      for (const [_, fn] of this.fnDecls) {
        this.checkFnBody(fn);
      }
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
          return;
        // Checked in checkFnBody
        case TypeDecl:
          return;
        // Type declarations are collected in collectDeclarations
        case ImportStmt:
          return this.checkImport(stmt);
        case ExportStmt:
          return this.checkStmt(stmt.decl);
        default:
          throw new TypeError2(`Unknown statement: ${stmt.constructor.name}`, stmt.line, stmt.column);
      }
    }
    checkLet(stmt) {
      if (this.scopeBindings.has(stmt.name)) {
        throw new TypeError2(
          `Variable '${stmt.name}' is already defined in this scope`,
          stmt.line,
          stmt.column
        );
      }
      this.checkExpr(stmt.init, stmt.type);
      this.scopeBindings.set(stmt.name, new ScopeEntry(stmt.name, stmt.type));
    }
    checkImport(stmt) {
      const moduleData = this.imports.get(stmt.from);
      if (!moduleData || !moduleData.exports || moduleData.exports.size === 0) {
        throw new TypeError2(
          `Module '${stmt.from}' has no exports`,
          stmt.line,
          stmt.column
        );
      }
      const fieldTypes = [];
      for (const [name, fnDecl] of moduleData.exports) {
        const retType = fnDecl.returnType || new TypeAnnotation("Unit");
        const paramTypes = fnDecl.params.map((p) => p.type);
        const fnType = new TypeAnnotation("Fn", [...paramTypes, retType], stmt.line, stmt.column);
        const qualifiedName = `${stmt.name}.${name}`;
        this.scopeBindings.set(qualifiedName, new ScopeEntry(qualifiedName, fnType));
        fieldTypes.push({ name, type: fnType });
      }
      const namespaceType = new TypeAnnotation("Record", fieldTypes.map((f) => f.type), stmt.line, stmt.column);
      this.scopeBindings.set(stmt.name, new ScopeEntry(stmt.name, namespaceType));
    }
    checkIf(stmt) {
      this.checkExpr(stmt.condition, new TypeAnnotation("Boolean"));
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
        const resolved = this.resolveTypeVars(inferred, this._typeVarBindings);
        if (resolved && this.typesMatch(resolved, expectedType)) {
          return resolved;
        }
        throw new TypeError2(
          `Expected type ${expectedType.toString()} but got ${inferred.toString()}`,
          expr.line,
          expr.column
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
          return new TypeAnnotation("Unit");
        default:
          throw new TypeError2(`Cannot infer type for: ${expr.constructor.name}`, expr.line, expr.column);
      }
    }
    inferLiteralType(expr) {
      const value = expr.value;
      if (typeof value === "number") {
        return new TypeAnnotation("Number");
      }
      if (typeof value === "string") {
        return new TypeAnnotation("String");
      }
      if (typeof value === "boolean") {
        return new TypeAnnotation("Boolean");
      }
      if (value === null) {
        return new TypeAnnotation("Unit");
      }
      throw new TypeError2(`Unknown literal type`, 0, 0);
    }
    lookupIdentifier(name) {
      for (let i = this.scopes.length - 1; i >= 0; i--) {
        const scope = this.scopes[i];
        if (scope.has(name)) {
          return scope.get(name).type;
        }
      }
      if (BUILTIN_FUNCTIONS.has(name)) {
        return BUILTIN_FUNCTIONS.get(name);
      }
      if (this.fnDecls.has(name)) {
        return this.fnDecls.get(name).returnType;
      }
      throw new TypeError2(`Undefined variable: ${name}`, 0, 0);
    }
    // ── Lambda type inference ──────────────────────────────────────
    inferLambda(expr) {
      const savedScopes = this.scopes;
      this.scopes = [/* @__PURE__ */ new Map()];
      this.scopeBindings = this.scopes[0];
      const paramTypes = [];
      for (const p of expr.params) {
        paramTypes.push(p.type);
        this.scopeBindings.set(p.name, new ScopeEntry(p.name, p.type));
      }
      let returnType = expr.returnType;
      for (let i = 0; i < expr.body.length; i++) {
        const stmt = expr.body[i];
        if (stmt instanceof ReturnStmt) {
          if (stmt.value) {
            const retType = this.inferExprType(stmt.value);
            if (!returnType) {
              returnType = retType;
            } else if (!this.typesMatch(retType, returnType)) {
              throw new TypeError2(
                `Lambda return type: expected ${returnType.toString()} but got ${retType.toString()}`,
                stmt.line,
                stmt.column
              );
            }
          } else {
            if (returnType && !this.typesMatch(new TypeAnnotation("Unit"), returnType)) {
              throw new TypeError2(
                `Lambda return type: expected ${returnType.toString()} but got Unit`,
                stmt.line,
                stmt.column
              );
            }
            if (!returnType) {
              returnType = new TypeAnnotation("Unit");
            }
          }
        } else if (i === expr.body.length - 1 && stmt instanceof ExpressionStmt) {
          const actualType = this.inferExprType(stmt.expression);
          if (!returnType) {
            returnType = actualType;
          } else if (!this.typesMatch(actualType, returnType)) {
            throw new TypeError2(
              `Lambda return type: expected ${returnType.toString()} but got ${actualType.toString()}`,
              stmt.line,
              stmt.column
            );
          }
        } else {
          this.checkStmt(stmt);
        }
      }
      if (!returnType) {
        returnType = new TypeAnnotation("Unit");
      }
      this.scopes = savedScopes;
      this.scopeBindings = savedScopes.length > 0 ? savedScopes[savedScopes.length - 1] : /* @__PURE__ */ new Map();
      return new TypeAnnotation("Fn", [...paramTypes, returnType], expr.line, expr.column);
    }
    inferBinOp(expr) {
      const leftType = this.inferExprType(expr.left);
      const rightType = this.inferExprType(expr.right);
      if (["-", "*", "/"].includes(expr.op)) {
        if (!this.isNumeric(leftType) || !this.isNumeric(rightType)) {
          throw new TypeError2(
            `Arithmetic operator '${expr.op}' requires numeric types, got ${leftType.toString()} and ${rightType.toString()}`,
            expr.line,
            expr.column
          );
        }
        return new TypeAnnotation("Number");
      }
      if (expr.op === "+") {
        if (this.isNumeric(leftType) && this.isNumeric(rightType)) {
          return new TypeAnnotation("Number");
        }
        if (leftType.name === "String" && rightType.name === "String") {
          return new TypeAnnotation("String");
        }
        throw new TypeError2(
          `Operator '+' requires matching numeric or string types, got ${leftType.toString()} and ${rightType.toString()}`,
          expr.line,
          expr.column
        );
      }
      if (["==", "!=", "<", ">", "<=", ">="].includes(expr.op)) {
        if (!this.canCompare(leftType, rightType)) {
          throw new TypeError2(
            `Comparison operator '${expr.op}' requires matching types, got ${leftType.toString()} and ${rightType.toString()}`,
            expr.line,
            expr.column
          );
        }
        return new TypeAnnotation("Boolean");
      }
      if (expr.op === "and" || expr.op === "or") {
        if (leftType.name !== "Boolean" || rightType.name !== "Boolean") {
          throw new TypeError2(
            `Boolean operator '${expr.op}' requires Boolean types, got ${leftType.toString()} and ${rightType.toString()}`,
            expr.line,
            expr.column
          );
        }
        return new TypeAnnotation("Boolean");
      }
      throw new TypeError2(`Unknown operator: ${expr.op}`, expr.line, expr.column);
    }
    inferUnOp(expr) {
      const operandType = this.inferExprType(expr.operand);
      if (expr.op === "not") {
        if (operandType.name !== "Boolean") {
          throw new TypeError2(`'not' operator requires Boolean, got ${operandType.toString()}`, expr.line, expr.column);
        }
        return new TypeAnnotation("Boolean");
      }
      if (expr.op === "-") {
        if (!this.isNumeric(operandType)) {
          throw new TypeError2(`Negation requires numeric type, got ${operandType.toString()}`, expr.line, expr.column);
        }
        return new TypeAnnotation("Number");
      }
      throw new TypeError2(`Unknown unary operator: ${expr.op}`, expr.line, expr.column);
    }
    inferCall(expr, expectedType = null) {
      let fnType;
      if (expr.callee instanceof IdentifierExpr) {
        const fnName = expr.callee.name;
        if (fnName === "get" || fnName === "has" || fnName === "put") {
          return this.inferPolyBuiltin(expr, fnName);
        }
        if (fnName === "spawn") {
          const fnType2 = this.inferExprType(expr.args[0]);
          if (fnType2.name !== "Fn") {
            throw new TypeError2("spawn expects a function", expr.line, expr.column);
          }
          const typeParams = fnType2.typeParams || [];
          if (typeParams.length === 0) {
            throw new TypeError2("spawn expects a function with a return type", expr.line, expr.column);
          }
          const retType = typeParams[typeParams.length - 1];
          return new TypeAnnotation("Task", [retType], expr.line, expr.column);
        }
        if (fnName === "join") {
          const taskType = this.inferExprType(expr.args[0]);
          if (taskType.name !== "Task") {
            throw new TypeError2("join expects a Task", expr.line, expr.column);
          }
          const typeParams = taskType.typeParams || [];
          if (typeParams.length === 0) {
            throw new TypeError2("join expects a Task with a type parameter", expr.line, expr.column);
          }
          return typeParams[0];
        }
        if (BUILTIN_FUNCTIONS.has(fnName)) {
          fnType = BUILTIN_FUNCTIONS.get(fnName);
          const sig = fnType;
          const typeVars = /* @__PURE__ */ new Map();
          for (let i = 0; i < expr.args.length; i++) {
            const expectedParamType = sig.paramTypes[i] instanceof TypeAnnotation ? sig.paramTypes[i] : new TypeAnnotation(String(sig.paramTypes[i]));
            const inferredType = this.inferExprType(expr.args[i]);
            this.unifyTypeVars(expectedParamType, inferredType, typeVars);
          }
          for (let i = 0; i < expr.args.length; i++) {
            const resolvedParamType = this.resolveTypeVars(sig.paramTypes[i], typeVars);
            if (!resolvedParamType.name.startsWith("$")) {
              this.checkExpr(expr.args[i], resolvedParamType);
            }
          }
          const resolvedReturn = this.resolveTypeVars(sig.returnType, typeVars, expectedType);
          return resolvedReturn;
        }
        if (this.fnDecls.has(fnName)) {
          const fn = this.fnDecls.get(fnName);
          this.checkUserFunctionCall(fn, expr.args, expr);
          return fn.returnType;
        }
        const maybeFn = this.lookupIdentifier(fnName);
        if (maybeFn instanceof TypeAnnotation && maybeFn.name === "Fn") {
          const typeParams = maybeFn.typeParams || [];
          if (expr.args.length !== typeParams.length - 1) {
            throw new TypeError2(
              `Lambda expects ${typeParams.length - 1} args, got ${expr.args.length}`,
              expr.line,
              expr.column
            );
          }
          for (let i = 0; i < expr.args.length; i++) {
            const actual = this.inferExprType(expr.args[i]);
            const expected = typeParams[i];
            if (!this.typesMatch(actual, expected)) {
              throw new TypeError2(
                `Lambda arg ${i}: expected ${expected.toString()} but got ${actual.toString()}`,
                expr.line,
                expr.column
              );
            }
          }
          return typeParams[typeParams.length - 1];
        }
        throw new TypeError2(`Undefined function: ${fnName}`, expr.callee.line, expr.callee.column);
      }
      if (expr.callee instanceof FieldAccessExpr) {
        const fnType2 = this.inferExprType(expr.callee);
        if (fnType2.name === "Fn") {
          const typeParams = fnType2.typeParams || [];
          if (expr.args.length !== typeParams.length - 1) {
            throw new TypeError2(
              `Function expects ${typeParams.length - 1} args, got ${expr.args.length}`,
              expr.line,
              expr.column
            );
          }
          for (let i = 0; i < expr.args.length; i++) {
            const actual = this.inferExprType(expr.args[i]);
            const expected = typeParams[i];
            if (!this.typesMatch(actual, expected)) {
              throw new TypeError2(
                `Arg ${i}: expected ${expected.toString()} but got ${actual.toString()}`,
                expr.line,
                expr.column
              );
            }
          }
          return typeParams[typeParams.length - 1];
        }
        throw new TypeError2(`Cannot call non-function expression`, expr.line, expr.column);
      }
      throw new TypeError2(`Cannot call non-function expression`, expr.line, expr.column);
    }
    inferFieldAccess(expr) {
      const objectType = this.inferExprType(expr.object);
      if (objectType.name === "Result") {
        if (expr.field === "isOk") return new TypeAnnotation("Boolean");
        if (expr.field === "value") {
          const innerType = objectType.typeParams && objectType.typeParams.length > 0 ? objectType.typeParams[0] : new TypeAnnotation("Unit");
          return innerType;
        }
        if (expr.field === "errMessage") return new TypeAnnotation("String");
        throw new TypeError2(
          `Result has no field '${expr.field}'`,
          expr.line,
          expr.column
        );
      }
      if (objectType.name === "String") {
        if (expr.field === "len") return new TypeAnnotation("Number");
        throw new TypeError2(
          `String has no field '${expr.field}'`,
          expr.line,
          expr.column
        );
      }
      if (objectType.name === "List") {
        if (expr.field === "len") return new TypeAnnotation("Number");
        throw new TypeError2(
          `List has no field '${expr.field}'`,
          expr.line,
          expr.column
        );
      }
      const typeDecl = this.typeDecls.get(objectType.name);
      if (typeDecl) {
        const field = typeDecl.fields.find((f) => f.name === expr.field);
        if (!field) {
          throw new TypeError2(
            `Record type '${objectType.name}' has no field '${expr.field}'`,
            expr.line,
            expr.column
          );
        }
        return field.type;
      }
      const objBinding = this.lookupIdentifier(expr.object.name || "unknown");
      if (objBinding instanceof TypeAnnotation && objBinding.name === "Record" && objectType.typeParams) {
        const qualifiedName = `${expr.object.name}.${expr.field}`;
        const qualifiedBinding = this.scopeBindings.get(qualifiedName);
        if (qualifiedBinding) {
          return qualifiedBinding.type;
        }
      }
      throw new TypeError2(
        `Cannot access field '${expr.field}' on type ${objectType.toString()}`,
        expr.line,
        expr.column
      );
    }
    inferIfExpr(expr) {
      this.checkExpr(expr.condition, new TypeAnnotation("Boolean"));
      for (const s of expr.thenBlock) {
        this.checkStmt(s);
      }
      return new TypeAnnotation("Unit");
    }
    inferBlock(expr) {
      let lastType = new TypeAnnotation("Unit");
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
      let typeName = null;
      if (expectedType && expectedType.name) {
        typeName = expectedType.name;
      } else if (expr.fields.length > 0) {
        typeName = expr.fields[0].key;
      } else {
        typeName = "Record";
      }
      if (expr.fields.length === 0 && expectedType) {
        if (expectedType.name === typeName) {
          return expectedType;
        }
      }
      const typeDecl = this.typeDecls.get(typeName);
      if (!typeDecl) {
        throw new TypeError2(
          `Unknown record type: ${typeName}`,
          expr.line,
          expr.column
        );
      }
      const fields = {};
      for (const field of expr.fields) {
        const decl = typeDecl.fields.find((f) => f.name === field.key);
        if (!decl) {
          throw new TypeError2(
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
        if (expectedType && expectedType.name === "List" && expectedType.typeParams && expectedType.typeParams.length > 0) {
          return new TypeAnnotation("List", [expectedType.typeParams[0]], expr.line, expr.column);
        }
        throw new TypeError2(`Empty list has no type information`, expr.line, expr.column);
      }
      const elementType = this.inferExprType(expr.elements[0]);
      for (let i = 1; i < expr.elements.length; i++) {
        const t = this.inferExprType(expr.elements[i]);
        if (!this.typesMatch(elementType, t)) {
          throw new TypeError2(
            `List element type mismatch at index ${i}: expected ${elementType.toString()}, got ${t.toString()}`,
            expr.elements[i].line,
            expr.elements[i].column
          );
        }
      }
      return new TypeAnnotation("List", [elementType], expr.line, expr.column);
    }
    inferMapCreate(expr, expectedType = null) {
      if (expr.entries.length === 0) {
        if (expectedType && expectedType.name === "Map" && expectedType.typeParams && expectedType.typeParams.length === 2) {
          return expectedType;
        }
        throw new TypeError2(`Empty map has no type information`, expr.line, expr.column);
      }
      const keyType = this.inferExprType(expr.entries[0].key);
      const valueType = this.inferExprType(expr.entries[0].value);
      for (let i = 1; i < expr.entries.length; i++) {
        const kt = this.inferExprType(expr.entries[i].key);
        const vt = this.inferExprType(expr.entries[i].value);
        if (!this.typesMatch(keyType, kt) || !this.typesMatch(valueType, vt)) {
          throw new TypeError2(
            `Map key/value type mismatch at index ${i}`,
            expr.entries[i].key.line,
            expr.entries[i].key.column
          );
        }
      }
      return new TypeAnnotation("Map", [keyType, valueType], expr.line, expr.column);
    }
    inferResultOk(expr, expectedType = null) {
      const innerType = this.inferExprType(expr.value);
      return new TypeAnnotation("Result", [innerType], expr.line, expr.column);
    }
    inferResultErr(expr, expectedType = null) {
      const msgType = this.inferExprType(expr.message);
      if (msgType.name !== "String") {
        throw new TypeError2(`err() requires String argument`, expr.line, expr.column);
      }
      if (expectedType && expectedType.name === "Result" && expectedType.typeParams && expectedType.typeParams.length === 1) {
        return new TypeAnnotation("Result", [expectedType.typeParams[0]], expr.line, expr.column);
      }
      return new TypeAnnotation("Result", [new TypeAnnotation("Unit")], expr.line, expr.column);
    }
    // ── Helper methods ────────────────────────────────────────────
    inferExprType(expr, expectedType = null) {
      return this.inferType(expr, expectedType);
    }
    isNumeric(type) {
      return type.name === "Number";
    }
    canCompare(left, right) {
      if (left.name !== right.name) return false;
      if (left.kind === "generic" && right.kind === "generic") {
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
      for (let i = 0; i < a.typeParams.length; i++) {
        const p1 = a.typeParams[i];
        const p2 = b.typeParams[i];
        const name1 = typeof p1 === "string" ? p1 : p1 instanceof TypeAnnotation ? p1.name : String(p1);
        const name2 = typeof p2 === "string" ? p2 : p2 instanceof TypeAnnotation ? p2.name : String(p2);
        if (name1 !== name2) return false;
      }
      return true;
    }
    checkCallArgs(sig, args, fnName, expr) {
      if (args.length !== sig.paramTypes.length) {
        throw new TypeError2(
          `Function '${fnName}' expects ${sig.paramTypes.length} arguments, got ${args.length}`,
          expr.line,
          expr.column
        );
      }
      const typeVars = /* @__PURE__ */ new Map();
      for (let i = 0; i < args.length; i++) {
        const expectedType = sig.paramTypes[i];
        const inferredType = this.inferExprType(args[i]);
        this.unifyTypeVars(expectedType, inferredType, typeVars);
      }
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
      if (expectedType.name.startsWith("$")) {
        const tv = expectedType.name;
        if (!typeVars.has(tv)) {
          typeVars.set(tv, inferredType);
        }
        return;
      }
      if (expectedType.typeParams && inferredType.typeParams) {
        for (let i = 0; i < expectedType.typeParams.length; i++) {
          const expParam = expectedType.typeParams[i] instanceof TypeAnnotation ? expectedType.typeParams[i] : new TypeAnnotation(String(expectedType.typeParams[i]));
          const infParam = inferredType.typeParams[i] instanceof TypeAnnotation ? inferredType.typeParams[i] : new TypeAnnotation(String(inferredType.typeParams[i]));
          this.unifyTypeVars(expParam, infParam, typeVars);
        }
      }
    }
    /**
     * Substitute type variables in a type with their resolved types.
     * If a type variable can't be resolved from typeVars, try the expected type context.
     */
    resolveTypeVars(type, typeVars, expectedFromContext = null) {
      if (type.name.startsWith("$")) {
        const resolved = typeVars.get(type.name);
        if (resolved) return resolved;
        if (expectedFromContext && expectedFromContext.typeParams) {
          const idx = this.findTypeVarIndex(expectedFromContext, type.name);
          if (idx >= 0) {
            return expectedFromContext.typeParams[idx];
          }
        }
        return type;
      }
      if (type.typeParams) {
        const resolvedParams = type.typeParams.map((p) => {
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
        const p = typeAnnotation.typeParams[i] instanceof TypeAnnotation ? typeAnnotation.typeParams[i] : new TypeAnnotation(String(typeAnnotation.typeParams[i]));
        if (p.name === varName) return i;
      }
      return -1;
    }
    checkUserFunctionCall(fn, args, expr) {
      if (args.length !== fn.params.length) {
        throw new TypeError2(
          `Function '${fn.name}' expects ${fn.params.length} arguments, got ${args.length}`,
          expr.line,
          expr.column
        );
      }
      for (let i = 0; i < args.length; i++) {
        const expectedType = fn.params[i].type;
        this.checkExpr(args[i], expectedType);
      }
    }
    checkFnBody(fn) {
      this.enterScope();
      for (const param of fn.params) {
        this.scopeBindings.set(param.name, new ScopeEntry(param.name, param.type));
      }
      let hasExplicitReturn = false;
      for (let i = 0; i < fn.body.length - 1; i++) {
        const stmt = fn.body[i];
        this.checkStmt(stmt);
        if (stmt instanceof ReturnStmt) {
          hasExplicitReturn = true;
        }
      }
      if (fn.body.length > 0) {
        const lastStmt = fn.body[fn.body.length - 1];
        if (lastStmt instanceof ReturnStmt) {
          if (lastStmt.value) {
            this.checkExpr(lastStmt.value, fn.returnType);
          }
          hasExplicitReturn = true;
        } else if (lastStmt.expression) {
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
        return new TypeAnnotation("Unit");
      }
      if (stmt instanceof ExpressionStmt) {
        return this.inferExprType(stmt.expression);
      }
      if (stmt instanceof IfStmt) {
        return new TypeAnnotation("Unit");
      }
      if (stmt instanceof LetStmt) {
        return new TypeAnnotation("Unit");
      }
      return new TypeAnnotation("Unit");
    }
    checkMutualRecursion() {
      const deps = /* @__PURE__ */ new Map();
      for (const [name, decl] of this.typeDecls) {
        const depSet = /* @__PURE__ */ new Set();
        for (const field of decl.fields) {
          if (this.typeDecls.has(field.type.name)) {
            depSet.add(field.type.name);
          }
        }
        deps.set(name, depSet);
      }
      const visited = /* @__PURE__ */ new Set();
      const recStack = /* @__PURE__ */ new Set();
      const dfs = (node) => {
        visited.add(node);
        recStack.add(node);
        const neighbors = deps.get(node) || /* @__PURE__ */ new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            throw new TypeError2(
              `Mutually recursive type declarations detected: ${node} <-> ${neighbor}`,
              0,
              0
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
      this.scopes.push(/* @__PURE__ */ new Map());
      this.scopeBindings = this.scopes[this.scopes.length - 1];
    }
    exitScope() {
      this.scopes.pop();
      this.scopeBindings = this.scopes[this.scopes.length - 1] || /* @__PURE__ */ new Map();
    }
    // ── Polymorphic builtins (get, has, put) ────────────────────────
    inferPolyBuiltin(expr, fnName) {
      if (expr.args.length < 1) {
        throw new TypeError2(`${fnName} expects at least 1 argument`, expr.line, expr.column);
      }
      const firstType = this.inferExprType(expr.args[0]);
      if (fnName === "get") {
        if (expr.args.length !== 2) {
          throw new TypeError2(`get expects 2 arguments, got ${expr.args.length}`, expr.line, expr.column);
        }
        const keyType = this.inferExprType(expr.args[1]);
        if (firstType.name === "List") {
          if (keyType.name !== "Number") {
            throw new TypeError2(`List index must be Number, got ${keyType.name}`, expr.line, expr.column);
          }
          const elemType = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation("$T");
          return new TypeAnnotation("Result", [elemType]);
        }
        if (firstType.name === "Map") {
          const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation("$K");
          if (!this.typesMatch(keyType, keyParam)) {
            throw new TypeError2(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
          }
          const valType = firstType.typeParams && firstType.typeParams[1] || new TypeAnnotation("$V");
          return new TypeAnnotation("Result", [valType]);
        }
        throw new TypeError2(`get expects a List or Map, got ${firstType.name}`, expr.line, expr.column);
      }
      if (fnName === "has") {
        if (expr.args.length !== 2) {
          throw new TypeError2(`has expects 2 arguments, got ${expr.args.length}`, expr.line, expr.column);
        }
        const keyType = this.inferExprType(expr.args[1]);
        if (firstType.name !== "Map") {
          throw new TypeError2(`has expects a Map, got ${firstType.name}`, expr.line, expr.column);
        }
        const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation("$K");
        if (!this.typesMatch(keyType, keyParam)) {
          throw new TypeError2(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
        }
        return new TypeAnnotation("Boolean");
      }
      if (fnName === "put") {
        if (expr.args.length !== 3) {
          throw new TypeError2(`put expects 3 arguments, got ${expr.args.length}`, expr.line, expr.column);
        }
        const keyType = this.inferExprType(expr.args[1]);
        const valType = this.inferExprType(expr.args[2]);
        if (firstType.name !== "Map") {
          throw new TypeError2(`put expects a Map, got ${firstType.name}`, expr.line, expr.column);
        }
        const keyParam = firstType.typeParams && firstType.typeParams[0] || new TypeAnnotation("$K");
        const valParam = firstType.typeParams && firstType.typeParams[1] || new TypeAnnotation("$V");
        if (!this.typesMatch(keyType, keyParam)) {
          throw new TypeError2(`Map key must be ${keyParam.toString()}, got ${keyType.toString()}`, expr.line, expr.column);
        }
        if (!this.typesMatch(valType, valParam)) {
          throw new TypeError2(`Map value must be ${valParam.toString()}, got ${valType.toString()}`, expr.line, expr.column);
        }
        return new TypeAnnotation("Unit");
      }
      throw new TypeError2(`Unknown polymorphic builtin: ${fnName}`, expr.line, expr.column);
    }
    collectTypeVarNames(type) {
      const names = [];
      if (type.name.startsWith("$") && !names.includes(type.name)) {
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
  };
  var BUILTIN_FUNCTIONS = /* @__PURE__ */ new Map([
    // String builtins
    ["concat", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("String")], returnType: new TypeAnnotation("String") }],
    ["substring", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("String") }],
    ["indexOf", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("String")], returnType: new TypeAnnotation("Number") }],
    ["parse_num", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Result", [new TypeAnnotation("Number")]) }],
    ["to_string", { paramTypes: [new TypeAnnotation("$T")], returnType: new TypeAnnotation("String") }],
    ["print", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Unit") }],
    // List builtins (as functions)
    ["append", { paramTypes: [new TypeAnnotation("List", [new TypeAnnotation("$T")]), new TypeAnnotation("$T")], returnType: new TypeAnnotation("List", [new TypeAnnotation("$T")]) }],
    ["list_get", { paramTypes: [new TypeAnnotation("List", [new TypeAnnotation("$T")]), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Result", [new TypeAnnotation("$T")]) }],
    ["substring_list", { paramTypes: [new TypeAnnotation("List", [new TypeAnnotation("$T")]), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("List", [new TypeAnnotation("$T")]) }],
    // Map builtins (fully generic)
    ["map_put", { paramTypes: [new TypeAnnotation("Map", [new TypeAnnotation("$K"), new TypeAnnotation("$V")]), new TypeAnnotation("$K"), new TypeAnnotation("$V")], returnType: new TypeAnnotation("Map", [new TypeAnnotation("$K"), new TypeAnnotation("$V")]) }],
    ["map_get", { paramTypes: [new TypeAnnotation("Map", [new TypeAnnotation("$K"), new TypeAnnotation("$V")]), new TypeAnnotation("$K")], returnType: new TypeAnnotation("Result", [new TypeAnnotation("$V")]) }],
    ["map_has", { paramTypes: [new TypeAnnotation("Map", [new TypeAnnotation("$K"), new TypeAnnotation("$V")]), new TypeAnnotation("$K")], returnType: new TypeAnnotation("Boolean") }],
    ["map_remove", { paramTypes: [new TypeAnnotation("Map", [new TypeAnnotation("$K"), new TypeAnnotation("$V")]), new TypeAnnotation("$K")], returnType: new TypeAnnotation("Map", [new TypeAnnotation("$K"), new TypeAnnotation("$V")]) }],
    // List higher-order functions
    ["map", { paramTypes: [new TypeAnnotation("List", [new TypeAnnotation("$T")]), new TypeAnnotation("Fn", [new TypeAnnotation("$T"), new TypeAnnotation("$U")])], returnType: new TypeAnnotation("List", [new TypeAnnotation("$U")]) }],
    ["filter", { paramTypes: [new TypeAnnotation("List", [new TypeAnnotation("$T")]), new TypeAnnotation("Fn", [new TypeAnnotation("$T"), new TypeAnnotation("Boolean")])], returnType: new TypeAnnotation("List", [new TypeAnnotation("$T")]) }],
    ["fold", { paramTypes: [new TypeAnnotation("List", [new TypeAnnotation("$T")]), new TypeAnnotation("$U"), new TypeAnnotation("Fn", [new TypeAnnotation("$U"), new TypeAnnotation("$T"), new TypeAnnotation("$U")])], returnType: new TypeAnnotation("$U") }],
    // File I/O (async — returns Task, I/O happens on join)
    ["file_read", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Task", [new TypeAnnotation("Result", [new TypeAnnotation("String")])]) }],
    ["file_read_lines", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Task", [new TypeAnnotation("Result", [new TypeAnnotation("List", [new TypeAnnotation("String")])])]) }],
    ["file_write", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("String")], returnType: new TypeAnnotation("Task", [new TypeAnnotation("Result", [new TypeAnnotation("Unit")])]) }],
    ["read_line", { paramTypes: [], returnType: new TypeAnnotation("Task", [new TypeAnnotation("Result", [new TypeAnnotation("String")])]) }],
    // Network I/O (async — returns Task, I/O happens on join)
    ["fetch", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("String"), new TypeAnnotation("Map", [new TypeAnnotation("String"), new TypeAnnotation("String")]), new TypeAnnotation("String")], returnType: new TypeAnnotation("Task", [new TypeAnnotation("Result", [new TypeAnnotation("String")])]) }],
    // ── Canvas builtins (browser runtime) ──
    ["canvas_clear", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_get_width", { paramTypes: [], returnType: new TypeAnnotation("Number") }],
    ["canvas_get_height", { paramTypes: [], returnType: new TypeAnnotation("Number") }],
    ["canvas_fill_rect", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_stroke_rect", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_clear_rect", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_fill_text", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_stroke_text", { paramTypes: [new TypeAnnotation("String"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_measure_text", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Number") }],
    ["canvas_set_fill_color", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_set_stroke_color", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_set_font", { paramTypes: [new TypeAnnotation("String")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_set_line_width", { paramTypes: [new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_begin_path", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_close_path", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_move_to", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_line_to", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_arc", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_stroke", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_fill", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_save", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_restore", { paramTypes: [], returnType: new TypeAnnotation("Unit") }],
    ["canvas_rotate", { paramTypes: [new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_translate", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    ["canvas_scale", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Unit") }],
    // Math builtins
    ["abs", { paramTypes: [new TypeAnnotation("Number")], returnType: new TypeAnnotation("Number") }],
    ["max", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Number") }],
    ["min", { paramTypes: [new TypeAnnotation("Number"), new TypeAnnotation("Number")], returnType: new TypeAnnotation("Number") }]
  ]);

  // src/runtime/values.ts
  var Value = class {
    constructor(type) {
      this.type = type;
    }
    typeName() {
      return this.type.name;
    }
    toString() {
      return `Value<${this.type.name}>`;
    }
    isNumber() {
      return this.type.name === "Number";
    }
    isString() {
      return this.type.name === "String";
    }
    isBoolean() {
      return this.type.name === "Boolean";
    }
    isUnit() {
      return this.type.name === "Unit";
    }
    isList() {
      return this.type.name === "List";
    }
    isMap() {
      return this.type.name === "Map";
    }
    isRecord() {
      return this.type.name === "Record";
    }
    isResult() {
      return this.type.name === "Result";
    }
    isFn() {
      return this.type.name === "Fn";
    }
    isTask() {
      return this.type.name === "Task";
    }
    isTruthy() {
      return false;
    }
    equals(other) {
      if (this.type.name !== other.type.name) return false;
      return this._equalsSameType(other);
    }
    _equalsSameType(other) {
      return false;
    }
    // ── Boundary: explicit escape to host types ──
    toRawNumber() {
      throw new TypeError(`Cannot extract number from ${this.typeName()}`);
    }
    toRawString() {
      throw new TypeError(`Cannot extract string from ${this.typeName()}`);
    }
    toRawBoolean() {
      throw new TypeError(`Cannot extract boolean from ${this.typeName()}`);
    }
    // ── Operation methods (overridden per type) ──
    add(other) {
      throw new TypeError(`+ not supported for ${this.typeName()}`);
    }
    subtract(other) {
      throw new TypeError(`- not supported for ${this.typeName()}`);
    }
    multiply(other) {
      throw new TypeError(`* not supported for ${this.typeName()}`);
    }
    divide(other) {
      throw new TypeError(`/ not supported for ${this.typeName()}`);
    }
    negate() {
      throw new TypeError(`Negation not supported for ${this.typeName()}`);
    }
    lt(other) {
      throw new TypeError(`< not supported for ${this.typeName()}`);
    }
    gt(other) {
      throw new TypeError(`> not supported for ${this.typeName()}`);
    }
    lte(other) {
      throw new TypeError(`<= not supported for ${this.typeName()}`);
    }
    gte(other) {
      throw new TypeError(`>= not supported for ${this.typeName()}`);
    }
    and(other) {
      throw new TypeError(`'and' not supported for ${this.typeName()}`);
    }
    or(other) {
      throw new TypeError(`'or' not supported for ${this.typeName()}`);
    }
    not() {
      throw new TypeError(`'not' not supported for ${this.typeName()}`);
    }
    concat(other) {
      throw new TypeError(`Concat not supported for ${this.typeName()}`);
    }
  };
  var NUM_TYPE = new TypeAnnotation("Number");
  var NumberValue = class _NumberValue extends Value {
    constructor(value) {
      super(NUM_TYPE);
      if (typeof value !== "number" || !isFinite(value)) {
        throw new TypeError(`Number value must be a finite number, got: ${value}`);
      }
      this._value = value;
    }
    toString() {
      return String(this._value);
    }
    _equalsSameType(other) {
      return this._value === other._value;
    }
    toRawNumber() {
      return this._value;
    }
    add(other) {
      return new _NumberValue(this._value + other._value);
    }
    subtract(other) {
      return new _NumberValue(this._value - other._value);
    }
    multiply(other) {
      return new _NumberValue(this._value * other._value);
    }
    divide(other) {
      const rhs = other._value;
      if (rhs === 0) throw new TypeError("Division by zero");
      return new _NumberValue(this._value / rhs);
    }
    negate() {
      return new _NumberValue(-this._value);
    }
    lt(other) {
      return new BooleanValue(this._value < other._value);
    }
    gt(other) {
      return new BooleanValue(this._value > other._value);
    }
    lte(other) {
      return new BooleanValue(this._value <= other._value);
    }
    gte(other) {
      return new BooleanValue(this._value >= other._value);
    }
  };
  var STR_TYPE = new TypeAnnotation("String");
  var StringValue = class _StringValue extends Value {
    constructor(value) {
      super(STR_TYPE);
      if (typeof value !== "string") {
        throw new TypeError(`StringValue must be constructed with a string, got: ${value}`);
      }
      this._value = value;
    }
    length() {
      return this._value.length;
    }
    get len() {
      return new NumberValue(this._value.length);
    }
    toString() {
      return `"${this._value}"`;
    }
    _equalsSameType(other) {
      return this._value === other._value;
    }
    toRawString() {
      return this._value;
    }
    concat(other) {
      return new _StringValue(this._value + other._value);
    }
  };
  var BOOL_TYPE = new TypeAnnotation("Boolean");
  var BooleanValue = class _BooleanValue extends Value {
    constructor(value) {
      super(BOOL_TYPE);
      if (typeof value !== "boolean") {
        throw new TypeError(`BooleanValue must be constructed with a boolean, got: ${value}`);
      }
      this._value = value;
    }
    toString() {
      return String(this._value);
    }
    _equalsSameType(other) {
      return this._value === other._value;
    }
    toRawBoolean() {
      return this._value;
    }
    isTruthy() {
      return this._value;
    }
    and(other) {
      return new _BooleanValue(this._value && other._value);
    }
    or(other) {
      return new _BooleanValue(this._value || other._value);
    }
    not() {
      return new _BooleanValue(!this._value);
    }
  };
  var UNIT_TYPE = new TypeAnnotation("Unit");
  var UnitValue = class extends Value {
    constructor() {
      super(UNIT_TYPE);
    }
    toString() {
      return "()";
    }
    _equalsSameType(other) {
      return other.isUnit();
    }
  };
  var UNIT_VALUE = new UnitValue();
  var LIST_TYPE = new TypeAnnotation("List");
  var ListValue = class _ListValue extends Value {
    constructor(elements = [], elementType = null) {
      super(LIST_TYPE);
      this._elements = elements;
      this._elementType = elementType;
    }
    typeName() {
      const elemName = this._elementType ? this._elementType.name : "?";
      return `List<${elemName}>`;
    }
    length() {
      return this._elements.length;
    }
    get len() {
      return new NumberValue(this._elements.length);
    }
    get(index) {
      if (index < 0 || index >= this._elements.length) {
        return void 0;
      }
      return this._elements[index];
    }
    append(elem) {
      return new _ListValue([...this._elements, elem], this._elementType);
    }
    slice(start, length) {
      return new _ListValue(this._elements.slice(start, start + length), this._elementType);
    }
    toString() {
      return `[${this._elements.map((e) => e.toString()).join(", ")}]`;
    }
    _equalsSameType(other) {
      const o = other;
      if (this.length() !== o.length()) return false;
      for (let i = 0; i < this.length(); i++) {
        if (!this.get(i).equals(o.get(i))) return false;
      }
      return true;
    }
  };
  var MAP_TYPE = new TypeAnnotation("Map");
  var MapValue = class _MapValue extends Value {
    constructor(entries = {}, keyType = null, valueType = null) {
      super(MAP_TYPE);
      this._entries = entries;
      this._keyType = keyType;
      this._valueType = valueType;
    }
    typeName() {
      const k = this._keyType ? this._keyType.name : "?";
      const v = this._valueType ? this._valueType.name : "?";
      return `Map<${k}, ${v}>`;
    }
    _resolveKey(key) {
      return String(key.isNumber() ? key.toRawNumber() : key.toRawString());
    }
    getByValueKey(key) {
      return this._entries[this._resolveKey(key)];
    }
    hasByValueKey(key) {
      return this._entries.hasOwnProperty(this._resolveKey(key));
    }
    set(key, value) {
      const newEntries = { ...this._entries };
      newEntries[this._resolveKey(key)] = value;
      return new _MapValue(newEntries, this._keyType, this._valueType);
    }
    remove(key) {
      const newEntries = { ...this._entries };
      delete newEntries[this._resolveKey(key)];
      return new _MapValue(newEntries, this._keyType, this._valueType);
    }
    get(key) {
      return this._entries[key] !== void 0 ? this._entries[key] : void 0;
    }
    has(key) {
      return this._entries.hasOwnProperty(key);
    }
    keys() {
      return Object.keys(this._entries);
    }
    size() {
      return Object.keys(this._entries).length;
    }
    toString() {
      const pairs = Object.entries(this._entries).map(([k, v]) => `${k}: ${v.toString()}`);
      return `{${pairs.join(", ")}}`;
    }
    _equalsSameType(other) {
      const o = other;
      if (this.size() !== o.size()) return false;
      for (const k of this.keys()) {
        const aVal = this.get(k);
        const bVal = o.get(k);
        if (!aVal || !bVal || !aVal.equals(bVal)) return false;
      }
      return true;
    }
  };
  var RecordValue = class extends Value {
    constructor(fields, typeName) {
      super(new TypeAnnotation(typeName));
      this._fields = fields;
      this._typeName = typeName;
    }
    typeName() {
      return this._typeName;
    }
    get(fieldName) {
      return this._fields[fieldName] !== void 0 ? this._fields[fieldName] : void 0;
    }
    hasField(fieldName) {
      return this._fields.hasOwnProperty(fieldName);
    }
    fieldNames() {
      return Object.keys(this._fields);
    }
    toString() {
      const fields = Object.entries(this._fields).map(([k, v]) => `${k}: ${v.toString()}`);
      return `${this._typeName}{${fields.join(", ")}}`;
    }
    _equalsSameType(other) {
      const o = other;
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
  };
  var ResultValue = class extends Value {
    constructor(isOk, value, errMessage, resultType = null) {
      super(new TypeAnnotation("Result"));
      this._isOk = isOk;
      this._value = value;
      this._errMessage = errMessage;
      this._resultType = resultType;
    }
    typeName() {
      const inner = this._resultType ? this._resultType.name : "?";
      return `Result<${inner}>`;
    }
    isOkValue() {
      return this._isOk._value;
    }
    isErr() {
      return !this._isOk._value;
    }
    getOk() {
      if (this.isErr()) {
        throw new TypeError("Called getOk() on an Err value");
      }
      return this._value;
    }
    getErr() {
      if (this.isOkValue()) {
        throw new TypeError("Called getErr() on an Ok value");
      }
      return this._errMessage;
    }
    toString() {
      return this.isOkValue() ? `ok(${this._value.toString()})` : `err(${this._errMessage.toString()})`;
    }
    _equalsSameType(other) {
      const o = other;
      if (this.isOkValue() !== o.isOkValue()) return false;
      if (this.isOkValue()) return this.getOk().equals(o.getOk());
      return this.getErr().equals(o.getErr());
    }
  };
  var FN_TYPE = new TypeAnnotation("Fn");
  var FnValue = class extends Value {
    constructor(params, body) {
      super(FN_TYPE);
      this.params = params;
      this.body = body;
    }
    toString() {
      return `fn(${this.params.map((p) => p.name).join(", ")}) -> ...`;
    }
  };
  var TASK_TYPE = new TypeAnnotation("Task");
  var TaskValue = class extends Value {
    constructor(handle, taskType = null) {
      super(TASK_TYPE);
      this.handle = handle;
      this._taskType = taskType;
    }
    typeName() {
      const inner = this._taskType ? this._taskType.name : "?";
      return `Task<${inner}>`;
    }
    toString() {
      return "Task(pending)";
    }
  };
  function number(v) {
    return new NumberValue(v);
  }
  function string(v) {
    return new StringValue(v);
  }
  function boolean(v) {
    return new BooleanValue(v);
  }
  function unit() {
    return UNIT_VALUE;
  }
  function list(elements = [], elementType = null) {
    return new ListValue(elements, elementType);
  }
  function map(entries = {}, keyType = null, valueType = null) {
    return new MapValue(entries, keyType, valueType);
  }
  function record(fields, typeName) {
    return new RecordValue(fields, typeName);
  }
  function mkOk(value, resultType = null) {
    return new ResultValue(boolean(true), value, string(""), resultType);
  }
  function mkErr(message, resultType = null) {
    const msg = typeof message === "string" ? string(message) : message;
    return new ResultValue(boolean(false), UNIT_VALUE, msg, resultType);
  }
  function task(handle, taskType = null) {
    return new TaskValue(handle, taskType);
  }

  // src/runtime/browser-builtins.ts
  var BrowserBuiltins = class {
    constructor(scheduler, canvas, width, height) {
      this.fnMap = /* @__PURE__ */ new Map();
      this.scheduler = scheduler || null;
      this.ctx = canvas || null;
      this.canvasWidth = width || 0;
      this.canvasHeight = height || 0;
      this.callbacks = [];
      this.registerBuiltins();
    }
    registerBuiltins() {
      this.registerFn("concat", 2, (args) => {
        return args[0].concat(args[1]);
      });
      this.registerFn("substring", 3, (args) => {
        const str = args[0].toRawString();
        const start = args[1].toRawNumber();
        const length = args[2].toRawNumber();
        return string(str.substring(start, start + length));
      });
      this.registerFn("indexOf", 2, (args) => {
        const haystack = args[0].toRawString();
        const needle = args[1].toRawString();
        return number(haystack.indexOf(needle));
      });
      this.registerFn("parse_num", 1, (args) => {
        const str = args[0].toRawString();
        const num = parseFloat(str);
        if (isNaN(num)) {
          return mkErr(`Cannot parse '${str}' as number`);
        }
        return mkOk(number(num));
      });
      this.registerFn("to_string", 1, (args) => {
        return string(String(args[0].toString()));
      });
      this.registerFn("print", 1, (args) => {
        console.log(args[0].toString());
        return unit();
      });
      this.registerFn("append", 2, (args) => {
        return args[0].append(args[1]);
      });
      this.registerFn("list_get", 2, (args) => {
        const list2 = args[0];
        const index = args[1].toRawNumber();
        if (index < 0 || index >= list2.length()) {
          return mkErr(`Index ${index} out of bounds`);
        }
        return mkOk(list2.get(index));
      });
      this.registerFn("substring_list", 3, (args) => {
        const list2 = args[0];
        const start = args[1].toRawNumber();
        const length = args[2].toRawNumber();
        return list2.slice(start, length);
      });
      this.registerFn("map_put", 3, (args) => {
        const map2 = args[0];
        const key = args[1];
        const value = args[2];
        return map2.set(key, value);
      });
      this.registerFn("map_get", 2, (args) => {
        const map2 = args[0];
        if (!map2.hasByValueKey(args[1])) {
          return mkErr(`Key '${args[1].toString()}' not found`);
        }
        return mkOk(map2.getByValueKey(args[1]));
      });
      this.registerFn("map_has", 2, (args) => {
        return boolean(args[0].hasByValueKey(args[1]));
      });
      this.registerFn("map_remove", 2, (args) => {
        const map2 = args[0];
        const key = args[1];
        return map2.remove(key);
      });
      this.registerFn("get", 2, (args) => {
        const obj = args[0];
        if (obj.isList()) {
          const list2 = obj;
          const index = args[1].toRawNumber();
          if (index < 0 || index >= list2.length()) {
            return mkErr(`Index ${index} out of bounds`);
          }
          return mkOk(list2.get(index));
        }
        if (obj.isMap()) {
          const map2 = obj;
          if (!map2.hasByValueKey(args[1])) {
            return mkErr(`Key '${args[1].toString()}' not found`);
          }
          return mkOk(map2.getByValueKey(args[1]));
        }
        throw new Error(`'get' expects a List or Map, got ${obj.typeName()}`);
      });
      this.registerFn("has", 2, (args) => {
        const obj = args[0];
        if (!obj.isMap()) {
          throw new Error(`'has' expects a Map, got ${obj.typeName()}`);
        }
        return boolean(obj.hasByValueKey(args[1]));
      });
      this.registerFn("put", 3, (args) => {
        const obj = args[0];
        if (!obj.isMap()) {
          throw new Error(`'put' expects a Map, got ${obj.typeName()}`);
        }
        obj.set(args[1], args[2]);
        return unit();
      });
      this.registerFn("abs", 1, (args) => {
        return number(Math.abs(args[0].toRawNumber()));
      });
      this.registerFn("max", 2, (args) => {
        return number(Math.max(args[0].toRawNumber(), args[1].toRawNumber()));
      });
      this.registerFn("min", 2, (args) => {
        return number(Math.min(args[0].toRawNumber(), args[1].toRawNumber()));
      });
      if (this.scheduler) {
        this.registerFn("fetch", 4, (args) => {
          const url = args[0].toRawString();
          const method = args[1].toRawString();
          const headersValue = args[2];
          const body = args[3].toRawString();
          const headers = {};
          if (headersValue instanceof RecordValue) {
            for (const key of headersValue.fieldNames()) {
              const val = headersValue.get(key);
              if (val && val instanceof StringValue) {
                headers[key] = val.toRawString();
              }
            }
          } else if (headersValue instanceof MapValue) {
            for (const key of Object.keys(headersValue._entries)) {
              const val = headersValue._entries[key];
              if (val instanceof StringValue) {
                headers[key] = val.toRawString();
              }
            }
          }
          const promise = globalThis.fetch(url, {
            method,
            headers,
            body: method === "GET" || method === "HEAD" ? void 0 : body
          }).then(async (response) => {
            if (!response.ok) {
              return mkErr(`HTTP ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            return mkOk(string(text));
          }).catch((e) => mkErr(`Fetch failed: ${e.message}`));
          return this.scheduler.spawnAsync(promise, null);
        });
      }
      this.registerCanvasBuiltins();
    }
    registerCanvasBuiltins() {
      this.registerFn("canvas_clear", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        return unit();
      });
      this.registerFn("canvas_get_width", 0, () => {
        return number(this.canvasWidth);
      });
      this.registerFn("canvas_get_height", 0, () => {
        return number(this.canvasHeight);
      });
      this.registerFn("canvas_fill_rect", 4, (args) => {
        if (!this.ctx) return unit();
        this.ctx.fillRect(
          args[0].toRawNumber(),
          args[1].toRawNumber(),
          args[2].toRawNumber(),
          args[3].toRawNumber()
        );
        return unit();
      });
      this.registerFn("canvas_stroke_rect", 4, (args) => {
        if (!this.ctx) return unit();
        this.ctx.strokeRect(
          args[0].toRawNumber(),
          args[1].toRawNumber(),
          args[2].toRawNumber(),
          args[3].toRawNumber()
        );
        return unit();
      });
      this.registerFn("canvas_clear_rect", 4, (args) => {
        if (!this.ctx) return unit();
        this.ctx.clearRect(
          args[0].toRawNumber(),
          args[1].toRawNumber(),
          args[2].toRawNumber(),
          args[3].toRawNumber()
        );
        return unit();
      });
      this.registerFn("canvas_fill_text", 3, (args) => {
        if (!this.ctx) return unit();
        this.ctx.fillText(
          args[0].toRawString(),
          args[1].toRawNumber(),
          args[2].toRawNumber()
        );
        return unit();
      });
      this.registerFn("canvas_stroke_text", 3, (args) => {
        if (!this.ctx) return unit();
        this.ctx.strokeText(
          args[0].toRawString(),
          args[1].toRawNumber(),
          args[2].toRawNumber()
        );
        return unit();
      });
      this.registerFn("canvas_measure_text", 1, (args) => {
        if (!this.ctx) return number(0);
        return number(this.ctx.measureText(args[0].toRawString()).width);
      });
      this.registerFn("canvas_set_fill_color", 1, (args) => {
        if (!this.ctx) return unit();
        this.ctx.fillStyle = args[0].toRawString();
        return unit();
      });
      this.registerFn("canvas_set_stroke_color", 1, (args) => {
        if (!this.ctx) return unit();
        this.ctx.strokeStyle = args[0].toRawString();
        return unit();
      });
      this.registerFn("canvas_set_font", 1, (args) => {
        if (!this.ctx) return unit();
        this.ctx.font = args[0].toRawString();
        return unit();
      });
      this.registerFn("canvas_set_line_width", 1, (args) => {
        if (!this.ctx) return unit();
        this.ctx.lineWidth = args[0].toRawNumber();
        return unit();
      });
      this.registerFn("canvas_begin_path", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.beginPath();
        return unit();
      });
      this.registerFn("canvas_close_path", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.closePath();
        return unit();
      });
      this.registerFn("canvas_move_to", 2, (args) => {
        if (!this.ctx) return unit();
        this.ctx.moveTo(args[0].toRawNumber(), args[1].toRawNumber());
        return unit();
      });
      this.registerFn("canvas_line_to", 2, (args) => {
        if (!this.ctx) return unit();
        this.ctx.lineTo(args[0].toRawNumber(), args[1].toRawNumber());
        return unit();
      });
      this.registerFn("canvas_arc", 5, (args) => {
        if (!this.ctx) return unit();
        this.ctx.arc(
          args[0].toRawNumber(),
          args[1].toRawNumber(),
          args[2].toRawNumber(),
          args[3].toRawNumber(),
          args[4].toRawNumber()
        );
        return unit();
      });
      this.registerFn("canvas_stroke", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.stroke();
        return unit();
      });
      this.registerFn("canvas_fill", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.fill();
        return unit();
      });
      this.registerFn("canvas_save", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.save();
        return unit();
      });
      this.registerFn("canvas_restore", 0, () => {
        if (!this.ctx) return unit();
        this.ctx.restore();
        return unit();
      });
      this.registerFn("canvas_rotate", 1, (args) => {
        if (!this.ctx) return unit();
        this.ctx.rotate(args[0].toRawNumber());
        return unit();
      });
      this.registerFn("canvas_translate", 2, (args) => {
        if (!this.ctx) return unit();
        this.ctx.translate(args[0].toRawNumber(), args[1].toRawNumber());
        return unit();
      });
      this.registerFn("canvas_scale", 2, (args) => {
        if (!this.ctx) return unit();
        this.ctx.scale(args[0].toRawNumber(), args[1].toRawNumber());
        return unit();
      });
    }
    registerFn(name, arity, fn) {
      this.fnMap.set(name, { arity, fn });
    }
    getFn(name) {
      return this.fnMap.get(name);
    }
    isBuiltin(name) {
      return this.fnMap.has(name);
    }
    getBuiltinNames() {
      return [...this.fnMap.keys()];
    }
    /**
     * Register a callback for a future event system.
     * type: event name (e.g. "click", "keydown")
     * handler: FnValue to execute when event fires
     *
     * When the event system is implemented, callers will:
     *   1. Call _registerHandler to store the callback
     *   2. Listen for DOM/browser events
     *   3. On event, construct a fresh Interpreter with the handler's env
     *      and call executeLambdaFromValue(handler, type, args)
     */
    _registerHandler(type, handler) {
      this.callbacks.push({ type, handler });
    }
    get callbacksList() {
      return this.callbacks;
    }
  };

  // shims/deasync.js
  var deasync_default = { loopWhile: () => {
  } };

  // src/runtime/scheduler.ts
  var SchedulerTask = class {
    constructor(id, fn, resultType) {
      this.id = id;
      this.fn = fn;
      this.resultType = resultType;
      this.state = "pending";
      this.result = null;
      this.error = null;
    }
    isDone() {
      return this.state === "done";
    }
  };
  var Scheduler = class {
    constructor() {
      this.tasks = /* @__PURE__ */ new Map();
      this.nextId = 0;
    }
    spawn(fn, resultType) {
      const task2 = new SchedulerTask(this.nextId++, fn, resultType);
      this.tasks.set(task2.id, task2);
      return task(task2, resultType);
    }
    spawnAsync(promise, resultType) {
      const task2 = new SchedulerTask(this.nextId++, () => promise, resultType);
      this.tasks.set(task2.id, task2);
      promise.then(
        (value) => {
          task2.result = value;
          task2.state = "done";
        },
        (err) => {
          task2.error = err.message;
          task2.state = "done";
        }
      );
      return task(task2, resultType);
    }
    join(taskValue) {
      const task2 = taskValue.handle;
      if (task2.isDone()) {
        if (task2.error) {
          throw new Error(`Task ${task2.id} failed: ${task2.error}`);
        }
        return task2.result;
      }
      const result = task2.fn();
      if (result instanceof Promise) {
        if (!task2.isDone()) {
          deasync_default.loopWhile(() => !task2.isDone());
        }
      } else {
        task2.result = result;
        task2.state = "done";
      }
      if (task2.error) {
        throw new Error(`Task ${task2.id} failed: ${task2.error}`);
      }
      return task2.result;
    }
    reset() {
      this.tasks.clear();
      this.nextId = 0;
    }
  };

  // src/runtime/env.ts
  var Env = class _Env {
    constructor(parent = null) {
      this.bindings = /* @__PURE__ */ new Map();
      this.parent = parent;
    }
    define(name, value) {
      if (this.bindings.has(name)) {
        throw new Error(`Variable '${name}' is already defined in this scope`);
      }
      this.bindings.set(name, value);
    }
    assign(name, value) {
      if (this.bindings.has(name)) {
        this.bindings.set(name, value);
        return;
      }
      if (this.parent) {
        this.parent.assign(name, value);
        return;
      }
      throw new ReferenceError(`Undefined variable: ${name}`);
    }
    lookup(name) {
      if (this.bindings.has(name)) {
        return this.bindings.get(name);
      }
      if (this.parent) {
        return this.parent.lookup(name);
      }
      throw new ReferenceError(`Undefined variable: ${name}`);
    }
    has(name) {
      if (this.bindings.has(name)) return true;
      if (this.parent) return this.parent.has(name);
      return false;
    }
    child() {
      return new _Env(this);
    }
    getNames() {
      return [...this.bindings.keys()];
    }
  };

  // shims/process.js
  var process_default = { stdout: { write: () => true }, stderr: { write: () => true } };

  // shims/fs.js
  var fs_default = {};

  // src/runtime/builtins.ts
  var Builtins = class {
    constructor(scheduler) {
      this.fnMap = /* @__PURE__ */ new Map();
      this.scheduler = scheduler || null;
      this.registerBuiltins();
    }
    registerBuiltins() {
      this.registerFn("concat", 2, (args) => {
        return args[0].concat(args[1]);
      });
      this.registerFn("substring", 3, (args) => {
        const str = args[0].toRawString();
        const start = args[1].toRawNumber();
        const length = args[2].toRawNumber();
        return string(str.substring(start, start + length));
      });
      this.registerFn("indexOf", 2, (args) => {
        const haystack = args[0].toRawString();
        const needle = args[1].toRawString();
        return number(haystack.indexOf(needle));
      });
      this.registerFn("parse_num", 1, (args) => {
        const str = args[0].toRawString();
        const num = parseFloat(str);
        if (isNaN(num)) {
          return mkErr(`Cannot parse '${str}' as number`);
        }
        return mkOk(number(num));
      });
      this.registerFn("to_string", 1, (args) => {
        return string(String(args[0].toString()));
      });
      this.registerFn("print", 1, (args) => {
        process_default.stdout.write(args[0].toString() + "\n");
        return unit();
      });
      this.registerFn("append", 2, (args) => {
        return args[0].append(args[1]);
      });
      this.registerFn("list_get", 2, (args) => {
        const list2 = args[0];
        const index = args[1].toRawNumber();
        if (index < 0 || index >= list2.length()) {
          return mkErr(`Index ${index} out of bounds`);
        }
        return mkOk(list2.get(index));
      });
      this.registerFn("substring_list", 3, (args) => {
        const list2 = args[0];
        const start = args[1].toRawNumber();
        const length = args[2].toRawNumber();
        return list2.slice(start, length);
      });
      this.registerFn("map_put", 3, (args) => {
        const map2 = args[0];
        const key = args[1];
        const value = args[2];
        return map2.set(key, value);
      });
      this.registerFn("map_get", 2, (args) => {
        const map2 = args[0];
        if (!map2.hasByValueKey(args[1])) {
          return mkErr(`Key '${args[1].toString()}' not found`);
        }
        return mkOk(map2.getByValueKey(args[1]));
      });
      this.registerFn("map_has", 2, (args) => {
        return boolean(args[0].hasByValueKey(args[1]));
      });
      this.registerFn("map_remove", 2, (args) => {
        const map2 = args[0];
        const key = args[1];
        return map2.remove(key);
      });
      this.registerFn("get", 2, (args) => {
        const obj = args[0];
        if (obj.isList()) {
          const list2 = obj;
          const index = args[1].toRawNumber();
          if (index < 0 || index >= list2.length()) {
            return mkErr(`Index ${index} out of bounds`);
          }
          return mkOk(list2.get(index));
        }
        if (obj.isMap()) {
          const map2 = obj;
          if (!map2.hasByValueKey(args[1])) {
            return mkErr(`Key '${args[1].toString()}' not found`);
          }
          return mkOk(map2.getByValueKey(args[1]));
        }
        throw new Error(`'get' expects a List or Map, got ${obj.typeName()}`);
      });
      this.registerFn("has", 2, (args) => {
        const obj = args[0];
        if (!obj.isMap()) {
          throw new Error(`'has' expects a Map, got ${obj.typeName()}`);
        }
        return boolean(obj.hasByValueKey(args[1]));
      });
      this.registerFn("put", 3, (args) => {
        const obj = args[0];
        if (!obj.isMap()) {
          throw new Error(`'put' expects a Map, got ${obj.typeName()}`);
        }
        obj.set(args[1], args[2]);
        return unit();
      });
      this.registerFn("abs", 1, (args) => {
        return number(Math.abs(args[0].toRawNumber()));
      });
      this.registerFn("max", 2, (args) => {
        return number(Math.max(args[0].toRawNumber(), args[1].toRawNumber()));
      });
      this.registerFn("min", 2, (args) => {
        return number(Math.min(args[0].toRawNumber(), args[1].toRawNumber()));
      });
      if (this.scheduler) {
        this.registerFn("file_read", 1, (args) => {
          const path = args[0].toRawString();
          const promise = fs_default.promises.readFile(path, "utf-8").then((content) => mkOk(string(content))).catch((e) => mkErr(`Cannot read file '${path}': ${e.message}`));
          return this.scheduler.spawnAsync(promise, null);
        });
        this.registerFn("file_read_lines", 1, (args) => {
          const path = args[0].toRawString();
          const promise = fs_default.promises.readFile(path, "utf-8").then((content) => {
            const raw = content.split("\n");
            if (raw.length > 0 && raw[raw.length - 1] === "") raw.pop();
            return mkOk(list(raw.map((line) => string(line)), null));
          }).catch((e) => mkErr(`Cannot read file '${path}': ${e.message}`));
          return this.scheduler.spawnAsync(promise, null);
        });
        this.registerFn("file_write", 2, (args) => {
          const path = args[0].toRawString();
          const content = args[1].toRawString();
          const promise = fs_default.promises.writeFile(path, content).then(() => mkOk(unit())).catch((e) => mkErr(`Cannot write file '${path}': ${e.message}`));
          return this.scheduler.spawnAsync(promise, null);
        });
        this.registerFn("read_line", 0, (args) => {
          const promise = new Promise((resolve) => {
            process_default.stdin.once("data", (data) => {
              const line = data.toString("utf-8").replace(/\n$/, "");
              resolve(mkOk(string(line)));
            });
            process_default.stdin.once("error", (e) => {
              resolve(mkErr(`stdin error: ${e.message}`));
            });
          });
          return this.scheduler.spawnAsync(promise, null);
        });
        this.registerFn("fetch", 4, (args) => {
          const url = args[0].toRawString();
          const method = args[1].toRawString();
          const headersValue = args[2];
          const body = args[3].toRawString();
          const headers = {};
          if (headersValue instanceof RecordValue) {
            for (const key of headersValue.fieldNames()) {
              const val = headersValue.get(key);
              if (val && val instanceof StringValue) {
                headers[key] = val.toRawString();
              }
            }
          } else if (headersValue instanceof MapValue) {
            for (const key of Object.keys(headersValue._entries)) {
              const val = headersValue._entries[key];
              if (val instanceof StringValue) {
                headers[key] = val.toRawString();
              }
            }
          }
          const promise = globalThis.fetch(url, {
            method,
            headers,
            body: method === "GET" || method === "HEAD" ? void 0 : body
          }).then(async (response) => {
            if (!response.ok) {
              return mkErr(`HTTP ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            return mkOk(string(text));
          }).catch((e) => mkErr(`Fetch failed: ${e.message}`));
          return this.scheduler.spawnAsync(promise, null);
        });
      }
    }
    registerFn(name, arity, fn) {
      this.fnMap.set(name, { arity, fn });
    }
    getFn(name) {
      return this.fnMap.get(name);
    }
    isBuiltin(name) {
      return this.fnMap.has(name);
    }
    getBuiltinNames() {
      return [...this.fnMap.keys()];
    }
  };

  // src/runtime/interpreter.ts
  var RuntimeError = class extends Error {
    constructor(message, line = 0, column = 0) {
      super(`Runtime error [${line}:${column}]: ${message}`);
      this.line = line;
      this.column = column;
      this.name = "RuntimeError";
    }
  };
  var Interpreter = class {
    constructor(builtins, scheduler) {
      this.scheduler = scheduler || new Scheduler();
      this.builtins = builtins || new Builtins(this.scheduler);
      this.rootEnv = new Env();
      this.userFns = /* @__PURE__ */ new Map();
      this.typeDecls = /* @__PURE__ */ new Map();
      this.modules = /* @__PURE__ */ new Map();
      this.currentModule = "main";
    }
    run(program) {
      for (const stmt of program.stmts) {
        if (stmt instanceof FnDecl) this.userFns.set(stmt.name, stmt);
        if (stmt instanceof TypeDecl) this.typeDecls.set(stmt.name, stmt);
        if (stmt instanceof ImportStmt) this.loadModule(stmt.name, stmt.from);
      }
      let lastResult = unit();
      for (const stmt of program.stmts) {
        try {
          lastResult = this.execStmt(stmt);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            lastResult = e.returnValue !== void 0 ? e.returnValue : unit();
          } else {
            throw e;
          }
        }
      }
      return lastResult;
    }
    execStmt(stmt) {
      switch (stmt.constructor) {
        case LetStmt:
          return this.execLet(stmt);
        case IfStmt:
          return this.execIf(stmt);
        case ReturnStmt: {
          const value = stmt.value ? this.execExpr(stmt.value) : unit();
          throw new ReturnSignal(value);
        }
        case ExpressionStmt:
          return this.execExpr(stmt.expression);
        case FnDecl:
          this.userFns.set(stmt.name, stmt);
          return unit();
        case TypeDecl:
          this.typeDecls.set(stmt.name, stmt);
          return unit();
        case ImportStmt:
        case ExportStmt:
          return unit();
        default:
          throw new RuntimeError(`Unknown statement: ${stmt.constructor.name}`, stmt.line, stmt.column);
      }
    }
    execExpr(expr) {
      switch (expr.constructor) {
        case LiteralExpr:
          return this.execLiteral(expr);
        case IdentifierExpr:
          return this.rootEnv.lookup(expr.name);
        case BinOpExpr:
          return this.execBinOp(expr);
        case UnOpExpr:
          return this.execUnOp(expr);
        case CallExpr:
          return this.execCall(expr);
        case FieldAccessExpr:
          return this.execFieldAccess(expr);
        case IfExpr:
          return this.execIfExpr(expr);
        case LambdaExpr:
          return this.execLambdaExpr(expr);
        case BlockExpr:
          return this.execBlock(expr);
        case RecordCreateExpr:
          return this.execRecordCreate(expr);
        case ListCreateExpr:
          return this.execListCreate(expr);
        case MapCreateExpr:
          return this.execMapCreate(expr);
        case ResultOkExpr:
          return mkOk(this.execExpr(expr.value));
        case ResultErrExpr: {
          const msg = this.execExpr(expr.message);
          return mkErr(msg);
        }
        case UnitExpr:
          return unit();
        default:
          throw new RuntimeError(`Unknown expression: ${expr.constructor.name}`, expr.line, expr.column);
      }
    }
    execLiteral(expr) {
      const value = expr.value;
      if (typeof value === "number") return number(value);
      if (typeof value === "string") return string(value);
      if (typeof value === "boolean") return boolean(value);
      if (value === null) return unit();
      throw new RuntimeError(`Unknown literal: ${value}`, 0, 0);
    }
    execBinOp(expr) {
      const left = this.execExpr(expr.left);
      const right = this.execExpr(expr.right);
      switch (expr.op) {
        case "+":
          if (left.isString() && right.isString()) {
            return left.concat(right);
          }
          return left.add(right);
        case "-":
          return left.subtract(right);
        case "*":
          return left.multiply(right);
        case "/":
          return left.divide(right);
        case "==":
          return boolean(left.equals(right));
        case "!=":
          return boolean(!left.equals(right));
        case "<":
          return left.lt(right);
        case ">":
          return left.gt(right);
        case "<=":
          return left.lte(right);
        case ">=":
          return left.gte(right);
        case "and":
          return left.and(right);
        case "or":
          return left.or(right);
        default:
          throw new RuntimeError(`Unknown operator: ${expr.op}`, expr.line, expr.column);
      }
    }
    execUnOp(expr) {
      const operand = this.execExpr(expr.operand);
      switch (expr.op) {
        case "not":
          return operand.not();
        case "-":
          return operand.negate();
        default:
          throw new RuntimeError(`Unknown unary operator: ${expr.op}`, expr.line, expr.column);
      }
    }
    execCall(expr) {
      if (expr.callee instanceof LambdaExpr) {
        return this._dispatchLambda(expr.callee, expr.args);
      }
      if (expr.callee instanceof FieldAccessExpr) {
        const obj = this.execExpr(expr.callee.object);
        if (obj && typeof obj === "object" && obj._module) {
          const fnDecl = obj._module.get(expr.callee.field);
          if (fnDecl) {
            const args = expr.args.map((a) => this.execExpr(a));
            return this.callUserFunction(fnDecl, args);
          }
        }
        throw new RuntimeError(`Cannot call '${expr.callee.field}' on non-module object`, expr.line, expr.column);
      }
      if (expr.callee instanceof FnDecl && !expr.callee.name) {
        const args = expr.args.map((a) => this.execExpr(a));
        return this.callUserFunction(expr.callee, args);
      }
      if (expr.callee instanceof IdentifierExpr) {
        return this._dispatchByIdentifier(expr.callee.name, expr.args, expr);
      }
      throw new RuntimeError(`Cannot call non-identifier`, expr.line, expr.column);
    }
    _dispatchLambda(lambdaExpr, argExprs) {
      const args = argExprs.map((a) => this.execExpr(a));
      return this.executeLambda(lambdaExpr, args);
    }
    _dispatchByIdentifier(name, argExprs, expr) {
      let envVal = null;
      try {
        envVal = this.rootEnv.lookup(name);
      } catch (e) {
      }
      if (envVal) {
        if (envVal instanceof FnValue) {
          const args = argExprs.map((a) => this.execExpr(a));
          return this.executeLambdaFromValue(envVal, name, args);
        }
        throw new RuntimeError(`'${name}' is not callable`, expr.callee.line, expr.callee.column);
      }
      if (name === "spawn") {
        const fnValue = this.execExpr(argExprs[0]);
        if (!(fnValue instanceof FnValue)) {
          throw new RuntimeError("spawn expects a function", expr.line, expr.column);
        }
        const thunk = () => this.executeLambdaFromValue(fnValue, "spawned", []);
        return this.scheduler.spawn(thunk, null);
      }
      if (name === "join") {
        const taskValue = this.execExpr(argExprs[0]);
        if (!(taskValue instanceof TaskValue)) {
          throw new RuntimeError("join expects a Task", expr.line, expr.column);
        }
        return this.scheduler.join(taskValue);
      }
      if (name === "join") {
        const taskValue = this.execExpr(argExprs[0]);
        if (!(taskValue instanceof TaskValue)) {
          throw new RuntimeError("join expects a Task", expr.line, expr.column);
        }
        return this.scheduler.join(taskValue);
      }
      if (name === "map") {
        const listValue = this.execExpr(argExprs[0]);
        if (!(listValue instanceof ListValue)) {
          throw new RuntimeError("map expects a List", expr.line, expr.column);
        }
        const fnValue = this.execExpr(argExprs[1]);
        if (!(fnValue instanceof FnValue)) {
          throw new RuntimeError("map expects a function", expr.line, expr.column);
        }
        const elements = [];
        for (let i = 0; i < listValue.length(); i++) {
          const elem = listValue.get(i);
          const result = this.executeLambdaFromValue(fnValue, "map", [elem]);
          elements.push(result);
        }
        return list(elements, null);
      }
      if (name === "filter") {
        const listValue = this.execExpr(argExprs[0]);
        if (!(listValue instanceof ListValue)) {
          throw new RuntimeError("filter expects a List", expr.line, expr.column);
        }
        const fnValue = this.execExpr(argExprs[1]);
        if (!(fnValue instanceof FnValue)) {
          throw new RuntimeError("filter expects a function", expr.line, expr.column);
        }
        const elements = [];
        for (let i = 0; i < listValue.length(); i++) {
          const elem = listValue.get(i);
          const result = this.executeLambdaFromValue(fnValue, "filter", [elem]);
          if (result.toRawBoolean()) {
            elements.push(elem);
          }
        }
        return list(elements, listValue._elementType);
      }
      if (name === "fold") {
        const listValue = this.execExpr(argExprs[0]);
        if (!(listValue instanceof ListValue)) {
          throw new RuntimeError("fold expects a List", expr.line, expr.column);
        }
        const initValue = this.execExpr(argExprs[1]);
        const fnValue = this.execExpr(argExprs[2]);
        if (!(fnValue instanceof FnValue)) {
          throw new RuntimeError("fold expects a function", expr.line, expr.column);
        }
        let acc = initValue;
        for (let i = 0; i < listValue.length(); i++) {
          const elem = listValue.get(i);
          try {
            acc = this.executeLambdaFromValue(fnValue, "fold", [acc, elem]);
          } catch (e) {
            console.error("FOLD ERROR at i=" + i + ": " + e);
            throw e;
          }
        }
        return acc;
      }
      const builtin = this.builtins.getFn(name);
      if (builtin) {
        const args = argExprs.map((a) => this.execExpr(a));
        if (args.length !== builtin.arity) {
          throw new RuntimeError(`Function '${name}' expects ${builtin.arity} args, got ${args.length}`, expr.line, expr.column);
        }
        return builtin.fn(args);
      }
      const fn = this.userFns.get(name);
      if (fn) {
        const args = argExprs.map((a) => this.execExpr(a));
        return this.callUserFunction(fn, args);
      }
      throw new RuntimeError(`Undefined function: ${name}`, expr.callee.line, expr.callee.column);
    }
    _execBody(body) {
      for (let i = 0; i < body.length; i++) {
        const stmt = body[i];
        const isLast = i === body.length - 1;
        try {
          if (stmt instanceof ReturnStmt) {
            if (isLast && stmt.value instanceof CallExpr) {
              const tailFn = this._resolveTailCallTarget(stmt.value);
              if (tailFn) {
                return new TailCall(tailFn, stmt.value.args.map((a) => this.execExpr(a)));
              }
            }
            const value = stmt.value ? this.execExpr(stmt.value) : unit();
            throw new ReturnSignal(value);
          }
          if (isLast && stmt instanceof ExpressionStmt) {
            const expr = stmt.expression;
            if (expr instanceof CallExpr) {
              const fn = this._resolveTailCallTarget(expr);
              if (fn) {
                return new TailCall(fn, expr.args.map((a) => this.execExpr(a)));
              }
            }
            return this.execExpr(expr);
          }
          const result = this.execStmt(stmt);
          if (result instanceof ReturnSignal) {
            throw new ReturnSignal(result.returnValue !== void 0 ? result.returnValue : unit());
          }
          if (isLast) return result;
        } catch (e) {
          if (e instanceof ReturnSignal) throw e;
          throw e;
        }
      }
      return unit();
    }
    _resolveTailCallTarget(callExpr) {
      if (callExpr.callee instanceof IdentifierExpr) {
        return this.userFns.get(callExpr.callee.name) || null;
      }
      if (callExpr.callee instanceof FieldAccessExpr) {
        const obj = this.execExpr(callExpr.callee.object);
        if (obj && typeof obj === "object" && obj._module) {
          return obj._module.get(callExpr.callee.field) || null;
        }
      }
      return null;
    }
    callUserFunction(fn, args) {
      let currentFn = fn;
      let currentArgs = args;
      while (true) {
        const callEnv = new Env(this.rootEnv);
        if (currentArgs.length !== currentFn.params.length) {
          throw new RuntimeError(
            `Function '${currentFn.name}' expects ${currentFn.params.length} arguments, got ${currentArgs.length}`,
            currentFn.line,
            currentFn.column
          );
        }
        for (let i = 0; i < currentFn.params.length; i++) {
          callEnv.define(currentFn.params[i].name, currentArgs[i]);
        }
        const savedEnv = this.rootEnv;
        this.rootEnv = callEnv;
        try {
          const result = this._execBody(currentFn.body);
          if (result instanceof TailCall) {
            currentFn = result.fn;
            currentArgs = result.args;
            this.rootEnv = savedEnv;
            continue;
          }
          return result;
        } catch (e) {
          if (e instanceof ReturnSignal) {
            return e.returnValue !== void 0 ? e.returnValue : unit();
          }
          throw e;
        } finally {
          this.rootEnv = savedEnv;
        }
      }
    }
    execFieldAccess(expr) {
      const obj = this.execExpr(expr.object);
      if (obj && typeof obj === "object" && obj._module) {
        if (obj._module.has(expr.field)) {
          return obj._module.get(expr.field);
        }
        throw new RuntimeError(`Module has no export '${expr.field}'`, expr.line, expr.column);
      }
      if (obj instanceof ResultValue) {
        if (expr.field === "isOk") return boolean(obj.isOkValue());
        if (expr.field === "value") return obj._value;
        if (expr.field === "errMessage") return obj._errMessage;
        throw new RuntimeError(`Result has no field '${expr.field}'`, expr.line, expr.column);
      }
      if (obj instanceof StringValue) {
        if (expr.field === "len") return obj.len;
        throw new RuntimeError(`String has no field '${expr.field}'`, expr.line, expr.column);
      }
      if (obj instanceof ListValue) {
        if (expr.field === "len") return obj.len;
        throw new RuntimeError(`List has no field '${expr.field}'`, expr.line, expr.column);
      }
      if (!(obj instanceof RecordValue)) {
        throw new RuntimeError(`Cannot access field on non-record type ${obj.typeName()}`, expr.line, expr.column);
      }
      if (!obj.hasField(expr.field)) {
        throw new RuntimeError(`Record has no field '${expr.field}'`, expr.line, expr.column);
      }
      return obj.get(expr.field);
    }
    execIfExpr(expr) {
      const condition = this.execExpr(expr.condition);
      if (condition.isTruthy()) {
        for (const stmt of expr.thenBlock) {
          this.execStmt(stmt);
        }
      }
      return unit();
    }
    execIf(stmt) {
      const condition = this.execExpr(stmt.condition);
      if (condition.isTruthy()) {
        return this.execBlock({ stmts: stmt.thenBlock });
      }
      return unit();
    }
    execBlock(expr) {
      let lastValue = unit();
      for (const stmt of expr.stmts) {
        lastValue = this.execStmt(stmt);
      }
      return lastValue;
    }
    execLet(stmt) {
      const value = stmt.init ? this.execExpr(stmt.init) : unit();
      this.rootEnv.define(stmt.name, value);
      return unit();
    }
    execRecordCreate(expr) {
      const fields = {};
      for (const field of expr.fields) {
        fields[field.key] = this.execExpr(field.value);
      }
      const typeName = expr.fields.length > 0 ? expr.fields[0].key : "Record";
      const typeDecl = this.typeDecls.get(typeName);
      return record(fields, typeDecl ? typeDecl.name : "Record");
    }
    execListCreate(expr) {
      const elements = expr.elements.map((e) => this.execExpr(e));
      return list(elements, null);
    }
    execMapCreate(expr) {
      const entries = {};
      for (const entry of expr.entries) {
        const key = this.execExpr(entry.key);
        const value = this.execExpr(entry.value);
        entries[key.isNumber() ? String(key.toRawNumber()) : key.toRawString()] = value;
      }
      return map(entries, null, null);
    }
    execLambdaExpr(expr) {
      return new FnValue(expr.params, expr.body);
    }
    executeLambda(lambdaExpr, argValues) {
      const env = new Env();
      if (argValues.length !== lambdaExpr.params.length) {
        throw new RuntimeError(
          `Lambda expects ${lambdaExpr.params.length} args, got ${argValues.length}`,
          lambdaExpr.line,
          lambdaExpr.column
        );
      }
      for (let i = 0; i < lambdaExpr.params.length; i++) {
        env.define(lambdaExpr.params[i].name, argValues[i]);
      }
      const savedEnv = this.rootEnv;
      this.rootEnv = env;
      try {
        for (const stmt of lambdaExpr.body) {
          const result = this.execStmt(stmt);
          if (result instanceof ReturnSignal) {
            return result.returnValue;
          }
        }
        const lastStmt = lambdaExpr.body[lambdaExpr.body.length - 1];
        if (lastStmt instanceof ExpressionStmt) {
          return this.execExpr(lastStmt.expression);
        }
        return unit();
      } finally {
        this.rootEnv = savedEnv;
      }
    }
    executeLambdaFromValue(fnValue, name, argValues) {
      const env = new Env();
      if (argValues.length !== fnValue.params.length) {
        throw new RuntimeError(
          `Function '${name}' expects ${fnValue.params.length} args, got ${argValues.length}`,
          0,
          0
        );
      }
      for (let i = 0; i < fnValue.params.length; i++) {
        env.define(fnValue.params[i].name, argValues[i]);
      }
      const savedEnv = this.rootEnv;
      this.rootEnv = env;
      try {
        for (const stmt of fnValue.body) {
          try {
            const result = this.execStmt(stmt);
            if (result instanceof ReturnSignal) {
              return result.returnValue;
            }
          } catch (e) {
            if (e instanceof ReturnSignal) {
              return e.returnValue;
            }
            throw e;
          }
        }
        const lastStmt = fnValue.body[fnValue.body.length - 1];
        if (lastStmt instanceof ExpressionStmt) {
          return this.execExpr(lastStmt.expression);
        }
        return unit();
      } finally {
        this.rootEnv = savedEnv;
      }
    }
    loadModule(name, path) {
      this.modules.set(path, { exports: /* @__PURE__ */ new Map() });
    }
  };
  var ReturnSignal = class extends Error {
    constructor(returnValue) {
      super("return");
      this.returnValue = returnValue;
    }
  };
  var TailCall = class {
    constructor(fn, args) {
      this.fn = fn;
      this.args = args;
    }
  };

  // src/browser-runtime.ts
  function createBrowserRuntime(canvas, width, height) {
    const scheduler = new Scheduler();
    const builtins = new BrowserBuiltins(scheduler, canvas || null, width || 0, height || 0);
    return new Interpreter(builtins, scheduler);
  }

  // src/browser-entry.ts
  function runBrowser(source, config = {}) {
    const lexer = new Lexer(source);
    const tokens = lexer.getTokens();
    const parser = new Parser(tokens);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    const interpreter = createBrowserRuntime(config.canvas, config.canvasWidth, config.canvasHeight);
    return interpreter.run(program);
  }
  return __toCommonJS(browser_entry_exports);
})();
