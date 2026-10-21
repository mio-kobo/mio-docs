import Link from 'next/link';
import { ReleaseShell } from '@/components/release-shell';
import { releaseDocs, releasePlan } from '@/lib/releases.mjs';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('Mio v2.0.0 · Release Notes', 'Mio v2.0.0 正式发布：M18 纯 Mio Native AOT 自编译、macOS ARM64 平台边界与已知限制。', '/releases/2.0.0', releasePlan.mode !== 'live');
const commit = releaseDocs!.source.commit;
const source = `https://github.com/mio-kobo/mio/tree/${commit}`;
export default function Page() {
  return <ReleaseShell title="Mio v2.0.0" description={releasePlan.released ? '正式发布。M18 纯 Mio Native AOT 自编译已验收；首发平台为 macOS Apple Silicon ARM64。' : 'V2.0.0 发布信息。'}>
    <aside className="release-callout"><strong>{releasePlan.released ? 'Stable · 2026-10-21 正式发布' : 'Development'}</strong><p>正式 Tag 为 <code>v2.0.0</code>，源码提交 <code>{commit}</code>。CLI 输出 <code>Mio 2.0.0</code>。本站默认稳定文档入口仍由版本注册表管理；这不影响语言本身的正式发布事实。</p></aside>
    <section><p className="release-eyebrow">RELEASE HIGHLIGHTS</p><h2>v2.0.0 的主要成果</h2>
      <div className="release-facts">
        <article><span>01 / NATIVE AOT</span><h3>M18 纯 Mio 自编译通过</h3><p>正式链为 Go 前端生成 <code>native-aot.mochi</code>，Go AOT 只生成 Seed；Seed 及后续 Stage 1–4 由纯 Mio 生成，Stage 1–5 未签名字节一致。Stage 5 已生成并签名验证，但未计为已执行代次。</p><Link href="/docs/v2.0/internals/native-aot">阅读 Native AOT →</Link></article>
        <article><span>02 / RUNTIME</span><h3>精确 Mark-Sweep GC</h3><p>Shadow Frame、typed Storage、nullable/closure/enum 位图、大对象与跨页分配、mmap 有界 managed arena。正式自举协议为 1 GiB；256 MiB 见证实际触发 GC 后仍生成相同固定点。</p><Link href="/docs/v2.0/internals/gc">阅读 GC 与对象表示 →</Link></article>
        <article><span>03 / TOOLING</span><h3>LSP 与标准库</h3><p>核心 CLI 内置 MioCore stdio LSP；Bunko/Kiso 提供数组、字节、字符串、路径、转换、数学、IO、文件、二进制与 Mochi 编码模块，以及工具链开发接口。</p><Link href="/docs/v2.0/tooling/lsp">阅读 LSP →</Link><Link href="/docs/v2.0/kiso">阅读 Kiso →</Link></article>
      </div>
    </section>
    <section><h2>平台与安装</h2><dl className="release-details">
      <div><dt>正式平台</dt><dd>macOS Apple Silicon / ARM64；macOS 15.6 实机验证。Intel Mac、Linux、Windows 没有 v2.0.0 正式支持认证。</dd></div>
      <div><dt>发行包</dt><dd><code>mio-2.0.0-darwin-arm64.tar.gz</code>，3,645,944 bytes，SHA256 <code>15a7a65c048e4bac4dc1e792c2106df979d7e68ca28b36e213343c8d1e3dde2e</code></dd></div>
      <div><dt>签名</dt><dd>ad-hoc 签名，无 Developer ID，无 notarization；Gatekeeper 首次下载体验未认证。</dd></div>
      <div><dt>下载</dt><dd><a href={releasePlan.releaseUrl}>GitHub Release v2.0.0</a> · <Link href="/docs/v2.0/getting-started">安装与校验步骤</Link></dd></div>
    </dl></section>
    <section><h2>边界与已知限制</h2><p>M18 证明的是 Mochi → Native 的纯 Mio 自编译，不表示从 <code>.mio</code> 源码开始的完整工具链已经摆脱 Go。源码前端、VM、LSP 和 <code>mochi-aot</code> 仍为 Go 实现；从源码重建与首次 Seed 需要 Go。Native 支持集合小于 VM：完整 Map、通用 CLI argv、任意 MMA 宿主桥接和任意多态函数值没有完整 Native 承诺。</p><p>分代 GC（M19）与 High/Balanced/Low 三档未实现；WebAssembly Playground 未发布。IDE 插件独立发行，本轮未完成 v2.0.0 的 IDE 端到端认证。</p><Link href="/releases/2.0.0/migration">阅读迁移说明 →</Link></section>
    <section><h2>来源</h2><dl className="release-details">
      <div><dt>源码提交</dt><dd><a href={source}>{commit}</a></dd></div>
      <div><dt>技术依据</dt><dd><code>docs/releases/v2.0.0.md</code>、<code>docs/releases/v2.0.0-platforms.md</code>、<code>docs/NATIVE_AOT_M18.md</code></dd></div>
      <div><dt>文档验证</dt><dd><Link href="/docs/v2.0/tooling/verification">v2.0.0 验证与来源</Link> · <code>verification/v2.0.0-release/results.json</code></dd></div>
    </dl></section>
  </ReleaseShell>;
}
