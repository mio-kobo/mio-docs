import { source } from '@/lib/source';
import { createSearchAPI } from 'fumadocs-core/search/server';
import { getVersion } from '@/lib/versions.mjs';
const search = createSearchAPI('advanced', {
  localeFilter: true,
  indexes: () => source.getPages().filter(page => getVersion(page.slugs[0])).map(page => ({
    id:page.url, title:page.data.title, description:page.data.description, url:page.url,
    structuredData:page.data.structuredData, tag:page.slugs[0], locale:page.locale,
    breadcrumbs:[`V${getVersion(page.slugs[0])!.version} · ${getVersion(page.slugs[0])!.status}`, page.data.title],
  })),
});
// Export only the database. GitHub Pages serves this as /api/search/index.json.
export const dynamic = 'force-static';
export const GET = search.staticGET;
