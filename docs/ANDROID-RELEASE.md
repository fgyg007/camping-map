# Android 正式版签名和发布

正式 APK 采用固定 ID `com.jlmac.yebo`，从 1.0.0 / code 13 开始。旧原型及 0.3.2 试用版保留原包名；见 [迁移步骤](YEBO-1.0.0.md)。

- 由项目所有者在受控设备上创建或选择项目专用 KeyStore，留一份加密的离线备份。永远不把文件、密码或其 Base64 写入 Git、聊天、构建产物或日志。
- 默认推荐本机签名，参考 [Mac 交接](YEBO-MAC-HANDOFF.md)。只有所有者明确选择托管签名时，才设置仓库变量 `YEBO_ENABLE_CI_PUBLISH=true`（默认关闭），并在 GitHub 私有仓库的 `yebo-release` Environment 设定 `YEBO_KEYSTORE_BASE64`、`YEBO_STORE_PASSWORD`、`YEBO_KEY_PASSWORD` 三个 Secrets，以及 `YEBO_KEY_ALIAS`、`YEBO_CERT_SHA256` 两个 Variables（后者只填 64 位十六进制的公开证书摘要，无冒号）。限制到所有者信任的发布标签；保留项目所有者审批（如果计划支持）。不要复用临时调试签名。
- 发布分支 push 只验证未签名候选，不能安装或转发。通过后用同一个密钥对两个递增 versionCode 的合成数据包验证 Android 覆盖安装和原地点/照片/点评/车辆/实测留存；验证正式非调试包冷启动和备份恢复。然后在目标提交上创建与 Gradle 版本一致的标签（如 `v1.0.0`）。标签构建校验正式包名、应用名、非调试状态、签名和固定证书后才创建仓库内 Release。保留已发布的 APK 和 SHA256。
