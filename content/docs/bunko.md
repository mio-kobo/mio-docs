---
title: Bunko 与 Kiso API
description: Bunko 的物理布局、包规则、完整公开模块列表，以及可运行的导入与调用示例。
---

## Bunko 与 Kiso 的关系

- **Bunko** 是标准库的物理根目录 `bunko/`。
- **Kiso** 是公开导入路径，例如 `kiso/math`。

源码中导入模块时写：

```mio
yobu "kiso/math";
```

不要写 `yobu "bunko/kiso/math";`。加载器会拒绝物理 `bunko` 前缀、绝对路径、路径回退，以及越过 Bunko 根目录的符号链接。

官方 v2.0.0 发行包把 Bunko 放在：

```text
mio-2.0.0-darwin-arm64/
  bunko/
    kiso/
```

使用时把 `MIO_BUNKO` 指向 `bunko` 目录：

```sh
export MIO_BUNKO="$MIO_HOME/bunko"
```

## 包规则

- 一个目录对应一个包。
- 同一目录中的普通 `.mio` 文件共同组成包，按文件名稳定排序加载；声明不能依赖文件顺序。
- 子目录是独立包，不会被父包隐式包含。
- 包只在出现显式 `yobu` 时读取；普通程序不预载任何 Bunko 源码。
- `_test.mio` 只由 `mio test` 加载，不参与普通 `check`、`run`、`build` 或包导入。
- `koukai` 显式导出函数、类型和常量；没有 `koukai` 的声明只在当前包内可见。
- `teisu` 声明编译期常量，不占运行时全局槽位。
- 标准库包不应通过顶层可执行语句产生隐式初始化副作用。
- 包成员使用目录名作为默认限定名，例如 `math.sqrt(...)`。

依赖按拓扑顺序合并；同一路径只编译一次；循环导入会在静态检查前被拒绝。

## 完整公开模块列表

### 基础标准库

| 导入路径 | 主要用途 |
| --- | --- |
| [`kiso/array`](/docs/kiso/array) | 动态数组：`make`、`with_capacity`、`push`、`capacity`、`reserve`、`clone`、`truncate`、`append_all` |
| [`kiso/bytes`](/docs/kiso/bytes) | 紧凑 `[]uint8` 的比较、查找、复制、填充与 `ByteBuffer` |
| [`kiso/string`](/docs/kiso/string) | UTF-8 字节转换、码点计数、查找、拼接与 `StringBuilder` |
| [`kiso/utf8`](/docs/kiso/utf8) | UTF-8 严格验证、单码点解码/编码 |
| [`kiso/path`](/docs/kiso/path) | 纯 Mio 的 `/` 分隔逻辑路径处理 |
| [`kiso/convert`](/docs/kiso/convert) | 严格 ASCII 十进制整数、IEEE 754 浮点数与布尔文本转换 |
| [`kiso/math`](/docs/kiso/math) | 数值泛型、整数 gcd/lcm、浮点数学与常量 |
| [`kiso/io`](/docs/kiso/io) | 同步 `Reader` / `Writer`、部分读写、流式复制 |
| [`kiso/fs`](/docs/kiso/fs) | 同步文件读写、状态、单级目录创建与目录项读取 |
| [`kiso/encoding/binary`](/docs/kiso/encoding-binary) | 固定宽度大小端整数、LEB128、`BinaryReader` / `BinaryWriter` |
| [`kiso/encoding/mochi`](/docs/kiso/encoding-mochi) | Mochi v1–v14 的纯 Mio 解码、规范化与摘要 |
| [`kiso/testing`](/docs/kiso/testing) | `mio test` 专用断言：`expect`、`fail` |

### 编译工具链模块

以下模块是公开可导入的**工具链开发接口**，不属于普通应用稳定 API 承诺：

| 导入路径 | 用途 |
| --- | --- |
| `kiso/aot/arm64` | ARM64 指令编码、label/fixup 与分支 |
| `kiso/aot/lower` | 把 Mochi 降低为原生中间表示 |
| `kiso/aot/lower/nativefs` | 原生文件系统 syscall 桥接 |
| `kiso/aot/lower/types` | 表示、可达性、Root 与 CFG 分析 |
| `kiso/aot/macho` | Darwin Mach-O 镜像写入 |

这些模块用于 `native-aot` 与自举流程。公开 `koukai` 不等于稳定 ABI，也不表示所有 VM 能力都能被 Native 后端接受。

## 导入与调用示例

### 数学

```mio title="math.mio"
yobu "kiso/math";

kaku value: float64 = 144.0;
chant(math.sqrt(value));
chant(math.gcd(84, 30));
```

```text title="output"
12
6
```

`sqrt`、`floor`、`ceil`、`round`、`trunc` 使用 `Float` 约束，同时支持 `float32` 与 `float64`，不会隐式转换精度。`gcd`、`lcm` 使用 `int64`；结果不可表示时，checked 版本返回 `mu`，非 checked 版本产生运行时错误。

### 动态数组

