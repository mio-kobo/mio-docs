import { source } from '@/lib/source';
import { renderDoc, docMetadata } from '@/lib/render-doc';
import { redirect } from 'next/navigation';
import { docsUrl } from '@/lib/versions.mjs';
type Params = {lang:string;slug?:string[]};
export default async function Page({ params }: { params:Promise<Params> }) {
  const { lang, slug } = await params;
  if (lang === 'zh-CN') redirect(docsUrl(slug));
  return renderDoc(slug, lang);
}
export function generateStaticParams() { return source.getPages().filter(page => page.locale !== 'zh-CN').map(page => ({lang:page.locale, slug:page.slugs})); }
export async function generateMetadata({params}:{params:Promise<Params>}) { const {lang,slug} = await params; return docMetadata(slug,lang); }
