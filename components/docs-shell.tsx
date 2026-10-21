'use client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { findPath, findProjection, type Folder, type Root } from 'fumadocs-core/page-tree';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { layoutOptions, sections } from '@/lib/navigation';
import { docsUrl, getVersion, parseDocsPath, versionLabel } from '@/lib/versions.mjs';
export const versionNoticeKey = 'mio-docs-version-fallback';
export function DocsShell({ tree, children }: { tree: Root; children: ReactNode }) {
  const pathname = usePathname();
  const current = parseDocsPath(pathname);
  const links = sections.map(({ title, url }) => ({ text: title, url: current && getVersion(current.version) ? docsUrl([current.version!, ...url.split('/').slice(2)], current.locale) : url, active: 'nested-url' as const, on:'nav' as const }));
  return <DocsLayout {...layoutOptions} links={links} tree={tree} tabs={{ transform(option, folder) {
    if (folder.root !== 'version') return option;
    const version = getVersion(folder.$ref?.folder);
    if (!version) return null;
    return { ...option, title: <span className="version-label"><span>V{version.version}</span><span className={`version-badge ${version.status === 'Development' ? 'is-development' : ''}`}>{version.status}</span>{versionLabel(version).includes('Latest') && <span className="version-latest">Latest</span>}</span>, description: version.release ? `发布于 ${version.release.publishedAt.slice(0,10)} · 维护：${version.maintenance === 'unspecified' ? '未声明' : version.maintenance}` : '站点开发快照 · 内容已按 v2.0.0 正式版核对', props: {
      className: 'version-option',
      'aria-label': `切换到 V${version.version} ${version.status}`,
      onClickCapture: () => {
        const path = findPath(tree.children, n => n.type === 'page' && n.url === pathname);
        const active = path?.findLast(n => n.type === 'folder' && n.root === 'version') as Folder | undefined;
        const page = path?.at(-1);
        const projected = active && page?.type === 'page' ? findProjection(active, folder, page) : undefined;
        try {
          sessionStorage.removeItem(versionNoticeKey);
          if (active && active !== folder && page?.type === 'page' && !projected) sessionStorage.setItem(versionNoticeKey, JSON.stringify({ target: option.url, version: `V${version.version}`, chapter: current?.chapter ?? '' }));
        } catch { /* Navigation must remain usable when storage is unavailable. */ }
      },
    } };
  } }}>{children}</DocsLayout>;
}
