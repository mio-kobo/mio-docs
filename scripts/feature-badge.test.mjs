import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { remarkFeatureBadge, remarkRestoreFeatureBadge, rehypeFeatureBadgeToc, rehypeRestoreFeatureBadge } from '../lib/feature-badge-mdx.mjs';
const require = createRequire(import.meta.url);
const mdxRequire = createRequire(require.resolve('fumadocs-mdx/package.json'));
const { evaluate } = mdxRequire('@mdx-js/mdx');
const { build } = mdxRequire('esbuild');
async function loadTs(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}
const { FeatureBadge } = await loadTs('components/feature-badge.tsx');
const { docsSchema } = await loadTs('lib/docs-schema.ts');
const options = await applyMdxPreset({
  rehypeCodeOptions: false,
  remarkImageOptions: false,
  remarkPlugins: defaults => [remarkFeatureBadge, ...defaults, remarkRestoreFeatureBadge],
  rehypePlugins: defaults => [rehypeFeatureBadgeToc, ...defaults, rehypeRestoreFeatureBadge],
})('bundler');
async function compile(text) { return evaluate(text, { ...options, ...runtime, baseUrl: import.meta.url }); }
const render = element => renderToStaticMarkup(element);

test('frontmatter and existing value/compact callers preserve all four states', () => {
  for (const [value, label] of Object.entries({ new: 'NEW', updated: 'UPDATED', experimental: 'BETA', deprecated: 'DEPRECATED' })) {
    assert.equal(docsSchema.parse({ title: 'Title', featureBadge: value }).featureBadge, value);
    assert.match(render(createElement(FeatureBadge, { value, compact: true })), new RegExp(`feature-badge-compact.*${label}`));
  }
  assert.throws(() => docsSchema.parse({ title: 'Title', featureBadge: 'beta' }));
  assert.equal(render(createElement(FeatureBadge, {})), '');
});

test('MDX renders four states, independent badges, paragraphs and optional since without imports', async () => {
  const doc = await compile('<FeatureBadge status="new" since="2.1" />\n\nText <FeatureBadge status="updated" />\n\n<FeatureBadge status="experimental" />\n\n<FeatureBadge status="deprecated" />');
  const html = render(createElement(doc.default, { components: { FeatureBadge } }));
  for (const label of ['NEW', 'UPDATED', 'BETA', 'DEPRECATED', 'feature-badge-since">2.1']) assert.ok(html.includes(label), label);
  assert.equal((html.match(/feature-badge-since/g) || []).length, 1);
});

