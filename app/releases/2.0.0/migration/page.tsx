import Link from 'next/link';
import { ReleaseShell } from '@/components/release-shell';
import { pageMetadata } from '@/lib/seo';
import { releasePlan } from '@/lib/releases.mjs';
export const metadata = pageMetadata('迁移到 Mio v2.0.0', '从 V1.0 迁移到 v2.0.0：安装、VM 验证、Native AOT 与兼容边界。', '/releases/2.0.0/migration', releasePlan.mode !== 'live');
export default function Page() {
 return <ReleaseShell title="迁移到 Mio v2.0.0" description={releasePlan.released ? '面向 V1.0 用户的正式迁移指南。先保留 V1 工具链，再在独立目录安装 v2.0.0。' : '迁移准备。'}>
  <aside className="release-callout"><strong>{releasePlan.released ? 'Stable · 正式迁移指南' : 'Development'}</strong><p>保留可用的 V1 工具链与 Bunko，使用独立的 <code>MIO_BUNKO</code>。不要混用两个版本的标准库。</p></aside>
  <section><h2>迁移步骤</h2><ol className="migration-steps">
    <li><h3>固定当前 V1 环境</h3><p>记录 V1 CLI 字符串、Bunko 路径和项目测试结果，保留原工具链作为回退环境。</p><Link href="/docs/v1.0/getting-started">V1.0 安装与运行 →</Link></li>
    <li><h3>安装 v2.0.0 发行包</h3><p>从官方 Release 下载 <code>mio-2.0.0-darwin-arm64.tar.gz</code> 与 <code>SHA256SUMS</code>，校验后解压到独立目录，设置 PATH 与 <code>MIO_BUNKO</code>。</p><Link href="/docs/v2.0/getting-started">v2.0.0 安装与校验 →</Link></li>
    <li><h3>先留在 Mochi VM</h3><p>用 v2.0.0 的 <code>mio check</code>、<code>run</code>、<code>build</code>、<code>exec</code> 重跑项目测试，重建旧字节码并核对 stdout、退出码与文件行为。没有“所有 V1 应用无修改兼容”的认证。</p><Link href="/docs/v2.0/tooling/cli">v2.0.0 CLI 参考 →</Link></li>
    <li><h3>按需尝试 Native AOT</h3><p>先确认程序在 Native 子集内。<code>mochi-aot</code> 生成未签名 Mach-O，需要 codesign；纯 Mio <code>native-aot</code> 使用两个无末尾换行的 config 文件，失败分支可能返回退出码 0，必须检查成功标记和新产物。</p><Link href="/docs/v2.0/internals/native-aot">Native AOT 流程与限制 →</Link></li>
    <li><h3>保留回退路径</h3><p>出现不支持的 lowering、Native 运行差异或平台限制时，恢复 V1 工具链或继续使用 v2.0.0 的 Mochi VM。不要通过关闭 GC、修改编译器或删除断言来强行迁移。</p><Link href="/docs/v2.0/tooling/troubleshooting">故障排查 →</Link></li>
  </ol></section>
  <section><h2>版本与平台边界</h2><p>v2.0.0 的正式平台为 macOS Apple Silicon / ARM64；Intel Mac、Linux、Windows 没有正式支持认证。源码前端、VM、LSP 仍为 Go；M18 完成的是 Mochi → Native 的纯 Mio 自编译。分代 GC 与三档 GC 未实现，Native 支持集合小于 VM。</p><p>CLI 版本应为 <code>Mio 2.0.0</code>；V1 标签源码的默认字符串可能是 <code>Mio 1.0.0-beta.2</code>。插件版本与核心版本独立，不能互相推断。</p><Link href="/releases/2.0.0">返回 v2.0.0 发行说明 →</Link></section>
 </ReleaseShell>;
}
