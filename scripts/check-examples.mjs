import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
const cli = process.env.MIO_CLI;
if (!cli) throw new Error('Set MIO_CLI to an existing Mio CLI path; optionally set MIO_BUNKO.');
const temp = mkdtempSync(join(tmpdir(), 'mio-docs-examples-'));
const version = process.env.DOCS_VERSION ?? 'v1.0';
if (!/^v[0-9]+\.[0-9]+(?:\.[0-9]+)?$/u.test(version)) throw new Error('Invalid DOCS_VERSION');
const base = `content/docs/${version}`;
const files = [base + '/getting-started.mdx', ...readdirSync(base + '/learn').filter(f => f.endsWith('.mdx')).map(f => base + '/learn/' + f)];
let count = 0;
let helloProgram;
const programs = new Map();
function execute(name, code, expected) {
  const path = join(temp, `example-${count++}.mio`);
  writeFileSync(path, code + '\n');
  for (const command of ['check', 'run']) {
    const result = spawnSync(resolve(cli), [command, path], { encoding: 'utf8', timeout: 30000 });
    if (result.error || result.status !== 0) throw new Error(`${name}: ${command} failed: ${result.error ?? result.stderr}`);
    if (command === 'run' && result.stdout.trimEnd() !== expected.trimEnd()) throw new Error(`${name}: output mismatch: ${JSON.stringify(result.stdout)} vs ${JSON.stringify(expected)}`);
  }
}
try {
  for (const file of files) {
    const nodes = unified().use(remarkParse).parse(readFileSync(file, 'utf8')).children;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type !== 'code' || node.lang !== 'mio') continue;
      // Test packages are executed with discovery/summary assertions by check-content-quality.py.
      if (node.meta?.includes('mode="test"')) continue;
      const next = nodes.slice(i + 1).find(n => n.type === 'code' && (n.lang === 'mio' || n.meta === 'title="output"'));
      if (!next || next.lang === 'mio') throw new Error(`${file}: Mio snippet must have an explicit output fence`);
      execute(file, node.value, next.value);
      programs.set(file, { code: node.value, output: next.value });
      // Getting Started now contains several independently verified programs;
      // the Hello build/exec/disasm check below always uses its first program.
      if (file === base + '/getting-started.mdx' && !helloProgram) helloProgram = { code: node.value, output: next.value };
    }
  }
  const home = JSON.parse(readFileSync('lib/home-example.json', 'utf8'));
  execute('homepage', home.code, home.output);
  const mainCount = count;
  const exercises = [
    ['variables', c => c.replace('count = 3', 'count = 5'), '6\n15'],
    ['control-flow', c => c.replace('score = 72', 'score = 59').replace('n <= 3', 'n <= 5'), 'failed\n15'],
    ['functions', c => c + '\nwaza double(value: int64) -> int64 { kaesu value * 2; }\nchant(double(square(3)));', '36\n7\n18'],
    ['collections', c => c.replace('alias[1] = 25', 'alias[0] = 40'), '20\n3\n41'],
    ['modules', c => c.replace('square(12.0)', 'square(5.0)'), '25\n5'],
  ];
  for (const [lesson, change, output] of exercises) execute('exercise: ' + lesson, change(programs.get(`${base}/learn/${lesson}.mdx`).code), output);
  const helloPath = join(temp, 'hello.mio');
  if (!helloProgram) throw new Error(base + '/getting-started.mdx: missing Hello program');
  writeFileSync(helloPath, helloProgram.code);
  for (const [command, file] of [['build', helloPath], ['exec', join(temp, 'hello.mochi')], ['disasm', join(temp, 'hello.mochi')]]) {
    const result = spawnSync(resolve(cli), [command, file], { encoding: 'utf8', timeout: 30000 });
    if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error ?? result.stderr}`);
    if (command === 'exec' && result.stdout.trimEnd() !== 'Hello, Mio!') throw new Error('Mochi exec stdout mismatch');
  }
  console.log(`Verified ${mainCount} complete Mio programs and ${exercises.length} exercises: type checking and exact stdout. Hello build/exec/disasm passed.`);
} finally { rmSync(temp, { recursive: true, force: true }); }