test('H2/H3 anchors and TOC match unbadged headings, including repeated and explicit IDs', async () => {
  const plain = '## 新增标准库\n\n### `trim_space`\n\n### 重复\n\n### 重复\n\n### 自定义 [#stable]';
  const decorated = plain.replace(/^(#{2,3} .+)$/gm, '$1 <FeatureBadge status="new" since="2.1" />');
  const [before, after] = await Promise.all([compile(plain), compile(decorated)]);
  assert.deepEqual(after.toc.map(x => x.url), before.toc.map(x => x.url));
  assert.deepEqual(after.toc.map(x => render(x.title).trim()), before.toc.map(x => render(x.title).trim()));
  const html = render(createElement(after.default, { components: { FeatureBadge } }));
  assert.equal((html.match(/class="feature-badge /g) || []).length, 5);
  assert.ok(!html.includes('[#stable]'));
  assert.ok(!JSON.stringify(after.structuredData).includes('FeatureBadge'));
  assert.match(html, /<h2 id="新增标准库">/);
  assert.match(html, /<h3 id="trim_space">/);
});

test('bad MDX statuses and unsupported attributes fail compilation with source position', async () => {
  for (const input of ['status="beta"', 'status="NEW"', 'status={"new"}', 'since="2.1"', 'status="new" since={2.1}', 'status="new" {...props}', 'status="new" status="updated"']) {
    await assert.rejects(compile(`<FeatureBadge ${input} />`), /FeatureBadge/);
  }
  await assert.rejects(compile('<FeatureBadge status="new">NEW</FeatureBadge>'), /must be empty/);
  assert.throws(() => render(createElement(FeatureBadge, { status: 'invalid' })), /Invalid FeatureBadge status/);
});

test('unbadged MDX keeps tables, code, callouts and heading output', async () => {
  const text = '## Existing\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst n = 1;\n```\n\n<Callout>Info</Callout>';
  const doc = await compile(text);
  const html = render(createElement(doc.default, { components: { Callout: 'aside' } }));
  for (const expected of ['id="existing"', '<table>', '<pre>', '<aside>Info</aside>']) assert.ok(html.includes(expected), expected);
  assert.ok(!html.includes('feature-badge'));
});

test('all V2.1 documents compile; V2.0 content never opts into the new component', async () => {
  function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(`${dir}/${e.name}`) : e.name.endsWith('.mdx') ? [`${dir}/${e.name}`] : []); }
  for (const file of files('content/docs/v2.1')) {
    const text = readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
    const doc = await compile(text);
    if (text.includes('<FeatureBadge')) {
      const plain = await compile(text.replace(/<FeatureBadge\b[^>]*\/>/g, ''));
      assert.deepEqual(doc.toc.map(x => x.url), plain.toc.map(x => x.url), file);
      assert.deepEqual(doc.toc.map(x => render(x.title).trim()), plain.toc.map(x => render(x.title).trim()), file);
    }
  }
  for (const file of files('content/docs/v2.0')) assert.ok(!readFileSync(file, 'utf8').includes('<FeatureBadge'), file);
});

const { PlatformBadge } = await loadTs('components/platform-badge.tsx');
const { PlatformSupport } = await loadTs('components/platform-support.tsx');
const { summarizeSupport } = await loadTs('lib/platform-support.ts');
const platformComponents = { FeatureBadge, PlatformBadge, PlatformSupport };
const exampleSystems = { macos: { arm64: 'full' }, windows: { x86_64: { status: 'partial', note: 'fixture restriction' } }, linux: { arm64: 'unknown', x86_64: 'full' } };

test('platform frontmatter is optional, strictly validated, and retains architecture evidence', () => {
  assert.deepEqual(docsSchema.parse({ title: 'Old' }), { title: 'Old' });
  assert.deepEqual(docsSchema.parse({ title: 'New', platforms: { systems: exampleSystems } }).platforms.systems, exampleSystems);
  for (const platforms of [
    { systems: { android: { arm64: 'full' } } },
    { systems: { linux: { arm: 'full' } } },
    { systems: { linux: { arm64: 'yes' } } },
    { systems: { linux: { arm64: { status: 'partial', reason: 'typo' } } } },
    { showArch: 'false', systems: {} }, { systems: null }, { system: {} },
  ]) assert.throws(() => docsSchema.parse({ title: 'Invalid', platforms }), /platforms/);
});

test('separate platforms, showArch and optional systems render deterministic accessible badges', () => {
  const hidden = render(createElement(PlatformSupport, { systems: exampleSystems }));
  assert.equal((hidden.match(/<button /g) || []).length, 3);
  assert.equal((hidden.match(/<svg /g) || []).length, 3);
  for (const label of ['macOS：未验证', 'Windows：未验证', 'Linux：未验证', 'fixture restriction', 'aria-describedby=', 'role="tooltip"']) assert.ok(hidden.includes(label), label);
  assert.ok(!hidden.includes('<span>arm64</span>'));
  assert.ok(hidden.includes('未配置，未验证'));
  assert.ok(render(createElement(PlatformSupport, {systems: {linux: {arm64: 'full', x86_64: 'full'}}})).includes('Linux：完整支持'));
  const shown = render(createElement(PlatformSupport, { systems: exampleSystems, showArch: true }));
  assert.equal((shown.match(/<button /g) || []).length, 4);
  assert.ok(shown.includes('Linux arm64：未验证'));
  assert.ok(shown.includes('Linux x86_64：完整支持'));
  for (const system of ['macos', 'windows', 'linux']) {
    const html = render(createElement(PlatformSupport, { systems: { [system]: { arm64: 'full' } } }));
    assert.equal((html.match(/<button /g) || []).length, 1);
  }
  assert.equal(render(createElement(PlatformSupport, { systems: { linux: {} } })), '');
  assert.equal(render(createElement(PlatformSupport, { systems: {} })), '');
});

test('architecture summary never upgrades mixed or unknown evidence to full', () => {
  assert.equal(summarizeSupport([]), 'unknown');
  assert.equal(summarizeSupport(['full', 'full']), 'full');
  assert.equal(summarizeSupport(['unsupported', 'unsupported']), 'unsupported');
  assert.equal(summarizeSupport(['full', 'unsupported']), 'partial');
  assert.equal(summarizeSupport(['full', 'partial']), 'partial');
  assert.equal(summarizeSupport(['full', 'unknown']), 'unknown');
});

test('platform MDX in body and H2/H3 preserves anchors, explicit IDs, TOC and search text', async () => {
  const badge = '<PlatformBadge system="windows" status="partial" note="fixture restriction" />';
  const support = '<PlatformSupport showArch={true} systems={{linux: {arm64: "unknown", x86_64: "full"}}} />';
  const plain = '## 标题\n\n### `api`\n\n### 重复\n\n### 重复\n\n### 固定 [#fixed]';
  const decorated = plain.replace(/^(#{2,3} .+)$/gm, `$1 <FeatureBadge status="updated" /> ${badge} ${support}`);
  const [before, after] = await Promise.all([compile(plain), compile(decorated)]);
  assert.deepEqual(after.toc.map(x => x.url), before.toc.map(x => x.url));
  assert.deepEqual(after.toc.map(x => render(x.title).trim()), before.toc.map(x => render(x.title).trim()));
  assert.deepEqual(after.structuredData, before.structuredData);
  const html = render(createElement(after.default, { components: platformComponents }));
  assert.equal((html.match(/<button /g) || []).length, 15);
  assert.ok(html.includes('id="fixed"'));
  const body = await compile(`Text ${badge}\n\n${support}`);
  const bodyHtml = render(createElement(body.default, { components: platformComponents }));
  assert.equal((bodyHtml.match(/<button /g) || []).length, 3);
  for (const unwanted of ['fixture restriction', 'unknown', 'PlatformSupport', 'PlatformBadge']) assert.ok(!JSON.stringify(body.structuredData).includes(unwanted));
});

test('invalid platform JSX fails MDX compilation instead of reaching production', async () => {
  for (const jsx of [
    '<PlatformBadge system="android" status="full" />',
    '<PlatformBadge system="linux" arch="arm" status="full" />',
    '<PlatformBadge system="linux" status="yes" />',
    '<PlatformBadge system="linux" status={getStatus()} />',
    '<PlatformBadge system="linux" status="full" {...props} />',
    '<PlatformBadge system="linux" status="full" status="unknown" />',
    '<PlatformBadge system="linux" status="full">text</PlatformBadge>',
    '<PlatformSupport systems={{linux: {arm64: "bad"}}} />',
    '<PlatformSupport systems={{linux: {arm: "full"}}} />',
    '<PlatformSupport systems={{android: {arm64: "full"}}} />',
    '<PlatformSupport showArch="false" systems={{}} />',
    '<PlatformSupport systems={{...systems}} />',
    '<PlatformSupport systems={systems} />',
  ]) await assert.rejects(compile(jsx), /Platform/);
});
