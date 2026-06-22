import { Value, TaskValue, TaskHandle, SuspendFrame } from './values.js';
import { TypeAnnotation } from '../ast/nodes.js';

interface SchedulerTask {
  id: number;
  state: 'pending' | 'done';
  result: Value | null;
  error: string | null;
  promise?: Promise<Value>;
  waitingVmIdx?: number;
  handle?: TaskHandle;
}

interface VMLike {
  stack: Value[];
  frames: any[];
  funcList: any[];
  functions: Map<string, any>;
  funcNameToIndex: Map<string, number>;
  globals: Value[];
  globalNames: string[];
  pushFrame(fn: any, args: Value[]): number;
  runScheduled(targetDepth: number): Value;
  hasFunction(name: string): boolean;
  getFunctionIndex(name: string): number;
  callByIndex(index: number, args: Value[]): Value;
}

class Scheduler {
  private tasks: Map<number, SchedulerTask>;
  private nextTaskId: number;
  private vms: VMLike[];
  private readyQueue: number[];
  currentVmIdx: number;
  private mainVmIdx: number;
  private mainResult: Value;
  private pendingPromiseTasks: Set<number>;
  private vmNextEntry: Map<number, string | null>;

  getCurrentVM(): VMLike | null {
    if (this.currentVmIdx >= 0 && this.currentVmIdx < this.vms.length) {
      return this.vms[this.currentVmIdx];
    }
    return null;
  }

  constructor() {
    this.tasks = new Map();
    this.nextTaskId = 1;
    this.vms = [];
    this.readyQueue = [];
    this.currentVmIdx = -1;
    this.mainVmIdx = -1;
    this.mainResult = null as unknown as Value;
    this.pendingPromiseTasks = new Set();
    this.vmNextEntry = new Map();
  }

  registerMainVM(vm: VMLike): void {
    this.mainVmIdx = this.vms.length;
    this.vms.push(vm);
  }

  setupMainEntry(hasEntry: boolean): void {
    if (hasEntry) {
      this.vmNextEntry.set(this.mainVmIdx, '__main__');
    }
  }

  spawnAsync(promise: Promise<Value>, resultType: TypeAnnotation | null): TaskValue {
    const taskId = this.nextTaskId++;

    const handle: TaskHandle = {
      id: taskId,
      state: 'pending',
      result: null,
      error: null,
      resultType,
      isDone(): boolean { return this.state === 'done'; },
    };

    const task: SchedulerTask = {
      id: taskId,
      state: 'pending',
      result: null,
      error: null,
      promise,
    };
    this.tasks.set(taskId, task);
    this.pendingPromiseTasks.add(taskId);

    promise.then(
      value => { handle.state = 'done'; handle.result = value; task.state = 'done'; task.result = value; },
      err => { handle.state = 'done'; handle.error = err.message; task.state = 'done'; task.error = err.message; }
    );

    return new TaskValue(handle, resultType);
  }

  join(taskValue: TaskValue): Value {
    const handle = taskValue.handle;
    if (handle.isDone()) {
      if (handle.error) {
        throw new Error(`Task ${handle.id} failed: ${handle.error}`);
      }
      return handle.result!;
    }

    const vm = this.vms[this.currentVmIdx];
    const task = this.tasks.get(handle.id);
    if (task) {
      task.waitingVmIdx = this.currentVmIdx;
    }

    vm.stack.push(taskValue);
    throw new SuspendFrame();
  }

  async run(): Promise<Value> {
    if (this.mainVmIdx < 0) return null as unknown as Value;

    const mainVM = this.vms[this.mainVmIdx];
    const nextEntry = this.vmNextEntry.get(this.mainVmIdx);
    if (nextEntry !== undefined) {
      const fnIdx = mainVM.getFunctionIndex(nextEntry);
      if (fnIdx >= 0) {
        mainVM.pushFrame(mainVM.funcList[fnIdx], []);
      }
      this.vmNextEntry.delete(this.mainVmIdx);
    }
    this.readyQueue.push(this.mainVmIdx);

    while (this.readyQueue.length > 0 || this.pendingPromiseTasks.size > 0) {
      while (this.readyQueue.length > 0) {
        const vmIdx = this.readyQueue.shift()!;
        this.currentVmIdx = vmIdx;
        const vm = this.vms[vmIdx];

        let result: Value;
        try {
          result = vm.runScheduled(0);
        } catch (e) {
          if (e instanceof SuspendFrame) {
            continue;
          }
          throw e;
        }

        this.handleVMCompletion(vmIdx, result);
      }

      if (this.pendingPromiseTasks.size > 0) {
        await this.waitForPromises();
      }
    }

    return this.mainResult;
  }

  private handleVMCompletion(vmIdx: number, result: Value): void {
    const nextEntry = this.vmNextEntry.get(this.mainVmIdx);
    if (nextEntry !== undefined) {
      const mainVM = this.vms[this.mainVmIdx];
      const fnIdx = mainVM.getFunctionIndex(nextEntry);
      if (fnIdx >= 0) {
        mainVM.pushFrame(mainVM.funcList[fnIdx], []);
        this.readyQueue.push(this.mainVmIdx);
      }
      this.vmNextEntry.delete(this.mainVmIdx);
      return;
    }

    this.mainResult = result;
  }

  private wakeWaitingVM(taskId: number): void {
    const task = this.tasks.get(taskId);
    if (task && task.waitingVmIdx !== undefined) {
      this.readyQueue.push(task.waitingVmIdx);
      task.waitingVmIdx = undefined;
    }
  }

  private async waitForPromises(): Promise<void> {
    const pending: Promise<Value>[] = [];
    for (const taskId of this.pendingPromiseTasks) {
      const task = this.tasks.get(taskId);
      if (task && task.state === 'pending' && task.promise) {
        pending.push(task.promise);
      }
    }

    if (pending.length === 0) return;

    await Promise.race(pending).catch(() => {});

    const resolved: number[] = [];
    for (const taskId of this.pendingPromiseTasks) {
      const task = this.tasks.get(taskId);
      if (task && task.state === 'done') {
        resolved.push(taskId);
        this.wakeWaitingVM(taskId);
      }
    }
    for (const id of resolved) {
      this.pendingPromiseTasks.delete(id);
    }
  }
}

export { Scheduler };
