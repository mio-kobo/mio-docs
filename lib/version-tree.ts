import type { Root, Node } from 'fumadocs-core/page-tree';
import { source } from './source';
import { versions } from './versions.mjs';
export function getDocsTree(locale = 'zh-CN'): Root {
  const tree = source.getPageTree(locale);
  const order = new Map(versions.map((v, i) => [v.id, i]));
  const rank = (node: Node) => node.type === 'folder' && node.root === 'version' ? order.get(node.$ref?.folder ?? '') ?? 1000 : 1000;
  return { ...tree, children: [...tree.children].sort((a,b) => rank(a) - rank(b)) };
}
