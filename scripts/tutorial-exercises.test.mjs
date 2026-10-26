import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import {
  getNextTutorialLesson,
  getPreviousTutorialLesson,
  getTutorialExercise,
  TUTORIAL_LESSONS,
} from '../lib/tutorial-data.ts';
import {
  clearTutorialDraft,
  loadTutorialProgress,
  markTutorialExerciseComplete,
  saveTutorialDraft,
  setTutorialLastLesson,
  TUTORIAL_PROGRESS_STORAGE_KEY,
} from '../lib/tutorial-storage.ts';
import { passesTutorialValidation } from '../lib/tutorial-validation.ts';
import { PlaygroundWorkerClient } from './lib/playground-worker.mjs';
import { startWasmAssetServer } from './lib/wasm-asset-server.mjs';

const root = process.cwd();
const assetDir = join(root, 'public/wasm');

const SOLUTIONS = new Map([
  ['hello-world', 'chant("Hello, Mio!");\n'],
  ['variables', 'kaku count = 3;\nchant(count);\n'],
  ['numbers', 'kaku a = 6;\nkaku b = 7;\nchant(a * b);\n'],
  ['conditions', 'kaku score = 72;\nmoshi (score >= 60) {\n    chant("passed");\n} sore {\n    chant("failed");\n}\n'],
  ['functions', 'waza square(value: int64) -> int64 {\n    kaesu value * value;\n}\n\nchant(square(7));\n'],
]);

async function withWorker(run) {
  const server = await startWasmAssetServer({ assetDir });
  const client = new PlaygroundWorkerClient({ assetDir, origin: server.origin });
  try {
    return await run(client);
  } finally {
    await client.terminate().catch(() => {});
    await server.close();
  }
}

test('defines five stable lessons with executable starter code and real stdout expectations', () => {
  assert.equal(TUTORIAL_LESSONS.length, 5);
  const ids = new Set();
  const hrefs = new Set();
  for (const lesson of TUTORIAL_LESSONS) {
    assert.ok(!ids.has(lesson.id), `duplicate lesson id: ${lesson.id}`);
    ids.add(lesson.id);
    assert.ok(!hrefs.has(lesson.href), `duplicate lesson href: ${lesson.href}`);
    hrefs.add(lesson.href);
    assert.match(lesson.href, /^\/docs\/v2\.0\/tutorials\/[a-z0-9-]+$/u);
    assert.equal(lesson.exercise.lessonId, lesson.id);
    assert.ok(lesson.exercise.starterCode.length > 0);
    assert.ok(lesson.exercise.hints.length >= 2);
    assert.equal(lesson.exercise.validation.type, 'stdout');
    assert.ok(lesson.exercise.validation.expectedStdout.length > 0);
    assert.ok(SOLUTIONS.has(lesson.exercise.id), `missing test solution for ${lesson.exercise.id}`);
  }

  assert.equal(getTutorialExercise('variables')?.lesson.id, 'variables');
  assert.equal(getPreviousTutorialLesson('hello-world'), undefined);
  assert.equal(getPreviousTutorialLesson('variables')?.id, 'hello-world');
  assert.equal(getNextTutorialLesson('variables')?.id, 'numbers');
  assert.equal(getNextTutorialLesson('functions'), undefined);
});

test('normalizes line endings and final newlines without accepting changed content', () => {
  assert.equal(passesTutorialValidation({ type: 'stdout', expectedStdout: 'Hello, Mio!\n' }, 'Hello, Mio!'), true);
  assert.equal(passesTutorialValidation({ type: 'stdout', expectedStdout: 'a\nb\n' }, 'a\r\nb\r\n'), true);
  assert.equal(passesTutorialValidation({ type: 'stdout', expectedStdout: 'a\n\nb\n' }, 'a\n\nb\n\n'), true);
  assert.equal(passesTutorialValidation({ type: 'stdout', expectedStdout: 'a\nb\n' }, 'a\nb \n'), false);
  assert.equal(passesTutorialValidation({ type: 'stdout', expectedStdout: 'a\nb\n' }, 'a\nc\n'), false);
  assert.equal(passesTutorialValidation({ type: 'stdout', expectedStdout: '42\n' }, '42\n43\n'), false);
});

