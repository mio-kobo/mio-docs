import { DocsShell } from '@/components/docs-shell';
import { getDocsTree, getDocsSidebarTree } from '@/lib/version-tree';
import type { ReactNode } from 'react';
export default function Layout({ children }: { children: ReactNode }) {
  return <DocsShell tree={getDocsTree()} sidebarTree={getDocsSidebarTree()}>{children}</DocsShell>;
}
