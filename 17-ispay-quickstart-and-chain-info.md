# ispay 公链信息与开发者快速开始

> 公链服务最后实测：2026-08-16 13:18 CST；OneKey Android 联调最后实测：2026-08-17（Asia/Shanghai）  
> 本文只包含公开链参数、公开地址和使用方法，不包含任何助记词、私钥、keystore 密码、SSH 私钥或 Engine JWT。

## 1. 一页速查

| 项目                 | 值                                    |
| -------------------- | ------------------------------------- |
| 链名称               | `ispay`                               |
| 原生币名称 / 符号    | `ispay` / `ISPAY`                     |
| Chain ID（十进制）   | `1944873742`                          |
| Chain ID（十六进制） | `0x73ec6b0e`                          |
| 精度                 | `18` decimals，`1 ISPAY = 10^18 wei`  |
| 出块时钟             | `6` 秒一个 slot                       |
| Epoch                | `32` slots，即约 `192` 秒（3.2 分钟） |
| 单块 Gas Limit       | `60,000,000`（`0x3938700`）           |
| 初始总量             | `1,000,000,000 ISPAY`                 |
| HTTPS JSON-RPC       | `https://rpc.ispaypaly.org`           |
| WSS JSON-RPC         | `wss://ws.ispaypaly.org`              |
| 节点公开配置         | `https://network.ispaypaly.org`       |
| 共识检查点服务       | `https://checkpoint.ispaypaly.org`    |
| 区块浏览器           | 暂无；钱包中先留空                    |

**域名拼写提醒：当前正式配置是 `ispaypaly.org`，其中是 `paly`，不是 `pay`。** 四个服务地址都必须使用这个现有拼写，复制时不要自行改成 `ispaypay.org`。

`ISPAY` 是这条链的原生 gas 币，作用类似 Ethereum 上的 ETH，不是额外部署的 ERC-20 合约。
这里的 10 亿是**创世初始供应量**，不是已经实现的永久硬顶。当前沿用 Ethereum PoS
奖励与罚则，共识奖励会形成后续协议发行；如果业务要求永远不超过 10 亿，需要另做
货币政策设计和客户端/协议评估，不能只改 premine 数字。

## 2. 初始供应与公开账户

初始经济总量严格为 `1,000,000,000 ISPAY`，分配规则为 Treasury 90%、Deployer 9%、Faucet 1%。

| 用途          |               比例 / 总桶 | 公开地址                                     |
| ------------- | ------------------------: | -------------------------------------------- |
| Treasury      | 90% = `900,000,000 ISPAY` | `0x2d7e20410fb0967db099b48b4b9eaeee94f874c4` |
| Deployer      |   9% = `90,000,000 ISPAY` | `0x5bc15e1f6c85090f78e36be479b24a169edecb30` |
| Faucet        |   1% = `10,000,000 ISPAY` | `0xa77451a8835a1f355d1e3c457045a5d9b59c54b0` |
| Withdrawal    |      不属于上述三账户分配 | `0xa5450b57f57a746a94e82738d5d8b2f6a121fdc9` |
| Fee Recipient |      不属于上述三账户分配 | `0x610a00eec27d20650515475b67e87852f24554f6` |

Treasury 的 90% 是“总桶”，其中已经包含：

- 6 个创世 Validator 的 `192 ISPAY` 共识质押；
- 生成器放入协议地址的 `256 wei`；
- Treasury EOA 的其余流动余额。

因此，通过 `eth_getBalance` 读取 Treasury EOA 时，创世余额应是 `899,999,807.999999999999999744 ISPAY`，而不是完整的 9 亿。这样计算不会把 Validator 质押重复计入总供应。

五个地址只有用途不同：

- Treasury：资金库；正式长期运营应迁移到多签或硬件钱包体系。
- Deployer：支付合约部署和管理交易的 gas。
- Faucet：测试发币账户；当前地址公开不等于已经存在公开领币网页。
- Withdrawal：接收 Validator 提款，与 Validator voting key 不同。
- Fee Recipient：接收出块产生的执行层 priority fee。

### 2.1 2026-08-16 13:06 的公网余额实测

以下余额来自公开 `eth_getBalance(..., "latest")`，会随着转账、Gas、共识奖励和
Validator 提款继续变化；它们是验收快照，不是创世常量。

