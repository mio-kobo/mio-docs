#!/usr/bin/env node
/**
 * Regenerate fixtures/docs/playground-expectations.json from the real WASM assets.
 *
 * Run this only after reviewing an intentional compiler or documentation change.
 * `npm run check:playground` never updates expectations; it fails on drift.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { collectDocsExamples } from './lib/docs-examples.mjs';
import { PlaygroundWorkerClient } from './lib/playground-worker.mjs';
import { startWasmAssetServer } from './lib/wasm-asset-server.mjs';

const root = process.cwd();
const assetDir = join(root, 'public/wasm');
const output = join(root, 'fixtures/docs/playground-expectations.json');
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function observable(result) {
  return {
    status: result.status,
    stdout: result.stdout,
    diagnostics: result.diagnostics,
    ...(result.error ? { error: result.error } : {}),
  };
}

const collection = collectDocsExamples(join(root, 'content/docs'));
const unique = new Map();
for (const example of collection.examples.filter(item => item.kind === 'executable')) {
  if (!unique.has(example.key)) unique.set(example.key, example);
}

const server = await startWasmAssetServer({ assetDir });
const client = new PlaygroundWorkerClient({ assetDir, origin: server.origin });
const examples = {};
try {
  await client.start();
  for (const example of unique.values()) {
    const checked = await client.execute('check', example.source);
    const ran = await client.execute('run', example.source);
    examples[example.key] = {
      preview: example.preview,
      check: observable(checked),
      run: observable(ran),
    };
  }
} finally {
  await client.terminate().catch(() => {});
  await server.close();
}

const fixture = {
  schemaVersion: 1,
  runtime: {
    wasmSha256: sha256(join(assetDir, 'mio.wasm')),
    wasmExecSha256: sha256(join(assetDir, 'wasm_exec.js')),
  },
  exampleCount: Object.keys(examples).length,
  examples: Object.fromEntries(Object.entries(examples).sort(([a], [b]) => a.localeCompare(b))),
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Wrote ${output}: ${fixture.exampleCount} unique executable examples, ${collection.examples.length} blocks total.`);
