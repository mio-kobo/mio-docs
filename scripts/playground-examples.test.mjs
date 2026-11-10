import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { collectDocsExamples } from './lib/docs-examples.mjs';
import { PlaygroundWorkerClient } from './lib/playground-worker.mjs';
import { bunkoCases, deniedModules } from '../fixtures/docs/playground-v2.1-bunko.mjs';
import { hasSupportedImports, V21_BUNKO_PACKAGES } from '../lib/mio-example-policy.mjs';
import { playgroundAssetPath, playgroundVersion } from '../lib/mio-playground-version.mjs';
import { startWasmAssetServer } from './lib/wasm-asset-server.mjs';

const root = process.cwd();
const assetDir = join(root, 'public/wasm');
const fixturePath = join(root, 'fixtures/docs/playground-expectations.json');
const collection = collectDocsExamples(join(root, 'content/docs'));
const v21Dir = join(assetDir, 'v2.1');
const v21Manifest = JSON.parse(readFileSync(join(v21Dir, 'manifest.json'), 'utf8'));
const v21Fixture = JSON.parse(readFileSync(join(root, 'fixtures/docs/playground-v2.1-expectations.json'), 'utf8'));
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

async function withWorker(run, { version = 'legacy', failWasm } = {}) {
  const assets = { assetDir: version === 'v2.1' ? v21Dir : assetDir, version };
  const server = await startWasmAssetServer({ ...assets, failWasm });
  const client = new PlaygroundWorkerClient({ ...assets, origin: server.origin });
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

function expectation(example) {
  return (example.version === 'v2.1' ? v21Fixture.examples[example.key] : undefined)
    ?? fixture.examples[example.key];
}

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
      const expected = expectation(example)?.run;
      if (expected?.status === 'ok' && output.content.trimEnd() === expected.stdout.trimEnd()) {
        duplicateStaticOutputs.push(`${output.file}:${output.line} duplicates the Playground output at ${example.file}:${example.line}`);
      }
    }
  }
  assert.deepEqual(duplicateStaticOutputs, [], 'static output blocks must not repeat a Playground result');

  const missing = [];
  const mismatches = [];
  for (const version of ['legacy', 'v2.1']) {
    const blocks = collection.examples.filter(item => item.kind === 'executable' && item.version === version);
    assert.ok(blocks.length > 0, version);
    await withWorker(async ({ client }) => {
      await client.start();
      for (const example of blocks) {
        const expected = expectation(example);
        const where = `${example.file}:${example.line} (${version})`;
        if (!expected) {
          missing.push(`${where} (${JSON.stringify(example.preview)}): no expectation; update and review the ${version} fixture`);
          continue;
        }
        for (const operation of ['check', 'run']) {
          const actual = observable(await client.execute(operation, example.source));
          if (!isDeepStrictEqual(actual, expected[operation])) {
            mismatches.push(`${where} ${operation}\n  expected ${JSON.stringify(expected[operation])}\n  actual   ${JSON.stringify(actual)}\n  source   ${example.preview}`);
          }
        }
      }
    }, { version });
    console.log(`Validated ${blocks.length} ${version} executable blocks (${new Set(blocks.map(item => item.key)).size} unique sources).`);
  }

  if (missing.length || mismatches.length) {
    assert.fail([...missing, ...mismatches].join('\n'));
  }
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

test('V2.1.2 uses the V2.1.0 Worker for checks, runs and diagnostics', async () => {
  const version = playgroundVersion('v2.1.2');
  assert.equal(version, playgroundVersion('v2.1'));
  assert.equal(playgroundAssetPath(version), '/wasm/v2.1');
  for (const docVersion of ['v1.0', 'v2.0', undefined]) {
    assert.equal(playgroundAssetPath(playgroundVersion(docVersion)), '/wasm');
  }
  await withWorker(async ({ client }) => {
    await client.start();
    const source = 'kaku value = 42; chant(value);';
    assert.equal((await client.execute('check', source)).status, 'checked');
    assert.equal((await client.execute('run', source)).stdout, '42\n');
    const bad = await client.execute('check', 'kaku value: int64 = "Mio";');
    assert.equal(bad.status, 'diagnostic');
    assert.match(bad.diagnostics[0], /E0301/);
  }, { version });
});

