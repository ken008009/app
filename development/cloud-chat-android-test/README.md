# Android 云聊第一阶段

## 2026-09-11 可独立完成的同步

Android 未保存地址时默认使用 `https://api.mschatapp.com`；已保存地址继续生效，显式本地联调构建仍走原有 HTTP 配置。不自动迁移地址对应的加密身份、历史或令牌。

bg 的 `ServiceCloudChat` 现在拥有 `CloudChatEvents` 连接：首帧认证，合并 ready/inbox_changed/sync_required 后调度现有 HTTP 收件流程；失败指数退避，4429 至少等待 30 秒，4401 进入重新登录。60 秒未收到有效提示则重连。保留原来的轮询与退避，通知丢失不作为消息丢失依据。main 不创建第二个连接；main/bg 的 JS 堆隔离，原生进程共享串行执行器和加密存储没有变化。

403 投递拒绝现在进入既有的本地失败队列，保留原密文及 ID，允许用户手动重试，不阻塞后续待发消息。设备版本冲突仅显示明确提示，不擅自替换身份或重新加密。

### 验证与配置命令（仓库根目录）

```sh
yarn test packages/kit-bg/src/services/cloudChat packages/shared/src/utils/cloudChatApi.test.ts packages/shared/src/utils/cloudChatUtils.test.ts apps/mobile/scripts/__tests__/cloud-chat-network-policy.test.js --runInBand --watch=false
yarn tsc:only
node apps/mobile/scripts/check-cloud-chat-push.cjs
# Firebase 项目建立后，可检查提供的 Android 配置是否匹配包名及预期项目：
node apps/mobile/scripts/check-cloud-chat-push.cjs /path/to/google-services.json YOUR_PROJECT_ID
```

推送检查只读文件，输出非秘密的包名和项目 ID。退出码 2 表示尚未指定目标聊天项目，1 表示文件或匹配检查失败，0 仅表示配置匹配，不代表推送接通。现有 Expo Notifications 已带 Firebase Messaging，勿再注册冲突的 MESSAGING_EVENT 服务。不要将后端服务账号私钥放进 Android 工程。

### 尚未同步与真实验收边界

缺少最新 backend OpenAPI/字段契约和仓库读取权限。好友申请、refresh 轮换、device_version/签名换机、服务端 read/status/typing、push-token API 均未实现。新版后端要求先成为好友，当前 App 不能自行完成申请，因此这次更新不构成完整新版私聊交付。HTTP 401 和 WebSocket 4401 仍要求钱包签名登录。

云聊 Firebase 尚未创建。现有 google-services.json 不能视为后端已启用推送；仍需同项目 Android 配置、后端私有凭据、token 接口以及真实手机前后台验证。未部署后端、未操作真实账户、未更改原生密码学实现。本次 JS 改动需要重新构建安装 APK 后验收，不能仅依据单元测试宣称实机通过。

以下为第一阶段历史实现记录，接口能力以本节与最新后端契约为准。

## 实现范围

- Android 使用 `org.signal:libsignal-android:0.102.1`，不修改 Signal 密码学算法，不回退明文。
- 钱包签名认证、预密钥上传/补充、领取、单设备文字密文投递、轮询和 ACK。
- 服务地址 + 钱包地址隔离本地身份、认证、会话、历史和队列；切换账户丢弃过期认证结果。
- main runtime 仅展示 UI。bg runtime 串行调度；原生模块在两个 host 注册，使用进程级串行执行器保护共享持久资源。JS 锁不跨 runtime；私钥不进入任一 JS heap。
- 独立 `cloud-chat-v1` 存储，AES-256-GCM + Android Keystore + AtomicFile；存放于 noBackupFilesDir。加密状态、明文消息、去重记录和待 ACK/发件队列原子提交。该版本不修改 Realm/IndexedDB schema，也不把旧 SimpleDB 原型会话当作 Signal 身份。
- 上传超时重传相同批次；发送重传相同密文及 client_message_id。解密失败不 ACK、不提交 ratchet；已持久化消息重投不重复解密。
- 每会话本地容量上限 10,000 条、全账户发件队列上限 500；超限报错，不静默删除本地历史。
- TOFU：首次信任对方身份，后续变更拒绝。会话页提供双方身份公钥 SHA-256 指纹，需通过可信渠道核对；钱包登录不能代替 Signal 身份验证。

## 构建

需要 JDK 21（可用 Android Studio 自带 JBR），Android SDK 36；保留 background runtime。正式 APK 必须完整构建 main/common/background/segments/segments-background，单 bundle 更新无法新增原生模块。

依赖来自 Signal 官方 Maven 仓库，固定版本；libsignal 为 AGPL-3.0，第三方使用不由 Signal 提供稳定性承诺。正式分发前需确认许可证义务及生产签名。项目目前 Release 使用既有 debug keystore，仅适用于现有本地联调流程。

## 独立测试（不替换钱包）

在此目录执行（设置本机 JAVA_HOME / ANDROID_HOME）：

```sh
../../apps/mobile/android/gradlew connectedDebugAndroidTest
```

独立包名 `so.onekey.cloudchat.tests`。Gradle 从钱包目录复制同一份原生引擎源码到生成目录，不维护另一份算法实现。测试每次重新加载加密文件，覆盖首条消息、回复、篡改拒绝、重复投递、预密钥后备、身份变更和上传批次重试。

真实后端测试必须显式开启，**会在联调数据库创建临时账号与消息记录**。仅使用随机测试钱包，不使用真实用户资产。

```sh
# 从仓库根目录启动；仅监听 loopback，不写出或打印私钥/JWT。
CLOUD_CHAT_TEST_API=http://192.168.3.44:8000 node development/cloud-chat-android-test/credential-broker.cjs
```

构建测试 APK 后分别安装到两台设备，为每台配置 `adb -s SERIAL reverse tcp:18791 tcp:18791`。同时运行以下命令，将 ROLE 分别替换为 alice/bob：

```sh
adb -s SERIAL shell am instrument -w \
  -e class 'so.onekey.app.wallet.cloudchat.CloudChatEngineTest#twoDeviceExchange' \
  -e cloudChatRole ROLE \
  so.onekey.cloudchat.tests.test/androidx.test.runner.AndroidJUnitRunner
```

2026-09-09 已验证：Android 17 模拟器与 Android 15 真机通过同事后端双向加解密成功，重复投递返回同一消息 ID，重复接收不重复入库，ACK 后收件箱为空。此测试验证原生引擎及后端协议，不能替代 ms-wallet 页面、钱包签名弹窗和双 JS runtime 的 APK 冒烟验收。

## 已知限制与上线前条件

- 后端当前仅 device_id=1；清除应用数据/重装后没有身份重置、换机恢复或备份流程。不要靠删密钥解决 409。
- 不含群聊、附件、多设备、推送；App 进程被系统终止时不轮询，重新打开后恢复。
- JWT 15 分钟到期需再次签名，不自动绕过签名授权；本地历史与令牌有效期分开。
- 地址改变（例如 HTTP 改 HTTPS）属于不同本地命名空间，需要正式迁移设计，不能直接重建身份。
- 历史、去重证据和旧密钥目前没有安全压缩/轮换策略；后端累计预密钥上限 20,000。首版有界测试可用，长期生产运行前必须补齐。
- 联调 HTTP 暴露令牌和元数据的传输风险；公网必须用受信任 HTTPS。
- 存储密钥不要求每次硬件生物认证；App 解锁边界沿用钱包现有机制。正式上线前需要独立安全审计、备份恢复策略和真实 Release 的双 runtime 回归。

不上传或发布此测试包、测试身份或联调产物。
