import type { ReactNode } from 'react';
import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { layoutOptions } from '@/lib/navigation';
import { releasePlan } from '@/lib/releases.mjs';
import { ReleaseLinks } from './release-links';
export function ReleaseShell({title,description,children}:{title:string;description:string;children:ReactNode}) {
  return <HomeLayout {...layoutOptions}><main id="main-content" className="release-page"><Link className="release-back" href="/">Mio / 澪光</Link><header><p className="release-eyebrow">MIO HIKARI · {releasePlan.mode === 'live' ? 'STABLE RELEASE' : 'RELEASE PREPARATION'}</p><h1>{title}</h1><p className="release-lead">{description}</p></header><ReleaseLinks /><div className="release-content">{children}</div><footer className="home-footer"><span>Mio Kōbō · 澪光 / Hikari</span><Link href="/docs/versions">版本与来源</Link></footer></main></HomeLayout>;
}
