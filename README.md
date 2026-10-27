# Mio Docs · 澪光

独立 mio-docs 仓库中的正式文档网站。Next.js App Router + Fumadocs MDX Macro API + Fumadocs UI；使用官方 `root: "version"` 版本目录与原生侧栏选择器。

## 本地运行

使用 Node.js 24 LTS 与 `package-lock.json` 安装依赖：

```sh
npm ci
npm run dev
npm run types:check
npm run test:versions
npm run check:versions
npm run check:links
npm run check:playground
npm run check:tutorial
npm run build
npm run start -- --hostname 127.0.0.1 --port 3210
BASE_URL=http://127.0.0.1:3210 npm run test:versions
BASE_URL=http://127.0.0.1:3210 npm run check:links
# 可选外链联网检查
CHECK_EXTERNAL=1 npm run check:links
```

**Mio v2.0.0 已于 2026-10-21 正式发布**：Tag `v2.0.0`，源码提交 `0ce04dd06c6c6e4e26f55a2c0b4ffb23aa942a0a`，CLI `Mio 2.0.0`，首发平台 macOS Apple Silicon / ARM64。`/docs` 当前仍进入站点默认稳定版 `/docs/v1.0`；`/docs/v2.0` 的正文已按 v2.0.0 正式版核对，但站点注册表仍将该目录标记为 Development。V2.0.0 冻结快照与默认入口切换必须在站点验收完成后另行激活，不能把语言发布状态和站点版本状态混为一谈。

注册表 `content/versions.json` 支持 `2.1`、`2.10`、`3.1.2` 等数字版本，不为示例版本生成公开空页。旧 URL 和 B 的未版本化资料保留；它们不自动归属稳定版本，也不混入版本搜索。

侧栏顶部原生版本下拉框在桌面/手机上均可用；切换优先投影同名章节，缺页回目标版本首页并提示。可从 `/docs/v2.0/development` 切到 V1.0 验证真实回退。搜索默认当前版本，使用构建期生成的静态数据库在客户端筛选版本与中文 locale，并标明结果版本。独立课程入口已移除，Learn 学习文档与 Playground 保留。

当前只提供中文。英文/日文路由已预留，未翻译路径返回 404，source 禁止中文 fallback 假装译文。

## 示例验证

V1 使用其固定提交构建的 CLI；V2 使用官方 v2.0.0 发行包。源码默认 CLI 字符串与 Release 标签可能不同，详细来源见 `content/LEARN_SOURCES.json`：

```sh
DOCS_VERSION=v1.0 MIO_CLI=/path/to/v1/mio MIO_BUNKO=/path/to/v1/bunko npm run check:examples
DOCS_VERSION=v2.0 \
  MIO_CLI=/path/to/mio-2.0.0-darwin-arm64/mio \
  MIO_BUNKO=/path/to/mio-2.0.0-darwin-arm64/bunko \
  npm run check:examples
```

教程验证器检查当前各版的普通程序、原五课练习及 Hello 的 Mochi build/exec/disasm。v2.0 最近一次结果为 15 个完整程序与 5 个练习通过，详见 `verification/v2.0.0-release/results.json`。完整内容验证（含测试包、新增练习、技术参考和 API 声明）使用下面的独立流程。脚本只在系统临时目录构建与运行，不修改核心仓库。

## 浏览器 Playground

文档中的 Mio 代码块会在构建期由 Shiki transformer 标记，并由 `components/mio-code-block.tsx` 自动换成交互式 Playground；原始源码在语法高亮前保存，不依赖抓取高亮 DOM。只有 `mio` 代码块会接入，首次点击运行或检查时才加载 `public/wasm/mio.wasm` 与 `public/wasm/wasm_exec.js`。

运行时是独立 Worker 中的官方 Go `js/wasm` ABI：调用 `mioExecute(source, "run" | "check")`，按消息 ID 串行处理请求。执行超时为 10 秒，停止或超时会真实 `terminate()` Worker，下一次请求重新初始化。页面级共享一个 Worker，源码、输出、诊断和待处理请求数均有上限。