| 账户          |                               实测余额 |
| ------------- | -------------------------------------: |
| Treasury      | `899,999,807.999999999999999744 ISPAY` |
| Deployer      |                     `90,000,000 ISPAY` |
| Faucet        |                     `10,000,000 ISPAY` |
| Withdrawal    |                    `6.720659706 ISPAY` |
| Fee Recipient |                              `0 ISPAY` |

Withdrawal 已出现余额，说明创世 Validator 的可提款共识奖励已经通过协议提款流程
进入 Withdrawal 地址。这不是创世时重复分配的余额；它是链启动后的动态协议结果。

## 3. 添加到 MetaMask 或其他 EVM 钱包

在钱包的“添加自定义网络”中填写：

| 钱包字段       | 填写内容                    |
| -------------- | --------------------------- |
| 网络名称       | `ispay`                     |
| 新 RPC URL     | `https://rpc.ispaypaly.org` |
| Chain ID       | `1944873742`                |
| 货币符号       | `ISPAY`                     |
| 区块浏览器 URL | 暂时留空                    |

保存后先确认钱包顶部显示 `ispay`，再确认 Chain ID 是 `1944873742`，然后才签名或发送交易。Chain ID 会进入交易签名，用来防止同一笔签名被直接搬到另一条 EVM 链重放。

前端也可以按 EIP-3085 请求 MetaMask 添加同一网络：

```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [
    {
      chainId: '0x73ec6b0e',
      chainName: 'ispay',
      nativeCurrency: { name: 'ispay', symbol: 'ISPAY', decimals: 18 },
      rpcUrls: ['https://rpc.ispaypaly.org'],
    },
  ],
});
```

钱包私钥只应导入用户自己的本地 MetaMask、硬件钱包或本地加密 keystore。不要把助记词或私钥发送到聊天、写入本文、提交到 Git、上传到 RPC 节点，也不要在远程服务器中为了方便长期保存明文私钥。

## 4. 用 curl 检查链

以下命令只访问公开接口，不需要任何密钥，依赖 `curl` 和 `jq`。建议先设置公共 URL：

```bash
export ISPAY_RPC_URL='https://rpc.ispaypaly.org'
export ISPAY_CHECKPOINT_URL='https://checkpoint.ispaypaly.org'
```

### 4.1 检查 Chain ID

```bash
curl -sS -X POST "$ISPAY_RPC_URL" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' | jq .
```

预期 `result` 为：

```json
"0x73ec6b0e"
```

### 4.2 读取最新执行层区块

```bash
curl -sS -X POST "$ISPAY_RPC_URL" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBlockByNumber","params":["latest",false]}' \
  | jq '.result | {number, hash, parentHash, timestamp, gasLimit}'
```

区块号和区块哈希应随链运行继续变化。

同一个 RPC 也支持 Ethereum 的 `finalized` block tag：

```bash
curl -sS -X POST "$ISPAY_RPC_URL" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBlockByNumber","params":["finalized",false]}' \
  | jq '.result | {number, hash, timestamp}'
```

验收时该结果非空。`latest` 适合看最新进度；涉及充值确认、跨系统结算等高价值动作时，
应根据业务风险等待 `safe` 或 `finalized`，不要只看到 receipt 就当作最终不可回滚。

### 4.3 读取 finalized 共识检查点

```bash
curl -sS "$ISPAY_CHECKPOINT_URL/eth/v1/beacon/headers/finalized" \
  | jq '{execution_optimistic, canonical: .data.canonical, root: .data.root, slot: .data.header.message.slot}'
```

也可以查看完整的 previous/current justified 和 finalized checkpoint：

```bash
curl -sS "$ISPAY_CHECKPOINT_URL/eth/v1/beacon/states/finalized/finality_checkpoints" | jq .
```

这里的 `finalized` 不是“刚看到的最新块”，而是已经获得共识层足够投票、正常情况下不会再回滚的检查点。
两个接口查询的对象并不相同：`headers/finalized` 返回节点当前认定的 finalized
区块头；`states/finalized/finality_checkpoints` 返回“该 finalized state 内部记录的”
previous/current justified 与 finalized checkpoint。后者的内部 epoch/root 可能正常落后，
不能要求两组数字逐字相等；应检查它们各自持续推进、root 非空且
`execution_optimistic=false`。

### 4.4 查询地址余额

把下面示例地址替换成任意 EVM 地址；返回值是十六进制 wei：

```bash
curl -sS -X POST "$ISPAY_RPC_URL" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0x5bc15e1f6c85090f78e36be479b24a169edecb30","latest"]}' \
  | jq .
```

