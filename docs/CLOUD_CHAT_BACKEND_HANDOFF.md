# MS Android 云聊：后端 AI 接入说明

更新时间：2026-09-11。对象：维护 web3-chat-backend 的工程师与 AI。

返回：[项目入口](../README.md) · [客户端联调](INTEGRATION.md) · [Android 引擎与验收](../development/cloud-chat-android-test/README.md)。

本文描述本次提交的实际客户端行为，不代替后端 OpenAPI，不把部署记录或模拟测试当作新版 Android 实机验收。当前客户端没有 backend 仓库读取权限，也没有其本地源码。后端版本以维护者交付的运行版本为准。

## 1. 先读结论

Android 已有钱包签名认证、原生 libsignal 单设备文字私聊、加密持久化、幂等重试和 ACK。本次增加默认公网 HTTPS、WebSocket 提示与重连、403 投递失败队列处理、设备变化错误提示及只读 Firebase 配置检查。

**新版后端要求好友关系，而客户端尚未接入申请／接受，因此目前不能宣称完成新版私聊闭环。** refresh、设备版本、签名换机、服务端已读／状态／typing 和推送登记接口仍待精确契约。不要通过移除后端好友门禁、跳过身份校验或放开认证来使旧客户端通过。

## 2. 代码导航与调用链

1. 界面：[CloudChat 页面](../packages/kit/src/views/CloudChat/pages/CloudChatPage.tsx)、[会话页](../packages/kit/src/views/CloudChat/pages/CloudChatRoomPage.tsx)、[设置页](../packages/kit/src/views/CloudChat/pages/CloudChatSettingsPage.tsx)。
2. bg 编排：[ServiceCloudChat](../packages/kit-bg/src/services/ServiceCloudChat.ts)，负责钱包选择、签名登录、密钥补充、发件队列、收件轮询与异常恢复。
3. 传输：[HTTP 客户端](../packages/kit-bg/src/services/cloudChat/CloudChatHttpClient.ts)、[WebSocket 提示](../packages/kit-bg/src/services/cloudChat/CloudChatEvents.ts)。
4. 类型：[cloudChat.ts](../packages/shared/types/cloudChat.ts)；地址策略：[cloudChatUtils.ts](../packages/shared/src/utils/cloudChatUtils.ts)；错误与常量：[cloudChatApi.ts](../packages/shared/src/utils/cloudChatApi.ts)。
5. 原生桥：[signal.native.ts](../packages/shared/src/cloudChat/signal.native.ts) → [CloudChatModule.java](../apps/mobile/android/app/src/main/java/so/onekey/app/wallet/cloudchat/CloudChatModule.java)。
6. 原生实现：[CloudChatEngine](../apps/mobile/android/app/src/main/java/so/onekey/app/wallet/cloudchat/CloudChatEngine.java)、[CloudChatSignalStore](../apps/mobile/android/app/src/main/java/so/onekey/app/wallet/cloudchat/CloudChatSignalStore.java)、[CloudChatVault](../apps/mobile/android/app/src/main/java/so/onekey/app/wallet/cloudchat/CloudChatVault.java)。

## 3. 运行时与持久化边界

- 生产有 main/UI 和 bg 两个独立 JS runtime，同一原生进程、独立 JS 堆。main 展示状态与交互，bg 持有业务队列、HTTP 和 WebSocket；不能各自创建续期或收件任务。
- Android 原生模块可被两套 React 上下文注册，但静态串行执行器是进程共享资源，保护同一个按 scope 隔离的持久存储。JS 锁不能跨 runtime。
- scope 为服务根地址、换行及钱包地址。Android Keystore 的 AES-256-GCM 加密文件存入 noBackupFilesDir/cloud-chat-v1，以 AtomicFile 写入；scope 同时参与认证附加数据。
- 解密状态、消息、去重证据和待 ACK／发件记录一起提交；异常不提交事务。私钥不进入 main 或 bg 的 JS 堆，不上传后端。界面所需消息数据进入 JS 后是各 runtime 自己的对象，不能认为共享原生文件等于共享 JS 内存。
- HTTP 改 HTTPS 属于不同 scope。不能自动把旧令牌、密钥或历史搬到新地址；清数据／重装不等于合法换机。
- 本轮未修改 Realm/IndexedDB schema，也未修改原生密码算法或原生加密文件格式。

