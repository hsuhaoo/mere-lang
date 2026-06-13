import { Value } from './values.js';

class Env {
  bindings: Map<string, Value>;
  parent: Env | null;

  constructor(parent: Env | null = null) {
    this.bindings = new Map();
    this.parent = parent;
  }

  define(name: string, value: Value): void {
    if (this.bindings.has(name)) {
      throw new Error(`Variable '${name}' is already defined in this scope`);
    }
    this.bindings.set(name, value);
  }

  assign(name: string, value: Value): void {
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

  lookup(name: string): Value {
    if (this.bindings.has(name)) {
      return this.bindings.get(name)!;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    throw new ReferenceError(`Undefined variable: ${name}`);
  }

  has(name: string): boolean {
    if (this.bindings.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  child(): Env {
    return new Env(this);
  }

  getNames(): string[] {
    return [...this.bindings.keys()];
  }
}

export { Env };
