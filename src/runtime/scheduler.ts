import { Value, TaskValue, task as mkTask } from './values.js';
import { TypeAnnotation } from '../ast/nodes.js';
import deasync from 'deasync';

class SchedulerTask {
  id: number;
  fn: () => Value | Promise<Value>;
  resultType: TypeAnnotation | null;
  state: 'pending' | 'done';
  result: Value | null;
  error: string | null;

  constructor(id: number, fn: () => Value | Promise<Value>, resultType: TypeAnnotation | null) {
    this.id = id;
    this.fn = fn;
    this.resultType = resultType;
    this.state = 'pending';
    this.result = null;
    this.error = null;
  }

  isDone(): boolean {
    return this.state === 'done';
  }
}

class Scheduler {
  tasks: Map<number, SchedulerTask>;
  nextId: number;

  constructor() {
    this.tasks = new Map();
    this.nextId = 0;
  }

  spawn(fn: () => Value | Promise<Value>, resultType: TypeAnnotation | null): TaskValue {
    const task = new SchedulerTask(this.nextId++, fn, resultType);
    this.tasks.set(task.id, task);
    return mkTask(task, resultType);
  }

  spawnAsync(promise: Promise<Value>, resultType: TypeAnnotation | null): TaskValue {
    const task = new SchedulerTask(this.nextId++, () => promise, resultType);
    this.tasks.set(task.id, task);
    promise.then(
      value => { task.result = value; task.state = 'done'; },
      err => { task.error = err.message; task.state = 'done'; }
    );
    return mkTask(task, resultType);
  }

  join(taskValue: TaskValue): Value {
    const task = taskValue.handle;

    if (task.isDone()) {
      if (task.error) {
        throw new Error(`Task ${task.id} failed: ${task.error}`);
      }
      return task.result;
    }

    const result = task.fn();

    if (result instanceof Promise) {
      // Async task — already started by spawnAsync, pump loop until done
      if (!task.isDone()) {
        deasync.loopWhile(() => !task.isDone());
      }
    } else {
      // Sync task — execute result immediately
      task.result = result;
      task.state = 'done';
    }

    if (task.error) {
      throw new Error(`Task ${task.id} failed: ${task.error}`);
    }
    return task.result;
  }

  reset() {
    this.tasks.clear();
    this.nextId = 0;
  }
}

export { Scheduler };
export type { SchedulerTask };
