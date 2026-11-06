import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { docsSchema } from './docs-schema';
import { i18n } from './i18n';
import { docsUrl } from './versions.mjs';
const docs = defineDocs({ dir: 'content/docs', docs: { schema: docsSchema } });
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n: { ...i18n, fallbackLanguage: null },
  url: (slugs, locale) => docsUrl(slugs, locale),
});
