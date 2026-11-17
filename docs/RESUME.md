# 床车露营地图 · 开发续接

## 30 秒检查

先读本文件、`README.md`（功能边界与构建步骤）、`docs/QA.md`（已验证与未验证）。

- 原 Mac：继续 `/Volumes/Extreme SSD/dev/projects/camping-map`，先确认 SSD UUID 为 `8E1F3D62-518E-4C0F-8F7F-B3E208FA3EDC` 且挂载可写；Notes 当前记忆在 `/Volumes/notes/10-项目/个人项目/床车露营地图/管理/项目记忆.md`。
- Dot / 云端：使用可访问私有仓库 `fgyg007/camping-map` 的工作区，无需 Mac、SSD 或 Notes。不要在云端照抄 `/Volumes` 路径。已有仓库先检查分支和未提交内容，不覆盖其他改动。

在仓库根目录运行（Node.js 22+）：

```sh
git status --short
npm ci
npm test
npm run build
```

## 当前事实

v0.1.0 已有个人营地库、在线地图、收藏筛选、详情、编辑和备份。技术栈 React + Leaflet + Capacitor，无后端。仓库目标 `fgyg007/camping-map`（私有），具体提交与云构建状态以 Notes 及 GitHub 为准。

## 唯一下一步

下载 Actions 生成的测试 APK，完成 Android 真机安装、数据持久化、分享备份与导航验收，再推进国内地图和分享导入。

## 能跑的命令与端口

- `npm ci`：安装 JS 依赖。
- `npm run dev -- --port 5173`：本地网页预览。
- `npm test`、`npm run build`：数据测试与网页构建。
- `npx cap sync android`：同步 Android 工程文件。
- Actions → Build Android APK → Run workflow：云端构建；不在本机运行 Gradle。

## 不要做什么

不安装本机 Android 工具链；不复制其他项目签名；不把演示数据当成真实营地；不把 GCJ-02/BD-09 当 WGS-84；不把 Notes、真实用户数据或签名材料提交 Git。

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

当前仓库包含完整基础版，未实现原方案的全部功能。原始设计原文与长期项目资料只在 Notes，未上传 GitHub。
原方案后续方向：多源分享导入、WGS-84/GCJ-02/BD-09 坐标处理、国内地图与导航、车型实际尺寸及通行风险对比、照片/EXIF、AI 提取、社区点评和状态打卡。
这些是待收敛的规划，不是已验收能力或确定的实现承诺。开展某一方向时先核实需求与官方接口；需要原文细节时再让用户提供原文或连接原 Mac。

## 给 Dot 的起始指令

> 请接续私有仓库 fgyg007/camping-map。先读取 AGENTS.md、README.md、docs/RESUME.md 和 docs/QA.md，检查当前分支与工作区，再运行 npm ci、npm test、npm run build。Android 已选 GitHub Actions 云端编译，不安装本机 Android 工具链。当前是 v0.1.0 基础版，请先确认 Actions 结果和待完成的真机验收，再按我提供的新需求推进。云端没有 Notes 或 SSD 时按仓库说明继续，不把演示地点当作真实营地。
