import { defineConfig } from 'fumadocs-mdx/config';
import mio from './syntaxes/mio.tmLanguage.json';
import { shouldAttachPlayground } from './lib/mio-example-policy.mjs';

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
