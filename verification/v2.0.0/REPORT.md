# Mio V2.0.0 文档完整性与最终候选验证报告

日期：2026-10-21（Asia/Tokyo）。状态：**Ready for Release Review（仅 RC4 文档候选）**。维护者审阅 pending / approved=false；未激活文档、未发布 Stable。全部下列文档本地验证已通过，不代表最终不可变版本或网站验收完成。

## 版本与产物证据

- V1 比较基线：正式标签 v1.0.0，提交 `51f1ba883767c1fc08ba415fbb0075316ff03106`，本轮隔离构建 CLI 实测 `Mio 1.0.0-beta.2`。
- Development 比较基线：`8b53a25142b0da1192a6c4868e807385d7bb50f9`，原 CLI beta.1，48 页。原正文未覆盖。
- V2.0.0 目标：**本地 RC4**，版本 `Mio 2.0.0`，HEAD 加 dirty/untracked 来源；HEAD 不是完整候选身份。归档 SHA256 `fe6c90b3887ff6e64841317a50a1be38f785e20b3b7def4ad80b848cc66f03b8`，4,077,761 bytes。
- 包内 CLI SHA256 `9aab538b0ca27aba352978e3849ae1039c23cdd1ef36f198c42bd31a2fa9a6fa`。解压归档，核对 MANIFEST 的 137 个文件（清单本身另计）大小/摘要，四个工具 strict codesign 验证通过。
- `BUILD-INFO.json`、`rc4-source-manifest.json`、`rc4-source.diff` 固定来源；`source/` 保存并核对 353 个与技术内容相关的真实候选源码文件，不冒充完整可重建源码归档。
- 当前工作树六个已记录路径已偏离 RC4；后续新增的 Tag 自动化文件也不属于 RC4。见 `post-rc4-drift.json`。本报告不把后续 workflow 本地测试改标为 RC4 验收。
- 正式 Release 只读核查返回 HTTP 404；可能是不存在或无访问权限，不能据此认定远端绝对不存在。当前没有可验证的 V2 正式 Release 记录。

## 六栏目完整性

独立目录：[V2.0.0 快照](../../.docs-drafts/v2.0.0/index.mdx)，51 个 MDX 正文文件，另有独立 meta.json。逐页内容哈希与检查在 `page-review.json`。快照无 symlink、跨版本读取或正文 re-export。

| 范围 | 页数 / 结果 |
| --- | --- |
| Getting Started 与版本/发布/迁移页 | 5；安装改用真实预编译候选、版本及 Bunko |
| Learn | 12；含路线与十一课，示例/练习复跑 |
| Reference | 6；规则来源及运行反例核对，不将 LSP 容错等同于严格检查放宽 |
| Kiso | 18；17 包、365 条公开声明逐字匹配 |
| Tooling | 6；CLI、LSP、插件边界、平台与复现说明 |
| Internals | 4；VM / Go AOT / 纯 Mio AOT、GC、自举链分别陈述 |

## 版本差异与 Breaking Changes

[Release Notes](../../.docs-drafts/v2.0.0/release-notes.mdx) 与 [Migration Guide](../../.docs-drafts/v2.0.0/migration.mdx) 已完成。

- 相对正式 V1：Native AOT / ARM64 / Mach-O、精确 GC、M18 Mochi→Native 自托管、MioCore LSP、binary 流式工具与 Mochi/AOT 库。32 条真实提交历史在 `history.json`；M18、版本号更新等 RC4 未提交内容明确另列。
- V1 的 171 条公开声明在 RC4 没有删除或签名改变；新增 194 条，合计 365。新增模块与声明的完整列表见 `api-diff.json`。此结论针对公开声明，不保证所有实现行为或应用均兼容。
- 相对 Development：7 条新增公开声明、4 个布局/枚举变化；新增 compile_with_heap、BranchOutOfRange、label_index 与类型追踪字段。原来的内部 struct 构造、完整枚举匹配及错误码处理需要检查。详见 `development-api-diff.json`。
- 没有发现刻意引入的 V1 语言语法破坏；Parser/Resolver/Typechecker 的相关变化为 LSP 宽松分析扩展，严格入口保留。没有认证任意 V1 应用无修改升级。
- 闭包、泛型、数组、Map、Mochi v14 在 V1 已有，未作为 V2 新增语法宣传。Native 支持集合小于 VM，平台承诺与内部 ABI 均需按新边界迁移。

## 本轮实际验证

命令：`python3 scripts/check-release-docs.py --rc ../mio/build/v2.0.0-rc4`。退出 0，451 条命令，0 个失败。实际平台 `macOS-15.6.1-arm64-arm-64bit`；环境详见 `results.json`。