Mio 示例不再在 Playground 下方重复渲染静态 stdout；结果、诊断与耗时统一由实时运行面板展示。CLI、Mochi、测试和 Native AOT 等独立命令的技术输出仍保留。逐字节 stdout 契约保存在 `fixtures/docs/playground-stdout.json`，供 CLI 验证脚本使用。

`npm run check:playground` 会自动收集 `content/docs/` 中的所有 Mio 代码块，用真实的 `public/wasm/mio-worker.js`、`mio.wasm` 和 `wasm_exec.js` 执行，并检查分类、`check` 状态、`run` 状态、stdout、诊断和错误。预期值保存在 `fixtures/docs/playground-expectations.json`；`no-run`、`mode="test"` 和 WASM 未内置模块的示例会被明确分类而不执行。Mio 编译器或 WASM 升级后，先运行 `npm run update:playground`，审阅预期值差异，再提交。回归测试还覆盖多个示例连续执行、诊断后恢复、超时终止、Worker 中断和 WASM 加载失败；失败信息会列出对应的 `content/docs/...:行号` 与期望/实际结果。

Playground 只内置 WASM 中的 `kiso/math`、`kiso/array`、`kiso/string`、`kiso/bytes`、`kiso/utf8`；依赖其他模块（如 `kiso/fs`、`kiso/testing`）的示例保持静态。不完整片段可用 `no-run` 元数据排除：

````md
```mio no-run
math.sqrt(144.0);
```
````

`mode="test"` 示例也不会自动接入，因为浏览器接口只有 `run` 与 `check`。


## 交互式教程

`/docs/v2.0/tutorials` 提供五课 MVP 教程：Hello World、变量、数值计算、条件分支、函数与返回值。课程正文是 MDX，练习元数据集中在 `lib/tutorial-data.ts`；`MioExercise` 复用现有 `runMio()` 和页面级 Worker，不复制编译器或 WASM 加载器。

练习的“检查答案”会真实执行当前源码，并按稳定练习 ID 校验标准化 stdout，而不是读取或匹配前端源码字符串。运行、编译诊断、运行时错误、超时、停止和重置仍使用 Playground 的同一套运行时边界。完成状态、最后访问课程与每个练习的草稿保存在 `localStorage`（键 `mio-tutorial-progress-v1`）；服务端和首次客户端渲染都先显示稳定占位，再由 `useEffect` 读取，避免 hydration mismatch。

```sh
npm run check:tutorial
```

该测试用真实 `public/wasm/mio-worker.js`、`mio.wasm` 和 `wasm_exec.js` 验证五课的初始代码都是可编译、可运行的错误答案，五份参考答案都能通过 stdout 校验；同时覆盖诊断后恢复、停止后重新运行，以及进度/草稿存储和换行归一化。练习代码或预期输出变更后，先更新 `lib/tutorial-data.ts` 与测试参考答案，再运行该命令。


## 新增文档版本

```sh
npm run docs:version -- --version <主.次[.修订]> --commit <真实40位提交> --ref <真实来源ref>
```

只生成 `.docs-drafts/` 中未公开的目录、版本元数据与迁移指南模板。填写真实内容、审阅证据后才可执行 `--activate <版本id>`；Stable 激活还会核对正式 Release 与提交。已注册版本拒绝覆盖，历史正文有 SHA-256 锁，不能在新增版本时自动刷新。该工具不创建 Git tag、GitHub Release、Commit 或 Push。

详细 URL、术语、国际化、发布流程与 A/B 文件所有权见 [DOCS_CONTRACT.md](./DOCS_CONTRACT.md)。A 不改 B 技术正文、既有用户改动或相邻仓库；已有 pnpm 文件保留。

## 设计与边界

Mio Hikari / 澪光：Light `#4370B9`、Dark `#91BEF6`，点缀 `#A99BDD` / `#79C5C7`，暗色背景 `#0E1728`。

