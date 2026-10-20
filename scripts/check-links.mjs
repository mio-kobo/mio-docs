import { readdirSync, readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
const files = readdirSync('content/docs').filter(f => /\.mdx?$/u.test(f));
const routes = new Set(files.map(f => '/docs' + (f.startsWith('index.') ? '' : '/' + f.replace(/\.mdx?$/u, ''))));
let count = 0;
for (const file of files) {
  const tree = unified().use(remarkParse).parse(readFileSync('content/docs/' + file, 'utf8'));
  function visit(node) {
    if (node.type === 'link' || node.type === 'image') {
      const url = node.url;
      if (url.startsWith('/docs') && !routes.has(url.split('#')[0])) throw new Error(file + ': broken link ' + url);
      if (!/^(?:https?:|\/|#)/u.test(url)) throw new Error(file + ': unresolved relative link ' + url);
      count++;
    }
    for (const child of node.children || []) visit(child);
  }
  visit(tree);
}
console.log(`Checked ${count} Markdown links; code blocks and inline code remain literal. External availability depends on transfer and visibility.`);
