/**
 * Test host for the real public/wasm/mio-worker.js in a Node worker_thread.
 *
 * This does not implement a Mio runtime. It only supplies the small browser-worker
 * globals (self, importScripts, location and postMessage) that the production
 * Worker expects, then loads the unmodified production worker source.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

globalThis.self = globalThis;
self.location = { href: workerData.workerUrl };
self.postMessage = message => parentPort.postMessage(message);
self.importScripts = url => {
  const code = readFileSync(workerData.assetDir + '/wasm_exec.js', 'utf8');
  vm.runInThisContext(code, { filename: String(url) });
};

try {
  const workerCode = readFileSync(workerData.workerPath, 'utf8');
  vm.runInThisContext(workerCode, { filename: workerData.workerPath });
} catch (error) {
  parentPort.postMessage({ type: 'fatal', error: `无法加载 Mio Worker：${error instanceof Error ? error.message : String(error)}` });
}

parentPort.on('message', data => {
  if (typeof self.onmessage === 'function') self.onmessage({ data });
});