test('V2.1 runtime hashes match the release build manifest', () => {
  assert.equal(v21Manifest.version, 'v2.1.0');
  assert.equal(v21Manifest.source, '74e461b2985886160a285c7104d2a41090d0f548');
  for (const file of ['mio.wasm', 'wasm_exec.js', 'mio-worker.js']) {
    assert.equal(sha256(join(v21Dir, file)), v21Manifest.files[file], file);
  }
  assert.notEqual(v21Manifest.files['mio.wasm'], fixture.runtime.wasmSha256);
});

test('V2.1 Bunko browser allowlist matches the verified runtime', async t => {
  assert.deepEqual([...V21_BUNKO_PACKAGES].sort(), Object.keys(bunkoCases).sort());
  await withWorker(async ({ client }) => {
    await client.start();
    for (const [pkg, probe] of Object.entries(bunkoCases)) {
      await t.test(pkg, async () => {
        const prefix = `yobu "${pkg}";\n${probe.imports ?? ''}\n`;
        assert.equal((await client.execute('check', prefix + probe.source)).status, 'checked');
        assert.deepEqual(observable(await client.execute('run', prefix + probe.source)), {
          status: 'ok', stdout: probe.stdout, diagnostics: [],
        });
        if (probe.invalid) {
          const result = await client.execute('run', prefix + probe.invalid);
          assert.equal(result.status, 'error');
          assert.match(result.error, probe.error);
        }
      });
    }
    for (const pkg of deniedModules) {
      await t.test(`denies ${pkg}`, async () => {
        const source = `chant("must not run"); yobu "${pkg}";`;
        assert.equal(hasSupportedImports(source, 'v2.1'), false);
        const result = await client.execute('run', `yobu "${pkg}";\nchant("must not run");`);
        assert.equal(result.status, 'diagnostic');
        assert.equal(result.stdout, '');
        assert.match(result.diagnostics[0], /bunko|package|包/i);
      });
    }
  }, { version: 'v2.1' });
});

test('V2.1 bridge preserves diagnostics, partial output, limits and recovery', async () => {
  await withWorker(async ({ client }) => {
    await client.start();
    const badType = await client.execute('check', 'kaku value: int64 = "Mio";');
    assert.equal(badType.status, 'diagnostic');
    assert.match(badType.diagnostics[0], /E0301/);
    const divide = await client.execute('run', 'waza div(a:int64,b:int64)->int64 { kaesu a/b; } chant("before"); chant(div(1,0));');
    assert.equal(divide.status, 'error');
    assert.equal(divide.stdout, 'before\n');
    assert.match(divide.diagnostics[0], /E0501/);
    const budget = await client.execute('run', 'kaku x = 0; aida (hai) { x = x + 1; }');
    assert.equal(budget.status, 'error');
    assert.match(budget.error, /instruction limit/i);
    const output = await client.execute('run', 'kaku i=0; aida (i<4000) { chant("' + 'x'.repeat(300) + '"); i=i+1; }');
    assert.equal(output.status, 'error');
    assert.match(output.error, /output limit/i);
    assert.ok(output.stdout.endsWith('…（已截断）'));
    assert.ok(output.stdout.length <= 64 * 1024);
    assert.equal((await client.execute('run', 'chant("after errors");')).stdout, 'after errors\n');
    await assert.rejects(client.execute('check', '界'.repeat(22_000)), /64 KiB/);
  }, { version: 'v2.1' });
});

test('V2.1 load failure does not fall back to the legacy runtime', async () => {
  await withWorker(async ({ client }) => {
    await assert.rejects(client.start(), /HTTP 503/);
  }, { version: 'v2.1', failWasm: true });
});

test('V2.1 timeout and termination allow a fresh Worker', async () => {
  const loop = 'kaku x = 0; aida (hai) { x = x + 1; }';
  const version = 'v2.1';
  await withWorker(async ({ client }) => {
    await client.start();
    await assert.rejects(client.execute('run', loop, { timeoutMs: 20 }), { code: 'MIO_TIMEOUT' });
  }, { version });
  await withWorker(async ({ client }) => {
    await client.start();
    const cancelled = assert.rejects(client.execute('run', loop), { code: 'MIO_TERMINATED' });
    await client.terminate();
    await cancelled;
  }, { version });
  await withWorker(async ({ client }) => {
    await client.start();
    assert.equal((await client.execute('run', 'chant("fresh");')).stdout, 'fresh\n');
  }, { version });
});