M18 已通过验收：纯 Mio Native AOT 完成 Mochi → Native 的多代自编译，正式链中 Go AOT 只生成 Seed。这不表示从 `.mio` 源码开始的完整工具链已经完全摆脱 Go；源码前端、VM、LSP 和 `mochi-aot` 仍为 Go 实现。分代 GC（M19）与三档 GC 未发布；文档站已通过既有 `mio.wasm` 提供浏览器 Playground。v2.0.0 首发平台仅 macOS Apple Silicon / ARM64；本站本地构建不等于站点部署。

[Fumadocs 官方版本机制](https://www.fumadocs.dev/docs/navigation) · [官方 Next.js 集成](https://www.fumadocs.dev/docs/mdx/next)。2026-10-20 npm 稳定版：Core/UI `16.17.7`、MDX `15.4.8`，沿用现有依赖。

## 内容质量审查与冻结勘误

```sh
python3 scripts/check-content-quality.py --core /absolute/path/to/mio --go-tests
```

验证器分别从 `content/versions.json` 的精确提交取 `git archive`，构建各版 CLI；逐字节检查完整 Mio 示例、测试包、练习及反例。该轮质量审计固定于当时快照：V1 与 V2 开发快照分别核对 171/358 条公开声明，不能把这个计数当作 v2.0.0 正式版的声明总数。完整命令、环境、退出码、stdout/stderr 和源码哈希见 `verification/content-quality/results.json`。首次失败记录保留，不以重跑覆盖历史结论。v2.0.0 发行包的文档验证记录见 `verification/v2.0.0-release/results.json`。

审计与处置见 `verification/content-quality/AUDIT.md`、`page-review.json` 和 `RESULT.md`；修订页面来源见 `content/QUALITY_SOURCES.json`。V2 Development 正文已独立精修。V1 Stable 正文与历史锁保持原样，修订候选仅存 `.docs-drafts/corrections/v1.0`；审批材料与差异见 `.docs-drafts/corrections/PROPOSAL.md`。草稿验证不代表审核批准，不自动激活或刷新历史锁。

## V2.0.0 正式发布与站点状态

官方发布已完成：

- Tag：`v2.0.0`
- 源码提交：`0ce04dd06c6c6e4e26f55a2c0b4ffb23aa942a0a`
- 发布时间：2026-10-21T08:31:25Z
- 唯一正式资产：`mio-2.0.0-darwin-arm64.tar.gz`，3,645,944 bytes，SHA256 `15a7a65c048e4bac4dc1e792c2106df979d7e68ca28b36e213343c8d1e3dde2e`
- 平台：macOS Apple Silicon / ARM64
- 签名：ad-hoc；无 Developer ID；无 notarization

`/releases/2.0.0`、`/releases/2.0.0/migration` 与 `/download/2.0.0` 已按正式发布更新。首页 banner 通过 `content/release-plan.json` 的 `released`、`releaseUrl`、`publishedAt` 显示正式状态。`/download/2.0.0` 直接链接官方 Release 并展示已核验的大小与 SHA256；`content/downloads.json` 仍只登记 V1.0.0 的五个包，V2.0.0 没有写入该门禁清单，因此不会伪造 `Downloads` 组件的已核验记录。

**站点默认入口仍是 `/docs/v1.0`，`/docs/v2.0` 仍标记为 Development。** 原因不是语言未发布，而是站点版本激活尚需完成冻结快照、审阅证据与浏览器验收。不要把当前状态写成“V2.0.0 尚未发布”。

可用 `MIO_DOCS_DIST_DIR=.next-release` 进行隔离构建，避免覆盖正在使用的 `.next`。预览：

```sh
MIO_DOCS_DIST_DIR=.next-release npm run build
MIO_DOCS_DIST_DIR=.next-release npm run start -- --hostname 127.0.0.1 --port 3211
BASE_URL=http://127.0.0.1:3211 npm run test:versions
BASE_URL=http://127.0.0.1:3211 npm run test:release
BASE_URL=http://127.0.0.1:3211 npm run check:links
npm run check:release -- --online
```

SEO 使用 `MIO_DOCS_SITE_URL` 的真实 HTTPS 站点源；未配置时 canonical 只以本地预览源生成，sitemap 为空，不能直接作为生产配置。sitemap 只收录 Stable/Legacy 文档及已开放的正式页面，Development 与 RC 继续 noindex。

### 仍待执行的站点激活

1. 在 `.docs-drafts/v2.0.0` 完成最终正文审阅，填写 `version.json` 的 Stable、release、frozen 与 `review.evidence`。RC4 目录不是正式发布证据，不能直接当作 v2.0.0 最终快照。
2. 在隔离副本运行完整网站验收，将 `build/types/routes/versions/search/desktop/mobile/accessibility/artifacts/releaseNotes/migration` 的真实结果写入证据 JSON；`reviewedBy` 必须由维护者确认，禁止自动填 `passed`。
3. 激活新的 `v2.0.0` 版本根，更新 `content/versions.json` 的 `defaultVersion`；旧 `/docs/v2.0` 保持原 URL，不重命名、不偷偷提升。
4. 把已实际下载核验的 V2.0.0 资产写入 `content/downloads.json`，再设置 `content/release-plan.json` 的 `mode=live` 和 acceptance。
5. 设置真实 `MIO_DOCS_SITE_URL`，运行 types:check、test:versions、test:release、check:versions、check:release -- --online、check:links 和 build，并复核桌面、手机、主题与键盘操作。
6. 本轮不提交、不推送、不部署。回滚需同时恢复 release-plan、versions 默认值与 downloads；不要删除旧 URL 或修改历史正文锁。

新增补丁与次版本同样使用 `2.0.1`、`2.1.0` 等完整版本号；测试 fixture 不产生公共空页面。发布状态支持 Development、Release Candidate、Stable、Legacy，兼容原 EOL；RC 必须有实际 prerelease，不接管稳定入口。

## GitHub Pages 生产部署

目标为 `main → GitHub Actions → Next.js export → GitHub Pages → Cloudflare → https://mio.kaelexvp.cc`。`next.config.mjs` 使用 `output: 'export'`、`trailingSlash: true`、`images.unoptimized: true`。站点位于自定义域名根路径，没有 `/mio-docs` basePath 或 assetPrefix。Node.js 24 的 `npm ci` 安装锁定依赖，`npm run build` 保留版本与发行检查并生成 `out/`；postbuild 会验证页面、搜索数据库、SEO 和 WASM 文件一致性。

`npm start` 只用于本地预览 `out/`，不启动 Next.js 服务端。默认地址为 `http://127.0.0.1:3210`，可用 `--hostname`、`--port` 指定地址。深层路由实际对应 `<route>/index.html`；未知路径返回 `404.html` 和 HTTP 404。生产环境由 GitHub Pages 提供文件，不需要 Node.js 服务器。

搜索实现使用已锁定的 Fumadocs 16.17.7 `createSearchAPI(...).staticGET` 与 `staticClient`，数据库为 `/api/search/index.json`。该路径是静态 JSON 文件，不处理请求参数；中文分词、版本标签和语言筛选均在浏览器执行。`lib/static-search.ts` 对结果再次检查版本和语言，并为所有结果附加版本标识。未版本化文档不混入搜索。

`/docs/` 和旧入口由构建期生成的页面承接，浏览器跳转到原有默认版本并保留 query/hash；禁用 JavaScript 时仍有目标链接。`/zh-CN/docs/...` 也有静态跳转页。仅生成已发布语言，英文、日文和未知版本返回 404。V1.0 / V2.0 注册表、默认版本与历史冻结数据不因部署改变。

WASM 直接发布自 `public/wasm/`，运行、诊断、停止和 Worker 重启仍由原始运行器完成；不需要 Cloudflare Worker、跨源隔离或服务端 API。`public/.nojekyll` 随产物发布，确保 `_next` 可用。`public/CNAME` 记录目标域名，但 Actions 部署仍必须在 GitHub Pages 控制台绑定域名。

### 发布前验证

```sh
npm ci
npm run types:check
npm run check:links
npm run check:playground
npm run check:tutorial
npm run test:versions
npm run test:release
MIO_DOCS_SITE_URL=https://mio.kaelexvp.cc npm run build
npm start
# 在另一个终端对纯静态产物验证：
BASE_URL=http://127.0.0.1:3210 npm run check:links
BASE_URL=http://127.0.0.1:3210 npm run test:versions
```

Playground 的预期记录已按当前文档使用原始 WASM 补齐；既有记录保持原值。部分语法片段会报告真实编译诊断，这些也有明确预期。

### 必须手动完成的控制台操作

1. GitHub `mio-kobo/mio-docs → Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**，允许仓库运行 Actions，并允许 `github-pages` 环境从 `main` 部署。由维护者提交并推送代码后，工作流自动构建；也可手动运行 **Deploy GitHub Pages**。
2. 在 GitHub Pages 的 **Custom domain** 保存 `mio.kaelexvp.cc`。建议先在组织的 Pages 设置按 GitHub 提示验证域名所有权，再配置 DNS。Actions 部署不会根据 CNAME 文件自动完成控制台绑定。
3. Cloudflare 的 `kaelexvp.cc` DNS 中设置 `CNAME mio → mio-kobo.github.io`，目标不带协议或 `/mio-docs`。清理该主机名的冲突记录。先设 DNS only，等待 GitHub DNS 检查及证书签发完成，并在 GitHub 启用 **Enforce HTTPS**。
4. GitHub HTTPS 正常后，按目标架构将该 CNAME 切换为 **Proxied**。Cloudflare SSL/TLS 选择 **Full (strict)**，确认边缘证书覆盖该域名；使用 Universal SSL 时检查其启用状态。避免 Flexible 模式导致重定向循环。
5. 不要配置将所有路径回退到首页的 SPA 重写。保持默认静态资源路径和查询字符串；如果有 Cache Everything / 自定义缓存规则，不要把 HTML、搜索 JSON 或固定文件名的 WASM 长期缓存。发布后按需清理旧缓存，并检查首页、深层文档、搜索和 `/wasm/mio.wasm`。

参考：[Fumadocs Static Search](https://www.fumadocs.dev/docs/headless/search/orama)、[GitHub 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)、[Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)。

### 本次部署适配文件清单

- 构建与依赖：`next.config.mjs`、`package.json`、`package-lock.json`、`tsconfig.json`、`.gitignore`。
- 自动部署：`.github/workflows/deploy-pages.yml`。
- 搜索：移除动态 `app/api/search/route.ts`，新增 `app/api/search/index.json/route.ts` 与 `lib/static-search.ts`，修改 `components/search-dialog.tsx`。
- 静态路由：`app/docs/[[...slug]]/page.tsx`、`app/[lang]/docs/[[...slug]]/page.tsx`、`lib/render-doc.tsx`、新增 `components/static-redirect.tsx`。
- SEO 与域名：`lib/seo.ts`、`app/sitemap.ts`、`app/robots.ts`、`app/not-found.tsx`、新增 `public/CNAME` 与 `public/.nojekyll`。
- 链接与来源：`components/home-code.tsx` 修复模块链接；`content/docs/v2.0/kiso/api.mdx` 修复内部链接；`content/docs/v2.0/index.mdx` 补充固定源码提交；`content/docs/meta.json` 按要求移除课程入口。
- 验证与预览：新增 `scripts/check-export.mjs`、`scripts/serve-static.mjs`；修改 `scripts/check-links.mjs`、`scripts/versioning.test.mjs`、`scripts/release.test.mjs`，补齐 `fixtures/docs/playground-expectations.json`。
- 说明：`README.md`。开始本次工作前已存在的首页样式、Learn 与 Reference 文档等改动继续保留，不归入本次新增变更。未改动 `public/wasm/`、`content/versions.json` 或历史版本冻结数据。
