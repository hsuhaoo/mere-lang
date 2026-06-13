/**
 * Token types for the Simplex language lexer.
 * Each token has a type, raw value, and source position.
 */

// ── Keyword tokens ──────────────────────────────────────────────
const KEYWORDS = {
  fn: 'FN',
  let: 'LET',
  if: 'IF',
  type: 'TYPE',
  import: 'IMPORT',
  export: 'EXPORT',
  return: 'RETURN',
  true: 'TRUE',
  false: 'FALSE',
  unit: 'UNIT',
  ok: 'OK',
  err: 'ERR',
  and: 'AND',
  or: 'OR',
  not: 'NOT',
  from: 'FROM',
  in: 'IN',   // reserved for future `for item in list`
};

// ── Delimiter / operator tokens ─────────────────────────────────
const DELIMITERS = {
  '{': 'LBRACE',
  '}': 'RBRACE',
  '(': 'LPAREN',
  ')': 'RPAREN',
  '[': 'LBRACKET',
  ']': 'RBRACKET',
  ';': 'SEMICOLON',
  ',': 'COMMA',
  ':': 'COLON',
  '=': 'ASSIGN',
};

// ── Token type definitions ──────────────────────────────────────
// Keys are uppercase to match the parser's checks like TokenType.LET
const TokenType = {
  // Literals
  INTEGER: 'INTEGER',
  FLOAT: 'FLOAT',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',
  EOF: 'EOF',

  // Keywords (uppercase keys → uppercase values)
  FN: 'FN',
  LET: 'LET',
  IF: 'IF',
  TYPE: 'TYPE',
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
  RETURN: 'RETURN',
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  UNIT: 'UNIT',
  OK: 'OK',
  ERR: 'ERR',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  FROM: 'FROM',
  IN: 'IN',

  // Delimiters
  LBRACE: '{',
  RBRACE: '}',
  LPAREN: '(',
  RPAREN: ')',
  LBRACKET: '[',
  RBRACKET: ']',
  SEMICOLON: ';',
  COMMA: ',',
  COLON: ':',
  ASSIGN: '=',

  // Operators
  ADD: '+',
  SUB: '-',
  MUL: '*',
  DIV: '/',
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  GT: '>',
  LE: '<=',
  GE: '>=',
  DOT: '.',
  ARROW: '->',
};

export { KEYWORDS, TokenType };
