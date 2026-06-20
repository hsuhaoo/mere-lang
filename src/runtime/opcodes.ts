export enum Opcode {
  NOP,
  CONST,      // u16 index
  UNIT,
  TRUE,
  FALSE,
  LOAD,       // u16 local_index
  STORE,      // u16 local_index
  LOAD_G,     // u16 global_index
  STORE_G,    // u16 global_index
  ADD, SUB, MUL, DIV,
  EQ, NEQ, LT, GT, LTE, GTE,
  AND, OR, NEG, NOT,
  JMP,        // i16 offset
  JMP_IF,     // i16 offset (pop, jump if truthy)
  JMP_IF_NOT, // i16 offset (pop, jump if falsy)
  CALL,       // u16 name_index, u8 argc
  CALL_VAL,   // u8 argc (callee popped from stack)
  FN,         // u16 sub_fn_index (create FnValue for lambda)
  RET,
  FIELD,      // u16 name_index
  MAKE_REC,   // u8 count + count × u16 name_index
  MAKE_LIST,  // u16 count
  MAKE_MAP,   // u16 count (stack: key1,val1,key2,val2,...)
  POP,
  DUP,
}

export const enumSize = Object.keys(Opcode).length / 2;
