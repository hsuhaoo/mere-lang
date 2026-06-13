/**
 * Simplex runtime environment.
 * Lexical scoping with parent chaining.
 * No mutation — variables are bound at declaration and cannot be reassigned.
 */

class Env {
  bindings: any;
  parent: any;

  constructor(parent = null) {
    this.bindings = new Map();
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
    return new Env(this);
  }

  getNames() {
    return [...this.bindings.keys()];
  }
}

export { Env };
