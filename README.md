# Hardhat GUI

Hardhat 本地节点的可视化管理界面，功能对标 Ganache，提供中文界面，通过 HTTP 访问。

> 不需要构建工具，不修改 Hardhat 项目，启动一条命令即可使用。

---

## 功能预览

| 标签页 | 主要功能 |
|--------|---------|
| 账户   | 查看账户地址、ETH 余额、Nonce；一键显示/复制私钥 |
| 区块   | 实时追加新区块列表；展开查看区块内所有交易 |
| 交易   | 全量交易记录；展开查看 Input Data、Gas 消耗、合约地址 |
| 合约   | 自动扫描 `artifacts/` 目录，展示 ABI 结构 |
| 日志   | 实时接收链上事件日志，展示 Topics 和 Data |

工具栏支持：手动出块、自动出块开关、时间快进、网络快照与回滚。

---

## 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Node.js | >= 18.0.0（内置 `fetch`） |
| Hardhat | 已在其他项目启动本地节点 |

---

## 快速开始

### 第一步：启动 Hardhat 本地节点

在你的 Hardhat 项目目录下执行：

```bash
npx hardhat node --chain-id 1337
```

节点默认监听 `http://127.0.0.1:8545`，并输出 20 个测试账户及私钥。

### 第二步：安装依赖

```bash
cd hardhat-gui
npm install
```

### 第三步：启动 GUI

```bash
npm start
```