| 检查 | 结果 |
| --- | --- |
| 正文代码块 | 42 个普通程序 + 2 个测试包，全部通过 |
| 练习 | 11 个普通练习（含安装）+ 2 个成功/故意失败测试练习，全部符合预期 |
| 迁移执行矩阵 | 2 个程序 × V1 VM / RC4 VM / Go AOT / 纯 Mio AOT = 8 项通过 |
| 合计 | 65 个程序/练习/迁移执行项；不是去重后的语言特性数量 |
| fixtures | 36 项全部符合预期，含故意拒绝/运行时错误 |
| 普通成功程序 | check / run / build / exec / disasm；run/exec stdout 逐字节匹配 |
| Native 迁移 | 全新产物、成功标记、chmod、ad-hoc 签名、strict verify、真实执行与精确输出 |
| Native 失败协议 | 截断 Mochi 实测 decode failed，无产物；OS exit 0，验证器没有误判成功 |
| AOT 无效 heap | 0 与 1025 MiB 均按预期 exit 1 |
| API | 17 包、365 条签名与候选源码匹配，无额外/缺失公开声明 |
| CLI / LSP | version/help 及 initialize/serverInfo 2.0.0/shutdown/exit 通过 |
| MDX / 章节链接 | 51 页语法通过，草稿内部链接无缺页 |
| 历史冻结 | 既有 check:versions 通过；V1 正文、全部既有锁、注册表及 pending 提案哈希未变 |

`results.json` 保存 argv、cwd、退出码、stdout/stderr、期望、代码与页面哈希；不会把预期错误算作未解决失败。验证在系统临时目录解压真实归档，不用当前工作树编译 V2，也未修改核心代码来使示例通过。

## 既有核心验收与本轮边界

`upstream-evidence.json` 保存已有核心证据的路径/摘要；`upstream/` 另保留 RC4 关键 summary、M18 provenance 与 GC observation。既有 full、AOT full/race、M18 普通/race、Native source B/C/D、decoder golden、74+18 项纯 Mio 测试和隔离无 Go 安装 smoke 的 PASS 仅归属其原始运行。本轮没有重跑整套核心测试、完整 M18 或 GC 计数。

M18 正式 1 GiB；Stage 1–5 未签名字节相同，Seed 以及 Stage 1–4 真正执行，Stage 5 仅生成/解析/签名。256 MiB GC 见证 gc_count=1、shadow_frame=0。源码前端和 VM 仍为 Go，不据 AOT 固定点声称全源码流程脱离 Go。

既有全仓测试中的长 VM 自编译因超时阈值主动 skip，不能算作该路径通过。全仓扩大随机 stress、旧 128 MiB OOM、本轮全平台/IDE/Gatekeeper/远端 CI 未执行。API 全签名与最小示例通过也不是所有参数和错误分支的穷尽认证。

## 冻结准备与网站交接

- `freeze-preparation.json` 固定独立快照、验证器和证据哈希；这是候选冻结记录，尚未写入 content/version-locks、尚未维护者批准。
- `review.json` 明确 readiness 为 Ready for Release Review，review pending / approved=false，stable=false，activated=false，finalSourceCommit=null。
- 最新契约已允许保留 `/docs/v2.0` Development 并新增 `/docs/v2.0.0`；草稿链接已使用新 URL。契约副本见 `contract-at-review.md`。Codex A 尚需接入正文、导航、注册、搜索和版本状态。
- 本任务只新增 `.docs-drafts/v2.0.0/`、`verification/v2.0.0/` 和 `scripts/check-release-docs.py`。未修改首页、网站配置、全局样式、版本注册表、既有正文或历史锁。并行网站改动属于其他任务，不应把整个 dirty 工作树都归到本文档任务。
- V1 历史勘误仍 pending，未应用，也未刷新其锁。未执行 Commit、Push、Tag、Release 或部署。

## 尚未满足的发布条件

1. 维护者审阅 dirty/untracked 核心实现，形成真实不可变最终提交，并由该提交重建最终候选；本任务按要求未提交代码。
2. 对最终资产再运行本验证器，复核来源、摘要、CLI/LSP 和文档差异；RC4 来源不能直接改写为新提交来源。
3. 维护者完成内容审阅，批准最终快照及冻结清单；不要把本地 passed 自动写为 approved。
4. 最终发布 CI / dry-run、真实 Tag 流水线及可核验远端发布/资产证据；当前 404 不满足正式版本登记条件。
5. 明确接受 ad-hoc 分发或完成 Developer ID / notarization；互联网下载 Gatekeeper 首次安装尚未验收。最低 macOS 版本仍未建立。若扩大平台或 IDE 承诺，先补对应实测。
6. Codex A 接入独立正式版本后执行生产构建、路由、搜索隔离、版本切换、桌面/移动端及可访问性验收。本轮只编译草稿 MDX、核对内部链接和历史锁，不声称全站验收通过。

当前满足提交 **RC4 文档候选审阅** 的条件；上述发行与站点条件仍待完成，不能自行提升为 Stable。
