import { readdirSync, readFileSync } from 'node:fs';
const files = readdirSync('content/docs').filter(f => /\.mdx?$/u.test(f));
const routes = new Set(files.map(f => '/docs' + (f.startsWith('index.') ? '' : '/' + f.replace(/\.mdx?$/u, ''))));
let count = 0;
for (const file of files) { const text = readFileSync('content/docs/' + file, 'utf8'); for (const match of text.matchAll(/\]\(([^)]+)\)/gu)) { const url = match[1]; if (url.startsWith('/docs') && !routes.has(url.split('#')[0])) throw new Error(file + ': broken link ' + url); if (!url.startsWith('#') && !url.startsWith('/') && !/^https?:/u.test(url)) throw new Error(file + ': unresolved relative link ' + url); count++; } }
console.log(`Checked ${count} content links; external availability depends on core transfer and repository visibility.`);
