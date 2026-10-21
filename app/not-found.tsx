import Link from 'next/link';
export default function NotFound() {
  return <main id="main-content" className="mx-auto flex min-h-[75vh] max-w-xl flex-col items-start justify-center gap-6 px-6"><p className="text-fd-primary font-mono">404</p><h1 className="text-3xl font-semibold">这个页面还未抵达。</h1><p className="text-fd-muted-foreground leading-8">页面可能已移动，或尚未发布。英文与日文内容尚未提供，可以先阅读中文文档。</p><div className="flex flex-wrap gap-3"><Link className="primary-action" href="/docs">阅读中文文档</Link><Link className="secondary-action" href="/">返回首页</Link></div></main>;
}
