import { Value, TaskValue, task as mkTask } from './values.js';
import { TypeAnnotation } from '../ast/nodes.js';

class SchedulerTask {
  id: number;
  fn: () => Value;
  resultType: TypeAnnotation | null;
  state: 'pending' | 'ready' | 'done';
  result: Value | null;
  error: string | null;

  constructor(id: number, fn: () => any, resultType: TypeAnnotation | null) {
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

  isReady(): boolean {
    return this.state === 'ready';
  }
}

class Scheduler {
  tasks: Map<number, SchedulerTask>;
  readyQueue: SchedulerTask[];
  nextId: number;
  running: boolean;

  constructor() {
    this.tasks = new Map();
    this.readyQueue = [];
    this.nextId = 0;
    this.running = false;
  }

  spawn(fn: () => Value, resultType: TypeAnnotation | null): TaskValue {
    const task = new SchedulerTask(this.nextId++, fn, resultType);
    this.tasks.set(task.id, task);
    this.readyQueue.push(task);

    return mkTask(task, resultType);
  }

  join(taskValue: TaskValue): any {
    const task: SchedulerTask = taskValue.handle;

    if (task.isDone()) {
      if (task.error) {
        throw new Error(`Task ${task.id} failed: ${task.error}`);
      }
      return task.result;
    }

    if (task.isReady()) {
      this.runTasks([task]);
      if (task.isDone()) {
        if (task.error) {
          throw new Error(`Task ${task.id} failed: ${task.error}`);
        }
        return task.result;
      }
    }

    this.run();

    if (task.error) {
      throw new Error(`Task ${task.id} failed: ${task.error}`);
    }
    return task.result;
  }

  run() {
    this.running = true;
    this.runTasks([...this.tasks.values()].filter(t => t.state === 'ready'));
    this.running = false;
  }

  runTasks(tasks: SchedulerTask[]) {
    for (const task of tasks) {
      try {
        const result = task.fn();
        task.result = result;
        task.state = 'done';
      } catch (e: any) {
        task.error = e.message;
        task.state = 'done';
      }
    }
  }

  registerTask(task: SchedulerTask) {
    this.tasks.set(task.id, task);
  }

  markReady(taskId: number) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.state = 'ready';
      if (!this.readyQueue.includes(task)) {
        this.readyQueue.push(task);
      }
    }
  }

  remainingTasks(): SchedulerTask[] {
    return [...this.tasks.values()].filter(t => !t.isDone());
  }

  reset() {
    this.tasks.clear();
    this.readyQueue = [];
    this.nextId = 0;
    this.running = false;
  }
}

export { Scheduler };
export type { SchedulerTask };
