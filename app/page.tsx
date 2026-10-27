import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { layoutOptions, sections } from '@/lib/navigation';
import { HomeCode } from '@/components/home-code';
import { defaultVersion, getVersion, versionLabel } from '@/lib/versions.mjs';
import { ReleaseLinks } from '@/components/release-links';
import { releasePlan } from '@/lib/releases.mjs';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('Mio · 澪光文档', '认识 Mio 编程语言，阅读稳定版文档与 Mio v2.0.0 正式发行信息。', '/');
export default function Home() {
  return <HomeLayout {...layoutOptions}>
    <main className="hikari-home" id="main-content" tabIndex={-1}>
      <section className="release-banner home-release" aria-labelledby="release-title"><div className="release-banner-copy"><div className="release-heading"><h2 id="release-title">Mio <span>V{releasePlan.version}</span></h2><span className={`version-badge ${releasePlan.released ? 'is-stable' : 'is-development'}`}>{releasePlan.released ? '语言正式版' : '开发中'}</span></div><p>{releasePlan.released ? 'Mochi VM · macOS ARM64 Native AOT' : '下一程，正在准备。浏览开发文档与已验证的变化；正式发布与安装包仍待最终验收。'}</p><Link className="release-summary" href="/releases/2.0.0">{releasePlan.released ? '查看更新' : '了解 V2.0.0 发布准备'} <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="release-banner-nav"><ReleaseLinks /></div></section>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title"><span className="hero-name">Mio</span>小巧的核心，<br /><span>清晰地表达。</span></h1>
          <p className="hero-intro">认识 Mio，一门采用日语罗马音关键字的静态强类型编程语言。以精简的语言核心，组合按需导入的 Bunko 标准库。</p>
          <Link className="home-version" href="/docs/versions"><span className="release-dot" aria-hidden="true" />默认文档：{versionLabel(getVersion(defaultVersion)!)}<ArrowUpRight size={14} aria-hidden="true" /></Link>
          <div className="hero-actions"><Link className="primary-action" href="/download/2.0.0">下载 Mio v2.0.0 <ArrowRight size={18} aria-hidden="true" /></Link><Link className="secondary-action" href="/docs/v2.0/learn">开始学习 <ArrowRight size={18} aria-hidden="true" /></Link></div>
          <p className="hero-note">当前执行路径：Mio 源码 → Mochi 字节码 → Mochi VM</p>
        </div>
        <HomeCode />
      </section>
      <section className="principles" aria-label="Mio 的设计取向">
        <div><h2>规则清晰，类型明确</h2><p>用 kaku 声明变量，用 waza 定义函数。数值转换显式书写，让代码的意图更容易读懂。</p></div>
        <div><h2>需要什么，导入什么</h2><p>通过 yobu 引入 kiso/ 模块。从数学运算开始，逐步探索数组、文本与文件处理。</p></div>
        <div><h2>从源码到执行</h2><p>先检查，再运行；也可以生成 .mochi 字节码，使用同一套 CLI 执行与反汇编。</p></div>
      </section>
      <section className="learning-path" aria-labelledby="path-title"><div><h2 id="path-title">从第一行，走向完整程序。</h2><p>第一次接触 Mio？从安装开始。已经有问题要查？直接进入对应的参考栏目。</p></div><div className="section-links">{sections.map((section) => <Link href={section.url} key={section.url}><span><strong>{section.label}<small>{section.title}</small></strong><span className="path-description">{section.description}</span></span><ArrowUpRight size={20} aria-hidden="true" /></Link>)}</div></section>
      <aside className="status-note"><strong>关于 v2.0.0 的状态</strong><p>Mio v2.0.0 已正式发布，M18 已完成 Mochi → Native 的纯 Mio 自编译。从 <code>.mio</code> 源码到 Native 的完整工具链仍未完全摆脱 Go；分代 GC 尚未发布。文档站已接入基于既有 WebAssembly 构建的 Playground。</p><Link href="/docs/v2.0/internals/native-aot">了解 Native AOT 与版本边界 <ArrowRight size={15} aria-hidden="true" /></Link></aside>
      <footer className="home-footer"><span>Mio Kōbō · 澪光 / Hikari</span><span>中文文档 · <a href="https://github.com/mio-kobo/mio">核心源码 <ArrowUpRight size={13} aria-hidden="true" /></a></span></footer>
    </main>
  </HomeLayout>;
}
