export type MioOperation = 'run' | 'check';

export type MioStatus = 'ok' | 'checked' | 'diagnostic' | 'error';

export type MioFailureKind = 'load' | 'timeout' | 'cancelled' | 'internal' | 'limit' | 'queue';

export interface MioResult {
  status: MioStatus;
  stdout: string;
  diagnostics: string[];
  compileMs: number;
  runMs: number;
  error?: string;
  /** Set only for failures raised by this loader, not by the Mio engine. */
  failureKind?: MioFailureKind;
}

export interface MioRunOptions {
  /** Abort a queued request or terminate the Worker that is executing it. */
  signal?: AbortSignal;
}

const WORKER_URL = '/wasm/mio-worker.js';
const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_OUTPUT_CHARS = 64 * 1024;
const MAX_ERROR_CHARS = 8 * 1024;
const MAX_DIAGNOSTIC_CHARS = 8 * 1024;
const MAX_DIAGNOSTICS_TOTAL_CHARS = 32 * 1024;
const MAX_QUEUED_REQUESTS = 8;
const INIT_TIMEOUT_MS = 20_000;
const EXECUTION_TIMEOUT_MS = 10_000;

const EMPTY_RESULT: Omit<MioResult, 'status' | 'error'> = {
  stdout: '',
  diagnostics: [],
  compileMs: 0,
  runMs: 0,
};

type Request = {
  id: number;
  operation: MioOperation;
  source: string;
  resolve: (result: MioResult) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
};

function failure(error: string, failureKind: MioFailureKind): MioResult {
  return { ...EMPTY_RESULT, status: 'error', error, failureKind };
}

function clampText(value: unknown, limit: number): string {
  if (typeof value !== 'string') return '';
  return value.length > limit ? `${value.slice(0, limit)}\n…（已截断）` : value;
}

function normalizeResult(value: unknown): MioResult {
  if (!value || typeof value !== 'object') {
    return failure('Mio Worker 返回了无法识别的结果。', 'internal');
  }
  const raw = value as Record<string, unknown>;
  if (!['ok', 'checked', 'diagnostic', 'error'].includes(String(raw.status))) {
    return failure(`Mio Worker 返回了未知状态：${String(raw.status)}`, 'internal');
  }

  const diagnostics: string[] = [];
  let diagnosticsChars = 0;
  if (Array.isArray(raw.diagnostics)) {
    for (const item of raw.diagnostics.slice(0, 32)) {
      if (typeof item !== 'string') continue;
      const remaining = MAX_DIAGNOSTICS_TOTAL_CHARS - diagnosticsChars;
      if (remaining <= 0) break;
      const text = clampText(item, Math.min(MAX_DIAGNOSTIC_CHARS, remaining));
      diagnostics.push(text);
      diagnosticsChars += text.length;
    }
  }

  const status = raw.status as MioStatus;
  const result: MioResult = {
    status,
    stdout: clampText(raw.stdout, MAX_OUTPUT_CHARS),
    diagnostics,
    compileMs: typeof raw.compileMs === 'number' && Number.isFinite(raw.compileMs) && raw.compileMs >= 0 ? raw.compileMs : 0,
    runMs: typeof raw.runMs === 'number' && Number.isFinite(raw.runMs) && raw.runMs >= 0 ? raw.runMs : 0,
  };
  if (typeof raw.error === 'string' && raw.error) result.error = clampText(raw.error, MAX_ERROR_CHARS);
  return result;
}

class MioRuntime {
  private worker: Worker | null = null;
  private workerGeneration = 0;
  private initRequestId: number | null = null;
  private nextRequestId = 0;
  private active: Request | null = null;
  private queue: Request[] = [];
  private initTimer: ReturnType<typeof setTimeout> | null = null;
  private executionTimer: ReturnType<typeof setTimeout> | null = null;
  private state: 'idle' | 'initializing' | 'ready' | 'executing' = 'idle';

  run(operation: MioOperation, source: string, options: MioRunOptions = {}): Promise<MioResult> {
    if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
      return Promise.resolve(failure('源码超过 64 KiB 限制。', 'limit'));
    }
    if (!['run', 'check'].includes(operation)) {
      return Promise.resolve(failure(`不支持的 Mio 操作：${operation}`, 'internal'));
    }
    if (options.signal?.aborted) {
      return Promise.resolve(failure('执行已停止。', 'cancelled'));
    }
    if (this.queue.length >= MAX_QUEUED_REQUESTS) {
      return Promise.resolve(failure('待执行的 Playground 请求过多，请稍后重试。', 'queue'));
    }

