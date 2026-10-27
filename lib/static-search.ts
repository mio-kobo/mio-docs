import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { getVersion, parseDocsPath } from './versions.mjs';

/** Shared by the dialog and static-host integration checks. No query API is used. */
export function versionSearchClient(tag: string, locale: string, from = '/api/search/index.json') {
  const client = staticClient({ from, tag, locale, search: { limit: 40 } });
  return {
    deps: [from, tag, locale],
    async search(query: string) {
      const version = getVersion(tag);
      if (!version?.locales.includes(locale)) return [];
      const label = `V${version.version} · ${version.status}`;
      const results = await client.search(query);
      return results.filter(result => {
        const path = parseDocsPath(result.url);
        return path?.version === version.id && path.locale === locale;
      }).map(result => ({
        ...result,
        breadcrumbs: [label, ...(result.breadcrumbs ?? []).filter(crumb => crumb !== label)],
      }));
    },
  };
}
