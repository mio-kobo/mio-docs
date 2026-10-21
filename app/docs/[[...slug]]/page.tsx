import { source } from '@/lib/source';
import { defaultVersion } from '@/lib/versions.mjs';
import { renderDoc, docMetadata } from '@/lib/render-doc';
export default async function Page({ params }: { params: Promise<{ slug?:string[] }> }) { return renderDoc((await params).slug); }
export function generateStaticParams() {
  const pages = source.getPages('zh-CN');
  const owned = new Set(['getting-started','learn','reference','kiso','tooling','internals']);
  const aliases = pages.filter(page => page.slugs[0] === defaultVersion && owned.has(page.slugs[1]) && !source.getPage(page.slugs.slice(1),'zh-CN')).map(page => ({slug:page.slugs.slice(1)}));
  return [{slug:[]}, ...pages.map(page=>({slug:page.slugs})), ...aliases];
}
export async function generateMetadata({ params }: { params:Promise<{slug?:string[]}> }) { return docMetadata((await params).slug); }
