# Mio Docs 内容质量审计

日期：2026-10-20（Asia/Tokyo）。审计对象：改写前 53 页；完整逐页路径、内容哈希、标题、程序数量及未版本化链接见 baseline.json。该清单是本轮审计的基线，不覆盖此前工作。审计以独立 git archive 的两个提交、实际 CLI、标准库实现及测试为依据，不能把篇幅短本身判为技术错误。

## 版本与修订规则

- V1.0 Stable：正式 v1.0.0 Release，提交 `51f1ba883767c1fc08ba415fbb0075316ff03106`。Release 页面本轮公开读取确认，标签关联短提交 51f1ba8。源码 CLI 输出 beta.2，不据此改变正式发布身份。
- V2.0 Development：提交 `8b53a25142b0da1192a6c4868e807385d7bb50f9`，源码 CLI 输出 beta.1。只说明此快照已有行为，不承诺未来 V2 功能。
- DOCS_CONTRACT.md「新版本流程与历史冻结」要求：“允许经过核验的文档勘误，但须明确记录证据、审核并更新对应锁”。V1 正文及 content/version-locks/v1.0.json 不修改。建议写入非公开 .docs-drafts/corrections/v1.0，审核状态 pending，不自行伪造 approved。
- 既有 A/B 所有权表用于此前并行工作；本次用户明确授权全区内容审查与精修。保留所有既有未提交工作，不编辑相邻核心仓库，不提交或推送。

## 优先级发现

| 编号 | 级别 | 位置 | 问题与读者影响 | 处理与验收条件 |
| --- | --- | --- | --- | --- |
| CQ01 | P0 | 两版 reference/kiso/tooling/internals/index.mdx；旧 compiler-modules | 版本入口缺少对应正文，跳到混有未提交 M17e 的旧资料。364 条公开声明不是 V2 固定提交的 358 条声明，更不是 V1 的 171 条声明 | V2 单独建立固定提交参考；V1 准备审核草稿。每页来源与 API 逐项匹配，禁止跨版推定 |
| CQ02 | P0 | verification/source-lock.json、SOURCES.json | 旧技术验证来源为含本地改动的工作树；只有提交号不能重现。教程则是干净提交，二者不可共用通过结论 | 新验证独立记录 git archive、完整文件哈希、命令、二进制哈希与输出；保留旧证据 |
| CQ03 | P0 | v1.0 全文 | 已冻结；批量“精修”或直接添加页会触发锁，自动刷新锁属于绕过流程 | 先通过 check:versions；所有 V1 建议置非公开草稿并附补丁/差异；审批前不激活 |
| CQ04 | P1 | 两版 learn/variables、control-flow、functions、collections、modules | 每课约 900–1100 字符，已有完整程序与练习；缺学习目标、明确前置、逐段推导和执行操作，读者需猜代码保存位置 | 补足每课命令、目标、动机、状态推演、类型边界和下一课连接；输出实测 |
| CQ05 | P1 | getting-started、Learn index | 从 clone 到运行基础流程存在，但源码根与练习目录关系不明确，./mio 对切换目录敏感；Go 版本要求与实际测试版本需区分 | 固定源码提交与工作目录；新增可复制 POSIX 操作与环境说明；Windows 保留未实测标记 |
| CQ06 | P1 | Learn 课程覆盖 | 五课没有字符串/UTF-8、Map、结构体、枚举、闭包、泛型与测试的学习桥梁，直接跳 Reference 概念跨度大 | 补递进课程，使用已存在实现与独立程序；不把参数签名清单当教学 |
| CQ07 | P1 | kiso/*.mdx | 普通基础包已有签名和简短语义，但缺逐页版本支持；encoding-binary 过多重复句，参数单位与游标失败条件不够易查 | 固定版本标识、返回错误约定、API 索引及参数含义；V1 不引入其不存在的 Reader/Writer/U64 |
| CQ08 | P1 | kiso/compiler-modules.mdx | 约 1.1 万字符大清单；开发接口与普通 Kiso 混排，含 assembler_label_word、compile_with_heap 等未提交接口 | 由固定源码重建分模块页；原始参数/返回和错误协议逐项可查；声明核对与运行覆盖分别记录 |
| CQ09 | P1 | Tooling、Internals | 旧 AOT 里“最新事实”含工作树证据，不能作为固定 V2 结论；V1 正式标签没有 internal/lsp、internal/aot、cmd/mochi-aot，不能从 V2 资料补写为 V1 能力；编辑器存在不代表发布/平台验收 | V2 只记录源码能证明的执行阶段和限制；编辑器保留独立来源，未实测明确标识 |
| CQ10 | P2 | reference/*.mdx | 已有精确规则但检索入口薄；关键字需与实际词法模式对应，术语 Nullable/空值和包/模块使用不统一 | 增索引与相关规则链接；统称可空类型（Nullable）、包（导入单元），Mochi 文件/VM 分开；核对关键字列表 |
| CQ11 | P2 | 所有重复示例和栏目边界提示 | 教程首页/模块课及 API/Reference 使用相同例子，重复本身合理，但没有区分教学目的、规范规则和 API 合同；A/B 实施交接信息直接呈现读者 | 保留必要独立示例，按角色重写连接；读者正文去除 Codex A/B 交接语；证据留报告 |
| CQ12 | P1 | check-examples.mjs | 只扫描 Getting Started+Learn；trimEnd 比较漏掉尾部空白；练习变换硬编码；失败直接抛出，缺逐条机器报告 | 增全页代码与测试 fence 覆盖、逐字节 stdout、记录成功/拒绝/失败与缺覆盖；不把 text 签名当程序运行 |

P0：版本或证据可信度阻断；P1：影响独立学习或准确使用；P2：检索与表达质量。上表是改写前发现，完成状态与保留问题见 RESULT.md。

## 逐页审查规则

Getting Started 检查安装前提、路径、命令、首次程序与失败恢复；Learn 检查动机、前置、类型解释、练习及连续性；Reference 检查规则边界与检索；Kiso 检查真实签名、参数、返回、错误、别名/单位与版本；Tooling 检查 CLI 实参、环境及退出码；Internals 检查实现事实、阶段记录与后端边界。全部 53 页均纳入 baseline.json；每页具体发现和处置见 page-review.json，不以自动统计替代人工技术判断。

## 原始来源

[正式 Release](https://github.com/mio-kobo/mio/releases/tag/v1.0.0)。本地两个提交的 cmd/mio、internal/{lexer,parser,typecheck,vm,bunko}、bunko/kiso 及测试；具体文件和 SHA-256 随验证报告记录。旧 verification/REPORT.md 是此前验证记录，本轮不把其通过状态移植为新验证。
