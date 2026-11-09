# Mio v2.1.0 文档验收

验收日期：2026-11-09（JST）。[v2.1.0 正式标签](https://github.com/mio-kobo/mio/releases/tag/v2.1.0) 指向 `74e461b2985886160a285c7104d2a41090d0f548`；比较基线是 v2.0.0 的 `5d4c1dbdc75aba87e2213bec2b0031c4ff21f379`。使用 `git diff v2.0.0 v2.1.0` 区分原有语法与工具链、标准库变化。本机为 Darwin ARM64；`/opt/homebrew/bin/mio` 来自 Homebrew v2.1.0 Full，实际原生文件在 `/opt/homebrew/Cellar/mio/2.1.0/libexec/bin/mio`，SHA-256 为 `287850288e8847b5c514d389f25858a53bb2b76a61665fbe21c644e073715bf4`。正常验收时 `MIO_BUNKO` 未设置，标准库由发行包自动找到。

- **本机**：用发行 CLI 在临时目录检查、构建和运行独立程序。[本机命令、退出码与实际输出](native-smoke-results.json)；[原生示例差异与复现源码](native-doc-repros.json)。
- **发布 CI**：[发行工作流 42384976176](https://github.com/mio-kobo/mio/actions/runs/42384976176)、[全量 CI 42384113411](https://github.com/mio-kobo/mio/actions/runs/42384113411)。[证据索引](release-evidence-summary.json)摘自正式发布的 `*-native-report.json` 与 `*-verification.json`；`release-verification.json` 将发行工作流和资产绑定到上述提交。三台原生 Runner 分别为 macOS 15 ARM64、Ubuntu 24 x86_64、Windows Server 2025 AMD64。
- **网页**：使用部署目录内的同一个 Worker 与 WASM；[Web CI 42384113383](https://github.com/mio-kobo/mio/actions/runs/42384113383) 是上游正式标签的独立证据。本站的验证方法、模块矩阵与浏览器结果见 [Playground 验收](playground.md)。

| 功能 | 对应 V2.1 文档 | 变化 | 测试、预期与实际结果 | 结论 |
| --- | --- | --- | --- | --- |
| 泛型函数、泛型结构体 | `learn/generics.mdx` | 原生改进，语法已有 | 本机运行官方 `generics.mio`，输出 Mio / Mochi / 42 / hai；泛型结构体输出 42 / Mio。直接将数组字面量传给两个泛型函数的推断报 E0301，改用显式参数后分别输出 10 和 3 / 2 | PARTIAL |
| 跨包泛型 | `learn/generics.mdx` | 原生改进 | 本机运行 `array.make[string](2,"Mio")` 并读取元素，输出 Mio，退出 0 | PASS |
| Nullable | `learn/nullable-types.mdx` | 原生改进 | 本机运行正式示例 `nullable.mio`，非空分支输出 42、缺失分支输出 hai，退出 0 | PASS |
| 闭包与函数值 | `learn/closures-function-values.mdx` | 原生改进 | 本机运行正式闭包计数示例，输出 1 / 2 / 1；初始化时自引用的递归闭包 Web 输出 120，Native E0305 | PARTIAL |
| 定长与动态数组 | `learn/arrays.mdx` | 原生布局改进 | 正式数组示例、本机泛型动态数组与 Bunko array 4 项测试通过 | PASS |
| Map | `learn/map.mdx`、`reference/builtins.mdx`、`reference/collections.mdx` | 原生改进 | 本机正式示例输出 43 / hai；Native 的无参类型构造 `Map()` 报 E0303，已改用显式键和值类型 | PASS |
| 结构体、枚举与模式匹配 | `learn/enums-pattern-matching.mdx`、`learn/datatype.mdx`、`learn/generics.mdx`、`learn/scope.mdx`、`reference/collections.mdx` | 原生改进 | 正式 `structs_and_enums.mio` 输出 7 / 75 / 24 / 0；若干泛型枚举推断 E0306、非泛型枚举匹配 E_LOWER，Web 正常 | PARTIAL |
| 数值推断与显式转换 | `reference/types.mdx` | 原有 | 本机推断 int64 后转 uint8 输出 7，非法 int64/string 赋值 E0301 | PASS |
| 原生类型布局和边界检查 | `internals/native-aot.mdx` | 改进 | ARM64 混合结构体数组输出 42 / Mio；越界退出 1，未提供诊断文本 | PARTIAL |
| JSON | `kiso/encoding-json.mdx` | NEW | 本机正式示例输出 Mio 与紧凑 JSON；Bunko 3 项通过，Web 验证非法 JSON；文档两例输出 42 / Mio 及 JSON 转义文本 | PASS |
| 正则表达式 | `kiso/regexp.mdx` | NEW | 本机正式示例输出 hai / iie，Bunko 3 项通过；Web 匹配 Han、拒绝非法模式 | PASS |
| SHA-256 | `kiso/crypto-sha256.mdx` | NEW | 本机 Bunko 4 项含边界和长消息通过；Web 核对 abc 的完整 32 字节及非法范围 | PASS |
| OS | `kiso/os.mdx` | NEW | 本机 `mio test bunko/kiso/os --format=json` 6 项通过；三平台 CI 进程协议通过，Windows exec 为子进程模式 | PARTIAL |
| IPv4 TCP | `kiso/index.mdx` | NEW | 本机 `mio test bunko/kiso/net/tcp --format=json` 4 项通过，覆盖回环、非法地址、EOF 和失效句柄；Windows 原生 echo 与 wildcard CI 通过 | PASS |
| Mach-O ad-hoc 签名 | `kiso/aot-sign.mdx` | NEW | 本机合法镜像与空数组拒绝输出 hai / hai；`codesign --verify --strict` 通过正式 CLI 产物；其他宿主未单独运行签名 API | PASS |
| 字符串、UTF-8 | `kiso/string.mdx`、`kiso/changes.mdx` | trim_space NEW | 本机 `string` 4 项、`utf8` 3 项测试通过；裁剪正常和空字符串输出 Mio / hai，Web 检查无效 UTF-8 | PASS |
| 文件系统 | `kiso/fs.mdx`、`kiso/changes.mdx` | is_character_device NEW | 本机文件系统 3 项测试通过；临时目录中普通文件和缺失路径均返回 iie。正式 CI 三平台验证核心文件操作；真实字符设备未做跨平台验收 | PASS |
| 数值库 | `kiso/math.mdx`、`kiso/changes.mdx` | fail NEW | 本机 math 4 项通过，gcd(84,30) 输出 6，fail 退出 1；Web 测试负数 sqrt 为 NaN | PASS |
| 路径文本 | `kiso/path.mdx` | 无变化 | 本机 Bunko 2 项与三平台 CI 通过；Web 确认斜杠规范化，反斜杠不当作路径分隔符 | PASS |
| 其他纯 Mio Bunko | `tooling/verification.mdx` | 无变化 | 本机 array、bytes、convert、binary 包分别 4 / 3 / 6 / 7 项通过；网页另逐包核对输出和错误输入 | PASS |
| CLI version/help | `tooling/native-cli.mdx` | NEW（正式入口） | 本机 version 显示 v2.1.0 release 与提交；help 列出命令但保留 candidate 字样，退出均为 0 | PASS |
| check 与诊断参数 | `tooling/native-cli.mdx` | Native 路径 | Hello check 无输出退出 0；非法类型加 `--format=json --color=never --verbose` 返回 E0301、退出 1 | PASS |
| build、原生运行与目标 | `getting-started.mdx`、`tooling/native-cli.mdx`、`internals/native-aot.mdx` | UPDATED | 默认 build 生成 ARM64 Mach-O；自定输出路径后执行为 Hello。显式 Linux/Windows 目标产物为 ELF/PE；实际目标运行用对应正式 CI | PASS |
| run / exec / disasm / emit | `tooling/native-cli.mdx`、`internals/mochi.mdx` | UPDATED | `mio run` 输出 Hello；`build --emit=mochi` 后 disasm 显示常量/指令，exec 输出 Hello；Native v16 与上游 Web VM 交叉验证通过 | PASS |
| Bunko 自动/外置路径 | `tooling/distribution.mdx` | UPDATED | 自动识别 Full；合法 `MIO_BUNKO` 成功，`--bunko-root` 覆盖无效环境变量；无效路径 E_BUNKO_ROOT、退出 2 | PASS |
| 原生测试运行器 | `tooling/native-cli.mdx`、`tooling/verification.mdx` | UPDATED | 本机正式 sample 用 `--run=test --format=json` 执行且无失败；三平台 archive 和进程协议验证通过 | PASS |
| LSP stdio | `tooling/lsp.mdx` | UPDATED | 本机 JSON-RPC initialize、未保存文档、Hover、定义、diagnostics、shutdown/exit；三平台发行握手及 RPC 测试通过 | PASS |
| 原生运行时错误 | `tooling/native-cli.mdx` | 已有，原生路径 | 本机除零与越界都退出 1，stdout/stderr 为空；Web 显示 E0501 和错误前 stdout | PARTIAL |
| GC、Runtime 与内存预算 | `internals/gc.mdx`、`internals/memory-policy.mdx` | UPDATED | 本机有界 1000 次数组分配，默认与 `--gc-stress` 均输出 3 / 499500；三平台 ABI/差分通过，长期并发接纳证据不足 | PARTIAL |
| Core / Full 归档 | `tooling/distribution.mdx` | NEW | 正式 CI 三平台校验哈希、内容、相同编译器、Core 无库、Full 自动 Bunko、归档迁移和命令运行 | PASS |
| Docker 离线 | `tooling/docker.mdx` | NEW | 正式 Linux AMD64 CI 断网与 save/load；本机 ARM64 Docker 模拟用 `--network none --pull=never --memory 512m` 得到 offline hello / 6 | PASS |
| 其他原生架构及独立包管理渠道 | `tooling/distribution.mdx` | — | Intel Mac、Linux/Windows ARM64 不在 v2.1.0 归档矩阵；未逐一重测所有包管理器渠道 | NOT_RUN |
| 编辑器扩展和长期并发 GC 接纳 | `tooling/lsp.mdx`、`internals/gc.mdx` | — | 本轮验证协议、ABI 与有界行为；未执行 VS Code/JetBrains 插件矩阵和长期 GC 接纳 | NOT_RUN |
| 网页 Playground | `getting-started.mdx`、`tooling/verification.mdx` | UPDATED | 运行、检查、编辑、复制、重置、停止、超时、诊断、失败恢复及三代文档隔离；详见独立矩阵 | PASS |

按上述功能口径：34 项，PASS 25、PARTIAL 7、FAIL 0、NOT_RUN 2、BLOCKED 0。这里的 FAIL 计功能总体结论；具体的原生复现失败仍按原始退出码保留。初轮对 335 个 V2.1 网页样例另用正式 Native CLI 逐个 check/run：323 个退出成功，12 个遇到原生诊断；其中 4 个改用显式类型后已复测，剩余 8 个在相应段落标明 Web / Native 差异。

平台徽标依据如下。FULL 仅表示对应行定义的能力和架构已充分验证，非所有系统版本或 API 的承诺。

| 徽标位置 | macOS ARM64 | Linux x86_64 | Windows x86_64 | 状态来源 |
| --- | --- | --- | --- | --- |
| Native AOT | full | full | full | 正式 native report 的原生固定点、产物运行与 ABI；本机另验证 Mach-O |
| Core / Full、原生 CLI、原生运行与测试 | full | full | full | 正式三份 archive verification 的 Core/Full hello、run、exec、mio test；native report 的进程协议 |
| LSP | full | full | full | 三份 archive verification 的 LSP handshake，native report 的 selfhost/lsp 与 RPC；本机交互 |
| 文件系统 | full | full | full | 三份 native report 的 fs 测试；本机临时目录复测。字符设备的具体行为单独说明 |
| OS 接口 | full | full | partial | 正式 OS 测试和进程协议；Windows exec、测试超时和 stdin 有平台语义差异 |
| TCP | full | full | full | 三份 native report 的 kiso/net/tcp；Windows echo/wildcard；本机回环 |
| Mach-O 签名 API | full | unknown | unknown | 本机合法/非法镜像和 codesign；其他宿主的签名 API 未单独验证 |
| GC / Runtime / 内存预算 | partial | partial | partial | 正式 ABI 与差分、Mac 有界 GC 压力测试；未外推长期并发接纳 |
| kiso/path | full | full | full | 正式三平台模块测试。路径是文本规则，不将 Windows 盘符/UNC 当作宿主路径 |
| 架构汇总示例 | unknown | unknown | unknown | 没有把已验证的一个架构推广到整个系统 |

功能变化标签：JSON、阻塞 IPv4 TCP、Native CLI 从 BETA 改为 NEW（3 项，含 frontmatter 共 5 处 NEW）；清除两处重复的候选 BETA 说明，保留 GC 的实验性标签。无新增 UPDATED 或 DEPRECATED。文档改动范围见 [文档列表](changed-docs.md)。历史文档、版本注册表、发布门禁及冻结锁均保持原样。

## TCP 文档补充验收（2026-11-09 JST）

本节单独记录文档覆盖和示例复测；不计入上方历史运行时功能矩阵，也不更改其结论。依据正式标签 `v2.1.0`（`74e461b2985886160a285c7104d2a41090d0f548`）中的 `tcp.mio`、模块 README、`tcp_test.mio` 和官方 Echo 示例。

| 验证范围 | 文档或证据 | 结果 |
| --- | --- | --- |
| TCP 文档覆盖 | [专页](../../content/docs/v2.1/kiso/net-tcp.mdx)、[Bunko 索引](../../content/docs/v2.1/kiso/index.mdx)、[API 索引](../../content/docs/v2.1/kiso/api.mdx)、[侧栏](../../content/docs/v2.1/kiso/meta.json) | PASS：核对 12 个公开函数的精确签名、9 个公开类型和全部 9 个错误变体；覆盖资源清理、短读短写、EOF、`kiso/io` 适配及限制。 |
| 平台徽标的依据 | [正式发行验证清单](https://github.com/mio-kobo/mio/releases/download/v2.1.0/release-verification.json)、[原生发行 CI](https://github.com/mio-kobo/mio/actions/runs/42384976176) | PASS：三份发布的原生报告与清单 SHA-256 一致。macOS ARM64、Linux AMD64、Windows AMD64 均通过 `mio-test bunko/kiso/net/tcp`；Windows 另通过 `windows-tcp-echo` 和 `windows-tcp-wildcard`。这是上游证据，补充验收未在本机复测 Linux 或 Windows。 |
| 本机示例复测（macOS ARM64） | 发行版 `mio --version`；两份官方示例及专页两段完整代码分别运行 `mio check <文件>` 和 `mio run <文件>` | PASS：4 个文件通过检查，两组进程均在 `127.0.0.1:18080` 回环收发后正常退出；客户端回显 `77 / 105 / 111`。 |
| 本机运行时回归（macOS ARM64） | 临时目录中的正式标签源码，`mio test bunko/kiso/net/tcp --format=json` | PASS：4 项通过，0 项失败。 |

站点检查在隔离工作树用 Node.js 24.22.2 执行：

| 命令或检查 | 结果 |
| --- | --- |
| `npm run types:check` | PASS：路由类型生成和 TypeScript 检查通过。 |
| `npm run check:versions` | PASS：三版根目录、版本策略与冻结文档哈希通过。 |
| `npm run check:links` | PASS：校验 221 个路由中的 691 个链接及导航项。 |
| `npm run check:playground` | PASS：32 项通过，包括真实 Worker 与 WASM、V2.1 模块范围及 TCP 不可用探针。 |
| `npm run build`（含 `check:export`） | PASS：静态导出 176 个文档页，发布检查与 WASM 资产校验通过。 |
| 静态 HTML 检查 | PASS：TCP 页面已导出；侧栏、内部链接与锚点有效；NEW 和三个架构徽标已渲染；两个 `no-run` 示例均未注入 Playground。 |
