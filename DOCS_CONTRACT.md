# Mio Docs 协作与版本契约

更新：2026-10-20。Codex A 负责架构、配置、选择器、导航与入门内容；Codex B 负责语言规范、API 与技术验证。用户指令及已有文件优先，不以此契约授权覆盖他人的并行改动。

## 版本系统

使用当前 Fumadocs 官方 [Root Type 版本机制](https://www.fumadocs.dev/docs/navigation)：每个版本拥有独立目录与 `meta.json`，设置 `root: "version"`。DocsLayout 原生在侧栏与移动抽屉中渲染版本下拉框，通过官方 `findProjection()` 保留同名章节；目标缺页时走目标版本的 index。A 只扩展状态标签、回退提示、数字排序与搜索过滤，不另造整套导航器。

统一清单：`content/versions.json`。字段包括：

| 字段 | 含义与约束 |
| --- | --- |
| `id` / `version` | 精确 URL id（如 `v2.10`）与数字版本（`2.10`）；支持主、次及可选修订版本 |
| `status` | `Stable`、`Legacy`、`Development`、`Release Candidate`、`EOL` |
| `maintenance` | 独立维护状态：`unspecified`、`maintained`、`security-only`、`unsupported`、`preview`；不凭空承诺 LTS |
| `release` | 正式发布标签、URL、UTC 发布时间与 prerelease 标志；Development 必须为 null；Release Candidate 必须指向真实 prerelease 并冻结快照 |
| `source` | 精确 40 位提交、来源 ref、实际 CLI 字符串；三者不能混为同一版本证据 |
| `locales` | 真正提供该版本内容的语言，不填未完成的翻译 |
| `frozen` | 已发布内容冻结，受文件哈希锁保护 |
| `defaultVersion` | 必须等于按数字比较得到的最新正式 Stable 版本 |

版本比较使用数字分量；`2.10 > 2.3`，`3.1.2 > 3.1`。`2.0` 与 `2.0.0` 数字排序相等，但 URL 身份独立：保留 `/docs/v2.0` Development，最终发布时新增独立 `/docs/v2.0.0` 快照；不可重命名旧 URL 或将其偷偷提升为正式版。精确 id 不得重复。新正式版本采用完整三段版本号。URL 大小写与字符串一旦注册就不再重命名。

**Latest 是派生标记**，表示最新正式 Stable，不是能把开发快照升级为发布版的状态。Legacy 只表示旧的已发布文档；EOL 必须附明确的维护终止证据。没有证据的维护承诺标为 unspecified。

## 当前事实与默认入口

| 精确版本 | 状态 | 来源 |
| --- | --- | --- |
| `/docs/v1.0` | Stable · Latest | [v1.0.0 正式 Release](https://github.com/mio-kobo/mio/releases/tag/v1.0.0)，2026-10-17T13:02:10Z；提交 `51f1ba883767c1fc08ba415fbb0075316ff03106` |
| `/docs/v2.0` | Development | `Mio-2` 提交 `8b53a25142b0da1192a6c4868e807385d7bb50f9`；没有正式发布记录 |

`/docs` 以可随新发布更新的重定向进入最新稳定版本，当前 `/docs/v1.0`。开发预览不会接管该入口。V2 页面、选项、搜索标签始终显式标注 Development，并设 noindex。V2.1、V2.10、V3.1.2 等只是测试 fixture 中的格式案例，不生成公共空页面。

V1.0 标签源码构建出的默认 CLI 字符串是 `Mio 1.0.0-beta.2`；V2 快照是 `Mio 1.0.0-beta.1`。发布身份以正式 GitHub Release 为准，教程如实记录源码构建结果，不修改核心源码来掩盖差异。

M17e 尚未验收，M18 尚未启动。Compiler A 生成/启动、Mochi 字节码自编译和纯 Mio 原生自举属于不同事实，不能混淆。纯 Mio 原生自举和 WebAssembly Playground 均不能宣传为已发布。

## 内容目录、导航与稳定 URL

```text
content/docs/
  meta.json
  versions.mdx
  v1.0/
    meta.json          # root: "version"
    index.mdx
    getting-started.mdx
    learn/
    reference/
    kiso/
    tooling/
    internals/
  v2.0/                # 同样的独立结构，明确标为 Development
```

每个版本内六栏目固定顺序：Getting Started、Learn、Reference、Kiso、Tooling、Internals。slug 小写 ASCII + 连字符；版本允许点。示例：`/docs/v2.1/learn/variables`、`/docs/v3.1.2/reference/types`。新增版本无需新增路由文件。

精确版本目录独立存储正文。不能用 symlink、运行时读取“最新版本”正文、或跨版本 re-export 技术正文替代快照；新版本发布不能批量覆盖旧版语义和 API。共享组件只提供排版与交互；带语义的示例若共享，必须固定版本/内容哈希。首页示例是展示资源，各版教程仍各自保存完整代码并独立执行验证。

旧 URL 原则：已有 B 的 `/docs/language`、`bunko`、`mochi`、`lsp`、`editors`、`native-aot` 与未版本化技术子页保持文件和 URL 原状，显示“未版本化迁移资料”提示，排除在版本搜索之外。不能自动把这些资料归到 V1.0。A 的旧入门 URL 仅在不存在原页、且目标稳定版章节存在时重定向；已有 B 页面优先保留。

版本化参考由 B 依据目标提交重新核验后写入对应精确版本目录。A 的栏目入口不冒充规范/API 正文，并明确指出未版本化旧资料不属于本版 API 保证。B 完成时由 A 添加导航；正文及来源证明仍归 B。

## 文件所有权与并行协作

| 所有者 | 范围 |
| --- | --- |
| A 网站 | `app/**`、`components/**`、`lib/**`、网站/依赖/TypeScript/主题配置、`README.md`、本文 |
| A 版本 | `content/versions.json`、`content/version-locks/**`、所有 `meta.json`、`content/docs/versions.mdx`、版本脚手架与版本/路由测试 |
| A 入门正文 | `content/docs/v*/index.mdx`、`v*/getting-started.mdx`、`v*/learn/**`、四个栏目 `reference/kiso/tooling/internals` 的 `index.mdx` 入口、`v2.0/development.mdx`、`content/LEARN_SOURCES.json` |
| B 技术正文 | `content/docs/v*/reference/**`、`v*/kiso/**`、`v*/tooling/**`、`v*/internals/**`，排除 A 的 `index.mdx` / `meta.json` |
| B 已有资料 | 现有六个旧顶层技术页、未版本化 `reference/kiso/tooling/internals` 子页、`content/SOURCES.json`、`fixtures/**`、`verification/**`、`scripts/check-reference.py` |
| A 验证脚本 | `scripts/check-links.mjs`、`check-examples.mjs`、`check-versions.mjs`、`create-docs-version.mjs`、`versioning.test.mjs` |

B 不改站点配置、选择器、首页与 Learn；A 不改 B 的技术正文、API 签名、fixture 和验证证据。发现对方资料的问题记录并交接，不通过渲染层偷偷替换技术内容。版本化迁移由 B 完成核验与正文写入，A 只接导航与配置。

相邻核心仓库含 M17e 开发改动；本轮不编辑、不清理。已有未跟踪 `pnpm-lock.yaml`、`pnpm-workspace.yaml` 保持原状，npm 的现有锁文件继续作为 README 中的复现入口。不得 Commit、Push、Tag、Release。

## 新版本流程与历史冻结

1. 取得真实源 ref 与精确提交。执行脚手架，例如 `npm run docs:version -- --version 2.1 --commit <40位提交> --ref <真实ref>`。它只在 `.docs-drafts/v2.1` 生成首页、`root: "version"` 元数据、候选版本清单和迁移指南模板；不写入公开内容、不伪造特性、不覆盖已存在目录。
2. A 编写入门/导航；B 编写目标提交的语言参考和 API。填写迁移范围、实际兼容变化、命令、示例输出及错误条件；不得简单复制当前开发 API 到历史版本。
3. 所有 TODO 必须完成，实际验证通过。准备本地审阅证据 JSON（至少 `status: "passed"` 与 `sourceCommit` 精确匹配），在候选 `version.json` 的 `review` 中记录 approved 和 evidence 相对路径。此标记代表维护者完成审阅，不是脚手架自行作出的保证。
4. 正式版本须已有真实、非 draft、非 prerelease 的 GitHub Release；填写其 tag、url、publishedAt，并设置 frozen。`--activate vX.Y` 会通过官方 API 再核对发布记录、标签对应提交、审阅证据与模板完整性。Development 只能保持 release=null 和明确预览状态。
5. 执行 `npm run docs:version -- --activate vX.Y`，将**已审阅草稿**复制到全新版本目录、注册清单、生成导航及已发布内容锁。已有版本拒绝覆盖；不会发布 Git 标签、Release，也不会提交或推送。新增开发版本不改变默认稳定版。
6. 发布站点之前完成下方验收。本站部署与 Mio 语言 Release 是两件独立的事；脚手架不创建语言 Release。

`content/version-locks/<id>.json` 固定已发布正文的 SHA-256。构建前校验历史锁；正文删除、替换或未审阅新增页均失败。允许经过核验的文档勘误，但须明确记录证据、审核并更新对应锁，不能在“新增下一个版本”时自动刷新旧锁。元数据导航调整不构成自动修改正文的许可。

## 版本切换与国际化

中文保留无前缀 `/docs/vX.Y/...`；未来实际译文使用 `/en/docs/vX.Y/...` 和 `/ja/docs/vX.Y/...`。`lib/i18n.ts` 当前只启用 zh-CN；Fumadocs source 使用 `fallbackLanguage: null`，不会在翻译 URL 下回退显示中文。

原生选择器在当前语言的 page tree 内投影章节；因此已提供译文时切换保留语言。无同名章节时回目标版本本语言首页，并通过非模态提示说明缺失章节。未提供的语言不创建 page tree 或入口；无译文返回 404，不能伪造已翻译内容。策略函数和测试另覆盖目标版本无该语言时显式返回中文目标的情况；生产选项只列当前 page tree 中真正可读的版本。

未来启用英文/日文时需要添加真实 locale 文件、对应版本 locales 与 UI 语言配置；现有 locale catch-all 路由、source、搜索和默认重定向可直接处理，不新增逐版本路由。版本号和语言段互相独立。

## 搜索隔离

沿用 Fumadocs 原生高级搜索索引和 tag 过滤。每个页面带 version tag 与 locale；对话框默认当前版本，首页默认最新 Stable，可显式换 tag，不提供清空版本过滤。服务端也强制单一合法版本，拒绝未知版本、多版本 tag 和未发布语言，不能仅靠前端过滤。

每条结果显示版本，搜索结果 URL 必须属于所选版本。未版本化技术迁移页不进入版本索引。新增版本只添加独立内容与注册项，索引自动识别；历史 API 不会因搜索聚合混入其他版本。

## 页面、术语与设计约定

每页 frontmatter 提供 title、description；布局生成唯一 H1，正文从 H2 开始。入门教程包含完整可运行程序、精确 stdout、解释、练习及预期、常见错误与下一步。Mio fenced 程序附 `text title="output"`，错误语法用行内代码明确说明。B 的技术示例由其独立 fixture 验证器负责，不纳入 A 的教程抽取器。

Mio 是语言；Bunko 是标准库物理根 `bunko/`；Kiso 对应公开 `kiso/` 导入路径；Mochi 需明确指字节码容器还是 VM。关键字保留 kaku / waza / kaesu / yobu 等真实拼写。

澪光 token：Light `#4370B9`、Dark `#91BEF6`，点缀 `#A99BDD` / `#79C5C7`，深色基底 `#0E1728`。保持键盘焦点、跳转主内容、代码横向滚动、复制、搜索、移动导航与主题切换。首页先讲 Mio 是什么，给真实代码、安装和学习入口；不放虚假的 Playground 控件。

## 验收与来源

```sh
npm run types:check
npm run test:versions
npm run check:versions
npm run check:links
DOCS_VERSION=v1.0 MIO_CLI=/path/to/v1/mio MIO_BUNKO=/path/to/v1/bunko npm run check:examples
DOCS_VERSION=v2.0 MIO_CLI=/path/to/v2/mio MIO_BUNKO=/path/to/v2/bunko npm run check:examples
npm run build
npm run start -- --hostname 127.0.0.1 --port 3210
BASE_URL=http://127.0.0.1:3210 npm run test:versions
BASE_URL=http://127.0.0.1:3210 npm run check:links
CHECK_EXTERNAL=1 npm run check:links
```

实际浏览器检查：桌面与手机的版本选择器；同名章节切换；V2-only development 章节切到 V1 的回退提示；亮/暗主题；搜索的当前版本默认值及结果归属；复制与语言缺页。纯函数测试覆盖数字排序、注册表约束、国际化策略、原生 projection 和脚手架；HTTP 测试覆盖默认重定向、精确路由、未知版本/未译语言 404、搜索服务端隔离。

Fumadocs 官方 Next.js / Macro API 与现有固定依赖一致，2026-10-20 npm 稳定版为 Core/UI 16.17.7、MDX 15.4.8。A 的示例在两个固定提交的干净 git archive 快照分别构建执行；来源见 `content/LEARN_SOURCES.json`。B 的来源按其 `content/SOURCES.json` 与 `verification/` 证据逐页记录，不能假定所有迁移页属于同一发布版本。外链匿名 404、尚未完成的 B 页面及上游构建警告须如实报告，不能宣称全站已完成不存在的验证。

## V2.0.0 网站发布门禁（2026-10-21）

`content/release-plan.json` 是首页展示、Release 与 V2 下载状态的共同开关，当前 `mode=prepared`、`docsVersion=v2.0`；`content/versions.json` 仍决定原生版本选项、搜索和默认文档。prepared 时 defaultVersion 必须保持 previousStable=v1.0。正式上线前遵循 README 的“V2.0.0 正式切换”步骤；`npm run build` 必须通过 `check-release.mjs`，禁止绕过门禁直接运行 next build 作为发布流程。

下载证据独立放在 `content/downloads.json`，不修改 B 的 verification 或 MDX。清单只录入逐包下载核对过的大小与 SHA256，`check:release -- --online` 再核对官方发布、标签提交及实际字节。Release Candidate 仍 noindex，不参与 latestStable。最终验收必须含 build/types/routes/versions/search/desktop/mobile/accessibility/artifacts/releaseNotes/migration，精确绑定提交并由维护者记录审阅。

V2.0.0 当前只提供网站发布准备页面，不复制或注册虚假的正式文档。公开发布前建立全新三段版本快照，由 B 负责技术正文审核；原 V1 和 V2 Development 均保留。本站更新没有修改任何 MDX 正文。