    return new Promise(resolve => {
      const request: Request = {
        id: ++this.nextRequestId,
        operation,
        source,
        resolve,
        signal: options.signal,
      };
      if (options.signal) {
        request.abortListener = () => this.abort(request);
        options.signal.addEventListener('abort', request.abortListener, { once: true });
      }
      this.queue.push(request);
      this.pump();
    });
  }

  private pump() {
    if (this.active || !this.queue.length) return;
    const request = this.queue.shift()!;
    this.active = request;
    if (this.state === 'ready') {
      this.send(request);
    } else if (this.state === 'idle') {
      this.startWorker();
    }
    // While initializing, the ready handler will send the active request.
  }

  private startWorker() {
    this.state = 'initializing';
    this.initRequestId = ++this.nextRequestId;
    const generation = ++this.workerGeneration;
    let worker: Worker;
    try {
      worker = new Worker(WORKER_URL);
    } catch (error) {
      const message = `无法创建 Mio WebAssembly Worker：${error instanceof Error ? error.message : String(error)}`;
      this.failActive(message, 'load');
      this.rejectAll(failure(message, 'load'));
      this.terminateWorker();
      return;
    }
    this.worker = worker;

    worker.onmessage = event => {
      if (generation !== this.workerGeneration) return;
      this.handleMessage(event.data);
    };
    worker.onerror = event => {
      if (generation !== this.workerGeneration) return;
      event.preventDefault();
      this.failActive(`Mio Worker 发生错误：${event.message || '未知错误'}`, 'internal');
      this.rejectAll(failure('Mio Worker 异常终止，请重试。', 'internal'));
      this.terminateWorker();
    };
    worker.onmessageerror = () => {
      if (generation !== this.workerGeneration) return;
      this.failActive('Mio Worker 返回了无法解码的消息。', 'internal');
      this.rejectAll(failure('Mio Worker 消息无法解码，请重试。', 'internal'));
      this.terminateWorker();
    };

    this.initTimer = setTimeout(() => {
      if (generation !== this.workerGeneration || this.state !== 'initializing') return;
      this.failActive('Mio WebAssembly 运行时初始化超时（20 秒）。', 'load');
      this.rejectAll(failure('Mio WebAssembly 运行时初始化超时（20 秒）。', 'load'));
      this.terminateWorker();
    }, INIT_TIMEOUT_MS);

    try {
      worker.postMessage({ type: 'init', id: this.initRequestId });
    } catch (error) {
      const message = `无法初始化 Mio WebAssembly Worker：${error instanceof Error ? error.message : String(error)}`;
      this.failActive(message, 'load');
      this.rejectAll(failure(message, 'load'));
      this.terminateWorker();
    }
  }

  private handleMessage(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const message = data as Record<string, unknown>;

    if (message.type === 'ready') {
      if (message.id !== this.initRequestId || this.state !== 'initializing') return;
      this.clearInitTimer();
      this.initRequestId = null;
      this.state = 'ready';
      if (this.active) this.send(this.active);
      return;
    }

    if (message.type === 'result') {
      if (!this.active || message.id !== this.active.id) return;
      this.clearExecutionTimer();
      this.completeActive(normalizeResult(message.result));
      return;
    }

    if (message.type === 'error') {
      const text = clampText(message.error, MAX_ERROR_CHARS) || 'Mio Worker 返回了未知错误。';
      if (message.id === this.initRequestId && this.state === 'initializing') {
        this.failActive(text, 'load');
        this.rejectAll(failure(text, 'load'));
        this.terminateWorker();
        return;
      }
      if (this.active && message.id === this.active.id) {
        this.failActive(text, 'internal');
        this.terminateWorker();
        this.pump();
      }
      return;
    }

    if (message.type === 'fatal') {
      const text = clampText(message.error, MAX_ERROR_CHARS) || 'Mio WebAssembly 运行意外结束。';
      this.failActive(text, 'internal');
      this.rejectAll(failure(text, 'internal'));
      this.terminateWorker();
    }
  }

  private send(request: Request) {
    if (!this.worker || this.state !== 'ready') return;
    try {
      this.state = 'executing';
      this.worker.postMessage({ type: 'execute', id: request.id, operation: request.operation, source: request.source });
      this.executionTimer = setTimeout(() => {
        this.failActive('执行超时（10 秒），Worker 已终止。', 'timeout');
        this.terminateWorker();
        this.pump();
      }, EXECUTION_TIMEOUT_MS);
    } catch (error) {
      this.failActive(`无法向 Mio Worker 发送请求：${error instanceof Error ? error.message : String(error)}`, 'internal');
      this.terminateWorker();
      this.pump();
    }
  }

  private completeActive(result: MioResult) {
    const request = this.active;
    if (!request) return;
    this.active = null;
    this.detachAbort(request);
    this.state = 'ready';
    request.resolve(result);
    this.pump();
  }

  private failActive(error: string, failureKind: MioFailureKind) {
    const request = this.active;
    if (!request) return;
    this.active = null;
    this.detachAbort(request);
    request.resolve(failure(error, failureKind));
  }

  private rejectAll(result: MioResult) {
    const requests = this.queue.splice(0);
    for (const request of requests) {
      this.detachAbort(request);
      request.resolve({ ...result, diagnostics: [...result.diagnostics] });
    }
  }

  private abort(request: Request) {
    if (this.active === request) {
      this.failActive('执行已停止，Worker 已终止。', 'cancelled');
      this.terminateWorker();
      this.pump();
      return;
    }
    const index = this.queue.indexOf(request);
    if (index < 0) return;
    this.queue.splice(index, 1);
    this.detachAbort(request);
    request.resolve(failure('执行已停止。', 'cancelled'));
  }

  private terminateWorker() {
    this.clearInitTimer();
    this.clearExecutionTimer();
    this.workerGeneration++;
    this.worker?.terminate();
    this.worker = null;
    this.initRequestId = null;
    this.state = 'idle';
  }

  private clearInitTimer() {
    if (this.initTimer) clearTimeout(this.initTimer);
    this.initTimer = null;
  }

  private clearExecutionTimer() {
    if (this.executionTimer) clearTimeout(this.executionTimer);
    this.executionTimer = null;
  }

  private detachAbort(request: Request) {
    if (request.signal && request.abortListener) {
      request.signal.removeEventListener('abort', request.abortListener);
    }
    request.abortListener = undefined;
    request.signal = undefined;
  }
}

const runtime = new MioRuntime();

/** Compile and execute Mio source in the shared, serialized WebAssembly runtime. */
export function runMio(source: string, options?: MioRunOptions): Promise<MioResult> {
  return runtime.run('run', source, options);
}

/** Compile Mio source without executing it. */
export function checkMio(source: string, options?: MioRunOptions): Promise<MioResult> {
  return runtime.run('check', source, options);
}
