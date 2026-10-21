---
title: Mio 语言规则
description: 从解析器、类型检查器与 CLI 实测核对的语言参考。
---

本页以 Mio **v2.0.0** 的 Go 源码前端 / Mochi VM 为执行范围。源码与运行结果版本见 [验证与来源](/docs/tooling/verification)。Native 后端支持集合小于 VM，见 [Native AOT](/docs/native-aot)。

v2.0.0 没有刻意引入新的 V1 语言语法破坏，但不承诺所有 V1 应用无需修改即可升级。Native 支持范围、Mochi 格式版本和 Mio 语言版本需要分别核对。

| 查阅主题 | 入口 |
| --- | --- |
| 关键字、词法、表达式、优先级 | [语法与表达式](/docs/reference/syntax) |
| 数值、Nullable、unit、resource | [类型](/docs/reference/types) |
| 作用域、函数、闭包、控制流 | [作用域与函数](/docs/reference/functions) |
| 数组、结构体、枚举、Map | [集合与复合类型](/docs/reference/collections) |
| 泛型、约束、模块、常量 | [泛型与模块](/docs/reference/modules) |

## 与旧 LANGUAGE.md 的差异

源码已支持动态数组操作、嵌套数组以及 Kiso 字符串组合 API；字符串仍不能用 `+` 拼接，内置 `len` 仍只接受数组。旧文件把 Native AOT、GC 与 LSP 统一写作未来规划，不能据此判断当前实现状态。本文将语言语义、VM 验证和原生研发状态分别记录。

Mio CLI 版本字符串 `2.0.0`、内部 Token 版本 `V05`、Mochi 格式版本 `14` 是不同版本维度。v2.0.0 的 `mio version` 应输出 `Mio 2.0.0`。

## 内置调用

完整的公开内置函数、`Map` 构造与显式数值转换规则见 [内置函数参考](/docs/v2.0/reference/builtins)。

`chant(value) -> unit` 接受一个整数、浮点数、`bool`、`string` 或字面量 `mu`，输出后追加换行。可空变量必须先收窄，不能直接输出。数组、结构体、枚举、Map、函数和 `resource` 不能直接传给 `chant`。`rune` 按整数输出。

`len(values: []T) -> int64` 返回数组长度。字符串字节长度和码点数分别使用 `kiso/string.byte_len` 与 `rune_count`。

数值类型名提供显式转换。Kiso 内部 `__...` 原语不是普通用户内置 API。

## 证据入口

- 词法：`internal/token/token.go`、`internal/lexer/lexer.go`。
- 语法：`internal/parser/parser.go`、`precedence.go`。
- 语义：`internal/resolver/`、`internal/typecheck/`、`internal/constant/`。
- 运行：`internal/compiler/`、`internal/vm/`、`internal/value/`。

所有路径相对核心仓库；准确文件 SHA256 记录于 `verification/source-lock.json`。
