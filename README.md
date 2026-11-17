# 野泊 · 床车露营地图

一个个人营地记录应用。React + Leaflet + Capacitor，Android 在 GitHub Actions 云端构建。

## 已有功能

- 营地新增、编辑、删除、收藏、搜索及分类筛选。
- 在线 OpenStreetMap 底图与地图标记；列表不依赖底图加载。
- WGS-84 经纬度、设施、开放状态、实测限高、核实日期和备注。
- Google Maps 导航链接、坐标复制。
- 设备本地保存；JSON 备份导入合并（相同 ID 跳过）；网页下载或 Android 原生分享导出。
- 三个明确标注的合成演示地点，不代表真实营地。

## 本地开发（不需要 Android SDK）

使用 Node.js 22 或更新版本：

```sh
npm ci
npm test
npm run dev -- --port 5173
npm run build
```

## 在 GitHub 编译和下载 APK

1. 打开仓库 **Actions → Build Android APK**。
2. 点击 **Run workflow**，选择 `main` 并运行；代码推送也会自动触发。
3. 等待构建成功，在该次运行的 **Artifacts** 下载 `camping-map-android-debug`。
4. 解压后将 `camping-map-v0.1.0-debug.apk` 传到 Android 手机安装。

这是测试用途的 debug APK，不是商店发行版本。云端临时 debug 签名可能随构建变化，不能保证跨构建覆盖安装；需要卸载旧版时先导出营地备份。正式发行需配置本项目独立且持久的签名密钥。

## 数据与能力边界

- 数据仅存当前设备/浏览器；清除应用数据或卸载会丢失记录，请定期导出备份。无账号、云同步或后端。
- 仅接受 WGS-84。高德 GCJ-02、百度 BD-09 坐标转换、短链解析、Android 分享接收、照片、AI、车辆档案尚未实现。
- 地图和导航需要可访问的网络；中国大陆网络下 OSM/Google 的可用性需要手机实测。底图不支持批量下载或离线缓存包。APK 内页面与已有地点记录不依赖服务器。
- 当前提供普通 Web 页面与 APK，尚未提供可离线安装的 PWA。
- 设施勾选仅表示记录者确认具备；未勾选表示未记录。没有以历史车辆数据推断安全通行。
- Android 最低版本由 Capacitor 工程指定为 Android 7（API 24）。

## 参考

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [OpenStreetMap 瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [验收记录](docs/QA.md)
- [开发续接](docs/RESUME.md)
