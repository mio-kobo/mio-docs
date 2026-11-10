import type { BaseLayoutProps, LinkItemType } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import logo from '@/app/icon.png';
import { defaultVersion } from '@/lib/versions.mjs';
import { releasePlan } from '@/lib/releases.mjs';
export const sections = [
  { title: 'Getting Started', label: '开始使用', url: '/docs/getting-started', homeUrl: `/docs/${defaultVersion}/getting-started`, description: '安装当前稳定版 Mio，验证 CLI。' },
  { title: 'Learn', label: '学习 Mio', url: '/docs/learn', homeUrl: `/docs/${defaultVersion}/learn`, description: '声明变量并运行第一个程序。' },
  { title: 'Reference', label: '语言参考', url: '/docs/reference', description: '查阅语法、类型与精确的语言规则。' },
  { title: 'Kiso', label: '基础库', url: '/docs/kiso', description: '理解 Bunko 与 kiso/ 导入路径。' },
  { title: 'Tooling', label: '开发工具', url: '/docs/tooling', description: '查找 CLI、编辑器和语言服务资料。' },
  { title: 'Internals', label: '内部实现', url: '/docs/internals', description: '了解 Mochi VM、GC 与 Native AOT 边界。' },
];
// Next.js treats the last dotted segment as a file, so these directory URLs use native navigation.
export const releaseNotesLink: LinkItemType = {
  type: 'custom',
  children: <a className="inline-flex items-center p-2 text-sm text-fd-muted-foreground hover:text-fd-accent-foreground" href={`/releases/${releasePlan.version}/`}>Release Notes</a>,
};
export const layoutOptions: BaseLayoutProps = {
  nav: { title: <span className="brand"><Image className="brand-mark" src={logo} alt="" width={32} height={32} /> Mio <span className="brand-subtitle">Docs</span></span>, url: '/' },
  links: [
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'Download', url: '/download', active: 'nested-url' },
    { ...releaseNotesLink, on: 'nav', children: <li>{releaseNotesLink.children}</li> },
    { ...releaseNotesLink, on: 'menu' },
  ],
  // Section links are supplied by DocsShell within the active version.
  githubUrl: 'https://github.com/mio-kobo/mio',
  themeSwitch: { mode: 'light-dark-system' },
};
