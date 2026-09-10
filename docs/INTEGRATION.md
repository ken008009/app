# Android 云聊本地联调

返回：[项目 README](../README.md)。协议来源：[平台入口](https://github.com/wangjiabao/web3-chat-platform/blob/main/README.md)，本轮已快进到 `e50aa24`，按 19 → 09 → 12 → 10 文档核对。运行后端版本以架构师文档为准，不能用文档 HEAD 代替后端镜像版本。

## 构建边界

- 正常构建不传 `cloudChatLocalIntegration`，生产 network-security-config 禁止所有明文 HTTP。
- 本地构建显式传 `-PcloudChatLocalIntegration=true`，仅 Release 资源覆盖允许 `192.168.3.44` 明文访问，其他域仍禁止。不会关闭 TLS 证书验证。
- 本地 APK 名称 `MS 联调`、版本后缀 `-local`，沿用现有应用 ID 和测试签名，可覆盖安装，无需清除数据。不能发布此包。
- 原有 Debug/Metro 网络策略通过 debug 专属 XML 保留；本轮实际使用完整 Release 双运行时，不使用 Metro。
- 默认 API 为 `http://192.168.3.44:8000`，无额外路径前缀。联调原生常量提供默认值，只迁移历史 loopback 默认地址；用户另存的其他服务地址保留。地址变化隔离本地 Signal 状态，不能把已注册在旧环境的身份复制覆盖。
- main 展示 UI，bg 串行认证/轮询；两者 JS heap 独立。Android 网络策略为进程级，安全存储及原生执行器由两套 runtime 共享，私钥不进入 JS。

## 构建命令

使用 JDK 21 和 Android SDK 36。先在仓库根运行相关 lint、`node_modules/.bin/tsgo -p tsconfig.json --noEmit` 和云聊单测。

在 `apps/mobile`，构建完整 JS（不要跳过完整性检查）：

```sh
env NODE_ENV=production SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_TOKEN= SENTRY_AUTH_TOKEN= SENTRY_PROJECT= \
ENABLE_NATIVE_BACKGROUND_THREAD=true UNION_BUILD=true SPLIT_BUNDLE=1 SPLIT_BUNDLE_SEGMENTS=true ONEKEY_PLATFORM=app \
BUILD_APP_VERSION=1.0.6 BUILD_NUMBER=10006 BUNDLE_VERSION=21718414 BUILD_BUNDLE_VERSION=21718414 \
node --max-old-space-size=8192 build-bundle.js --platform android
node scripts/check-split-bundle-integrity.js
node scripts/check-bundle-architecture.js
```

在 `apps/mobile/android`，保持同一版本及双运行时参数：

```sh
env NODE_ENV=production SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_TOKEN= SENTRY_AUTH_TOKEN= SENTRY_PROJECT= \
ENABLE_NATIVE_BACKGROUND_THREAD=true UNION_BUILD=true SPLIT_BUNDLE=1 SPLIT_BUNDLE_SEGMENTS=true ONEKEY_PLATFORM=app \
BUILD_APP_VERSION=1.0.6 BUILD_NUMBER=10006 BUNDLE_VERSION=21718414 BUILD_BUNDLE_VERSION=21718414 SKIP_EXPO_JS_BUNDLE=true \
./gradlew :app:assembleProdRelease -PcloudChatLocalIntegration=true -PcloudChatLocalVersion=1.0.6 --max-workers=4
```

`SKIP_EXPO_JS_BUNDLE` 只复用上一步刚完成的完整 union 产物，不能拿旧包或单 bundle 注入代替。安装前核对 APK 的 main/common/background、两套 segments 与新产物逐文件哈希、ARM64 libsignal、版本和签名，并检查实际 APK 的网络 XML。正常生产不传两个 cloudChatLocal 参数；生产源配置及合并 Manifest 单独核验。

## 协议与验证

实际库为 `org.signal:libsignal-android:0.102.1`，EC/PQ 由官方库生成。请求字段 snake_case、ID 为字符串、bytes 为标准 Base64，device_id=1。原始 challenge 经钱包 EIP-191 签名；JWT 加密保存，过期重新签名。密码学和身份验证未改。

轮询约 3 秒加抖动，失败指数退避。429/503 遵循 Retry-After 秒数/HTTP 日期；429 无有效响应头等待 60 秒。每个认证 HTTP 客户端共享冷却截止时间，其他请求不能越过冷却。重试复用原请求体、client_message_id 和密文。先持久化本机消息/ratchet/去重记录再 ACK。

真实双设备回归见 [独立原生测试](../development/cloud-chat-android-test/README.md)。每次使用两个新测试钱包；测试创建的后端用户/公钥/去重记录不自动删除，不操作架构师已有账户。独立原生测试不等于 App 页面与签名弹窗验收。

## 本轮结果

验证记录：2026-09-09 开始，2026-09-10 完成模拟器覆盖安装。

| 检查 | 实际结果 |
| --- | --- |
| Mac 健康检查 | 开始时 `/healthz`、`/readyz` 均 200；后续按用户要求停止检查，不表示当前仍可达 |
| TypeScript / lint | TypeScript 全项目检查通过；10 个改动 JS/TS 文件 lint 0 警告、0 错误 |
| 单元测试 | 7 个 suite、57 项通过，含 Retry-After 秒数/日期、无头 429 冷却、配置隔离 |
| 完整 JS | 2303 main + 160 bg + 23 bg-shared 分段检查通过；架构检查通过 |
| 普通生产配置 | 未传联调参数的 Manifest/资源合并成功，只包含 main 的禁止明文 XML，无 localIntegration 覆盖 |
| 联调 APK | 完整 ProdRelease + 显式 local 开关，1.0.6-local / 10006，background=true |
| 包内网络策略 | Manifest 引用 networkSecurityConfig；实际资源表解析到 XML，base=false，仅 192.168.3.44=true，无子域放行 |
| APK 完整性 | main/common/background、全部两套分段和模块映射逐文件 SHA256 与新 union 输出一致，包含 ARM64 libsignal_jni.so |
| 模拟器离线引擎 | 本地真实 Signal 加解密、存储和重复/篡改等回归通过；两个在线场景未启用 |
| 模拟器安装 | 覆盖安装成功，读回 versionName=1.0.6-local、versionCode=10006；未清除钱包数据 |
| 手机安装 | 独立测试包安装被手机拒绝；随后手机断开，未安装新联调钱包包 |
| 本轮在线验收 | App 签名登录、公钥上传/领取、双向页面收发、ACK、断线恢复均未完成；后端断开后按用户指示暂停 |

APK：[app-1.0.6-local-cloudchat.apk](../apps/mobile/dist/android/app-1.0.6-local-cloudchat.apk)。

- SHA256：`3bff4eebc2baa01fcd47489ae68134b7f39afe2e1b664b661846a0872ff5a144`
- 现有 Android Debug 签名，证书 SHA256：`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。
- 未上传/发布，未修改在线更新清单或生产版本文件。不是正式健康包；不能把历史双端引擎成功当作本轮页面验收。
- 临时测试凭证服务与 ADB 18791 转发已关闭。安装后未启动 App 主动连接后端。

文件职责：`app/build.gradle` 与三个源码集的网络 XML 隔离构建策略；主 Manifest 引用策略；`CloudChatModule` 与 `shared/cloudChat/signal` 提供非秘密联调常量；`cloudChatUtils`、`ServiceCloudChat` 应用默认地址；`CloudChatHttpClient` 处理限流冷却；对应单测保护这些行为。独立测试脚本增加健康/登录/me 检查及只含时间、路径、状态的日志，供后续恢复在线联调使用。

下一步：安装联调 APK → 两个不同测试钱包签名登录 → 公钥/预密钥 → 双向页面收发 → ACK → 断线/重试/重启。用户自行确认解锁及签名，不绕过验证。公网仍需受信任 HTTPS，HTTP 仅用于受控测试网络。
