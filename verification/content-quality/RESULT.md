# Mio Docs 内容精修与验证结果

日期：2026-10-20（Asia/Tokyo）。本轮已完成改写前 53 页审计、V2 Development 六栏目的精修和本轮验证；V1 Stable 的修订已完成为可审阅候选，**仍待维护者审批，未写入公开正文或刷新冻结锁**。

## 交付范围

- 优先级审计：[AUDIT.md](AUDIT.md)，逐页处置：[page-review.json](page-review.json)，原始内容指纹：[baseline.json](baseline.json)。共 12 类发现，按版本可信度、独立学习、检索与表达分级。
- V2 公开版本目录现有 48 页，包括十一课 Learn、五个规则参考页、17 个 Kiso 包页、CLI/LSP/编辑器/验证说明及内部实现。六个新课程为字符串、Map、结构体与枚举、闭包、泛型和测试。
- V1 候选目录有 41 页，包含十一课与仅属于该正式标签的参考。待审补丁涉及 46 个文件；不包含锁更新，可用 git apply --check 检查适用性。
- 页面来源与内容 SHA-256：仓库 `content/QUALITY_SOURCES.json`。V1/V2 技术正文独立存储，不在运行时共享“最新”语义。

## 实际执行

| 版本 | 精确源码提交 | 实际 CLI 字符串 | 代码块/练习执行 | 公开声明匹配 | 通过的核心 Go 包 |
| --- | --- | --- | ---: | ---: | ---: |
| v1.0 | `51f1ba883767c1fc08ba415fbb0075316ff03106` | `Mio 1.0.0-beta.2` | 52 | 171 | 7 |
| v2.0 | `8b53a25142b0da1192a6c4868e807385d7bb50f9` | `Mio 1.0.0-beta.1` | 76 | 358 | 8 |

工具环境：Go 1.25.9 darwin/arm64、Node v24.15.0、Python 3.12.10。两版均从 git archive 构建，完整归档文件哈希与二进制哈希在 [results.json](results.json)。本轮没有修改核心实现、已有工作树、版本注册或历史锁。

128 项执行包括 108 个文档代码块（其中 4 个为测试包）与 20 个普通练习改写。普通代码块与练习分别运行 check/run/build/exec/disasm，run/exec 与预期 stdout 逐字节匹配。测试包使用 mio test 检查命中数量与状态；另执行两版各一项成功和一项故意失败的测试练习，均得到预期数量与退出码。重复代码按页面与版本分别运行，128 不是去重后的独立程序数量。

另有旧 fixture 兼容性：V1 34 项符合预期、2 项因缺少对应 API 明确不支持；V2 36 项符合预期。fixtures 内包括 7 个编译拒绝和 5 个运行时失败反例，预期失败没有改标为成功执行。所有实际命令、cwd、MIO_BUNKO 来源、stdout/stderr、退出码和预期均记录；本轮共保存 715 条外部命令记录。

实际复跑命令：

```sh
python3 scripts/check-content-quality.py --go-tests
python3 scripts/check-content-editorial.py
git apply --check .docs-drafts/corrections/v1.0.patch
npm run types:check
npm run test:versions
npm run check:versions
npm run check:links
npm run build
BASE_URL=http://127.0.0.1:3214 npm run test:versions
BASE_URL=http://127.0.0.1:3214 npm run check:links
```

网站类型、构建、静态链接及历史冻结检查通过；生产 HTTP 验证覆盖 101 条路由、渲染后站内链接及锚点。带生产 BASE_URL 的 12 项版本测试全通过，无跳过。命令日志分别在 [site-checks.json](site-checks.json)、[http-checks.json](http-checks.json)；候选正文结构、内部链接、来源指纹和冻结基线检查在 [editorial-checks.json](editorial-checks.json)。本轮未做视觉/UI 改版。

## 发现的版本差异与失败记录

1. V1 没有 internal/lsp、internal/aot、cmd/mochi-aot、kiso/aot 或 kiso/encoding/mochi。V1 调用 lsp --stdio 实际退出 2；草稿明确标为不提供，未复制 V2 工具能力。
2. V1 binary 没有 V2 的 U64、流式 Reader/Writer。旧 binary fixture 在 V1 失败；已准备 V1 独立定宽示例。旧 mochi fixture 在 V1 因包不存在失败；不会生成一个虚假的 V1 API 页。原命令与错误见 [compatibility-baseline.json](compatibility-baseline.json)。
3. 未版本化工作树参考的 364 条声明不能归入 V2 固定快照的 358 条，更不能归入 V1 的 171 条。后续未提交的 compile_with_heap、assembler_label_word 等未进入版本化 API。
4. 首次附加 Go 测试失败记录保存在 [failed-go-tests.json](failed-go-tests.json)：验证器错误地为 V1 请求不存在的 LSP 包，并把运行用 MIO_BUNKO 传给会创建独立包根的 V2 LSP 测试，导致六项断言失败。修正测试目标和环境隔离后，源码未变，7/8 个包通过。没有删除失败证据，也没有修改核心测试来通过验证。

## 未覆盖与保留问题

- 两版各有 `TestKisoFilesystemRuntimeCleanup` 在 macOS 跳过；它使用 Linux /proc/self/fd，不算资源清理验证通过。
- 构建保留依赖 CSS 的两条 ::highlight 兼容性警告，没有构建错误。
- API 验证是精确声明与列出示例/语义测试的验证；不代表全部 API 的所有参数、权限、错误分支或平台均已覆盖。
- 本轮未执行 Native AOT/GC 专项、完整 Compiler A→B、自举固定点、IDE 客户端或全平台测试；未核验插件市场发布与所有 GitHub 源码链接的联网可达性。M17e 尚未验收，M18 尚未启动，不据此增添未来版本承诺。
- 旧未版本化技术资料与其证据继续保留独立来源；本轮没有将旧技术验证报告重新贴作固定提交的验证。
- V1 的 CQ01、CQ04–CQ09 等公开内容缺口仍待审批后才能落实；候选通过不代表公开 Stable 已完成改写。

## V1 审核入口

仓库 `.docs-drafts/corrections/PROPOSAL.md` 是完整提案，`review.json` 保持 pending / approved=false，`v1.0.patch` 已通过适用性检查。依据 DOCS_CONTRACT.md 的“允许经过核验的文档勘误，但须明确记录证据、审核并更新对应锁”，维护者批准后才能应用与显式更新锁。

未 Commit、Push、Tag、Release 或部署站点。
