# 平台兼容性徽标

组件只展示作者提供的证据，不推断 Mio 的真实兼容性。以下均为配置示例，不是产品支持声明。未配置的平台和空架构集合不显示。

```yaml
---
title: 示例
featureBadge: updated
platforms:
  showArch: false
  systems:
    macos:
      arm64: full
    windows:
      x86_64:
        status: partial
        note: 示例限制，请替换为经过验证的说明
    linux:
      arm64: unknown
      x86_64: unsupported
---
```

布局自动在 H1 的 FeatureBadge 后面渲染独立的平台徽标；未配置 `platforms` 的页面保持原有输出。默认只显示 SVG 系统图标和状态符号。`showArch: true` 每个架构各显示一个徽标。

MDX 无需导入，正文和 H2/H3 均可使用：

```mdx
## 示例特性 [#stable-id] <FeatureBadge status="updated" /> <PlatformBadge system="windows" arch="x86_64" status="partial" note="示例限制" />

<PlatformSupport showArch={true} systems={{linux: {arm64: "unknown", x86_64: {status: "partial", note: "示例限制"}}}} />
```

`PlatformBadge` 接收 `system`、`status`、可选 `arch` 和 `note`。`PlatformSupport` 接收与 frontmatter 相同的 `systems` 和可选 `showArch`。MDX 只允许静态字符串、布尔值和普通对象；动态表达式、展开、重复属性及子内容会在编译时报错，避免 MDX 绕过 TypeScript 校验。Frontmatter 同样严格拒绝未知字段、系统、架构和状态。

状态为 `full`（完整支持 ✓）、`partial`（部分支持 ◐）、`unsupported`（不支持 ×）、`unknown`（未验证 ?）。读屏标签包含系统、架构和完整状态语义。鼠标悬停、键盘聚焦或触屏点击可查看说明；Escape 关闭，移开焦点后关闭。徽标可换行，详情限制在视口内。

隐藏架构时，注册表内尚未配置的架构也按未验证处理：有未验证则显示未验证；全部同状态则沿用该状态；其他混合状态显示部分支持。详情始终保留每个架构的独立状态和限制，并标明缺失的架构。只配置 arm64 完整支持、尚未配置 x86_64 时，系统整体显示未验证。例如 `full + unsupported` 显示 `partial`，`full + unknown` 显示 `unknown`，不会错误提升为完整支持。

扩展时，在 `lib/platform-support.ts` 注册平台、架构或状态，并在 `components/platform-badge.tsx` 的类型完备 logo 映射中补齐平台 SVG。Schema、排序和组合组件均从注册表派生。默认顺序为 macOS、Windows、Linux，架构为 arm64、x86_64。徽标属性和说明不会进入 TOC 或搜索索引；标题 slug 和显式 ID 仍由现有 Fumadocs 插件生成。

验证：`npm run types:check`、`node --test scripts/feature-badge.test.mjs`、`npm run build`。测试数据仅位于测试中，不修改历史文档或声明真实支持程度。
