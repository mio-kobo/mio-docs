import { isFeatureBadge } from './feature-badge.ts';

const trailingBadges = Symbol('featureBadgeTrailing');
const isBadge = node => ['mdxJsxTextElement', 'mdxJsxFlowElement'].includes(node.type) && node.name === 'FeatureBadge';
function walk(node, visit) {
  visit(node);
  node.children?.forEach(child => walk(child, visit));
}

/** Validate author-facing MDX at build time; MDX itself does not typecheck JSX. */
export function remarkFeatureBadge() {
  return (tree, file) => {
    walk(tree, node => {
      if (isBadge(node)) {
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
