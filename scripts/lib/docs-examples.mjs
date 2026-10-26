import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { classifyMioSource } from '../../lib/mio-example-policy.mjs';

/** Normalize only line endings and trailing whitespace; keep Mio source inside blocks untouched. */
export function normalizeExampleSource(source) {
  return source.replace(/\r\n?/gu, '\n').trimEnd();
}

export function exampleKey(source) {
  return createHash('sha256').update(normalizeExampleSource(source)).digest('hex');
}

function markdownFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(root, path);
    return /\.mdx?$/u.test(entry.name) ? [relative(root, path)] : [];
  }).sort();
}

function hasOutputMeta(meta) {
  return /(?:^|\s)(?:title\s*=\s*["'][^"']*output[^"']*["']|output)(?=\s|$)/iu.test(meta ?? '');
}

/**
 * Collect every Mio fenced block and classify it. The returned executable list is
 * the exact corpus that the browser build attaches a Playground to.
 */
export function collectDocsExamples(root = 'content/docs') {
  const examples = [];
  const staticOutputs = [];
  const duplicateOutputs = [];
  for (const file of markdownFiles(root)) {
    const absolute = join(root, file);
    const tree = unified().use(remarkParse).parse(readFileSync(absolute, 'utf8'));

    const walk = (node, parent = null) => {
      if (Array.isArray(node.children)) {
        for (let index = 0; index < node.children.length; index++) {
          const child = node.children[index];
          if (child.type === 'code' && hasOutputMeta(child.meta)) {
            staticOutputs.push({
              file,
              line: child.position?.start.line ?? 0,
              content: child.value,
              meta: child.meta ?? '',
            });
          }
          if (child.type === 'code' && child.lang?.toLowerCase() === 'mio') {
            const source = child.value;
            const meta = child.meta ?? '';
            const kind = classifyMioSource(source, meta);
            const item = {
              file,
              line: child.position?.start.line ?? 0,
              source,
              meta,
              kind,
              key: exampleKey(source),
              preview: source.trim().split(/\r?\n/u)[0]?.slice(0, 160) ?? '',
            };
            examples.push(item);
            if (kind === 'executable') {
              const next = node.children[index + 1];
              if (next?.type === 'code' && hasOutputMeta(next.meta)) {
                duplicateOutputs.push({
                  file,
                  line: child.position?.start.line ?? 0,
                  outputLine: next.position?.start.line ?? 0,
                  preview: item.preview,
                });
              }
            }
          }
          walk(child, node);
        }
      }
    };
    walk(tree);
  }

  const counts = { total: examples.length, executable: 0, excluded: 0, test: 0, unsupported: 0, fragment: 0 };
  for (const example of examples) counts[example.kind]++;
  return { examples, counts, staticOutputs, duplicateOutputs };
}
