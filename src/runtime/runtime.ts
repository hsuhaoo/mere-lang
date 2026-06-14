import { Scheduler } from './scheduler.js';
import { Interpreter } from './interpreter.js';
import { Builtins } from './builtins.js';
import { BrowserBuiltins } from './browser-builtins.js';

export type RuntimeTarget = 'node' | 'browser';

export interface RuntimeConfig {
  target: RuntimeTarget;
  canvas?: CanvasRenderingContext2D | null;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function createRuntime(config: RuntimeConfig): Interpreter {
  const scheduler = new Scheduler();

  if (config.target === 'browser') {
    const builtins = new BrowserBuiltins(
      scheduler,
      config.canvas || null,
      config.canvasWidth || 0,
      config.canvasHeight || 0
    );
    return new Interpreter(builtins, scheduler);
  }

  const builtins = new Builtins(scheduler);
  return new Interpreter(builtins, scheduler);
}
