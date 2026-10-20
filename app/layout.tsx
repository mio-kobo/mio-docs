import './globals.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
export const metadata = { title: { default: 'Mio Kōbō · 澪光', template: '%s · Mio' }, description: 'Mio 编程语言、Bunko 标准库与开发工具文档' };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="zh-CN" suppressHydrationWarning><body className="flex min-h-screen flex-col"><RootProvider>{children}</RootProvider></body></html>; }
