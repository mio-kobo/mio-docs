# V2.1 Playground 与页面验收

**构建通过。** 在独立临时目录解出 `git archive v2.1.0`，从正式提交 `74e461b2985886160a285c7104d2a41090d0f548` 运行原有 `bash scripts/web/build.sh`。Darwin ARM64、Go 1.27.3；脚本嵌入 12 个包的 18 份 Mio 源文件，再用 `GOOS=js GOARCH=wasm go build -trimpath -ldflags=-s` 构建 Web 参考 VM。WASM 为 7,771,054 字节，配套的 `wasm_exec.js` 来自同一 Go 安装。构建未修改核心源码或关闭安全检查。

- `mio.wasm` SHA-256：`7196d8cdabc0349b4350e4754cf35190d8fe3aeb91755cb2d49a0619adb891ce`
- `wasm_exec.js` SHA-256：`0c949f4996f9a89698e4b5c586de32249c3b69b7baadb64d220073cc04acba14`
- [构建清单与 Worker 哈希](../../public/wasm/v2.1/manifest.json)
- [上游正式 Web 构建流程](https://github.com/mio-kobo/mio/blob/v2.1.0/scripts/web/build.sh)、[桥接接口](https://github.com/mio-kobo/mio/blob/v2.1.0/cmd/mio-wasm/main.go) 与 [Web CI](https://github.com/mio-kobo/mio/actions/runs/42384113383)

文档页从已解析的文档版本选择 Worker。V2.1 使用 `/wasm/v2.1/`，V1.0、V2.0 和旧版教程继续使用 `/wasm/`。运行与检查通过官方异步 `mioExecute(requestJSON, callback)`；转换结构化诊断、运行时错误和部分 stdout。每个 V2.1 请求结束后销毁实例，避免把增长的线性内存留到下一次运行。20 秒初始化和 10 秒执行上限均在页面控制器执行，停止会终止 Worker。页面及 Worker 都限制 64 KiB 源码，Worker 返回至多 64 Ki UTF-16 字符 stdout；官方 VM 另有 5,000 万指令和 1 MiB 输出上限。Go 的 1 GiB GC 内存目标是**软限制**，不是固定配额；未做极端内存压力的浏览器兼容验收。

所有 Mio 宿主调用由正式 VM 的拒绝注册表处理；Go Worker 初始化之后关闭网络及脚本加载能力。标准库来自封闭的只读嵌入包。源程序不接触文件、进程、外网、浏览器存储或 JS 桥。对不适合网页执行的文档代码块保留静态显示。

| Web Bunko | 实际检查、编译、运行和输出 | 边界或错误输入 |
| --- | --- | --- |
| `kiso/array` | make + push，输出 9、0 | 空数组长度 0；负长度为运行时诊断 |
| `kiso/bytes` | contains 命中，输出 hai | 查找空字节序列返回 -1 |
| `kiso/convert` | parse_int 输出 -42 | int64 溢出返回 mu |
| `kiso/crypto/sha256` | 逐字节核对 abc 摘要 `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` | 负区间返回空数组 |
| `kiso/encoding/binary` | 大端读取 0x0102，输出 258 | 读过末尾返回错误 |
| `kiso/encoding/json` | 解析并渲染 `{"a":42}` | 不闭合的对象有 error |
| `kiso/math` | gcd(12,18) 输出 6 | 负数平方根为 NaN |
| `kiso/path` | clean("/a/../b") 输出 /b | 空文本为 `.`；Windows 反斜杠是普通字符 |
| `kiso/regexp` | Han 属性匹配汉字，输出 hai | 未闭合字符类报告错误 |
| `kiso/regexp/unicode_data` | 用小写规范键 han 得到非空三元组 | 直接用 Han 或未知键得到空数组；regexp 先规范化 |
| `kiso/string` | rune_count("漢é") 输出 2；trim_space 输出 Mio | 0xFF 不能转换为 UTF-8 字符串 |
| `kiso/utf8` | 汉字编码的有效性输出 hai | 无效字节输出 iie |

上述 12 项在 Node Worker 和 Chromium Worker 中均执行静态检查及实际编译运行，检查精确 stdout。另逐项确认 9 个未嵌入的路径导入会产生诊断：fs、io、os、net、net/tcp、testing、runtime、aot/sign、encoding/mochi。探针见 [模块用例](../../fixtures/docs/playground-v2.1-bunko.mjs)。本轮没有据此承诺所有模块 API 与 Native 输出完全相同。

`npm run check:playground` 32 项通过，覆盖 **337 个 V2.1 可执行块（308 个不同源码）**及 **366 个旧版块（333 个不同源码）**。V2.1 的差异快照逐项核对：新增 JSON、regexp、SHA-256、裁剪等用例；四例改用 Native 与 Web 都接受的显式类型；三例比旧版多输出正式 VM 的末尾表达式值。旧版快照保持原样；两段依赖上下文的片段在 V2.1 改为静态。

**Mochi。** 单独用正式标签的 Worker 试验 `compile` / `exec`：Web 生成的简单程序为 v2 字节码，可由该 Web VM 和本机 Native CLI 执行；Native CLI 生成的 Hello 与类型化闭包字节码均为 v16，正式 Web Worker 正确输出 Hello, Mio! 和 42。截断文件被拒绝；带文件系统调用的 Native Mochi 被 Web VM 明确拒绝（`host capability is not available`）。因此接口可行，但站点本轮只保留运行/检查，不开放字节码导入导出；未进行完整双向兼容承诺。

| 浏览器 | 页面 | 结果 |
| --- | --- | --- |
| Chromium / Chrome 157.0.8103.38 | 本机静态站，1440×900 浅色及 390×844 触摸深色 | 通过。真实 Hello、模块、复制、编辑、重置、停止、诊断、重复运行；V2.1→V2.0 版本选择器和 V1.0 样例各使用正确资源；注入 WASM HTTP 503、无响应和 Worker 异常，验证无回退和恢复 |
| Firefox 159.0 | 本机静态站，1440×900 浅色 | 通过。运行与检查、错误、停止、版本切换、SVG 状态与键盘提示 |
| Playwright WebKit 27.2 | 本机静态站，1440×900 浅色 | 通过核心运行与交互。默认 Tab 顺序没有落到目标按钮，另以显式焦点确认提示和 Enter/Escape；未运行 Safari 应用 |

页面身份、正文、框架错误层与控制台均检查；正常流程没有相关浏览器错误。平台图标位于功能标题旁，实际验证 SVG 和状态符号同时显示，状态未被写入目录标题。桌面用 Tab、Enter、Escape 和悬停验证提示，测试并修复焦点与悬停同时显示时的提示叠加；移动端点按展开，未出现横向溢出。检查了可访问性树中的系统、架构和状态文本，以及无架构汇总对缺失架构显示「未验证」。未使用实际屏幕阅读器朗读，也未使用实体手机。

浏览器验证用 Playwright 连接 `npm start -- --port 3212` 的静态导出（本会话没有 Browser 插件技能）；页面流程入口为 V2.1 快速开始、JSON/正则/SHA-256、OS/发行包/验证页面。可复跑的站点检查：

- Node 24：`npm run check:playground`；`npm run types:check`；`npm run check:versions`；`npm run check:links`。
- `npm run build` 通过发布门禁、静态导出与资源哈希检查；导出包含 175 个文档页面及其别名。构建有两条 Fumadocs 搜索 `::highlight` 的 CSS 优化器警告。
- `BASE_URL=http://127.0.0.1:3212 node --test scripts/feature-badge.test.mjs scripts/tutorial-exercises.test.mjs scripts/versioning.test.mjs scripts/release.test.mjs`：35 项通过，含生产路由验证。
