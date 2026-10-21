import Link from 'next/link';
import { downloadManifest, releasePlan } from '@/lib/releases.mjs';
export function Downloads({version}:{version:string}) {
  const release = version === releasePlan.version && releasePlan.mode !== 'live' ? undefined : downloadManifest.releases.find(r => r.version === version);
  if (!release) return <aside className="release-callout"><strong>尚无已核验的 V{version} 构建产物</strong><p>平台、架构、文件大小与 SHA256 等待正式产物确认；当前不提供 V{version} 下载链接。</p><Link href="/download">获取当前稳定版 →</Link></aside>;
  const mac = release.assets.find(a => a.platform === 'macOS' && a.architecture === 'arm64');
  const windows = release.assets.find(a => a.platform === 'Windows' && a.architecture === 'x86_64');
  return <><section><h2>V{release.version} 安装包</h2><p>已于 {downloadManifest.verifiedOn} 实际下载，逐包比对字节大小与 GitHub SHA256，确认包含 CLI 和 Bunko。此项验证不代表在全部操作系统上执行测试。</p><p><a href={release.releaseUrl}>官方 Release 与校验信息 →</a></p><div className="download-list">{release.assets.map(asset => <article className="download-asset" key={asset.name}><div><h3>{asset.platform} <span>{asset.architecture}</span></h3><p>{asset.name}</p></div><a className="secondary-action" href={asset.url} aria-label={`下载 ${asset.platform} ${asset.architecture} V${release.version}`}>下载 · {(asset.size/1048576).toFixed(2)} MiB</a><dl><div><dt>文件大小</dt><dd>{asset.size.toLocaleString('en-US')} bytes</dd></div><div><dt>SHA256</dt><dd><code>{asset.sha256}</code></dd></div></dl></article>)}</div></section><section><h2>校验与安装</h2><p>选择与你的系统、处理器匹配的包，先核对 SHA256。解压后保留 mio（Windows 为 mio.exe）与同包 bunko/，不要混用开发版标准库。</p><div className="install-grid"><article><h3>macOS / Linux</h3><p>在下载目录核对所选文件；以下以 macOS arm64 为例。</p><pre tabIndex={0}><code>{`shasum -a 256 ${mac?.name ?? "选择的安装包.tar.gz"}
mkdir mio-v${release.version}
tar -xzf ${mac?.name ?? "选择的安装包.tar.gz"} -C mio-v${release.version}
cd mio-v${release.version}
export MIO_BUNKO="$PWD/bunko"
./mio version`}</code></pre><p>Linux 也可使用 sha256sum。校验输出应与对应安装包的 SHA256 完全一致。</p></article><article><h3>Windows PowerShell</h3><pre tabIndex={0}><code>{`Get-FileHash .\u005c${windows?.name ?? "选择的安装包.zip"} -Algorithm SHA256
Expand-Archive .\u005c${windows?.name ?? "选择的安装包.zip"} -DestinationPath mio-v${release.version}
Set-Location mio-v${release.version}
$env:MIO_BUNKO = "$PWD\u005cbunko"
.\u005cmio.exe version`}</code></pre><p>从独立目录调用可避免覆盖已有工具链。</p></article></div><p>发布身份以对应版本的官方 Release 为准，CLI 字符串可能与标签不同。运行程序和环境配置详见 <Link href={`/docs/${release.docsVersion}/getting-started`}>对应版本安装文档</Link>。</p></section></>;
}
