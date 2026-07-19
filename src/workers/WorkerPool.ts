/**
 * WorkerPool — manages a pool of Web Workers for offloading computation.
 * Distributes tasks round-robin and handles worker lifecycle.
 */

export type WorkerTask = 'keyframe-eval' | 'asset-decode' | 'cache-trim';

export interface WorkerTaskMessage {
  id: string;
  type: WorkerTask;
  payload: unknown;
}

export interface WorkerResultMessage {
  id: string;
  type: WorkerTask;
  success: boolean;
  payload: unknown;
  error?: string;
}

export class WorkerPool {
  private _workers: Worker[] = [];
  private _nextId = 0;
  private _pending = new Map<string, {
    resolve: (value: WorkerResultMessage) => void;
    reject: (err: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private _maxWorkers: number;

  /** Create a pool of workers running the given script URL */
  constructor(scriptUrl: string, maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this._maxWorkers = Math.max(1, Math.min(maxWorkers, 8));
    this._initialize(scriptUrl);
  }

  private _initialize(scriptUrl: string): void {
    for (let i = 0; i < this._maxWorkers; i++) {
      try {
        const worker = new Worker(scriptUrl);
        worker.onmessage = (e: MessageEvent<WorkerResultMessage>) => this._handleResult(e.data);
        worker.onerror = (err) => {
          console.error('[WorkerPool] Worker error:', err);
        };
        this._workers.push(worker);
      } catch (err) {
        console.warn('[WorkerPool] Failed to create worker:', err);
      }
    }
  }

  /** Submit a task to the pool. Returns a promise that resolves with the result. */
  submit(type: WorkerTask, payload: unknown, timeoutMs: number = 10000): Promise<WorkerResultMessage> {
    return new Promise((resolve, reject) => {
      const id = `task_${this._nextId++}`;
      const workerIdx = this._nextId % this._workers.length;

      if (this._workers.length === 0) {
        reject(new Error('No workers available'));
        return;
      }

      const timeout = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`Task ${id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this._pending.set(id, { resolve, reject, timeout });

      const msg: WorkerTaskMessage = { id, type, payload };
      this._workers[workerIdx].postMessage(msg);
    });
  }

  /** Check if workers are available */
  get isAvailable(): boolean {
    return this._workers.length > 0;
  }

  get workerCount(): number {
    return this._workers.length;
  }

  private _handleResult(msg: WorkerResultMessage): void {
    const pending = this._pending.get(msg.id);
    if (!pending) {
      console.warn('[WorkerPool] Received result for unknown task:', msg.id);
      return;
    }
    clearTimeout(pending.timeout);
    this._pending.delete(msg.id);

    if (msg.success) {
      pending.resolve(msg);
    } else {
      pending.reject(new Error(msg.error || 'Worker task failed'));
    }
  }

  /** Terminate all workers */
  terminate(): void {
    for (const w of this._workers) {
      w.terminate();
    }
    this._workers = [];
    for (const [, pending] of this._pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker pool terminated'));
    }
    this._pending.clear();
  }

  dispose(): void {
    this.terminate();
  }
}
