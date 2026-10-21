# Mio 技术文档审计与验证报告

审计日期：2026-10-20（Asia/Tokyo）。范围：Reference、Kiso、Tooling、Internals 与文档示例。未修改站点配置、首页、全局导航、A 的入口/meta.json 或 Learn；没有 Commit、Push、Tag、Release，也未修改核心编译器实现。

## 实际结果

| 项目 | 结果与范围 |
| --- | --- |
| 技术正文 | 27 页；含 24 个正文完整 Mio 程序块，逐项绑定 fixture 和精确输出 |
| Fixtures | 36/36 通过：23 个普通成功程序、7 个编译拒绝反例、5 个运行时失败反例、1 个测试包 |
| 成功程序 | check/run/build/exec/disasm 全部执行；run 与 exec 输出逐字节匹配 |
| API 声明 | 17 个真实 Kiso 包、364 条公开声明与快照一致；264 条函数签名，其余为类型/常量 |
| LSP | 真 CLI stdio initialize/shutdown/exit 与能力声明通过 |
| Go 包测试 | lexer/parser/resolver/typecheck/mochi/vm/lsp/cmd/mio 8 个包通过；1 项明确 skip，见下 |
| Go AOT 原生程序 | macOS ARM64 实际生成、签名、运行；functions fixture stdout 为 120 加换行 |
| Native GC | 5 项 M11 测试通过，无 skip；不是纯 Mio 自举测试 |
| 网站类型检查 | npm run types:check 通过 |
| 网站生产构建 | npm run build 通过 |
| 静态链接 | 168 个链接、66 条路由与所有导航条目检查通过（站点包含 A 的并行改动） |
| 技术页面 HTTP | 本次 27 页及其正文站内链接均 HTTP 200，唯一 H1 检查通过 |
| 全站 HTTP | 最终复查通过：66 条路由、页面标题、渲染后站内链接与锚点 |

执行环境：macOS-15.6.1-arm64-arm-64bit，go version go1.25.9 darwin/arm64，Node v24.15.0。完整命令、stdout/stderr、退出码与文件 SHA256 在 latest.json；最后的正文措辞复核及 36 项 fixture 复跑在 content-check.json，其页面哈希为最终内容；本轮通过记录不包含未执行的步骤。

## 来源与版本

核心提交 `8b53a25142b0da1192a6c4868e807385d7bb50f9`，CLI `Mio 1.0.0-beta.1`；实际 CLI SHA256 `a2af7a625937690eacf3c8846874d27025dfa7856f796b79c698878b85300e6b`。来源是冻结的本地工作树快照，含已记录的未提交 M17e 开发内容。source-lock.json 保存 431 个输入文件哈希、工作树状态与 diff SHA256；提交号本身不能替代未提交文件哈希。

A 的教程采用干净归档快照，本参考另存工作树来源，不将本地开发代码归入 Stable 发布。正文保留旧 URL；新的未版本化技术页不自动复制到 Stable v1.0。SOURCES.json 保留旧迁移提交作为 migrationSource，并记录本轮页面来源。编辑器各自提交和审计文件见 editor-sources.json。

## 核实并修正的旧结论

1. 旧 LANGUAGE.md 声称没有多维数组。当前 ArrayOf 与 CLI 实测支持嵌套数组；新增 nested-array fixture，验证内层共享引用，不承诺连续矩阵布局或完整 Native 支持。
2. 当前已有动态数组、ByteBuffer、StringBuilder、流、文件、路径与编码 API；语言内置 len 仍只接收数组，字符串 + 仍被拒绝。
3. 结构体字段不可重新赋值，但字段中的数组/Map 仍共享可变存储；不能解释为递归深不可变。
4. 全局 Nullable 收窄会在可能产生副作用的调用后失效；fs 示例使用非空局部句柄，未通过修改类型检查器绕过问题。
5. Mochi 实现上限是 v14，但 encodedVersion 按程序需要选择输出格式。成功 fixtures 实际出现 v2、v6、v10、v11、v12、v13、v14；字符串复制转换例子明确验证 v14。
6. Native AOT、GC、MioCore LSP 与编辑器源码已经存在，旧语言文档的统一“未来规划”不再准确；实现存在、定向测试与发布/阶段验收分别表述。
7. BinaryWriter.writer 的负 max_length 在源码中被归一为 0，不能照旧注释写成抛错；u64 patch 逐半写，不能承诺失败原子性。

## 明确未验证/跳过

- TestKisoFilesystemRuntimeCleanup 只在 Linux 通过 /proc/self/fd 计数；本轮 macOS skip，不计为已验证资源清理。
- 未运行 IDE Extension Host、JetBrains IDE、Gradle 打包、VSIX 或 Marketplace 发布核验。
- 364 条声明的源码一致性不是 343 个 API 全分支/全平台行为通过。编译器 Kiso 模块明确为开发接口；只有报告列出的程序/测试执行过。
- 未重跑完整 Compiler A 生成、A→B 或固定点。M17e 文档中的镜像哈希、LLDB 与时序是锁定来源记录的转述，没有伪称本轮重算。
- **Compiler A 已生成并启动；A→B 仍因目标 Heap OOM 阻塞。M17e 尚未验收，M18 未启动。** Go M16b 的历史固定点、Seed Heap 增大或新增目标容量配置入口都不能替代纯 Mio A→B 验收。

## 交给 A 的集成事项

导航建议在 navigation-handoff.json；B 未编辑任何 meta.json。全站首次检查发现 A 所有旧入口的重复 Location，保留于 site-integration.json / site-logs/http-links-global.log。最终生产构建复查时，66 条路由、渲染后链接与锚点均通过（site-logs/http-links-final.log）；旧失败不再列为待修项。导航和路由配置由 A 维护，B 未修改。

## 可复跑

从任意所需的核心 checkout：

```sh
python3 scripts/check-reference.py --core /absolute/path/to/mio --go-tests --native
```

脚本在临时目录构建与执行，不覆盖用户文件。当前核心源码若已继续开发，API 漂移会失败并要求重新审计，不会静默接受不同版本。精确重跑本轮需提供与 source-lock 匹配的完整快照，再使用 --source-lock verification/source-lock.json；仓库不捆绑/覆盖未提交编译器实现。
