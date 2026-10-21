# V1.0 Stable 内容勘误与增补提案

审核状态：**pending，未批准、未应用**。公开 V1 正文、导航元数据和 SHA-256 锁均保持本轮开始时原状。

## 提议范围

1. 在原五课基础上补齐目标、动机、运行步骤、逐段解释与类型边界，并新增字符串、Map、数据模型、闭包、泛型与测试课，构成十一课连续路线。
2. 增补独立的 V1 语言参考和 11 个真实 Kiso 包（171 条公开声明），以正式标签提交为准，不复制 V2 API。
3. 补足 CLI、编辑器兼容边界、Mochi 格式和 VM 内存说明。明确 V1 没有内置 LSP、cmd/mochi-aot、internal/aot、kiso/aot 和 kiso/encoding/mochi，不提供 binary Reader/Writer/U64。
4. 修订各栏目入口和导航，让读者在当前版本内完成学习与检索。旧未版本化资料仍作为独立历史来源保留。

## 可审阅材料

- `v1.0/`：完整候选正文，所有例子仅按 V1 固定提交验证。
- `v1.0.patch`：针对公开 V1 目录的完整差异，包括新增页；不含冻结锁更新。
- `review.json`：每文件原始/候选 SHA-256、操作和固定源码提交；review.approved=false。
- `../../verification/content-quality/results.json`（以仓库根的同名路径为准）：实际命令、输出、API 核对与失败/跳过边界。
- 仓库 `verification/content-quality/AUDIT.md`、`RESULT.md`：审计问题与处置结论。

可在仓库根执行 `git apply --stat .docs-drafts/corrections/v1.0.patch` 或 `git apply --check .docs-drafts/corrections/v1.0.patch` 审阅补丁。`--check` 不应用修改。不要直接运行版本新增工具激活 v1.0：它是已注册版本，新增流程本就拒绝覆盖。

## 审核与应用次序

依据 DOCS_CONTRACT.md「新版本流程与历史冻结」：“允许经过核验的文档勘误，但须明确记录证据、审核并更新对应锁”。本提案提交供维护者审核，不自行填写批准。

维护者明确批准这份修订范围和证据后，先确认原始文件及冻结锁仍匹配 review.json，再应用精确补丁；随后按批准记录显式更新 V1 正文哈希锁，并运行冻结、示例、链接和构建检查。正文补丁不与锁更新捆绑自动执行；如审阅期间文件漂移，重新核对差异，不能覆盖新工作。

新增教程与技术正文属于同一待审勘误/增补包，不创建新语言版本，不创建 tag、Release、Commit 或 Push。