如果已经安装 Foundry，可以直接按 18 decimals 显示：

```bash
cast balance --ether \
  --rpc-url "$ISPAY_RPC_URL" \
  0x5bc15e1f6c85090f78e36be479b24a169edecb30
```

`rpc-1` 还通过了创世块 `0x0` 的历史余额查询。它按 Archive 模式运行，但“能查创世
余额”只是当前历史状态功能验收，不等于所有复杂历史查询都已经做过长期压力测试。

## 5. 合约开发与部署

ispay 是标准 EVM JSON-RPC 网络。Solidity 合约通常不需要为了这条链修改业务代码，主要变化是 RPC URL、Chain ID、账户和部署记录。

### 5.1 Foundry

先验证连接：

```bash
export ISPAY_RPC_URL='https://rpc.ispaypaly.org'
cast chain-id --rpc-url "$ISPAY_RPC_URL"
cast block-number --rpc-url "$ISPAY_RPC_URL"
```

推荐把 Deployer 私钥导入**开发者本机**的 Foundry 加密 keystore，由命令交互输入，不把私钥写进命令或仓库：

```bash
cast wallet import ispay-deployer --interactive
```

以常见的 `Counter` 合约为例：

```bash
forge create src/Counter.sol:Counter \
  --rpc-url "$ISPAY_RPC_URL" \
  --account ispay-deployer \
  --broadcast
```

`forge create` 适合单合约快速验证；多个有关联合约的正式部署更适合使用可版本化、
可模拟并能保存广播记录的 `forge script`。

部署前先用 `cast balance` 确认本地选中的地址有 ISPAY 支付 gas。保存交易哈希、部署地址、源码 commit、编译器版本和构造参数，作为部署记录。

交易费用沿用 EIP-1559 模型。应用应使用钱包/SDK 的 gas estimation、
`eth_feeHistory` 或 `eth_gasPrice` 动态估算，不要把验收时的低费率硬编码进生产代码。

### 5.2 Hardhat 3

下面固定使用当前 Hardhat 3 官方推荐的新项目组合：Node.js `22.13.0+`、
TypeScript + Node Test Runner + Viem。运行 `npx hardhat --init` 时选择该项目类型；如需手动安装则执行
`npm install --save-dev @nomicfoundation/hardhat-toolbox-viem`。网络部分写入
`hardhat.config.ts`：

```typescript
import { configVariable, defineConfig } from 'hardhat/config';
import hardhatToolboxViem from '@nomicfoundation/hardhat-toolbox-viem';

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: '0.8.28',
  },
  networks: {
    ispay: {
      type: 'http',
      chainType: 'l1',
      url: 'https://rpc.ispaypaly.org',
      chainId: 1944873742,
      accounts: [configVariable('ISPAY_DEPLOYER_PRIVATE_KEY')],
    },
  },
});
```

不要把私钥写进配置或 shell 历史。使用 Hardhat 3 的加密 keystore，在提示符中
手动输入部署私钥：

```bash
npx hardhat keystore set ISPAY_DEPLOYER_PRIVATE_KEY
```

执行已有 TypeScript 部署脚本；正式构建使用官方建议的 production profile：

```bash
npx hardhat run scripts/deploy.ts --build-profile production --network ispay
```

