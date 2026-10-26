import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Serve the real public/wasm assets over loopback for the Worker fetch path.
 * A failing server is used to exercise the real load-error branch.
 */
export async function startWasmAssetServer({ assetDir, failWasm = false }) {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (path !== '/wasm/mio.wasm') {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
      return;
    }
    if (failWasm) {
      response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('injected WASM load failure');
      return;
    }
    try {
      const bytes = readFileSync(join(assetDir, 'mio.wasm'));
      response.writeHead(200, { 'content-type': 'application/wasm', 'content-length': bytes.byteLength });
      response.end(bytes);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(`asset read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('WASM asset server did not get a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}
