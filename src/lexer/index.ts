/**
 * Lexer for the Simplex language.
 * Converts source code into a stream of tokens.
 * 
 * Design principles:
 * - Minimal keywords, explicit tokenization
 * - No implicit behavior, no syntax sugar
 * - Deterministic: each token has a明确 role
 */

import { KEYWORDS, TokenType } from './tokens.js';

// Two-character operator mappings - uses TokenType values directly
const OPERATOR_2CHAR = {
  '==': TokenType.EQ,
  '!=': TokenType.NEQ,
  '<=': TokenType.LE,
  '>=': TokenType.GE,
  '->': TokenType.ARROW,
};

// Single-character operator mappings - uses TokenType values directly
const OPERATOR_1CHAR = {
  '+': TokenType.ADD,
  '-': TokenType.SUB,
  '*': TokenType.MUL,
  '/': TokenType.DIV,
  '<': TokenType.LT,
  '>': TokenType.GT,
  '=': TokenType.ASSIGN,
  '!': TokenType.NOT,
  '.': TokenType.DOT,
  '{': TokenType.LBRACE,
  '}': TokenType.RBRACE,
  '(': TokenType.LPAREN,
  ')': TokenType.RPAREN,
  '[': TokenType.LBRACKET,
  ']': TokenType.RBRACKET,
  ';': TokenType.SEMICOLON,
  ',': TokenType.COMMA,
  ':': TokenType.COLON,
};

class Token {
  type: any;
  value: any;
  line: any;
  column: any;

  constructor(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, ${this.line}:${this.column})`;
  }
}

class LexerError extends Error {
  line: any;
  column: any;
  name: any;

  constructor(message, line = 0, column = 0) {
    super(`[${line}:${column}] ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'LexerError';
  }
}

class Lexer {
  source: any;
  pos: any;
  line: any;
  column: any;
  tokens: any;

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
    return '\0';
  }

  advance() {
    const ch = this.peek();
    if (ch === '\n') {
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
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.advance();
      } else {
        break;
      }
    }
  }

  skipComment() {
    // Skip until end of line
    while (this.pos < this.source.length && this.peek() !== '\n') {
      this.advance();
    }
  }

  readString() {
    const startLine = this.line;
    const startCol = this.column;
    const quote = this.advance(); // consume opening quote
    let str = '';

    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (ch === '\\') {
        this.advance(); // consume backslash
        const esc = this.advance();
        switch (esc) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case '"': str += '"'; break;
          case '\\': str += '\\'; break;
          case '\'': str += '\''; break;
          default: str += '\\' + esc; break;
        }
      } else if (ch === quote) {
        this.advance(); // consume closing quote
        return new Token(TokenType.STRING, str, startLine, startCol);
      } else {
        str += this.advance();
      }
    }

    throw new LexerError('Unterminated string literal', startLine, startCol);
  }

  readNumber() {
    const startLine = this.line;
    const startCol = this.column;
    let num = '';

    while (this.pos < this.source.length) {
      const ch = this.peek();
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        num += this.advance();
      } else {
        break;
      }
    }

    // Check if it's a float
    if (num.includes('.')) {
      const val = parseFloat(num);
      if (isNaN(val)) {
        throw new LexerError(`Invalid number: ${num}`, startLine, startCol);
      }
      return new Token(TokenType.FLOAT, val, startLine, startCol);
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
    let ident = '';

    while (this.pos < this.source.length) {
      const ch = this.peek();
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
          (ch >= '0' && ch <= '9') || ch === '_') {
        ident += this.advance();
      } else {
        break;
      }
    }

    // Check if it's a keyword
    if (KEYWORDS.hasOwnProperty(ident)) {
      return new Token(KEYWORDS[ident], ident, startLine, startCol);
    }

    return new Token(TokenType.IDENTIFIER, ident, startLine, startCol);
  }

  readOperator() {
    const startLine = this.line;
    const startCol = this.column;
    const ch = this.peek();

    // Two-character operators (must check first)
    if (this.pos + 1 < this.source.length) {
      const two = this.source.substring(this.pos, this.pos + 2);
      if (OPERATOR_2CHAR.hasOwnProperty(two)) {
        this.pos += 2;
        this.column += 2;
        return new Token(OPERATOR_2CHAR[two], two, startLine, startCol);
      }
    }

    // Single-character operators
    const singleMap = {
      '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV',
      '<': 'LT', '>': 'GT', '=': 'ASSIGN', ' ': 'SPACE',
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

      // Comments
      if (ch === '/') {
        if (this.pos + 1 < this.source.length && this.source[this.pos + 1] === '/') {
          this.skipComment();
          continue;
        }
      }

      const startLine = this.line;
      const startCol = this.column;

      // Strings
      if (ch === '"' || ch === "'") {
        this.tokens.push(this.readString());
        continue;
      }

      // Numbers
      if ((ch >= '0' && ch <= '9') || (ch === '.' && this.pos + 1 < this.source.length && this.source[this.pos + 1] >= '0' && this.source[this.pos + 1] <= '9')) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Identifiers and keywords
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
        this.tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      // Delimiters and operators
      if (ch === '{' || ch === '}' || ch === '(' || ch === ')' ||
          ch === '[' || ch === ']' || ch === ';' || ch === ',' ||
          ch === ':' || ch === '.' || ch === '+' || ch === '-' ||
          ch === '*' || ch === '/' || ch === '!' || ch === '<' ||
          ch === '>' || ch === '=') {
        this.tokens.push(this.readOperator());
        continue;
      }

      throw new LexerError(`Unexpected character: ${ch}`, startLine, startCol);
    }

    // Add EOF token
    this.tokens.push(new Token(TokenType.EOF, null, this.line, this.column));
  }

  getTokens() {
    return this.tokens;
  }
}

export { Lexer, LexerError, Token };