## 4. 当前实际调用的接口

以下为客户端已调用路径，非新版后端全部接口清单。JSON 使用 snake_case，ID 保留字符串，密文字节使用标准 Base64；认证后使用 Authorization Bearer。

| 方法 | 路径 | 当前用途 |
| --- | --- | --- |
| GET | /readyz | 连接检查 |
| POST | /v1/auth/challenge | 获取 register/login 挑战 |
| POST | /v1/auth/register | 签名注册 |
| POST | /v1/auth/login | 签名登录 |
| POST | /v1/auth/logout | 退出并撤销当前会话 |
| GET | /v1/users/me | 验证当前用户 |
| GET | /v1/users/lookup | 按 address 查 service_id |
| PUT / GET | /v1/signal/keys | 上传／补充、查询预密钥 |
| POST | /v1/signal/prekeys/claim | 幂等领取 bundle |
| POST / GET | /v1/signal/messages | 投递密文／拉取收件箱 |
| POST | /v1/signal/messages/ack | 确认已可靠保存的消息 |
| WebSocket | /v1/signal/events | 通用状态变化提示 |

### 认证

challenge 请求包含 address、chain_id、purpose；对服务器原始 message 做钱包 personal_sign，再提交 challenge_id 与 signature。不自行重拼签名文本或绕过域名校验。现有 AuthResponse 只处理 user、access_token、token_type、expires_in；未保存 refresh token。

现有 ServiceCloudChat.refresh() 是刷新聊天数据，不是令牌续期。HTTP 401 或 WebSocket 4401 仍要求重新签名登录。切钱包后旧授权结果不能提交到新账户。

### 密钥与发送

Android 使用 org.signal:libsignal-android:0.102.1，device_id 固定为 1。支持 EC/PQ 预密钥，签名与身份由 libsignal 验证；首次信任后身份改变会拒绝，不静默接受。

发送字段：recipient_service_id、recipient_device_id、recipient_registration_id、client_message_id、message_type（prekey/whisper）、ciphertext。**尚未发送 recipient_device_version，也未持久化 bundle.device_version。**

claim 重试复用 request_id；发送重试复用原 ID 与原密文。403 和其他确定的输入／身份冲突进入本地失败队列，保留密文，可手动重试。429/503 遵循 Retry-After 与退避，不通过重新加密绕过幂等约束。

### 接收、通知与状态

HTTP 收件单次 limit=50，原生解密并落盘后记录待 ACK，在后续 pump 提交，失败只重试 ACK。通知合并后驱动现有 pump；当前仍按轮询逐批处理，不宣称一次通知会无界排空收件箱。

WebSocket 使用 HTTPS→WSS、HTTP→WS 的对应地址；令牌只放第一帧 `{"type":"auth","token":"<access_token>"}`，不放 URL。ready/inbox_changed/sync_required 合并触发 HTTP 补拉，不把通知当消息正文或持久化事件。1–30 秒指数退避加抖动；4429 至少等待 30 秒；4401 停止重连并要求登录；60 秒没有有效提示则重连。退出／换钱包停止连接并忽略旧回调。保留原轮询退避，WebSocket 不等于系统后台推送。

界面状态仅 local/sent/received/failed；sent 只代表服务端接受。当前本地 read 仅清未读，不代表调用服务端 read。尚未接 messages/status 或 typing。

## 5. Android 地址与 Firebase

无保存地址时默认 https://api.mschatapp.com；已保存地址优先，显式本地联调构建仍有 HTTP 覆盖。生产网络策略继续禁止明文 HTTP。地址可用不代表密钥互通或新版好友流程通过。

