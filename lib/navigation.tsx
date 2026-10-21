import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
export const sections = [
  { title: 'Getting Started', label: '开始使用', url: '/docs/getting-started', description: '安装 Mio v2.0.0，运行第一个程序。' },
  { title: 'Learn', label: '学习 Mio', url: '/docs/learn', description: '从变量到模块，一步步写出真实程序。' },
  { title: 'Reference', label: '语言参考', url: '/docs/reference', description: '查阅语法、类型与精确的语言规则。' },
  { title: 'Kiso', label: '基础库', url: '/docs/kiso', description: '理解 Bunko 与 kiso/ 导入路径。' },
  { title: 'Tooling', label: '开发工具', url: '/docs/tooling', description: '查找 CLI、编辑器和语言服务资料。' },
  { title: 'Internals', label: '内部实现', url: '/docs/internals', description: '了解 Mochi VM、GC 与 Native AOT 边界。' },
];
export const layoutOptions: BaseLayoutProps = {
  nav: { title: <span className="brand"><span className="brand-mark" aria-hidden="true">澪</span> Mio <span className="brand-subtitle">Docs</span></span>, url: '/' },
  links: [{text:'Docs',url:'/docs',active:'nested-url'}, {text:'Download',url:'/download',active:'nested-url'}, {text:'Release Notes',url:'/releases/2.0.0',active:'nested-url'}],
  // Section links are supplied by DocsShell within the active version.
  githubUrl: 'https://github.com/mio-kobo/mio',
  themeSwitch: { mode: 'light-dark-system' },
};