```mio title="array.mio"
yobu "kiso/array";

kaku numbers = [10, 20];
array.push(numbers, 30);
chant(len(numbers));
chant(numbers[2]);
```

```text title="output"
3
30
```

数组赋值和传参保持共享引用语义。`array.clone` 创建独立数组并按浅复制规则复制元素；`truncate` 原地缩短共享长度并保留容量。

### 字符串与 Builder

```mio title="string.mio"
yobu "kiso/string";

kaku builder = string.new_builder();
string.write_string(builder, "Mio");
string.write_string(builder, " v2.0.0");
chant(string.builder_string(builder));
chant(string.byte_len("澪"));
```

```text title="output"
Mio v2.0.0
3
```

`string.index` 返回 UTF-8 字节偏移，未找到时返回 `-1`。模块不做 Unicode 规范化、大小写折叠或字素簇处理。`builder_string` 成功导出的字符串是独立不可变副本。

### 数值转换

```mio title="convert.mio"
yobu "kiso/convert";

kaku value = convert.parse_int("42");
moshi (value != mu) {
    chant(value + 1);
} sore {
    chant("invalid");
}
```

```text title="output"
43
```

整数解析不清理空白，只接受十进制数字和可选符号；越界或非法输入返回 `mu`。浮点解析最多接受 10000 字节输入。

### 文件读写

```mio title="fs.mio"
yobu "kiso/fs";
yobu "kiso/string";

kaku written = fs.write_all("note.txt", string.to_bytes("hello"));
moshi (written.error != mu) {
    chant("write failed");
} sore {
    kaku read = fs.read_all("note.txt");
    moshi (read.error != mu) {
        chant("read failed");
    } sore {
        kaku text = string.from_utf8(read.data);
        moshi (text != mu) {
            chant(text);
        } sore {
            chant("invalid utf8");
        }
    }
}
```

```text title="output"
hello
```

`fs.read_all` 按 32 KiB 分块读取；一般大文件处理应直接使用流接口 `reader` / `writer` 与 `kiso/io.copy_stream`。CLI 授予与 Mio 进程相同的文件权限；路径规范化不是安全沙箱。

### 二进制编码

```mio title="binary.mio"
yobu "kiso/encoding/binary";

kaku data: []uint8 = [0, 0, 0, 0];
kaku write = binary.write_u16_be(data, 0, 258);
moshi (write != mu) {
    chant("write failed");
} sore {
    kaku result = binary.read_u16_be(data, 0);
    moshi (result.error != mu) {
        chant("read failed");
    } sore {
        chant(result.value);
    }
}
```

```text title="output"
258
```

固定宽度读取返回带 `value` 与 `error` 的 Result；写入返回 `BinaryError?`，不会扩容目标数组。Varint 使用 LEB128，不是 ZigZag 编码。

## 错误与返回值约定

- `unit` 表示没有普通返回值。
- `T?` 用 `mu` 表示缺失。
- `Error?` 返回 `mu` 通常表示成功；返回非空错误表示失败。
- 带 `error` 字段的 Result 应先检查错误，再读取有效负载。
- 数组、字节和路径的长度/偏移单位不同；数组按元素，字符串查找按字节。
- `clone` 的独立存储不必然意味着递归深复制。
- 动态分配还受 VM 资源预算影响；返回错误值的 API 不保证捕获所有资源错误。

## 测试模块

`kiso/testing` 只在 `mio test` 环境注册：

```mio title="example_test.mio"
yobu "kiso/testing";

waza test_add() -> unit {
    testing.expect(1 + 1 == 2, "addition should work");
}
```

```sh
mio test .
```

普通 `mio run` 不能使用 `kiso/testing`。测试发现规则与 JSON 报告见 [CLI](/docs/v2.0/tooling/cli)。

## VM 与 Native 的支持边界

VM 成功不代表纯 Mio Native 后端完整支持同一程序。Native 当前不承诺完整 Map、通用 CLI argv、任意 MMA 宿主桥接和任意多态函数值。`kiso/fs`、`kiso/io` 等模块的 Native 行为还受 NativeFS 与 lowering 支持范围约束。

M18 已完成 Mochi → Native 的纯 Mio 自编译，但这不表示从 `.mio` 源码开始的完整工具链已经完全脱离 Go。详见 [Native AOT](/docs/v2.0/internals/native-aot)。

## 来源

本页依据 Mio v2.0.0 标签提交 `0ce04dd06c6c6e4e26f55a2c0b4ffb23aa942a0a` 的 `bunko/kiso/**/*.mio`、各模块 `README.md`、`docs/BUNKO.md`、`internal/bunko`、`internal/typecheck` 与 `internal/stdlib`。

文中的 math、array、string、convert、fs、binary 示例均使用官方 v2.0.0 发行包在 macOS 15.6.1 ARM64 上执行，输出与 `run` 实际 stdout 一致。Kiso 各模块的逐项签名见对应版本页面；v2.0 的模块索引在 [Kiso](/docs/v2.0/kiso)。
