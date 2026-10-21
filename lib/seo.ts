import type { Metadata } from 'next';
export const siteUrl = process.env.MIO_DOCS_SITE_URL;
export function pageMetadata(title: string, description: string, path: string, preview = false): Metadata {
  return { title, description, alternates: { canonical: path }, robots: preview ? { index:false, follow:true } : undefined, openGraph: { title, description, url:path, locale:'zh_CN', type:'website' } };
}
