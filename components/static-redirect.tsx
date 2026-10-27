'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Static hosts cannot send Next.js redirects. Keep a usable no-JS link too. */
export function StaticRedirect({ href }: { href: string }) {
  const target = href.endsWith('/') ? href : `${href}/`;
  useEffect(() => {
    window.location.replace(target + window.location.search + window.location.hash);
  }, [target]);
  return <main id="main-content" className="mx-auto max-w-xl p-8">
    <h1>文档入口已更新</h1>
    <p><Link href={target}>继续阅读文档</Link></p>
  </main>;
}
