# Android 云聊第一阶段

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
