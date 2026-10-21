import Link from 'next/link';
import { ReleaseShell } from '@/components/release-shell';
import { releasePlan } from '@/lib/releases.mjs';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('下载 Mio v2.0.0', 'Mio v2.0.0 官方发行包、平台、校验与安装说明。', '/download/2.0.0', releasePlan.mode !== 'live');
const asset = {
  name: 'mio-2.0.0-darwin-arm64.tar.gz',
  size: 3645944,
  sha256: '15a7a65c048e4bac4dc1e792c2106df979d7e68ca28b36e213343c8d1e3dde2e',
};
export default function Page() {
 return <ReleaseShell title="下载 Mio v2.0.0" description={releasePlan.released ? '官方正式发行包。仅支持 macOS Apple Silicon / ARM64。' : 'v2.0.0 发行包。'}>
  <section><h2>官方发行包</h2><p>发行包由 GitHub Release 提供；本页不托管副本。请从官方 Release 下载并先核对 SHA256。</p><p><a href={releasePlan.releaseUrl}>GitHub Release v2.0.0 →</a></p>
    <div className="download-list"><article className="download-asset"><div><h3>macOS <span>arm64</span></h3><p>{asset.name}</p></div><a className="secondary-action" href={releasePlan.releaseUrl} aria-label="前往 GitHub Release v2.0.0">前往官方 Release</a><dl><div><dt>文件大小</dt><dd>{asset.size.toLocaleString('en-US')} bytes</dd></div><div><dt>SHA256</dt><dd><code>{asset.sha256}</code></dd></div><div><dt>签名</dt><dd>ad-hoc；无 Developer ID；无 notarization</dd></div></dl></article></div>
  </section>
  <section><h2>校验与安装</h2><p>从官方 Release 页面下载 <code>{asset.name}</code> 与 <code>SHA256SUMS</code> 到同一目录，然后执行：</p><pre tabIndex={0}><code>{`shasum -a 256 -c SHA256SUMS
tar -xzf mio-2.0.0-darwin-arm64.tar.gz
export MIO_HOME="$PWD/mio-2.0.0-darwin-arm64"
export PATH="$MIO_HOME:$PATH"
export MIO_BUNKO="$MIO_HOME/bunko"
mio version`}</code></pre><p>预期校验输出 <code>{asset.name}: OK</code>，版本输出 <code>Mio 2.0.0</code>。完整步骤、签名检查和 Gatekeeper 说明见 <Link href="/docs/v2.0/getting-started">v2.0.0 安装文档</Link>。</p>
  </section>
  <section><h2>平台边界</h2><p>v2.0.0 只提供并验证 macOS Apple Silicon / ARM64。Intel Mac、Linux 和 Windows 没有 v2.0.0 正式支持认证；不要根据历史 V1 多平台资产推断 V2 支持范围。</p><p>需要从源码构建时，参见 <Link href="/docs/v2.0/getting-started">Getting Started 的源码路线</Link>；发行包本身不需要 Go。</p></section>
 </ReleaseShell>;
}