test('runs every starter as a real failing answer and every solution as a passing answer', async () => {
  await withWorker(async client => {
    await client.start();
    for (const lesson of TUTORIAL_LESSONS) {
      const starterCheck = await client.execute('check', lesson.exercise.starterCode);
      assert.equal(starterCheck.status, 'checked', `${lesson.id} starter must compile`);
      const starterRun = await client.execute('run', lesson.exercise.starterCode);
      assert.equal(starterRun.status, 'ok', `${lesson.id} starter must run`);
      assert.equal(
        passesTutorialValidation(lesson.exercise.validation, starterRun.stdout),
        false,
        `${lesson.id} starter must not pass the answer check`,
      );

      const solution = SOLUTIONS.get(lesson.exercise.id);
      const solvedRun = await client.execute('run', solution);
      assert.equal(solvedRun.status, 'ok', `${lesson.id} solution must run`);
      assert.equal(
        passesTutorialValidation(lesson.exercise.validation, solvedRun.stdout),
        true,
        `${lesson.id} solution stdout must match ${JSON.stringify(lesson.exercise.validation.expectedStdout)}, got ${JSON.stringify(solvedRun.stdout)}`,
      );
    }
  });
  console.log(`Validated ${TUTORIAL_LESSONS.length} tutorial starters and solutions with the real Mio WASM runtime.`);
});

test('reports a compile diagnostic and recovers for the next tutorial answer', async () => {
  await withWorker(async client => {
    await client.start();
    const broken = await client.execute('run', 'kaku answer = ;');
    assert.equal(broken.status, 'diagnostic');
    assert.ok(broken.diagnostics.length > 0);

    const recovered = await client.execute('run', SOLUTIONS.get('hello-world'));
    assert.equal(recovered.status, 'ok');
    assert.equal(recovered.stdout, 'Hello, Mio!\n');
  });
});

test('terminates a stopped execution and runs the tutorial again in a fresh Worker', async () => {
  await withWorker(async client => {
    await client.start();
    const pending = client.execute('run', 'kaku x = 0; aida (hai) { x = x + 1; }');
    const interrupted = assert.rejects(pending, error => error?.code === 'MIO_TERMINATED');
    await client.terminate();
    await interrupted;
  });

  await withWorker(async client => {
    await client.start();
    const result = await client.execute('run', SOLUTIONS.get('hello-world'));
    assert.equal(result.status, 'ok');
    assert.equal(result.stdout, 'Hello, Mio!\n');
  });
});

test('persists completed exercise ids, the last lesson, and drafts per exercise', () => {
  const values = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  try {
    assert.deepEqual(loadTutorialProgress(), { completedExerciseIds: [], lastLessonId: null, drafts: {} });

    markTutorialExerciseComplete('hello-world', 'hello-world');
    saveTutorialDraft('hello-world', 'chant("draft");\n');
    setTutorialLastLesson('variables');

    const restored = loadTutorialProgress();
    assert.deepEqual(restored.completedExerciseIds, ['hello-world']);
    assert.equal(restored.lastLessonId, 'variables');
    assert.equal(restored.drafts['hello-world'], 'chant("draft");\n');
    assert.ok(values.has(TUTORIAL_PROGRESS_STORAGE_KEY));

    markTutorialExerciseComplete('variables', 'variables');
    saveTutorialDraft('numbers', 'chant(42);\n');
    clearTutorialDraft('hello-world');
    const afterSecondLesson = loadTutorialProgress();
    assert.deepEqual(afterSecondLesson.completedExerciseIds, ['hello-world', 'variables']);
    assert.equal(afterSecondLesson.lastLessonId, 'variables');
    assert.equal(afterSecondLesson.drafts['hello-world'], undefined);
    assert.equal(afterSecondLesson.drafts['numbers'], 'chant(42);\n');

    values.set(TUTORIAL_PROGRESS_STORAGE_KEY, '{not json');
    assert.deepEqual(loadTutorialProgress(), { completedExerciseIds: [], lastLessonId: null, drafts: {} });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
