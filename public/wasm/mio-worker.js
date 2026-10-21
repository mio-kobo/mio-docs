/*
 * Mio Playground Worker.
 *
 * A classic Worker is intentional: the Go toolchain's wasm_exec.js uses
 * importScripts() and the official js/wasm ABI. One Worker owns exactly one Go
 * runtime. The page terminates the Worker to stop a synchronous Mio program.
 */
'use strict';

const EXECUTION_LIMIT_BYTES = 64 * 1024;
const INIT_TIMEOUT_MS = 20_000;
const ASSET_BASE = new URL('./', self.location.href);

let initialized = false;
let initializing = null;
let runtimeFailure = null;

function postError(id, error) {
  const message = error instanceof Error ? error.message : String(error);
  self.postMessage({ type: 'error', id, error: message });
}

function describeRuntimeFailure(error) {
  runtimeFailure = error instanceof Error ? error : new Error(String(error));
  if (initialized) self.postMessage({ type: 'fatal', error: runtimeFailure.message });
}

async function waitForBridge() {
  const deadline = performance.now() + INIT_TIMEOUT_MS;
  while (typeof self.mioExecute !== 'function') {
    if (runtimeFailure) throw runtimeFailure;
    if (performance.now() >= deadline) {
      throw new Error('Mio WebAssembly 运行时初始化超时：mioExecute 未注册。');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function initialize(id) {
  const started = performance.now();
  try {
    importScripts(new URL('wasm_exec.js', ASSET_BASE).href);
    if (typeof self.Go !== 'function') {
      throw new Error('wasm_exec.js 未提供 Go 运行时构造器。');
    }

    const go = new self.Go();
    go.exit = code => describeRuntimeFailure(new Error(`Go 运行时已退出（code ${code}）。`));

    const response = await fetch(new URL('mio.wasm', ASSET_BASE).href);
    if (!response.ok) {
      throw new Error(`无法加载 mio.wasm：HTTP ${response.status} ${response.statusText}`.trim());
    }
    const bytes = await response.arrayBuffer();

    let instance;
    try {
      ({ instance } = await WebAssembly.instantiate(bytes, go.importObject));
    } catch (error) {
      throw new Error(`mio.wasm 实例化失败：${error instanceof Error ? error.message : String(error)}`);
    }

    // go.run() does not resolve for this program: main registers mioExecute and
    // then blocks forever. We must not await it before considering the bridge ready.
    go.run(instance).then(
      () => describeRuntimeFailure(new Error('Go 运行时在注册 Mio 接口后意外结束。')),
      error => describeRuntimeFailure(error),
    );

    await waitForBridge();
    initialized = true;
    self.postMessage({ type: 'ready', id, initMs: performance.now() - started });
  } catch (error) {
    postError(id, error);
  }
}

async function initializeOnce(id) {
  if (!initializing) initializing = initialize(id);
  await initializing;
}

function execute(id, operation, source) {
  if (!initialized || typeof self.mioExecute !== 'function') {
    postError(id, new Error('Mio Worker 尚未初始化。'));
    return;
  }
  if (operation !== 'run' && operation !== 'check') {
    postError(id, new Error(`不支持的 Mio 操作：${String(operation)}`));
    return;
  }
  if (typeof source !== 'string') {
    postError(id, new Error('Mio 源码必须是字符串。'));
    return;
  }
  if (new TextEncoder().encode(source).byteLength > EXECUTION_LIMIT_BYTES) {
    postError(id, new Error('源码超过 64 KiB 限制。'));
    return;
  }

  try {
    const raw = self.mioExecute(source, operation);
    if (typeof raw !== 'string') throw new Error('mioExecute 返回了非字符串结果。');
    const result = JSON.parse(raw);
    if (!result || typeof result !== 'object') throw new Error('mioExecute 返回了无效的 JSON 结果。');
    self.postMessage({ type: 'result', id, result });
  } catch (error) {
    postError(id, error);
  }
}

self.onmessage = event => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'init') {
    void initializeOnce(data.id);
  } else if (data.type === 'execute') {
    execute(data.id, data.operation, data.source);
  }
};
