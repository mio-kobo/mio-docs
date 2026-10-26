import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const HOST_ENTRY = fileURLToPath(new URL('./mio-worker-host.mjs', import.meta.url));

class WorkerFailure extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WorkerFailure';
    this.code = code;
  }
}

/**
 * A small Node client for the unmodified production Worker protocol. The Worker
 * host loads the same mio-worker.js, wasm_exec.js and mio.wasm used by the site.
 */
export class PlaygroundWorkerClient {
  constructor({ assetDir, origin, initTimeoutMs = 20_000, executionTimeoutMs = 20_000 }) {
    this.assetDir = assetDir;
    this.origin = origin;
    this.initTimeoutMs = initTimeoutMs;
    this.executionTimeoutMs = executionTimeoutMs;
    this.worker = null;
    this.nextId = 0;
    this.initId = null;
    this.init = null;
    this.initTimer = null;
    this.active = null;
    this.ready = false;
    this.closed = false;
  }

  async start() {
    if (this.worker) throw new Error('PlaygroundWorkerClient.start() may only be called once');
    this.worker = new Worker(HOST_ENTRY, {
      workerData: {
        assetDir: this.assetDir,
        workerPath: join(this.assetDir, 'mio-worker.js'),
        workerUrl: `${this.origin}/wasm/mio-worker.js`,
      },
    });
    this.worker.on('message', message => this.onMessage(message));
    this.worker.on('error', error => this.failAll(new WorkerFailure(
      `Mio Worker error: ${error instanceof Error ? error.message : String(error)}`,
      'MIO_WORKER_ERROR',
    )));
    this.worker.on('exit', code => {
      if (this.closed) return;
      this.failAll(new WorkerFailure(`Mio Worker exited unexpectedly (code ${code})`, 'MIO_WORKER_EXIT'));
    });

    this.initId = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.init = { resolve, reject };
      this.initTimer = setTimeout(() => {
        this.failInit(new WorkerFailure('Mio Worker initialization timed out', 'MIO_INIT_TIMEOUT'));
        void this.terminate();
      }, this.initTimeoutMs);
      try {
        this.worker.postMessage({ type: 'init', id: this.initId });
      } catch (error) {
        this.failInit(error);
        void this.terminate();
      }
    });
  }

  /**
   * @param {'run'|'check'} operation
   * @param {string} source
   * @param {{timeoutMs?: number}} [options]
   */
  async execute(operation, source, options = {}) {
    if (!this.ready || !this.worker) throw new Error('Mio Worker is not ready');
    if (this.active) throw new Error('Mio Worker requests must be serialized');
    const id = ++this.nextId;
    const timeoutMs = options.timeoutMs ?? this.executionTimeoutMs;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failActive(new WorkerFailure(`Execution timed out after ${timeoutMs}ms`, 'MIO_TIMEOUT'));
        void this.terminate();
      }, timeoutMs);
      this.active = { id, resolve, reject, timer };
      try {
        this.worker.postMessage({ type: 'execute', id, operation, source });
      } catch (error) {
        this.failActive(error);
        void this.terminate();
      }
    });
  }

  onMessage(message) {
    if (this.closed || !message || typeof message !== 'object') return;
    if (message.type === 'ready') {
      if (message.id !== this.initId || !this.init) return;
      clearTimeout(this.initTimer);
      this.initTimer = null;
      this.ready = true;
      const init = this.init;
      this.init = null;
      init.resolve(message);
      return;
    }
    if (message.type === 'result') {
      if (!this.active || message.id !== this.active.id) return;
      const active = this.active;
      this.active = null;
      clearTimeout(active.timer);
      active.resolve(message.result);
      return;
    }
    if (message.type === 'error') {
      const error = new WorkerFailure(String(message.error ?? 'Mio Worker error'), 'MIO_WORKER_ERROR');
      if (message.id === this.initId && this.init) {
        this.failInit(error);
        void this.terminate();
        return;
      }
      if (this.active && message.id === this.active.id) {
        this.failActive(error);
        void this.terminate();
      }
      return;
    }
    if (message.type === 'fatal') {
      this.failAll(new WorkerFailure(String(message.error ?? 'Mio Worker fatal error'), 'MIO_WORKER_FATAL'));
    }
  }

  failInit(error) {
    if (!this.init) return;
    clearTimeout(this.initTimer);
    this.initTimer = null;
    const init = this.init;
    this.init = null;
    init.reject(error);
  }

  failActive(error) {
    if (!this.active) return;
    clearTimeout(this.active.timer);
    const active = this.active;
    this.active = null;
    active.reject(error);
  }

  failAll(error) {
    this.ready = false;
    this.failInit(error);
    this.failActive(error);
  }

  async terminate(error = new WorkerFailure('Mio Worker terminated', 'MIO_TERMINATED')) {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    clearTimeout(this.initTimer);
    this.initTimer = null;
    this.failInit(error);
    this.failActive(error);
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