浏览器访问 [http://localhost:3000](http://localhost:3000)

---

## 目录结构

```
hardhat-gui/
├── server.js          # Express 后端服务
├── package.json
└── public/
    ├── index.html     # 单页应用入口（Vue 3 CDN）
    ├── app.js         # Vue 3 应用逻辑
    └── style.css      # 暗色主题样式
```

---

## 环境变量配置

启动时可通过环境变量自定义行为：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | GUI 服务端口 |
| `RPC_URL` | `http://127.0.0.1:8545` | Hardhat 节点 RPC 地址 |
| `ARTIFACTS_DIR` | `../dapp/artifacts` | 合约 artifacts 目录路径 |

**示例：**

```bash
# 连接非默认端口的节点
RPC_URL=http://127.0.0.1:8546 npm start

# 指定合约目录
ARTIFACTS_DIR=/path/to/my-project/artifacts npm start

# 修改 GUI 端口
PORT=8080 npm start

# 同时设置多个
RPC_URL=http://127.0.0.1:8546 ARTIFACTS_DIR=../myproject/artifacts PORT=8080 npm start
```

---

## 功能详解

### 账户

- 列出节点所有账户，实时刷新余额和 Nonce
- 点击任意行展开，可显示/隐藏对应私钥
- Hardhat 默认助记词（`test test test ... junk`）生成的 20 个账户私钥自动匹配；自定义账户显示"私钥未知"
- 支持一键复制地址和私钥

### 区块

- 按时间倒序展示区块列表，实时追加新区块
- 每行显示：区块号、出块时间、交易数量、Gas 使用量/限制、区块哈希
- 点击区块展开：显示父哈希、矿工地址，以及该区块所含交易的概要信息
- 支持分页浏览历史区块

### 交易

- 记录所有经过的交易，实时推送新交易
- 每行显示：交易哈希、区块号、发送方、接收方、金额、Gas 消耗、执行状态
- 点击交易展开：显示完整字段，包括 Gas 价格（Gwei）、Nonce、合约创建地址、Input Data 原始数据
- 支持分页浏览

### 合约

- 自动扫描配置的 `artifacts` 目录，识别所有已编译合约（跳过 `build-info` 和 `.dbg.json` 文件）
- 左侧合约列表：合约名称、成员数量、字节码大小
- 右侧详情：完整 ABI 展示，包含函数签名、参数类型、可见性（view/pure/payable）、返回值类型
- 可在右侧输入已部署合约地址，便于核对
- 支持自定义扫描目录

**ABI 成员类型标签说明：**

| 标签 | 含义 |
|------|------|
| 函数 | 普通函数（function） |
| 事件 | 合约事件（event） |
| 构造 | 构造函数（constructor） |
| 接收 | 接收 ETH（receive） |
| 回退 | 回退函数（fallback） |
| 错误 | 自定义错误（error） |

### 日志

- 实时接收所有交易产生的事件日志（EVM Logs）
- 每条日志显示：区块号、合约地址、来源交易哈希、Topics 列表、Data 数据
- 支持手动清空

### 工具栏

| 控件 | 功能 |
|------|------|
| ⛏ 出块 | 立即挖出一个空区块（`evm_mine`） |
| 自动出块 | 开关控制（`evm_setAutomine`）。开启时每笔交易立即出块；关闭时需手动出块 |
| 📸 快照 | 创建当前链状态快照，可随时回滚（`evm_snapshot` / `evm_revert`） |
| ⏩ 时间 | 将区块时间戳快进指定秒数（`evm_increaseTime`） |

---

## 技术架构

```
浏览器 (Vue 3)
    ↕  REST API（数据查询）
    ↕  SSE（实时推送：新区块、新交易、新日志）
Express 服务器 (server.js)
    ↕  JSON-RPC（轮询 + 控制）
Hardhat 本地节点 :8545
```

**后端职责：**
- 每秒轮询 Hardhat 节点，检测新区块
- 获取区块内所有交易及其收据（状态、Gas、事件日志）
- 缓存最近 200 个区块、500 笔交易、500 条日志（内存）
- 通过 SSE 向所有浏览器客户端实时广播

**前端职责：**
- Vue 3（CDN 引入，无需构建）Options API 组织逻辑
- 建立 SSE 长连接接收实时数据
- REST API 请求历史数据和分页

---

## 支持的 RPC 方法（工具栏）

GUI 工具栏调用的 Hardhat 专有 RPC 方法：

| 方法 | 用途 |
|------|------|
| `evm_mine` | 手动出块 |
| `evm_setAutomine` | 设置自动出块开关 |
| `evm_setIntervalMining` | 设置固定间隔出块（毫秒） |
| `evm_increaseTime` | 快进时间（秒） |
| `evm_setNextBlockTimestamp` | 设置下一个区块的精确时间戳 |
| `evm_snapshot` | 创建链状态快照，返回快照 ID |
| `evm_revert` | 回滚到指定快照 |
| `hardhat_reset` | 重置网络到初始状态 |
| `hardhat_getAutomine` | 查询当前自动出块状态 |

---

## 开发模式

使用 Node.js 内置的 `--watch` 模式，修改 `server.js` 后自动重启：

```bash
npm run dev
```

---

## 常见问题

**Q：打开页面显示"未连接"？**

确认 Hardhat 节点已启动，且 RPC 地址正确。默认连接 `http://127.0.0.1:8545`，若节点使用其他端口，用环境变量 `RPC_URL` 指定。

---

**Q：合约页面扫描不到合约？**

确认已在 Hardhat 项目中执行过编译：

```bash
npx hardhat compile
```

然后在 GUI 合约页面的路径输入框中填入正确的 `artifacts` 目录绝对路径，点击"扫描"。

---

**Q：账户显示"私钥未知"？**

仅当 Hardhat 使用默认助记词（`test test test test test test test test test test test junk`）时，GUI 能自动匹配私钥。使用自定义助记词或外部账户时无法显示，请参考节点启动日志获取私钥。

---

**Q：快照回滚后数据没有更新？**

回滚操作会自动触发一次全量数据刷新。若仍有异常，手动刷新浏览器页面即可。

---

**Q：如何连接 Anvil（Foundry）？**

Anvil 兼容 Hardhat JSON-RPC 接口，直接指定地址即可：

```bash
RPC_URL=http://127.0.0.1:8545 npm start
```

---

## 注意事项

- 本工具仅用于**本地开发和教学**，请勿连接公共网络或主网节点
- 账户私钥为 Hardhat 测试账户的公开私钥，**不得用于存储真实资产**
- 所有数据存储在内存中，服务重启后历史记录清空