当前 applicationId 为 so.onekey.app.wallet。仓库已有 google-services.json 指向 test-aa6e3，但用户尚未创建／确认云聊 Firebase 项目，不能拿它宣称聊天推送已配置。Expo Notifications 已带 Firebase Messaging，不重复添加冲突的 MESSAGING_EVENT 服务。

只读检查：[check-cloud-chat-push.cjs](../apps/mobile/scripts/check-cloud-chat-push.cjs)。不输出 API key、token 或私钥；退出码 2 表示未指定目标项目，1 表示配置检查失败，0 仅说明包名和目标项目匹配，不代表 token 登记或推送验收完成。

## 6. 请后端提供的材料

请提供与当前云端运行版本对应的接入材料，可授予仓库只读权限，也可导出文件；不必共享账号密码。

1. 最新 openapi.yaml 和 docs/PRIVATE_CHAT_COMPLETION.md，附源码 commit 和实际部署版本；HEAD 与运行版本不同请分别标明。
2. 好友接口：申请、处理、列表、删除、拉黑／解除的请求响应、分页和错误码。
3. 认证续期接口：登录新增字段、refresh 请求响应、有效期、并发及响应丢失后的处理规则，尤其旧 refresh 重放是否撤销整族。
4. 设备换机接口：challenge／confirm 完整字段、签名原文规则、设备版本字段、身份变更错误码与数据清理行为；确认客户端提交成功后响应丢失的恢复方式。
5. 消息状态与 typing 接口：ACK／read 区别、状态查询、批量限制、TTL，以及 WebSocket 通知后的同步方式。
6. 推送接口与配置约定：token 登记／删除、钱包和设备绑定、通知载荷、token 失效处理；确认 Firebase 项目及客户端／后端配置负责方。
7. 联调条件：允许创建测试账号的环境、当前地址、限流，以及好友、换机、旧令牌撤销的配合安排。

请求示例使用脱敏测试数据，说明必填／可选、null、枚举及错误码。**不需要向客户端提供数据库密码、JWT 签名密钥或 Firebase 服务账号私钥。** 服务账号凭据由后端私有配置，客户端只拿同项目的 Android 配置。

后端 AI 收到本文后，先核对运行版本与源码，不依据旧摘要发明字段；按上述七项逐项回复已提供／待提供／不适用。本文不是修改后端、部署、清库或向真实用户发消息的授权。

## 7. 下一步批次与验收

1. 第一批：好友、refresh、device_version、签名换机，保持原有身份安全边界。
2. 第二批：补齐服务端 read/status/typing；对现有 WebSocket、离线恢复、切钱包及身份变化进行真实 Android 验收。
3. 第三批：Firebase 配置、token 绑定与注销，验证前后台、锁屏、拒绝通知、断网、换钱包／换机及无 Google Play 服务设备的支持范围。

群聊、附件、会议、直播、用户资料、历史迁移、多设备、iOS/APNs 不在本轮已完成范围。

本次相关测试此前 31 项通过，TypeScript 与 lint 通过；提交前再次执行检查，以本次命令结果为准。原生引擎历史互通记录见 Android 文档；新增 WebSocket 等代码未打包实机验收，不能用单元测试替代。

```sh
# 在仓库根执行；本组单元测试不创建真实后端账户。
yarn test packages/kit-bg/src/services/cloudChat packages/shared/src/utils/cloudChatApi.test.ts packages/shared/src/utils/cloudChatUtils.test.ts apps/mobile/scripts/__tests__/cloud-chat-network-policy.test.js --runInBand --watch=false
yarn lint:staged
yarn tsc:staged
node apps/mobile/scripts/check-cloud-chat-push.cjs
```

真实双端测试使用两个独立测试钱包和隔离设备状态，先确认服务端好友关系与授权。已有 HTTP 测试或随机传输夹具不代表 libsignal 双端通过。重新构建 APK 时遵循[现有构建说明](../development/cloud-chat-android-test/README.md)，同时打包 main/common/bg 与分段资源，不单独替换一份 JS bundle。

下一步：后端按第 6 节交付契约，前端按第 7 节接入并记录版本与实测结果。返回：[项目入口](../README.md)。
