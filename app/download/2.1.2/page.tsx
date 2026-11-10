import { Downloads } from '@/components/downloads';
import { ReleaseShell } from '@/components/release-shell';
import { pageMetadata } from '@/lib/seo';

const description = '选择 Mio v2.1.2 的平台、架构与发行类型，下载后核对 SHA-256。';
export const metadata = pageMetadata('下载 Mio v2.1.2', description, '/download/2.1.2');

export default function Page() {
  return <ReleaseShell title="下载 Mio v2.1.2" description={description}>
    <Downloads version="2.1.2" />
  </ReleaseShell>;
}
