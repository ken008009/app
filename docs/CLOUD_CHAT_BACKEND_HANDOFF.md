# MS Android 云聊：后端 AI 接入说明

更新时间：2026-09-11。对象：维护 web3-chat-backend 的工程师与 AI。

返回：[项目入口](../README.md) · [客户端联调](INTEGRATION.md) · [Android 引擎与验收](../development/cloud-chat-android-test/README.md)。

本文描述本次提交的实际客户端行为，不代替后端 OpenAPI，不把部署记录或模拟测试当作新版 Android 实机验收。当前客户端没有 backend 仓库读取权限，也没有其本地源码。后端版本以维护者交付的运行版本为准。

## 0. 给后端 Codex 的阅读入口

仓库：<https://github.com/wangjiabao/web3-chat-frontend>。这是 MS 钱包前端（含 Android 原生云聊引擎），不是 web3-chat-backend，也不是原来的 web3-chat-platform 网页项目。

远端从 `5b8452674f58d71ec557b9d836b5cb6c11d62119` 的单提交快照开始，该快照文件树与本地 `8d5d3372fc30fb823aab0524ef141cdb30b67366` 一致。远端没有此前本地 Git 历史，请勿以找不到旧提交判断功能不存在。阅读时记录实际前端 HEAD；本文后续文档修订不代表 Android 已重新打包或后端已部署。

建议先读本文第 1、4、6 节，再沿第 2 节查看 HTTP、类型、Service 和原生实现；不要先扫描钱包全部链与交易模块。后台服务文件中的 `refresh`、界面中的 `read` 名称不等于存在同名后端接口。

可以直接把以下提示词交给后端 Codex：

> 请读取 web3-chat-frontend 的 docs/CLOUD_CHAT_BACKEND_HANDOFF.md，记录前端 HEAD，并对照你有权限的 backend 源码、OpenAPI、迁移与实际部署信息做兼容性分析。先完成只读分析：沿文档代码链接核对请求和响应结构，区分客户端已实现、后端源码存在、实际部署可用和真实联调通过。按第 8 节模板返回接口差异、证据路径与符号、阻塞项和脱敏契约材料。未知项明确标为待确认，不猜字段、不以 mock 通过代替互通验证。优先排查好友门禁、refresh、device_version、换机及幂等重试；未经维护者另行安排，不执行生产写入或部署。

若仓库为私有，后端同事的 GitHub 身份及其 Codex 使用的访问方式都需要有读取权限。浏览器能打开并不证明 CLI／连接器能读取。可在授权环境克隆后阅读；没有访问权限时由维护者提供本文和第 2 节源文件，不需要共享个人 GitHub 密码或 token。

证据优先级：实际部署信息决定线上可用性；后端源码与 OpenAPI 需相互核对；前端源码决定本客户端实际发送与消费什么；历史说明只作为待核实线索。发现矛盾请同时列出两侧证据。

## 1. 先读结论

Android 已有钱包签名认证、原生 libsignal 单设备文字私聊、加密持久化、幂等重试和 ACK。本次增加默认公网 HTTPS、WebSocket 提示与重连、403 投递失败队列处理、设备变化错误提示及只读 Firebase 配置检查。

**根据前序平台接入材料，新版后端要求好友关系；该要求尚需后端核对当前部署。客户端尚未接入申请／接受，因此目前不能宣称完成新版私聊闭环。** refresh、设备版本、签名换机、服务端已读／状态／typing 和推送登记接口仍待精确契约。不要通过移除后端好友门禁、跳过身份校验或放开认证来使旧客户端通过。

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

## 8. 后端 Codex 的交付模板

请把结果整理为 Markdown，例如在后端仓库新增 `docs/MS_ANDROID_CLOUD_CHAT_CONTRACT_REVIEW.md`，由维护者按其工作流程确认和同步。客户端目前不能读取 backend 仓库，单独提供一个私有后端链接不足以完成交付；请同时导出文档、OpenAPI 和必要示例供前端读取。

### A. 版本与环境

- 分析时间、前端 commit、后端源码 commit、OpenAPI 对应 commit：
- 实际部署版本／镜像标识、环境地址及版本确认依据：
- 源码与部署是否一致；无法确认的部分：
- 是否允许测试账号、请求限流和可配合联调时间：

### B. 逐项兼容性矩阵

每个能力单独一行；状态使用“兼容／需前端修改／需后端修改／未部署／待确认”。不要把源码存在直接写成兼容。

