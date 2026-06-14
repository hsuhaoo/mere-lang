import { Scheduler } from './runtime/scheduler.js';
import { Interpreter } from './runtime/interpreter.js';
import { BrowserBuiltins } from './runtime/browser-builtins.js';

export function createBrowserRuntime(
  canvas?: CanvasRenderingContext2D | null,
  width?: number,
  height?: number
): Interpreter {
  const scheduler = new Scheduler();
  const builtins = new BrowserBuiltins(scheduler, canvas || null, width || 0, height || 0);
  return new Interpreter(builtins, scheduler);
}
