import Link from 'next/link';
import { ReleaseShell } from '@/components/release-shell';
import { pageMetadata } from '@/lib/seo';

const description = '保留原有安装，在独立目录校验并试用 Mio v2.1.2。';
export const metadata = pageMetadata('迁移到 Mio v2.1.2', description, '/releases/2.1.2/migration');

export default function Page() {
  return <ReleaseShell title="迁移到 Mio v2.1.2" description={description}>
    <ol>
      <li>从<a href="/download/2.1.2/">官方下载清单</a>选择与你的系统和架构匹配的包。</li>
      <li>核对 SHA-256 后，按<Link href="/docs/v2.1.2/migration">文档迁移步骤</Link>验证版本、重跑项目检查与测试。</li>
      <li>确认结果后切换工具链，并保留旧安装用于回退。</li>
    </ol>
    <p><a href="/releases/2.1.2/">返回 v2.1.2 发行说明</a></p>
  </ReleaseShell>;
}
