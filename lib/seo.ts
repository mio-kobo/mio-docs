import type { Metadata } from 'next';
export const siteUrl = process.env.MIO_DOCS_SITE_URL ?? 'https://mio.kaelexvp.cc';
export function canonicalPath(path: string) { return path.endsWith('/') ? path : `${path}/`; }
export function pageMetadata(title: string, description: string, path: string, preview = false): Metadata {
  return { title, description, alternates: { canonical: canonicalPath(path) }, robots: preview ? { index:false, follow:true } : undefined, openGraph: { title, description, url:canonicalPath(path), locale:'zh_CN', type:'website' } };
}