| 能力 | 当前客户端行为及证据 | 后端行为及证据 | 部署状态 | 差异／影响 | 负责方与下一步 |
| --- | --- | --- | --- | --- | --- |
| 钱包 challenge/register/login/logout | 见第 4 节 | 待填写 | 待确认 | 待填写 | 待填写 |
| 好友申请、处理、删除、拉黑 | 未接入 | 待填写 | 待确认 | 确认 claim/send 的门禁 | 待填写 |
| refresh 与撤销 | 未接入 refresh | 待填写 | 待确认 | 并发、轮换、响应丢失 | 待填写 |
| keys/claim/device_version | 固定 device_id=1，缺版本字段 | 待填写 | 待确认 | bundle 与投递校验 | 待填写 |
| 签名换机与旧身份 | 未接入换机，拒绝身份变化 | 待填写 | 待确认 | 清理和恢复协议 | 待填写 |
| 发送、收件、ACK | 密文幂等重试，持久化后 ACK | 待填写 | 待确认 | 重复和响应丢失 | 待填写 |
| WebSocket | 提示驱动 HTTP 同步 | 待填写 | 待确认 | 帧、关闭码、空闲超时 | 待填写 |
| read/status/typing | 未接入服务端接口 | 待填写 | 待确认 | 状态含义与过期 | 待填写 |
| FCM token 与通知 | 未接入云聊登记 | 待填写 | 待确认 | 项目和绑定规则 | 待填写 |

每项证据请注明 `仓库 + commit + 文件路径 + 类/函数或 schema 名`；有测试时附测试名称及实际运行结果。不要只引用本文作为后端实现证据。

### C. 每个新增／不兼容接口的最小契约

- HTTP method/path、认证要求、权限前置条件；WS 则提供握手和首帧规则。
- 请求字段、类型、必填、缺省值、null、枚举、单位、编码；响应外层结构及每个消费字段。
- 成功请求／响应与失败示例，HTTP 状态、稳定业务错误码；示例使用占位测试值。
- 分页、批量上限、TTL、排序、重试条件、幂等键作用域和保存期限。
- 服务端已提交但响应丢失时，客户端应复用什么、查询什么、何时必须重新签名。
- 对旧令牌、旧设备、既有密文／session、本地历史的影响；不得把重新生成密钥作为通用重试。

当前 HTTP 客户端直接读取 `response.data`，不会自动解包统一的 `data` 层。收件期待 `{messages: [...]}`，缺少 messages 会回退为空数组；ACK 请求为 `{ids: [...]}`，单次客户端最多取 100 个 ID；发送响应类型为 `{id: string, acknowledged: boolean}`。请重点核对这些结构与真实响应，避免 HTTP 200 但前端无法消费。完整字段以 [类型文件](../packages/shared/types/cloudChat.ts) 与 [HTTP 实现](../packages/kit-bg/src/services/cloudChat/CloudChatHttpClient.ts) 为准，TypeScript 类型本身不构成服务端运行时验证。

### D. 联调场景与结果记录

| 场景 | 需要核对的结果 |
| --- | --- |
| 两个测试钱包建立好友后互发 | 建立关系、claim、投递、解密、持久化、ACK 全链路；明确哪一步失败 |
| 非好友／拉黑后发送 | 返回稳定错误；失败队列不阻塞其他消息；不绕过权限 |
| 发送成功但响应丢失、重复 claim／ACK | 按契约恢复，原 ID／密文重试不会重复显示或错误消费预密钥 |
| refresh 并发、响应丢失、旧 token 使用 | 明确轮换／撤销及恢复结果；当前客户端需新增实现后才能验收 |
| 换机后旧设备和旧 bundle 投递 | 设备版本、身份确认、旧令牌撤销符合约定；不静默重建信任 |
| WebSocket 断线／重复提示／空闲 | HTTP 补拉不漏消息，退避生效，明确服务端是否允许客户端 60 秒重连 |
| 收件超过 50 条、ACK 响应丢失 | 分批收取与去重；确认 ACK 上限和重复请求语义 |
| 切钱包、退出、应用重启 | main/bg 状态隔离，旧异步结果不能写入新账户 |
| 推送前后台、锁屏、token 变更 | 使用确认的 Firebase 项目；通知不携带明文消息或秘密材料 |

每项记录前后端版本、设备／系统、前置条件、预期、实际、脱敏错误码和请求关联 ID。缺环境或功能尚未接入时写“未执行＋阻塞原因”。最后列出前三个优先阻塞项及负责方，供前端继续实施。
