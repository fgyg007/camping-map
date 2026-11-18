# 野泊 · 床车露营地图

一个个人营地记录应用。React + Leaflet + Capacitor，Android 在 GitHub Actions 云端构建。

## 产品方案与云端续接

- [完整产品设计与技术架构方案（原文）](docs/product/original-proposal.md)
- [Dot / 云端开发续接说明](docs/RESUME.md)

原方案描述长期目标，当前实现与限制见下文；云端可直接从本仓库继续，无需访问 Mac 或 Notes。

## 已有功能

- 营地新增、编辑、删除、收藏、搜索及分类筛选。
- Android 本地清单，不请求在线瓦片；网页可按需开启 OpenStreetMap 底图。
- WGS-84 经纬度、设施、开放状态、实测限高、核实日期和备注。
- 每个营地可添加最多 3 张本机相册照片；自动缩小为 JPEG，详情可看大图，随 JSON 导出和恢复。不上传照片，也不读取照片坐标。
- 「我的车辆」可从 12 个常见车型/配置中选择并自动带出长、宽、高，也可手填或修改。原厂参考附厂商出处；改装尺寸请以实测为准。不用车型数据判断能否通行。
- Google 地图和高德路线规划、百度地图看点、WGS-84 坐标复制。
- 设备本地保存；JSON 备份导入合并（相同地点 ID 跳过，已有车辆资料不覆盖）；网页下载或 Android 原生分享导出。
- 三个明确标注的合成演示地点，不代表真实营地。

- 可离线粘贴特定高德、百度与 Google 地图长链接，预览坐标后填入表单，再手动保存。不把地名或视图中心当坐标。

- Android 可从系统分享菜单接收地图文本；高德短链接预览仅向高德取一次跳转头，不访问跳转页。兼容已观察到的 q 与 p 两类短链。预览自动填地点名和坐标，用户核对保存；微信内部转发不能作为系统分享。
- Android 支持预览百度和 Google 地图白名单短链接，最多读取同服务的两次跳转响应头，不抓取目标页面。只有明确地点坐标且坐标系能确定才导入；百度仅返回地点编号、Google 只有视图中心或落在坐标系不明确范围内时，提供打开原地图和手填，不猜落点。

## 本地开发（不需要 Android SDK）

使用 Node.js 22 或更新版本：

```sh
npm ci
npm test
npm run dev -- --port 5173
npm run build
```

首个 APK 已构建通过：[下载页面](https://github.com/fgyg007/camping-map/actions/runs/44044484379)（页面底部 Artifacts）。

## 在 GitHub 编译和下载 APK

1. 打开仓库 **Actions → Build Android APK**。
2. 点击 **Run workflow**，选择 `main` 并运行；代码推送也会自动触发。
3. 等待构建成功，在该次运行的 **Artifacts** 下载 `camping-map-android-debug`。
4. 解压后将 `camping-map-v0.1.0-debug.apk` 传到 Android 手机安装。

这是测试用途的 debug APK，不是商店发行版本。云端临时 debug 签名可能随构建变化，不能保证跨构建覆盖安装。有已安装的旧版时先保留原应用和数据，不卸载、不清除；先导出 JSON。若无法用原签名，只能另行准备不同应用 ID 的并装候选，并验证 JSON 恢复。正式邀请车友前要确定项目独立且持久的所有者签名密钥、固定应用 ID、递增 versionCode，并实测签名一致的覆盖升级。

## 数据与能力边界

- 数据仅存当前设备/浏览器；清除应用数据或卸载会丢失记录，请定期导出备份。无账号、云同步或后端。
- 支持手动录入 WGS-84、GCJ-02 或 BD-09 经纬度；录入后近似转换为 WGS-84，旧备份无需迁移。转换范围采用粗略矩形，不是行政边界，不保证零偏移。百度墨卡托、仅有地点编号的链接识别与 AI 解析尚未实现。照片与车辆档案仅在本机保存；设备存储或备份空间不足时不会覆盖原记录。高德按钮为 [HTTPS 路线规划](https://lbs.amap.com/api/uri-api/guide/travel/route)，Android 优先用官方路线 Intent 开高德 App，仅启动失败时退回网页；高德 App 真机落点待验收。
- 网页在线地图和外部路线需要可访问的网络；中国大陆网络下 OSM/Google 的可用性需要实测。底图不支持批量下载或离线缓存包。APK 内页面与已有地点记录不依赖服务器。
- 当前提供普通 Web 页面与 APK，尚未提供可离线安装的 PWA。
- 设施勾选仅表示记录者确认具备；未勾选表示未记录。没有以历史车辆数据推断安全通行。
- Android 最低版本由 Capacitor 工程指定为 Android 7（API 24）。

## 参考

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [OpenStreetMap 瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [验收记录](docs/QA.md)
- [开发续接](docs/RESUME.md)
