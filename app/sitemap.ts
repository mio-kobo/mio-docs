import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { getVersion } from '@/lib/versions.mjs';
import { releasePlan } from '@/lib/releases.mjs';
import { canonicalPath, siteUrl } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  const paths = ['/', '/download', '/docs/versions', ...(releasePlan.mode === 'live' ? ['/releases/2.0.0','/releases/2.0.0/migration','/download/2.0.0'] : [])];
  for (const page of source.getPages()) {
    const version = getVersion(page.slugs[0]);
    if (version && ['Stable','Legacy'].includes(version.status)) paths.push(page.url);
  }
  return [...new Set(paths)].map(path => ({url:new URL(canonicalPath(path),siteUrl).href}));
}

export const dynamic = 'force-static';
