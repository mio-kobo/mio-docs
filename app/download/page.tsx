import Link from 'next/link';
import { ReleaseShell } from '@/components/release-shell';
import { Downloads } from '@/components/downloads';
import { stableDownload } from '@/lib/releases.mjs';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('下载 Mio', '下载已核验的 Mio 稳定版安装包，查看平台、架构、文件大小与 SHA256。', '/download');
export default function Page() {
 return <ReleaseShell title="下载 Mio" description={`当前稳定发行版：${stableDownload ? `V${stableDownload.version}` : '暂无已核验安装包'}。选择对应平台与架构，校验后安装。`}><p><Link href="/download/2.0.0">查看 Mio v2.0.0 正式发行包 →</Link></p>{stableDownload ? <Downloads version={stableDownload.version} /> : <p>当前没有匹配默认稳定版的已核验安装包。</p>}</ReleaseShell>;
}
