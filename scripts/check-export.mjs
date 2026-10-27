import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { defaultVersion } from '../lib/versions.mjs';

const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]);
const html = path => join('out', path, 'index.html');
const pages = walk('content/docs').filter(file => /\.mdx?$/u.test(file)).map(file => relative('content/docs',file).replace(/\.mdx?$/u,'').replace(/(?:^|\/)index$/u,''));
for (const path of ['', 'download', 'download/2.0.0', 'releases/2.0.0', 'releases/2.0.0/migration', 'docs', ...pages.map(p => `docs/${p}`)]) {
  assert.ok(existsSync(html(path)), `Missing exported page: ${path}`);
  const body = readFileSync(html(path),'utf8');
  assert.ok(body.includes('<h1'), `Missing heading: ${path}`);
  assert.ok(!body.includes('http://localhost:3211'), `Localhost metadata: ${path}`);
}
for (const slug of ['', ...pages]) {
  assert.ok(existsSync(html(`zh-CN/docs/${slug}`)), `Missing explicit Chinese alias: ${slug}`);
  if (slug.startsWith(defaultVersion + '/') && /^(getting-started|learn|reference|kiso|tooling|internals)(?:\/|$)/u.test(slug.slice(defaultVersion.length+1))) {
    assert.ok(existsSync(html(`docs/${slug.slice(defaultVersion.length+1)}`)), `Missing legacy alias: ${slug}`);
  }
}
for (const asset of ['mio.wasm','mio-worker.js','wasm_exec.js']) {
  const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(digest(`out/wasm/${asset}`), digest(`public/wasm/${asset}`), `WASM asset altered: ${asset}`);
}
assert.ok(existsSync('out/_next/static'));
assert.ok(existsSync('out/.nojekyll'));
assert.equal(readFileSync('out/CNAME','utf8').trim(),'mio.kaelexvp.cc');
assert.ok(readFileSync('out/404.html','utf8').includes('noindex'));
assert.ok(readFileSync('out/robots.txt','utf8').includes('/sitemap.xml'));
assert.ok(readFileSync('out/sitemap.xml','utf8').includes('https://mio.kaelexvp.cc/'));
const index = JSON.parse(readFileSync('out/api/search/index.json','utf8'));
assert.equal(index.type,'advanced');
assert.equal(index.i18n,true);
console.log(`Static export verified: ${pages.length} document pages, aliases, SEO, search database, _next and identical WASM assets.`);
