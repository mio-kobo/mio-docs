import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { collectDocsExamples } from './lib/docs-examples.mjs';
import { PlaygroundWorkerClient } from './lib/playground-worker.mjs';
import { startWasmAssetServer } from './lib/wasm-asset-server.mjs';

const root = process.cwd();
const assetDir = join(root, 'public/wasm');
const fixturePath = join(root, 'fixtures/docs/playground-expectations.json');
const collection = collectDocsExamples(join(root, 'content/docs'));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function observable(result) {
  return {
    status: result.status,
    stdout: result.stdout,
    diagnostics: result.diagnostics,
    ...(result.error ? { error: result.error } : {}),
  };
}

async function withWorker(run, options = {}) {
  const server = await startWasmAssetServer({ assetDir, failWasm: options.failWasm });
  const client = new PlaygroundWorkerClient({ assetDir, origin: server.origin });
  try {
    return await run({ server, client });
  } finally {
    await client.terminate().catch(() => {});
    await server.close();
  }
}

test('wraps the same production Worker and assets used by the site', () => {
  assert.equal(sha256(join(assetDir, 'mio.wasm')), fixture.runtime.wasmSha256,
    'mio.wasm changed. Run npm run update:playground and review the output diff.');
  assert.equal(sha256(join(assetDir, 'wasm_exec.js')), fixture.runtime.wasmExecSha256,
    'wasm_exec.js changed. Run npm run update:playground and review the output diff.');
});

test('collects every executable Mio example and validates its assertions', async () => {
  console.log('Mio blocks:', collection.counts);
  assert.equal(collection.counts.executable + collection.counts.excluded + collection.counts.test + collection.counts.unsupported + collection.counts.fragment, collection.counts.total);
  assert.ok(collection.counts.executable > 0);
  assert.equal(fixture.exampleCount, Object.keys(fixture.examples).length);
  assert.ok(fixture.exampleCount > 0);
  assert.ok(collection.counts.excluded > 0);
  assert.ok(collection.counts.unsupported > 0);
  assert.deepEqual(collection.duplicateOutputs, [], 'executable examples must not have a duplicate static output block immediately below them');

  const executableByFile = new Map();
  for (const example of collection.examples.filter(item => item.kind === 'executable')) {
    const list = executableByFile.get(example.file) ?? [];
    list.push(example);
    executableByFile.set(example.file, list);
  }
  const duplicateStaticOutputs = [];
  for (const output of collection.staticOutputs) {
    for (const example of executableByFile.get(output.file) ?? []) {
      const expected = fixture.examples[example.key]?.run;
      if (expected?.status === 'ok' && output.content.trimEnd() === expected.stdout.trimEnd()) {
        duplicateStaticOutputs.push(`${output.file}:${output.line} duplicates the Playground output at ${example.file}:${example.line}`);
      }
    }
  }
  assert.deepEqual(duplicateStaticOutputs, [], 'static output blocks must not repeat a Playground result');

  const missing = [];
  const mismatches = [];
  await withWorker(async ({ client }) => {
    await client.start();
    for (const example of collection.examples.filter(item => item.kind === 'executable')) {
      const expected = fixture.examples[example.key];
      const where = `${example.file}:${example.line}`;
      if (!expected) {
        missing.push(`${where} (${JSON.stringify(example.preview)}): no expectation; run npm run update:playground and review`);
        continue;
      }
      const checked = await client.execute('check', example.source);
      if (!isDeepStrictEqual(observable(checked), expected.check)) {
        mismatches.push(`${where} check\n  expected ${JSON.stringify(expected.check)}\n  actual   ${JSON.stringify(observable(checked))}\n  source   ${example.preview}`);
      }
      const ran = await client.execute('run', example.source);
      if (!isDeepStrictEqual(observable(ran), expected.run)) {
        mismatches.push(`${where} run\n  expected ${JSON.stringify(expected.run)}\n  actual   ${JSON.stringify(observable(ran))}\n  source   ${example.preview}`);
      }
    }
  });

  if (missing.length || mismatches.length) {
    assert.fail([...missing, ...mismatches].join('\n'));
  }
  console.log(`Validated ${collection.counts.executable} executable blocks (${Object.keys(fixture.examples).length} unique sources).`);
});

test('runs multiple examples sequentially and recovers after a diagnostic', async () => {
  await withWorker(async ({ client }) => {
    await client.start();
    const first = await client.execute('run', 'chant("first");');
    assert.equal(first.status, 'ok');
    assert.equal(first.stdout, 'first\n');

    const broken = await client.execute('run', 'kaku answer = ;');
    assert.equal(broken.status, 'diagnostic');
    assert.ok(broken.diagnostics.length > 0);

    const second = await client.execute('run', 'chant("second");');
    assert.equal(second.status, 'ok');
    assert.equal(second.stdout, 'second\n');
  });
});

test('times out by terminating the real Worker and starts a fresh one', async () => {
  await withWorker(async ({ client }) => {
    await client.start();
    await assert.rejects(
      client.execute('run', 'kaku x = 0; aida (hai) { x = x + 1; }', { timeoutMs: 20 }),
      error => error?.code === 'MIO_TIMEOUT',
    );
  });
  await withWorker(async ({ client }) => {
    await client.start();
    const result = await client.execute('run', 'chant("after timeout");');
    assert.equal(result.status, 'ok');
    assert.equal(result.stdout, 'after timeout\n');
  });
});

test('drops an interrupted request and recovers in a fresh Worker', async () => {
  await withWorker(async ({ client }) => {
    await client.start();
    const pending = client.execute('run', 'kaku x = 0; aida (hai) { x = x + 1; }');
    const interrupted = assert.rejects(pending, error => error?.code === 'MIO_TERMINATED');
    await client.terminate();
    await interrupted;
  });
  await withWorker(async ({ client }) => {
    await client.start();
    const result = await client.execute('run', 'chant("after interruption");');
    assert.equal(result.status, 'ok');
    assert.equal(result.stdout, 'after interruption\n');
  });
});

test('reports a real WASM load failure and then runs after recovery', async () => {
  await withWorker(async ({ client }) => {
    await assert.rejects(client.start(), /无法加载 mio\.wasm：HTTP 503/);
  }, { failWasm: true });
  await withWorker(async ({ client }) => {
    await client.start();
    const result = await client.execute('run', 'chant("after load failure");');
    assert.equal(result.status, 'ok');
    assert.equal(result.stdout, 'after load failure\n');
  });
});
