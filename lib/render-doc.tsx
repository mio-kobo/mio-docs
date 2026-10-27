import { StaticRedirect } from '@/components/static-redirect';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import Link from 'next/link';
import { source } from './source';
import { defaultVersion, docsUrl, getVersion, versionLabel } from './versions.mjs';
import { VersionNotice } from '@/components/version-notice';
import { MioCodeBlock } from '@/components/mio-code-block';
import { MioExerciseBlock } from '@/components/mio-exercise-block';
import { TutorialLayout } from '@/components/tutorial-layout';
import { TutorialProgress } from '@/components/tutorial-progress';
import { TutorialLessonList } from '@/components/tutorial-lesson-list';
import { ContinueLearning } from '@/components/continue-learning';
import { TutorialNav } from '@/components/tutorial-nav';
import { i18n } from './i18n';
const mdxComponents = {
  ...defaultMdxComponents,
  pre: MioCodeBlock,
  MioExercise: MioExerciseBlock,
  TutorialLayout,
  TutorialProgress,
  TutorialLessonList,
  ContinueLearning,
  TutorialNav,
};
const legacyOwned = new Set(['getting-started','learn','reference','kiso','tooling','internals']);
export function docRedirect(slugs: string[] = [], locale = 'zh-CN') {
  if (!slugs.length) return docsUrl([defaultVersion], locale);
  if (legacyOwned.has(slugs[0]) && !source.getPage(slugs, locale) && source.getPage([defaultVersion, ...slugs], locale)) return docsUrl([defaultVersion, ...slugs], locale);
}
function resolvePage(slugs: string[] = [], locale = 'zh-CN') {
  if (!(i18n.languages as string[]).includes(locale)) notFound();
  const version = getVersion(slugs[0]);
  if (/^v\d/u.test(slugs[0]) && !version) notFound();
  if (version && !version.locales.includes(locale)) notFound();
  const page = source.getPage(slugs, locale);
  if (!page) notFound();
  return { page, version };
}
export function renderDoc(slugs?: string[], locale = 'zh-CN') {
  const target = docRedirect(slugs, locale);
  if (target) return <StaticRedirect href={target} />;
  const { page, version } = resolvePage(slugs, locale);
  const MDX = page.data.body;
  return <DocsPage id="main-content" toc={page.data.toc}>
    <VersionNotice />
    {version?.id !== 'v2.0' && (version ? <aside className={`version-status ${version.status === 'Development' ? 'is-development' : ''}`} aria-label="文档版本状态"><strong>{versionLabel(version)}</strong><span>{version.status === 'Release Candidate' ? '候选发布，尚非稳定版。' : version.status === 'Development' ? '开发预览，尚未正式发布。' : `正式发布 ${version.release?.tag} · 文档内容固定于本版本。`}</span><Link href="/docs/versions">版本与来源</Link></aside> : page.slugs[0] !== 'versions' && <aside className="version-status is-development"><strong>未版本化迁移资料</strong><span>本页保留旧 URL；不将其自动归属到任何正式版本，也不混入版本搜索。</span><Link href="/docs/versions">选择版本化文档</Link></aside>)}
    <DocsTitle>{page.data.title}</DocsTitle><DocsDescription>{page.data.description}</DocsDescription><DocsBody><MDX components={mdxComponents} /></DocsBody>
  </DocsPage>;
}
export function docMetadata(slugs?: string[], locale = 'zh-CN') {
  const target = docRedirect(slugs, locale);
  if (target) return { title: '文档入口已更新', robots: { index:false, follow:true }, alternates: { canonical: `${target}/` } };
  const { page, version } = resolvePage(slugs, locale);
  return { title: `${version ? `V${version.version} · ` : ''}${page.data.title}`, description: page.data.description, robots: (version?.status === 'Development' || version?.status === 'Release Candidate') || (!version && page.slugs[0] !== 'versions') ? { index:false, follow:true } : undefined, alternates: { canonical: `${page.url}/` } };
}
