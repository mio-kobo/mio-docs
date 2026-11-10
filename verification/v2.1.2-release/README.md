# Mio v2.1.2 发布与文档核验

- [GitHub Release](https://github.com/mio-kobo/mio/releases/tag/v2.1.2) 是正式发布，发布时间为 2026-11-10 08:11:15 UTC。带注释 tag 的对象为 `26e37f066a03c09bd696f2430ed7cbcdb8c16f7c`，解引用后为源码提交 `7903f6d18a37b3e4a84fb381f019d1683d3fb81a`。GitHub commits API 返回相同的提交。
- 从官方 Release 下载 `SHA256SUMS` 和所列全部九个包。每个包的实际字节大小和 SHA-256 与 GitHub Release API 一致，SHA-256 同时与 `SHA256SUMS`、`release-verification.json` 一致。Core 和 Full 各自核对。
- 从 macOS ARM64 Core 和 Full 归档分别解压并执行 `bin/mio version`、`bin/mio check hello.mio`、`bin/mio run hello.mio`。两包都报告上面的源码提交，检查成功，运行输出 `42`。其他平台只做发行包字节校验。
- V2.1.2 仅冻结版本首页、安装与验证、首个程序及迁移步骤。V2.1 原预览正文保持独立，完整补丁版技术文档仍待安装/Bunko、CLI 与审核资料相关修正完成后逐页复核。
- Playground 使用 [V2.1.0 构建清单](../../public/wasm/v2.1/manifest.json) 中的 Worker 和 WASM。对比 v2.1.0 与 v2.1.2，Web 构建脚本及 Go 编译器、VM、GC 与 WASM 入口路径没有差异。本站的例程测试在 V2.1.0 Worker 中核验运行、检查与诊断，CLI 补丁版功能的验证使用本机发行包。
- `published` 表示上游发布与产物已核对。本站生产验收仍待维护者完成，`acceptance` 保持为空，精确补丁快照进入生产部署前须通过 `live` 门禁。
