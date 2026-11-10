/* Mio v2.1.0 Web reference VM. Keep the site protocol separate from the Go bridge. */
'use strict';

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_OUTPUT_CHARS = 64 * 1024;
const MAX_ERROR_CHARS = 8 * 1024;
const MAX_DIAGNOSTICS_CHARS = 32 * 1024;
const assetBase = new URL('./', self.location.href);
let executeMio;
let initializing = false;
let busy = false;

function clipped(value, limit) {
  if (typeof value !== 'string') return '';
  const suffix = '\n…（已截断）';
  return value.length > limit ? value.slice(0, limit - suffix.length) + suffix : value;
}

function report(type, id, error) {
  self.postMessage({ type, id, error: clipped(error instanceof Error ? error.message : String(error), MAX_ERROR_CHARS) });
}

async function initialize(id) {
  if (initializing) return;
  initializing = true;
  const started = performance.now();
  importScripts(new URL('wasm_exec.js', assetBase).href);
  const go = new self.Go();
  const response = await fetch(new URL('mio.wasm', assetBase).href, { redirect: 'error' });
  if (!response.ok) throw new Error(`无法加载 mio.wasm：HTTP ${response.status}`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject);
  go.run(instance).then(
    () => report('fatal', id, new Error('Mio WebAssembly 运行时意外退出。')),
    error => report('fatal', id, error),
  );
  // As in the tagged upstream Worker, Go registers this synchronously at startup.
  executeMio = self.mioExecute;
  if (typeof executeMio !== 'function') throw new Error('Mio v2.1 WebAssembly 接口未注册。');
  delete self.mioExecute;
  // Keep upstream's defense in depth. The VM also denies host MMA calls and embeds
  // a closed, read-only Bunko library; it has no JS bridge exposed to Mio code.
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel']) {
    Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false });
  }
  self.postMessage({ type: 'ready', id, initMs: performance.now() - started });
}

async function execute(id, operation, source) {
  if (!executeMio || busy) throw new Error('Mio Worker 尚未就绪。');
  if (operation !== 'run' && operation !== 'check') throw new Error('不支持的 Mio 操作。');
  if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
    throw new Error('源码超过 64 KiB 限制，或不是字符串。');
  }
  busy = true;
  try {
    // Preserve the tagged VM's default instruction budget and output/memory checks.
    const raw = await new Promise((resolve, reject) => {
      const refusal = executeMio(JSON.stringify({ operation, source }), resolve);
      if (refusal) reject(new Error(String(refusal)));
    });
    const result = JSON.parse(raw);
    if (result.status === 'internal_error') throw new Error(result.error || 'Mio WebAssembly 内部错误。');
    const status = result.status === 'runtime_error' || result.status === 'rejected' ? 'error' : result.status;
    if (!['ok', 'checked', 'diagnostic', 'error'].includes(status)) {
      throw new Error('Mio v2.1 WebAssembly 返回了未知状态。');
    }
    const diagnostics = [];
    let remaining = MAX_DIAGNOSTICS_CHARS;
    for (const diagnostic of result.diagnostics.slice(0, 32)) {
      if (remaining < 16) break;
      const message = clipped(diagnostic.rendered || diagnostic.message, Math.min(MAX_ERROR_CHARS, remaining));
      if (message) diagnostics.push(message);
      remaining -= message.length;
    }
    self.postMessage({ type: 'result', id, result: {
      status,
      stdout: clipped(result.stdout, MAX_OUTPUT_CHARS),
      diagnostics,
      compileMs: result.compileMs,
      runMs: result.runMs,
      ...(result.error && { error: clipped(result.error, MAX_ERROR_CHARS) }),
    } });
  } finally {
    busy = false;
  }
}

self.onmessage = async ({ data }) => {
  if (!data || typeof data !== 'object') return;
  try {
    if (data.type === 'init') await initialize(data.id);
    if (data.type === 'execute') await execute(data.id, data.operation, data.source);
  } catch (error) {
    report('error', data.id, error);
  }
};
