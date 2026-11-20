# 野泊 1.0.0：Mac 发布交接

给 jlmac.local 上的 Codex。用户已确认 0.3.2 可以作为正式版，希望 App 仅叫「野泊」，以后无需卸载就能更新。任务：完成长期签名、验证迁移和覆盖安装、将签好的正式 APK 发布到现有私有 GitHub 仓库。不要公开源码、创建公开仓库或联系车友。

## 从这里继续

- GitHub：`fgyg007/camping-map`，正式候选分支 `release/yebo-1.0.0`；功能基线是 0.3.2 的 `25808ad571a5e282ef987c116800dc4c74bfa69c`。
- 候选代码锚点：`cf3ef11be7c1cb7f581489bc8f0c2329a4140328`。检查分支在该提交之后的差异；交接提交只改文档/关闭云发布默认开关，不改 APK 源文件。正式显示名「野泊」，应用 ID `com.jlmac.yebo`，versionName `1.0.0`，versionCode `13`，非 debuggable。不要改成曾用临时证书的 `com.jlmac.campingmap` 或 `com.jlmac.campingmap.baidutrial`。保留 Java namespace `com.jlmac.campingmap`。
- [GitHub Actions 44716010745](https://github.com/fgyg007/camping-map/actions/runs/44716010745) 的 59 项单测、移动浏览器回归、Gradle release 编译/lint/测试和 APK 元数据检查均通过。只生成了**未签名**候选，GitHub 尚未发布 Release，也未创建正式标签。
- 候选 [ZIP 14620330291](https://github.com/fgyg007/camping-map/actions/runs/44716010745/artifacts/14620330291) 保留 3 天。ZIP SHA-256：`d80a5ad05e37171472f81d741cf274ef6b97a9f99f2a1da9661ba0a2563a4a2c`；解压 `app-release-unsigned.apk` SHA-256：`c344a6edf6963e03b98a50dd78a959215546007c0e10e3b43b3a88b3d6ff2d9a`。私有仓库须登录；如过期，用同一发布分支重新跑 GitHub Actions 并核对提交，别用试用 APK 代替。
- Mac 的原工作树先前在旧 `main`。先读 AGENTS.md、jlmac-workflow 的 Android 规则与 Notes 项目入口。写入前用 `diskutil info "/Volumes/Extreme SSD"` 确认 SSD 可写且 UUID 为 `8E1F3D62-518E-4C0F-8F7F-B3E208FA3EDC`。无法确认则不改原工作树。在正确 SSD 上从远端分支开干净 worktree，不重置、覆盖或切走用户的原工作树。继续使用 GitHub Actions 编译，未经用户选择不装完整本地 Android 环境。

## 推荐路线：签名只留在 Mac

1. 先在项目相关的受控位置检查有没有现成的**正式**签名，只核对公开证书指纹与归属，不读取或传输别的项目的密码。先前的只读检查没有在项目中找到 keystore。若尚无专用密钥，用受信任 JDK 的 `keytool` 在仓库外创建新的项目专用 PKCS12/JKS，项目所有者用本机终端提示输入密码或用钥匙串保管。限制文件访问权限，并至少留一份在所有者掌控下的加密离线备份。记录公开证书 SHA-256、别名、保管和恢复方式；**不要**把私钥、密码、Base64 或口令截图发到聊天、Git、CI 日志或产物。以后不要重新生成。Mac 上此前未检测到可用 JDK 或 SDK；以本地 Codex 实查为准，若要安装最少签名工具，先征得用户同意。编译仍留在云端。
2. 从经校验的未签名 APK 开始，用 Android 官方 Build Tools 的 `zipalign -f -P 16 4` 对齐，再用 `apksigner sign --ks … --ks-key-alias … --out Yebo-1.0.0.apk …` 本机签名。交互输入密码，不把密码写进命令参数、脚本或终端记录。运行 `zipalign -c -P 16 4`、`apksigner verify --verbose --print-certs`，核对公开证书 SHA-256，运行 `bash tools/check-release-apk.sh Yebo-1.0.0.apk` 核对标签、包名、版本、非调试、FileProvider 和百度进程。计算独立的 APK SHA-256。只上传 APK 与其校验和。
3. 用已同意的测试 Android 设备验证。先在 0.3.2 导出**完整 JSON 备份**，保留测试版，再并装正式包授予所需权限；先点「恢复我的备份」，有车辆资料时另勾选「同时恢复备份中的车辆资料」，检查地点、照片、点评、实测、车辆，最后才导入车友分享。用合成数据和同一正式证书在独立 QA 设备上做一次低 code → code 13 的 `adb install -r`，确认原数据保留；低 code 包只供本次验证，不发布。不要卸载任何已有旧包或清它的数据。可顺手测冷启动、地图分享、底部保存按钮在原生键盘弹出/收起时的表现。之前的云模拟器因 KVM 权限未启动；不能把浏览器通过当作真机验证。没有可用 Android 时如实告知用户并先保留签名包，标明未验项。
4. 检查 `gh auth status`、仓库仍是 PRIVATE、`v1.0.0` 标签和 Release 是否已存在；遇冲突先查，不覆盖标签或资产。通过发布门槛后，使用有权限的本机 GitHub 会话，把 `v1.0.0` 绑定到验证过的发布提交，并在同一私有仓库发布 `Yebo-1.0.0.apk` 和 `SHA256SUMS.txt`。标题「野泊 1.0.0」，发布说明见 [YEBO-1.0.0.md](YEBO-1.0.0.md)。上传后重新下载核对哈希，检查 Release 已发布而非草稿、版本和资产正确，再把链接交给用户。车友若无权限可由用户单独转发签好的 APK，不要公开源库。后续更新保持包名和证书不变、只递增 versionCode。
5. 默认不要把长期密钥交给 GitHub。只有所有者明确选择云托管签名，才按 [ANDROID-RELEASE.md](ANDROID-RELEASE.md) 设置受保护的环境、固定公开指纹并开启 `YEBO_ENABLE_CI_PUBLISH`；本机签名和云签名只能选一条路线，避免重复发布。

依据：[Android 官方签名说明](https://developer.android.com/studio/publish/app-signing) · [Android 官方 apksigner](https://developer.android.com/tools/apksigner)。
