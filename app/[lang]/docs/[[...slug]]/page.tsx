import { source } from '@/lib/source';
import { renderDoc, docMetadata } from '@/lib/render-doc';
import { StaticRedirect } from '@/components/static-redirect';
import { docRedirect } from '@/lib/render-doc';
import { generateStaticParams as defaultParams } from '@/app/docs/[[...slug]]/page';
import { docsUrl } from '@/lib/versions.mjs';
type Params = {lang:string;slug?:string[]};
export default async function Page({ params }: { params:Promise<Params> }) {
  const { lang, slug } = await params;
  if (lang === 'zh-CN') return <StaticRedirect href={docRedirect(slug) ?? docsUrl(slug)} />;
  return renderDoc(slug, lang);
}
export function generateStaticParams() { return [...defaultParams().map(params => ({lang:'zh-CN', ...params})), ...source.getPages().filter(page => page.locale !== 'zh-CN').map(page => ({lang:page.locale, slug:page.slugs}))]; }
export async function generateMetadata({params}:{params:Promise<Params>}) { const {lang,slug} = await params; return lang === 'zh-CN' ? {title:'文档入口已更新', robots:{index:false,follow:true}, alternates:{canonical:`${docRedirect(slug) ?? docsUrl(slug)}/`}} : docMetadata(slug,lang); }

export const dynamicParams = false;
