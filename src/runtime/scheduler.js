/**
 * Task scheduler for the Simplex concurrency model.
 * Cooperative scheduling: tasks yield on I/O operations.
 * 
 * Design principles:
 * - spawn() returns Task<T> immediately
 * - join() blocks the calling task but schedules other tasks
 * - No async/await syntax
 * - Synchronous appearance, asynchronous reality
 * - No channels; communication via file IO or shared state
 */

const { TaskValue, value: mkTask } = require('./values');

class SchedulerTask {
  constructor(id, fn, resultType) {
    this.id = id;
    this.fn = fn;
    this.resultType = resultType;
    this.state = 'pending'; // 'pending' | 'ready' | 'done'
    this.result = null;
    this.error = null;
  }

  isDone() {
    return this.state === 'done';
  }

  isReady() {
    return this.state === 'ready';
  }
}

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.readyQueue = [];
    this.nextId = 0;
    this.running = false;
  }

  /**
   * Spawn a new task. Returns a Task<T> value.
   */
  spawn(fn, resultType) {
    const task = new SchedulerTask(this.nextId++, fn, resultType);
    this.tasks.set(task.id, task);
    this.readyQueue.push(task);

    const { task: mkTask } = require('./values');
    return mkTask({
      handle: task,
      taskType: resultType,
    });
  }

  /**
   * Join on a task. Blocks until the task completes.
   * If the scheduler is not running, runs it.
   */
  join(taskValue) {
    const task = taskValue.handle;

    if (task.state === 'done') {
      if (task.error) {
        throw new Error(`Task ${task.id} failed: ${task.error}`);
      }
      return task.result;
    }

    if (task.state === 'ready') {
      this.runTasks([task]);
    }

    if (task.state === 'done') {
      if (task.error) {
        throw new Error(`Task ${task.id} failed: ${task.error}`);
      }
      return task.result;
    }

    // If still pending, run the scheduler
    this.run();

    if (task.error) {
      throw new Error(`Task ${task.id} failed: ${task.error}`);
    }
    return task.result;
  }

  /**
   * Run the scheduler until all tasks complete.
   */
  run() {
    this.running = true;
    this.runTasks([...this.tasks.values()].filter(t => t.state === 'ready'));
    this.running = false;
  }

  /**
   * Run a batch of ready tasks.
   */
  runTasks(tasks) {
    for (const task of tasks) {
      try {
        const result = task.fn();
        task.result = result;
        task.state = 'done';
      } catch (e) {
        task.error = e.message;
        task.state = 'done';
      }
    }
  }

  /**
   * Register a task that will complete later (for IO-bound tasks).
   */
  registerTask(task) {
    this.tasks.set(task.id, task);
  }

  /**
   * Mark a task as ready for execution.
   */
  markReady(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.state = 'ready';
      if (!this.readyQueue.includes(task)) {
        this.readyQueue.push(task);
      }
    }
  }

  /**
   * Get remaining tasks.
   */
  remainingTasks() {
    return [...this.tasks.values()].filter(t => !t.isDone());
  }

  /**
   * Reset the scheduler (for testing).
   */
  reset() {
    this.tasks.clear();
    this.readyQueue = [];
    this.nextId = 0;
    this.running = false;
  }
}

module.exports = { Scheduler };
