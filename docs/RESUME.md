# 床车露营地图 · 开发续接

## 30 秒检查

读取 Notes `/Volumes/notes/10-项目/个人项目/床车露营地图/管理/项目记忆.md`。
确认 SSD UUID 为 `8E1F3D62-518E-4C0F-8F7F-B3E208FA3EDC` 且已挂载、可写。

```sh
cd '/Volumes/Extreme SSD/dev/projects/camping-map'
git status --short
npm test
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
