import Link from 'next/link';
import { ReleaseShell } from '@/components/release-shell';
import { pageMetadata } from '@/lib/seo';
import { getVersion } from '@/lib/versions.mjs';

const docs = getVersion('v2.1.2')!;
const release = docs.release!;
const description = 'Mio v2.1.2 正式发布，包含多语言 CLI 与终端帮助显示改进。';
export const metadata = pageMetadata('Mio v2.1.2 · Release Notes', description, '/releases/2.1.2');

export default function Page() {
  return <ReleaseShell title="Mio v2.1.2" description={description}>
    <section>
      <h2>发布记录</h2>
      <p>正式标签 <code>{release.tag}</code> 于 <time dateTime={release.publishedAt}>{release.publishedAt.slice(0, 10)}</time> 发布，源码提交 <code>{docs.source.commit}</code>。</p>
      <p>本次更新为命令行提供多语言帮助和可配置的终端显示。完整变更记录见 <a href={release.url}>GitHub Release</a>。</p>
    </section>
    <section>
      <h2>发行包与文档</h2>
      <p><Link href="/download/2.1.2">下载与 SHA-256 校验</Link> · <Link href="/docs/v2.1.2">稳定版文档</Link> · <Link href="/releases/2.1.2/migration">迁移指南</Link></p>
      <p><Link href="/releases/2.0.0">历史发行说明 · v2.0.0</Link></p>
    </section>
  </ReleaseShell>;
}
