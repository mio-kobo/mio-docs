import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { releasePlan } from '@/lib/releases.mjs';
export function ReleaseLinks() {
  const root = `/releases/${releasePlan.version}`;
  const links = [['Docs', releasePlan.released ? 'v2.0.0 文档' : '开发文档', `/docs/${releasePlan.docsVersion}`], ['Download', releasePlan.released ? '发行说明' : '下载状态', `/download/${releasePlan.version}`], ['Release Notes', '更新记录', root], ['Migration Guide', '迁移指南', `${root}/migration`]];
  return <nav className="release-links" aria-label={`V${releasePlan.version} 版本入口`}>{links.map(([label,description,url]) => <Link key={url} href={url}><span><strong>{label}</strong><small>{description}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>)}</nav>;
}