部署脚本本身使用项目初始化时选择的 Viem Toolbox 编写。部署前确认
签名地址有 ISPAY；执行后保存交易哈希、合约地址、源码 commit、编译器版本、
优化参数和构造参数。Hardhat 3 配置、keystore 与脚本用法以
[官方配置文档](https://hardhat.org/docs/reference/configuration)、
[Viem Toolbox 文档](https://hardhat.org/docs/plugins/hardhat-toolbox-viem)、
[密钥管理文档](https://hardhat.org/docs/guides/configuration-variables)及
[部署脚本文档](https://hardhat.org/docs/guides/deployment/using-scripts)为准。

### 5.3 Remix

1. 先按第 3 节把 ispay 添加到本机 MetaMask。
2. 在 Remix 编译 Solidity 合约。
3. 在 Deploy & Run Transactions 中选择 `Browser Extension`；旧版 Remix
   可能显示为 `Injected Provider - MetaMask`。
4. 再次核对钱包网络、Chain ID `1944873742` 和发送账户。
5. 点击 Deploy，并只在本地 MetaMask 中确认交易。

这种方式由 MetaMask 本地签名，不需要把私钥粘贴给 Remix 或任何服务器。

## 6. WSS 订阅新区块

公开 WebSocket 地址是：

```text
wss://ws.ispaypaly.org
```

仓库已有不依赖第三方 WebSocket 库的验收脚本，它会完成 TLS/WebSocket 握手、调用 `eth_subscribe`，并等待真实的 `newHeads` 通知：

```bash
python3 scripts/51-verify-public-ws.py \
  --host ws.ispaypaly.org \
  --origin https://www.ispaypaly.org \
  --timeout 25
```

成功时会依次看到 `WS handshake OK`、`WS subscription OK` 和 `WS newHeads OK`。应用代码对应发送的 JSON-RPC 请求是：

```json
{ "jsonrpc": "2.0", "id": 1, "method": "eth_subscribe", "params": ["newHeads"] }
```

浏览器 WebSocket 连接还受服务端 Origin 策略约束。正式 dApp 域名变化时，应先更新网关允许的 Origin，再上线前端；不要为了省事永久允许任意 Origin。

## 7. network-config 与 checkpoint 分别做什么

### `network.ispaypaly.org`：公开的“入网安装包”

它提供第三方节点加入 ispay 所需的公开制品，例如：

- `genesis.json`：Geth 执行层创世配置；
- `genesis.ssz` 和 `config.yaml`：Lighthouse 共识层创世与链参数；
- `bootnodes.json`、`enodes.txt`、`enrs.txt`：发现现有公网节点；
- `manifest.json`、`SHA256SUMS`、`GENESIS_SHA256SUMS`：版本、清单和完整性校验。

示例：

```bash
curl -fsS https://network.ispaypaly.org/manifest.json | jq .
curl -fsS https://network.ispaypaly.org/SHA256SUMS
curl -fsS https://network.ispaypaly.org/config.yaml
```

钱包和 dApp 日常发交易不使用这个域名；它主要给节点运营者下载并校验创世和 bootnode 信息。

### `checkpoint.ispaypaly.org`：共识层快速同步入口

全新 Lighthouse Beacon Node 可以从一个已 finalized 的可信检查点开始，而不必从 genesis 重放全部共识历史。例如其启动参数可指向：

```text
--checkpoint-sync-url https://checkpoint.ispaypaly.org
```

Checkpoint sync 是“从已确认的书签开始读账本”，不是执行层 JSON-RPC，也不会替代 Geth 的执行层同步。第三方运营者仍应核对网络制品哈希、genesis validators root 和 checkpoint 来源；只有一个检查点来源时，使用者对该来源存在初始信任。

## 8. 当前健康状态与尚未完成事项

以下是 2026-08-16 的阶段性事实，不是长期 SLA：

### 已通过

- 四台节点全部通过基础健康门禁和严格创世后审计：`4/4`。
- 三次、间隔 12 秒的采样中，四台 CL head 与 EL block 都持续增长，`slot_lag=0`。
- 四台均有 `3` 个 EL peer、`3` 个 CL peer；CL 与本机 Geth 的同高度执行块哈希一致。
- 6 个创世 Validator 均为 `active_ongoing`、`slashed=false`；三台 Validator
  各映射且只映射 2 把 voting key，`rpc-1` 为 0 把。
- 四台在同一轮审计中均报告同一个 finalized checkpoint：epoch `243`，root 为
  `0xf776e72496daf111a171e85136eb62a2e128f1fa10365d2de8bc9b4d6cd40d33`。
- 随后的独立复查中，四台的 finality checkpoint 又一致推进到 epoch `246`、root
  `0x346152ee53b52cab506dc29aaef4fdac8aa2b66f259252fa2e60bee7f460cf74`，
  current justified 为 epoch `247`；这证明 finality 正在继续前进，而非只形成过一次。
- HTTPS RPC 返回 Chain ID `0x73ec6b0e`、动态 latest block 和非空 finalized block；
  正确 Origin 的 CORS header 恰好一份。
- 公网 WSS 已再次通过真实 `newHeads` 订阅，验收时收到执行块 `0x1efe`。
- `network.ispaypaly.org` 的公网 `SHA256SUMS` 与 `GENESIS_SHA256SUMS`
  均和本地冻结制品逐字节一致。
- checkpoint 的 finalized state 已通过 HTTP/2 完整下载：`2,860,341` bytes、
  HTTP `200`、curl exit `0`；对应 finalized block 也成功下载。网关曾因 30 秒
  写超时截断该响应，现已修正为有上限的 15 分钟并完成复验。
- RPC、WSS、network-config 和 checkpoint 四个公开服务域名均使用有效 HTTPS/WSS。
- 公网复验确认 8545、8546、8551、5052、5054、5064、6060、2019
  等内部控制/指标端口仍不可直接访问。
- 交付前于 `2026-08-16 13:18 CST` 再次从公网复验：Chain ID 为
  `0x73ec6b0e`、`eth_syncing=false`、latest 为 `0x1f78`、执行层
  finalized 为 `0x1f20`；checkpoint 返回 canonical finalized slot `7968`，
  WSS 随后收到新区块 `0x1f7a`。这些高度只是当时快照，之后应继续增长。

### 尚未完成，不能省略

- **连续 24 小时观察尚未完成**：仍需记录出块、attestation、finality、资源占用、peer 和重启恢复情况。
- **第三方全新节点同步尚未完成**：需在一台没有旧数据库的新主机上，从公开 network-config 和 checkpoint 独立加入并追上链头。
- **外部 UDP/QUIC 协议握手证据尚未完成**：仅有监听状态或已有 peer 不能替代从独立外部网络完成 `30303/UDP`、`9000/UDP`、`9001/UDP` 的真实协议验证。
- **SSH 22 收紧尚未完成**：当前临时管理规则必须改为当前管理员公网 IPv4 `/32`、按需启用或等价的受控管理通道，并从非管理网络验证 22 不可达。
- **公开前端和浏览器尚未部署**：`www.ispaypaly.org` 当前是 WSS Origin/DNS
  约定，不代表已经存在可用的 dApp 首页或区块浏览器。

在这些门禁完成前，可以把网络当作已真实运行的公开测试/模拟上线链进行开发和观察，但不应把它表述成已经完成长期稳定性和完整外部接入验收的高价值生产网络。

## 9. 最小安全规则

- 本文所有账户地址都是公开信息；地址公开不代表私钥可以公开。
- 用户只在自己的本地钱包、硬件钱包或本地加密 keystore 导入密钥。
- 不在节点服务器保存 Treasury、Deployer 或 Withdrawal 的明文私钥。
- 不把助记词、私钥、密码、JWT、云凭证粘贴到聊天或写入 Git。
- 公共 RPC 只用于标准 `eth/net/web3` 访问；不要对公网开放 Engine API、Geth admin/personal 或 Lighthouse 管理 API。
- 每次部署先核对 Chain ID、发送地址、余额、nonce 和预估 gas，再签名。

## 10. OneKey Android 开发联调与常见故障

本节记录 2026-08-17 在 Android 模拟器上的实际接入结果。公开地址
`0xd90913f656f89aa666DBD8edb5E9554F6b94fC58` 当时可正常显示
`500,000 ISPAY`。余额是动态数据，只能作为联调参考，不能作为长期断言。

### 10.1 先区分 Metro 故障和 ISPAY RPC 故障

如果 Android 出现红屏 `Unable to load script`，表示应用没有从 Metro 加载到 JS
bundle；这发生在连接 ISPAY RPC 之前，不是 Chain ID、余额或 RPC 配置错误。应先恢复
Metro，不能继续用 `getNativeToken failed` 判断公链配置。

OneKey 原生应用有两个彼此隔离的 JS runtime：`main` 负责 UI，`bg` 负责后台服务。
二者各有独立的 Hermes/JS heap，开发时应分别提供 bundle；Android 系统代理属于同一
模拟器的系统/原生网络配置，会同时影响两个 runtime，并不是两份独立代理配置。

开发服务器和端口转发可按下面的顺序准备：

```bash
# 终端 1：main bundle，默认端口 8081
yarn workspace @onekeyhq/mobile native-bundle

# 终端 2：bg bundle，默认端口 8082
yarn workspace @onekeyhq/mobile native-bundle:bg

# 将模拟器访问的 Metro 端口反向转发到宿主机
adb -s emulator-5554 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse tcp:8082 tcp:8082
```

如果设备序列号不是 `emulator-5554`，先用 `adb devices` 查询并替换。可用下面的命令
确认两个 Metro 端口确实监听：

```bash
curl -fsS http://127.0.0.1:8081/status
curl -fsS http://127.0.0.1:8082/status
```

预期都返回 `packager-status:running`。

### 10.2 Android 模拟器使用宿主机代理的正确顺序

Android Emulator 中的 `10.0.2.2` 指向宿主机。宿主机代理必须允许局域网连接，或者
额外提供一个监听 `0.0.0.0` 的转发端口；只监听 `127.0.0.1` 的代理不能直接被模拟器
访问。例如本次 Veee 的 HTTP 代理只监听 `127.0.0.1:15236`，因此使用了宿主机转发
`0.0.0.0:15237 -> 127.0.0.1:15236`，模拟器配置为：

```bash
adb -s emulator-5554 shell settings put global http_proxy 10.0.2.2:15237
```

React Native 开发模式下，不要在应用冷启动或 Reload 之前开启这个全局代理。实际验证
中，即使配置了 `localhost,127.0.0.1,10.0.2.2` 排除列表，RN bundle loader 仍可能
无法访问 Metro，最终出现 `Unable to load script`。可靠的启动顺序是：

```bash
# 1. 先关闭模拟器全局代理
adb -s emulator-5554 shell settings put global http_proxy :0

# 2. 启动两个 Metro，并冷启动应用；等待首页和 main/bg bundle 均加载完成

# 3. 再开启访问公网 RPC 所需的宿主机代理
adb -s emulator-5554 shell settings put global http_proxy 10.0.2.2:15237
```

开启代理后应避免再执行 Reload 或强制停止后冷启动。确需重启时，先执行
`adb -s emulator-5554 shell settings put global http_proxy :0`，加载完成后再恢复代理。
调试结束也应清除全局代理，避免其他模拟器请求继续走已经退出的宿主机转发进程。

### 10.3 原生币网络不得发送空 JSON-RPC batch

ISPAY 只有原生币、没有待查询的代币合约时，合约 token 请求数组可能为空。调用方如果
仍发送 JSON-RPC 空 batch `[]`，RPC 会按规范返回单个 `-32600 empty batch` 错误对象，
而不是数组；客户端随后会报：

```text
Invalid JSON Batch RPC response, response should be an array
```

这类错误表示 RPC 已经可达，不能归因于 Android 网络或 MetaMask 差异。业务调用点在调用
`batchChunkCall` 前应短路空数组，例如：

```typescript
const infos: string[][] = payloads.length
  ? await client.batchChunkCall<string>(payloads)
  : [];
```

同时，共享 `JsonRPCRequest.batchCall` 必须保证空调用列表不会进入真实 RPC batch 分支，
避免其他调用点再次发送 `[]`：

```typescript
const useRpcBatch = calls.length > 0 && !autoFallbackToRpcSingle;
```

只修改源码但没有重新加载 bundle 时，Android 仍会运行旧逻辑。修复后应在关闭模拟器
全局代理的状态下冷启动应用，确认 `main` 和 `bg` bundle 都已加载，再恢复代理并重新
观察日志。

### 10.4 分层验证清单

按以下顺序排查，可以避免把不同层的问题混在一起：

1. 在宿主机直接调用 `eth_chainId`，预期为 `0x73ec6b0e`。
2. 调用公开地址的 `eth_getBalance`，确认 RPC 返回十六进制余额。
3. 确认 `8081`、`8082` 都返回 `packager-status:running`，再冷启动 Android。
4. 首页加载完成后再开启模拟器代理，并观察 ISPAY RPC 是否返回 HTTP `200`。
5. 若已有 HTTP `200` 但出现 batch 数组错误，检查是否发送了空 batch，不要继续调整代理。
6. 收款页地址与被测持币地址必须完全相同；本次验证地址为
   `0xd90913f656f89aa666DBD8edb5E9554F6b94fC58`。

| 现象                                                   | 所在层级          | 优先检查                                                |
| ------------------------------------------------------ | ----------------- | ------------------------------------------------------- |
| `Unable to load script` 红屏                           | Metro / bundle    | 关闭全局代理，检查 8081/8082 和 `adb reverse`           |
| `getNativeToken failed` 且没有 HTTP 状态               | 模拟器网络        | 宿主机代理监听地址、转发进程、`10.0.2.2` 和 DNS/TLS     |
| ISPAY RPC 返回 HTTP `200`，随后提示 batch 响应不是数组 | 钱包 RPC 调用逻辑 | 是否把空数组传给了 `batchChunkCall`                     |
| MetaMask 可用而模拟器不可用                            | 网络路径不同      | 不要据此判断 RPC 故障；单独验证模拟器到宿主机代理的路径 |
| RPC 正常但余额地址不一致                               | 钱包账户/派生路径 | 对比收款页地址和实际持币地址                            |
