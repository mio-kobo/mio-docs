import { isFeatureBadge } from './feature-badge.ts';
import { platformBadgeSchema, platformSupportSchema } from './platform-support-schema.ts';

const trailingBadges = Symbol('featureBadgeTrailing');
const isBadge = node => ['mdxJsxTextElement', 'mdxJsxFlowElement'].includes(node.type) && ['FeatureBadge', 'PlatformBadge', 'PlatformSupport'].includes(node.name);
function walk(node, visit) {
  visit(node);
  node.children?.forEach(child => walk(child, visit));
}

/** Validate author-facing MDX at build time; MDX itself does not typecheck JSX. */
export function remarkFeatureBadge() {
  return (tree, file) => {
    walk(tree, node => {
      if (isBadge(node) && node.name !== 'FeatureBadge') {
        const props = Object.create(null);
        for (const attr of node.attributes) {
          if (attr.type !== 'mdxJsxAttribute' || Object.hasOwn(props, attr.name)) file.fail(`${node.name}: no spreads or duplicate attributes`, node);
          try {
            props[attr.name] = typeof attr.value === 'string' ? attr.value : attr.value === null ? true : literalValue(attr.value.data?.estree?.body?.[0]?.expression);
          } catch { file.fail(`${node.name}: attributes must be static literals or plain objects`, node); }
        }
        const result = (node.name === 'PlatformBadge' ? platformBadgeSchema : platformSupportSchema).safeParse(props);
        if (!result.success) file.fail(`${node.name}: ${result.error.message}`, node);
        if (node.children.length) file.fail(`${node.name} must be empty`, node);
      }
      if (node.name === 'FeatureBadge' && isBadge(node)) {
        const attrs = node.attributes;
        const status = attrs.filter(attr => attr.name === 'status');
        if (status.length !== 1 || !isFeatureBadge(status[0].value)) {
          file.fail('FeatureBadge status must be a literal: new, updated, experimental, or deprecated', node);
        }
        if (attrs.some(attr => attr.type !== 'mdxJsxAttribute' || !['status', 'since'].includes(attr.name))) {
          file.fail('FeatureBadge accepts only status and optional since attributes (no spreads)', node);
        }
        const since = attrs.filter(attr => attr.name === 'since');
        if (since.length > 1 || since.some(attr => typeof attr.value !== 'string')) {
          file.fail('FeatureBadge since must be a string literal', node);
        }
        if (node.children.length) file.fail('FeatureBadge must be empty; use <FeatureBadge status="new" />', node);
      }
    });
    walk(tree, node => {
      // Temporarily detach trailing badges so Fumadocs sees exactly the same
      // heading text (including explicit IDs) as before a badge was added.
      if (node.type === 'heading' && node.children.some(isBadge)) {
        const suffix = [];
        while (node.children.length) {
          const child = node.children.at(-1);
          if (isBadge(child)) { suffix.unshift(node.children.pop()); continue; }
          if (child.type === 'text') {
            child.value = child.value.trimEnd();
            if (!child.value) { node.children.pop(); continue; }
          }
          break;
        }
        if (suffix.length) node[trailingBadges] = suffix;
      }
    });
  };
}

export function remarkRestoreFeatureBadge() {
  return tree => walk(tree, node => {
    if (!node[trailingBadges]) return;
    node.children.push(...node[trailingBadges]);
    delete node[trailingBadges];
  });
}

const originalChildren = Symbol('featureBadgeHeadingChildren');
function withoutBadges(node) {
  if (!node.children) return node;
  return { ...node, children: node.children.filter(child => !isBadge(child)).map(withoutBadges) };
}

/** Hide badges only while Fumadocs copies heading content into the TOC export. */
export function rehypeFeatureBadgeToc() {
  return tree => walk(tree, node => {
    if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) return;
    let hasBadge = false;
    walk(node, child => { if (isBadge(child)) hasBadge = true; });
    if (!hasBadge) return;
    node[originalChildren] = node.children;
    node.children = withoutBadges(node).children;
  });
}

export function rehypeRestoreFeatureBadge() {
  return tree => walk(tree, node => {
    if (!node[originalChildren]) return;
    node.children = node[originalChildren];
    delete node[originalChildren];
  });
}

/** Read only JSON-like ESTree values; never execute authored JavaScript. */
function literalValue(node) {
  if (node?.type === 'Literal' && ['string', 'boolean'].includes(typeof node.value)) return node.value;
  if (node?.type === 'ObjectExpression') {
    const value = Object.create(null);
    for (const prop of node.properties) {
      if (prop.type !== 'Property' || prop.computed || prop.method || prop.shorthand || prop.kind !== 'init') throw new Error('Not static');
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
      if (typeof key !== 'string' || Object.hasOwn(value, key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid key');
      value[key] = literalValue(prop.value);
    }
    return value;
  }
  throw new Error('Not static');
}
