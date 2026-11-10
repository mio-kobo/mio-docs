import { defineConfig } from 'fumadocs-mdx/config';
import { remarkFeatureBadge, remarkRestoreFeatureBadge, rehypeFeatureBadgeToc, rehypeRestoreFeatureBadge } from './lib/feature-badge-mdx.mjs';
import mio from './syntaxes/mio.tmLanguage.json';
import { isPlaygroundCandidate } from './lib/mio-example-policy.mjs';

/**
 * Runs inside Fumadocs' build-time rehype pipeline. `this.source` is the raw
 * fenced source, before Shiki turns it into spans, so the interactive editor
 * never needs to reconstruct code from highlighted DOM.
 */
const mioPlaygroundTransformer = {
  name: 'mio-playground-source',
  pre(this: { options: { lang?: string; meta?: Record<string, unknown> }; source: string }, node: { properties: Record<string, unknown> }) {
    if (this.options.lang?.toLowerCase() !== 'mio') return;
    if (!isPlaygroundCandidate(this.source, this.options.meta)) return;
    node.properties['data-mio-source'] = this.source;
  },
};

/**
 * Mermaid fences stay ordinary MDX fences. A tiny grammar keeps Shiki from
 * throwing on the language name, while the raw fence source is forwarded to
 * the client component that replaces the block with a rendered SVG.
 */
const mermaidLanguage = {
  name: 'mermaid',
  scopeName: 'source.mermaid',
  patterns: [],
  repository: {},
};

const mermaidSourceTransformer = {
  name: 'bunko-mermaid-source',
  pre(this: { options: { lang?: string }; source: string }, node: { properties: Record<string, unknown> }) {
    if (this.options.lang?.toLowerCase() !== 'mermaid') return;
    node.properties['data-mermaid-source'] = this.source;
  },
};

export default defineConfig({
  mdxOptions: {
    remarkPlugins: defaults => [remarkFeatureBadge, ...defaults, remarkRestoreFeatureBadge],
    rehypePlugins: defaults => [rehypeFeatureBadgeToc, ...defaults, rehypeRestoreFeatureBadge],
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
      langs: [{ ...mio, name: 'mio', aliases: ['Mio'] }, mermaidLanguage],
      transformers: [mioPlaygroundTransformer, mermaidSourceTransformer],
    },
  },
});
