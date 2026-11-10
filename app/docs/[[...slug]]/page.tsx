import { source } from '@/lib/source';
import { renderDoc, docMetadata, docRedirect } from '@/lib/render-doc';
export default async function Page({ params }: { params: Promise<{ slug?:string[] }> }) { return renderDoc((await params).slug); }
export function generateStaticParams() {
  const pages = source.getPages('zh-CN');
  const aliases = pages.flatMap(page => {
    const slug = page.slugs.slice(1);
    return slug.length && docRedirect(slug) === page.url ? [{ slug }] : [];
  });
  return [{slug:[]}, ...pages.map(page=>({slug:page.slugs})), ...aliases];
}
export async function generateMetadata({ params }: { params:Promise<{slug?:string[]}> }) { return docMetadata((await params).slug); }

export const dynamicParams = false;
