import './globals.css';
import { SkipLink } from '@/components/skip-link';
import { Providers } from '@/components/providers';
import { siteUrl } from '@/lib/seo';
import type { ReactNode } from 'react';
export const metadata = { metadataBase: new URL(siteUrl ?? 'http://localhost:3211'), title: { default: 'Mio · 澪光文档', template: '%s · Mio' }, description: 'Mio 编程语言中文文档：安装、渐进式教程、语言参考、Kiso 基础库与开发工具。' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN" suppressHydrationWarning><body className="flex min-h-screen flex-col"><SkipLink /><Providers>{children}</Providers></body></html>;
}
