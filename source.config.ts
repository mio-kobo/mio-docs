import { defineConfig } from 'fumadocs-mdx/config';
import mio from './syntaxes/mio.tmLanguage.json';

const supportedBunkoPackages = new Set(['kiso/math', 'kiso/array', 'kiso/string', 'kiso/bytes', 'kiso/utf8']);
const importPattern = /(?:^|\n)\s*yobu\s+"([^"]+)"\s*;/g;

function rawMeta(meta: Record<string, unknown> | undefined): string {
  return typeof meta?.__raw === 'string' ? meta.__raw : '';
}

function isExcluded(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return false;
  if ('no-run' in meta || 'no-playground' in meta) return true;
  const raw = rawMeta(meta);
  if (/(?:^|\s)(?:no-run|no-playground)(?=\s|=|$)/u.test(raw)) return true;
  // Test-mode files need the CLI test runner, which is not part of the two
  // browser operations (run/check).
  return /(?:^|\s)mode\s*=\s*["']?test(?:["']|\s|$)/iu.test(raw);
}

/** Skip imports outside the closed Bunko filesystem embedded in mio.wasm. */
function hasSupportedImports(source: string): boolean {
  for (const match of source.matchAll(importPattern)) {
    if (!supportedBunkoPackages.has(match[1])) return false;
  }
  return true;
}

/** Imports and comments alone do not form a useful standalone Playground. */
function hasExecutableSource(source: string): boolean {
  const executable = source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/[^\n]*/gu, '')
    .replace(importPattern, '')
    .replace(/\s+/gu, '');
  return executable.length > 0;
}

function shouldAttachPlayground(source: string, meta: Record<string, unknown> | undefined): boolean {
  if (!source.trim() || isExcluded(meta)) return false;
  return hasSupportedImports(source) && hasExecutableSource(source);
}

/**
 * Runs inside Fumadocs' build-time rehype pipeline. `this.source` is the raw
 * fenced source, before Shiki turns it into spans, so the interactive editor
 * never needs to reconstruct code from highlighted DOM.
 */
const mioPlaygroundTransformer = {
  name: 'mio-playground-source',
  pre(this: { options: { lang?: string; meta?: Record<string, unknown> }; source: string }, node: { properties: Record<string, unknown> }) {
    if (this.options.lang?.toLowerCase() !== 'mio') return;
    if (!shouldAttachPlayground(this.source, this.options.meta)) return;
    node.properties['data-mio-source'] = this.source;
  },
};

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
      langs: [{ ...mio, name: 'mio', aliases: ['Mio'] }],
      transformers: [mioPlaygroundTransformer],
    },
  },
});
