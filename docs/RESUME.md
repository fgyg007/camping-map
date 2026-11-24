# 床车露营地图 · 开发续接

## 30 秒检查

先读本文件、`README.md`（功能边界与构建步骤）、`docs/QA.md`（已验证与未验证）、[完整原始方案](product/original-proposal.md)。

- 原 Mac：继续 `/Volumes/Extreme SSD/dev/projects/camping-map`，先确认 SSD UUID 为 `8E1F3D62-518E-4C0F-8F7F-B3E208FA3EDC` 且挂载可写；Notes 当前记忆在 `/Volumes/notes/10-项目/个人项目/床车露营地图/管理/项目记忆.md`。
- Dot / 云端：使用可访问公开仓库 `fgyg007/camping-map` 的工作区，无需 Mac、SSD 或 Notes。不要在云端照抄 `/Volumes` 路径。已有仓库先检查分支和未提交内容，不覆盖其他改动。

在仓库根目录运行（Node.js 22+）：

```sh
git status --short
npm ci
npm test
npm run build
```

## 当前事实

- Android 已发布正式签名 [v1.0.0](https://github.com/fgyg007/camping-map/releases/tag/v1.0.0)，包名 `com.jlmac.yebo`，版本号 13。旧测试包与正式包可并装，通过 JSON 备份迁移。现有 APK 可直接下载使用。
- iPhone 使用共用 React / Vite 源码的 PWA。生产构建生成清单、图标和版本化 Service Worker 缓存，Capacitor 原生容器跳过注册。PWA 尚待 HTTPS 部署和 iPhone 真机验收。
- 59 项单元测试、生产构建、Chrome 断网重开和数据留存、JSON 导出、Android 桥接模拟回归已通过。详细项目状态与规划以 NAS Notes 为准。

## 下一步

确定稳定的 HTTPS 地址并部署 PWA，然后按 README 和 QA 的清单在 iPhone 主屏幕模式验收。Android 继续使用当前正式 APK。

## 能跑的命令与端口

- `npm ci`：安装 JS 依赖。
- `npm run dev -- --port 5173`：本地网页预览。
- `npm test`、`npm run build`：数据测试与网页构建。
- `npx cap sync android`：同步 Android 工程文件。
- Actions → Build Android APK → Run workflow：云端构建；不在本机运行 Gradle。

## 不要做什么

不安装本机 Android 工具链；不复制其他项目签名；不把演示数据当成真实营地；不把 GCJ-02/BD-09 当 WGS-84；不批量镜像 Notes，不提交真实用户数据或签名材料；本次用户明确授权的产品方案原文已单独纳入仓库。

## 工程文件在哪里

| 路径 | 职责 |
|---|---|
| `src/main.jsx`、`src/style.css` | 页面、交互、地图和响应式样式 |
| `src/data.js` | 数据校验、演示记录、备份解析、导航链接 |
| `tests/data.test.js` | 数据与导航测试 |
| `android/` | 完整 Android 工程及 Gradle Wrapper |
| `capacitor.config.json` | 应用名称、包名和 Web 构建目录 |
| `package.json`、`package-lock.json` | 依赖与可复现安装 |
| `.github/workflows/build-apk.yml` | 云端测试、编译、lint、签名验证与 APK 上传 |

源码以仓库为准；`node_modules`、`dist` 可由安装/构建生成，APK 在 Actions Artifacts 中，不提交 Git。Artifacts 保存 30 天，过期后可手动重新构建。

## 原方案与后续范围

当前仓库包含完整基础版，未实现原方案的全部功能。用户于 2026-11-17 授权上传[完整产品设计与技术架构方案](product/original-proposal.md)，供 Dot 直接云端开发。

- 原文副本：`docs/product/original-proposal.md`，与 Notes 原始资料逐字节一致，不改写原文。
- SHA-256：`95d3f04a865d1d930c282f00745bdf4acfbd513f0ee0127f0209576c32e45065`。
- 原始资料归档仍在 Notes；云端直接使用仓库中的授权副本，无需连接 Mac 或索取原文。后续设计调整和实施决定写在工程文档中，保留原始方案作追溯依据。
原方案后续方向：多源分享导入、WGS-84/GCJ-02/BD-09 坐标处理、国内地图与导航、车型实际尺寸及通行风险对比、照片/EXIF、AI 提取、社区点评和状态打卡。
这些是待收敛的规划，不是已验收能力或确定的实现承诺。开展某一方向时核对原文、现有代码和官方接口，再记录实际选型。原文中的“零偏移”、自动抓取、车型 AI 数据与离线地图等表述是待验证的设计目标；不能直接视为已保证能力。

## 给 Dot 的起始指令

> 请接续公开仓库 fgyg007/camping-map。先读取 AGENTS.md、README.md、docs/RESUME.md、docs/QA.md 和完整方案 docs/product/original-proposal.md，检查当前分支与工作区，再运行 npm ci、npm test、npm run build。Android 已选 GitHub Actions 云端编译，不安装本机 Android 工具链。当前 Android 已正式发布 v1.0.0，iPhone PWA 源码已实现；先按本文件当前状态和任务授权继续。云端没有 Notes 或 SSD 时按仓库说明继续，不把演示地点当作真实营地。

### 微信位置引用候选

已有一例用户确认腾讯地图小程序短链接能在微信回到分享点位，见 QA。可另做「位置引用」：仅本机保存不透明引用、标题和备注，允许复制回微信；未提供坐标时不生成地图点。暂不宣称能够提取坐标、跨设备复开或保证有效期。

### Android 分享试用

高德短链接与系统 text/plain 分享接收已实现，先用合成无名点真机验收。微信闭环仍未打通：不将复制短码、手填或桌面重标视作一键导入。

Android 已改为列表首页、移除嵌入的在线底图；网页地图可手动打开。保留高德与 Google 外部路线。应用图标资源由 `tools/generate-launcher-icons.py` 生成旧版位图，系统自适应图标采用 108dp 矢量层。

### 0.2.1 候选补丁
导入冲突预览按目标营地汇总，与实际保存共用同一合并逻辑。确认前不写入；旧版覆盖安装仍须使用相同签名。

### 0.3.0 试用迭代
同一营地可保留多条带日期的车友实测，并按当时的车型尺寸与「我的车辆」展示差值。它不是通行结论。详情横向翻页；页头上下滑或底部按钮换地点，底部固定关闭。从列表进入遵循当前筛选及排序，从地图进入使用地图中全部地点。导入车友地点与恢复备份区分入口；含实测或个人车辆离地间隙的备份使用 v2，新版可读 v1。真实分享、边缘返回手势与同签名覆盖升级仍须独立安卓验收。

### 0.3.1 试用迭代
新建地点时可填写首次到访实测，从「我的车辆」预填可改的当天车型。只收藏不生成实测；填写后的有效实测与地点一起保存。实测列表区分我的、车友和旧记录未标记来源。私人评分和短评移到详情的「概览」，不混入实测或分享。
