---
title: MioCore LSP
description: 从能力声明、实现与协议实测记录语言服务器。
---

**版本基线：Mio v2.0.0**（标签 `v2.0.0`，提交 `0ce04dd06c6c6e4e26f55a2c0b4ffb23aa942a0a`）。`initialize` 返回 `serverInfo = {"name":"MioCore","version":"2.0.0"}`。完整的 v2.0 编辑器配置见 [V2.0 编辑器指南](/docs/v2.0/tooling/editors) 与 [V2.0 MioCore LSP](/docs/v2.0/tooling/lsp)。

MioCore 是核心 CLI 内置的语言服务器，执行 `mio lsp` 或 `mio lsp --stdio`。stdout 只用于带 Content-Length 的 JSON-RPC 帧，日志写 stderr。不能把它当作普通逐行 JSON 命令。

## 协议与能力

| 范围 | 已实现来源 |
| --- | --- |
| 生命周期 | initialize / initialized / shutdown / exit |
| 文档同步 | open/close、增量 change、save；位置编码 utf-16 |
| 诊断 | 名称解析、语法、类型检查；未保存文本参与分析 |
| Hover | 类型、签名与可提取的源码文档注释 |
| Definition / References | 语义符号身份与引用索引 |
| DocumentSymbol | AST 中的声明、字段、变体、参数 |
| Completion | 作用域与模块/成员候选，`.` 触发 |
| SignatureHelp | `(` 与 `,` 触发的调用参数信息 |
| 取消 | `$/cancelRequest` 与分析取消路径 |

上表来自 `internal/lsp/server.go` 的 capabilities 和相应处理器。没有声明 Rename、SemanticTokens、Formatting 或 Debugger，不能把编辑器自己的语法着色归为 LSP 语义着色。

## 分析范围与限制

使用真实 Lexer、Parser、Resolver、Typechecker，结合导入图与打开的文档。跨文件能力不代表已经建立整个工作区全部 `.mio` 的持久索引。当前诊断管线主要返回第一条错误，损坏输入的容错结果也不能当作完整静态检查通过。

Mio 源码位置、宿主 UTF-8 字节偏移和 LSP UTF-16 位置不同；实现中有转换与 Unicode/CRLF 测试。客户端应使用协商的位置编码。

v2.0.0 文档验证启动了真实 `mio lsp --stdio`，确认 `serverInfo` 为 2.0.0、capabilities 包含 completion/definition/documentSymbol/hover/references/signatureHelp，并完成 shutdown/exit。更早的缓存、依赖失效、取消和语义导航测试保留其原始记录。结果见 [验证与来源](/docs/v2.0/tooling/verification)。这不是所有 IDE 客户端集成测试通过的声明。

## 配置与接入

外部编辑器应将 Mio CLI 路径和参数数组配置为 `mio`、`["lsp", "--stdio"]`，Bunko 路径通过 `MIO_BUNKO` 传递。不要向协议 stdout 写 shell 提示、版本说明或日志。VS Code 的具体开关与诊断回退见 [编辑器](/docs/editors)。

## 来源

`cmd/mio/main.go:runLSP`、`internal/lsp/server.go`、`transport.go`、`position.go`、`analysis.go`、`semantic.go` 及同目录测试。源码 SHA256 与 Go 测试输出在验证目录中。
