import { DocsShell } from '@/components/docs-shell';
import { getDocsTree } from '@/lib/version-tree';
import { i18n } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
export default async function Layout({children,params}:{children:ReactNode;params:Promise<{lang:string}>}) {
  const {lang} = await params;
  if (!(i18n.languages as string[]).includes(lang)) notFound();
  return <DocsShell tree={getDocsTree(lang)}>{children}</DocsShell>;
}
