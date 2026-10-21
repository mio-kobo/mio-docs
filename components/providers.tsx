'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { parseDocsPath } from '@/lib/versions.mjs';
import { useEffect } from 'react';
import { VersionSearchDialog } from './search-dialog';
export function Providers({ children, locale }: { children:ReactNode;locale?:string }) {
  const requested = locale ?? parseDocsPath(usePathname())?.locale ?? 'zh-CN';
  const activeLocale = (i18n.languages as string[]).includes(requested) ? requested : 'zh-CN';
  useEffect(() => { document.documentElement.lang = activeLocale; }, [activeLocale]);
  return <RootProvider i18n={i18n.provider(activeLocale)} search={{ SearchDialog: VersionSearchDialog }}>{children}</RootProvider>;
}
