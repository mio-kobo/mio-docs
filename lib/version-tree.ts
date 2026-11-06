import { createElement } from 'react';
import { FeatureBadge } from '@/components/feature-badge';
import type { Root, Node } from 'fumadocs-core/page-tree';
import { source } from './source';
import { versions } from './versions.mjs';
export function getDocsTree(locale = 'zh-CN'): Root {
  const tree = source.getPageTree(locale);
  const order = new Map(versions.map((v, i) => [v.id, i]));
  const rank = (node: Node) => node.type === 'folder' && node.root === 'version' ? order.get(node.$ref?.folder ?? '') ?? 1000 : 1000;
  return { ...tree, children: [...tree.children].sort((a,b) => rank(a) - rank(b)) };
}

/** Join the already parsed Frontmatter by canonical URL, including folder indexes. */
export function getDocsSidebarTree(locale = 'zh-CN'): Root {
  const badges = new Map(source.getPages(locale).map(page => [page.url, page.data.featureBadge]));
  function label(name: Node['name'], url?: string) {
    const badge = url ? badges.get(url) : undefined;
    return badge ? createElement('span', { className: 'feature-nav-label' },
      createElement('span', { className: 'feature-nav-text' }, name),
      createElement(FeatureBadge, { value: badge, compact: true })) : name;
  }
  function decorate(node: Node): Node {
    if (node.type === 'page') return { ...node, name: label(node.name, node.url) };
    if (node.type === 'folder') return {
      ...node, name: label(node.name, node.index?.url),
      index: node.index ? { ...node.index, name: label(node.index.name, node.index.url) } : undefined,
      children: node.children.map(decorate),
    };
    return node;
  }
  function decorateRoot(tree: Root): Root {
    return { ...tree, children: tree.children.map(decorate), fallback: tree.fallback ? decorateRoot(tree.fallback) : undefined };
  }
  return decorateRoot(getDocsTree(locale));
}
