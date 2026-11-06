'use client';
import { createContext, use, type ComponentProps, type ReactNode } from 'react';
import type { Root } from 'fumadocs-core/page-tree';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import { Sidebar, SidebarProvider, SidebarTrigger, useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';

const SidebarTree = createContext<Root | null>(null);

export function FeatureSidebarProvider({ tree, children }: { tree: Root; children: ReactNode }) {
  return <SidebarTree value={tree}>{children}</SidebarTree>;
}

function FeatureSidebar(props: ComponentProps<typeof Sidebar>) {
  const tree = use(SidebarTree);
  if (!tree) return <Sidebar {...props} />;
  // Scope decorated names to navigation. Breadcrumbs, footer links, and version
  // projection continue to use the original page tree and plain page titles.
  return <TreeContextProvider tree={tree}><Sidebar {...props} /></TreeContextProvider>;
}

export const featureSidebarSlots = {
  provider: SidebarProvider,
  root: FeatureSidebar,
  trigger: SidebarTrigger,
  useSidebar,
};
