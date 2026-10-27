import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { defaultVersion } from '../lib/versions.mjs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
const root = 'content/docs';
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]); }
const files = walk(root);
function route(file) { const slug = relative(root, file).replace(/\.mdx?$/u, '').replace(/(?:^|\/)index$/u, ''); return '/docs' + (slug ? '/' + slug.replace(/\/$/u, '') : ''); }
const routes = new Set(['/', '/docs', '/download', '/download/2.0.0', '/releases/2.0.0', '/releases/2.0.0/migration', ...files.filter(f => /\.mdx?$/u.test(f)).map(route)]);
for (const path of [...routes]) {
  const alias = path.replace('/docs/' + defaultVersion, '/docs');
  if (path !== alias && /^\/docs\/(getting-started|learn|reference|kiso|tooling|internals)(?:\/|$)/u.test(alias)) routes.add(alias);
}
let count = 0;
const external = new Set();
const fragments = [];
function check(url, owner, base = '/docs') {
  if (/^https?:/u.test(url)) { external.add(url); count++; return; }
  if (!/^(?:\/|#)/u.test(url)) throw new Error(`${owner}: unresolved relative link ${url}`);
  const target = new URL(url, 'https://docs.invalid' + base);
  if (!routes.has(target.pathname.replace(/\/$/u, '') || '/')) throw new Error(`${owner}: broken route ${url}`);
  if (target.hash) fragments.push({ path: target.pathname.replace(/\/$/u, '') || '/', hash: decodeURIComponent(target.hash.slice(1)), owner });
  count++;
}
for (const file of files.filter(f => /\.mdx?$/u.test(f))) {
  const tree = unified().use(remarkParse).parse(readFileSync(file, 'utf8'));
  function visit(node) {
    if (node.type === 'link' || node.type === 'image') check(node.url, file, route(file));
    for (const child of node.children || []) visit(child);
  }
  visit(tree);
}
for (const file of files.filter(f => f.endsWith('meta.json'))) {
  const meta = JSON.parse(readFileSync(file, 'utf8'));
  for (const page of meta.pages ?? []) {
    const link = /^\[.*\]\((.*)\)$/u.exec(page);
    if (link) { check(link[1], file); continue; }
    if (page.startsWith('---') || page === '...') continue;
    const stem = join(dirname(file), page);
    if (!files.some(f => f === stem + '.mdx' || f === stem + '.md' || f === join(stem, 'index.mdx') || f === join(stem, 'index.md'))) throw new Error(`${file}: missing navigation entry ${page}`);
  }
}
for (const file of ['app/page.tsx', 'lib/navigation.tsx']) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:href=|url:\s*)["']([^"']+)["']/gu)) check(match[1], file, '/');
}
console.log(`Checked ${count} links and all navigation entries across ${routes.size} routes.`);
if (process.env.BASE_URL) {
  const html = new Map();
  for (const path of routes) {
    const response = await fetch(new URL(path, process.env.BASE_URL));
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const body = await response.text();
    if (!body.includes('<h1')) throw new Error(`${path}: missing page heading`);
    html.set(path, body);
  }
  for (const [path, body] of html) {
    for (const match of body.matchAll(/<a\b[^>]*?\bhref="([^"<>]+)"/gu)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (href.startsWith('/') || href.startsWith('#')) check(href, 'rendered ' + path, path);
    }
  }
  for (const {path, hash, owner} of fragments) {
    if (!html.get(path)?.includes(`id="${hash}"`)) throw new Error(`${owner}: missing anchor ${path}#${hash}`);
  }
  console.log(`HTTP 200, heading, rendered local links and anchors verified for ${routes.size} pages.`);
}
if (process.env.CHECK_EXTERNAL === '1') {
  const results = await Promise.allSettled([...external].map(async url => {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
  }));
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) throw new Error(failed.map(r => r.reason).join('\n'));
  console.log(`External availability verified for ${external.size} unique URLs.`);
}
