import { source } from '@/lib/source';
import { createSearchAPI } from 'fumadocs-core/search/server';
import { defaultVersion, getVersion, parseDocsPath } from '@/lib/versions.mjs';
const search = createSearchAPI('advanced', {
  localeFilter: true,
  indexes: () => source.getPages().filter(page => getVersion(page.slugs[0])).map(page => ({
    id:page.url, title:page.data.title, description:page.data.description, url:page.url,
    structuredData:page.data.structuredData, tag:page.slugs[0], locale:page.locale,
    breadcrumbs:[page.data.title],
  })),
});
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.getAll('tag').length > 1 || params.getAll('locale').length > 1) return Response.json({error:'Exactly one version and locale are allowed'}, {status:400});
  const version = getVersion(params.get('tag') ?? defaultVersion);
  const locale = params.get('locale') ?? 'zh-CN';
  if (!version || !version.locales.includes(locale)) return Response.json({error:'Unsupported version or unpublished locale'}, {status:400});
  const query = params.get('query');
  if (!query) return Response.json([]);
  const results = await search.search(query, {tag:version.id,locale,limit:40});
  return Response.json(results.filter(result => parseDocsPath(result.url)?.version === version.id).map(result => ({...result, breadcrumbs:[`V${version.version} · ${version.status}`, ...(result.breadcrumbs ?? [])]})));
}
