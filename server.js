import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'fs'
import { spawn, execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// ============ 配置 ============
const CONFIG = {
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  port: parseInt(process.env.PORT || '3000'),
  artifactsDir: process.env.ARTIFACTS_DIR || join(__dirname, '..', 'dapp', 'artifacts'),
  maxBlocks: 200,
  maxTransactions: 500,
  maxLogs: 500,
}

// ============ Hardhat 默认账户私钥 ============
// 助记词：test test test test test test test test test test test junk
const HARDHAT_DEFAULT_KEYS = {
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8': '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc': '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906': '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65': '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b',
  '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc': '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x976ea74026e726554db657fa54763abd0c3a0aa9': '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x14dc79964da2c08b23698b3d3cc7ca32193d9955': '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f': '0xdbda1821b80551c9d65939329250132c444d57b8afff8ddb25e27e4c47ffe29d',
  '0xa0ee7a142d267c1f36714e4a8f75612f20a79720': '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
  '0xbcd4042de499d14e55001ccbb24a551f3b954096': '0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897',
  '0x71be63f3384f5fb98995898a86b02fb2426c5788': '0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82',
  '0xfabb0ac9d68b0b445fb7357272ff202c5651694a': '0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b2',
  '0x1cbd3b2770909d4e10f157cabc84c7264073c9ec': '0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd',
  '0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097': '0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa',
  '0xcd3b766ccdd6ae721141f452c550ca635964ce71': '0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61',
  '0x2546bcd3c84621e976d8185a91a922ae77ecec30': '0x0ea6c44ac03bff858b476bba28179e306548a1d29534558bc20e0dc04c03b0dc7',
  '0xbda5747bfd65f08deb54cb465eb87d40e51b197e': '0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd',
  '0xdd2fd4581271e230360230f9337d5c0430bf44c0': '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0',
  '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199': '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e'
}

// ============ 内存缓存 ============
const cache = {
  connected: false,
  networkInfo: { chainId: null, clientVersion: null, latestBlock: -1 },
  accounts: [],
  blocks: [],
  transactions: new Map(), // hash => tx 对象（保留插入顺序）
  logs: [],
}

// ============ SSE 客户端管理 ============
const sseClients = new Set()

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of sseClients) {
    try { res.write(msg) } catch { sseClients.delete(res) }
  }
}

// ============ JSON-RPC 工具 ============
async function rpc(method, params = []) {
  const res = await fetch(CONFIG.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    signal: AbortSignal.timeout(8000)
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result
}

function hexToDec(hex) {
  return hex ? parseInt(hex, 16) : 0
}

function weiToEth(weiHex) {
  if (!weiHex || weiHex === '0x0') return '0.0000'
  try {
    const wei = BigInt(weiHex)
    const eth = Number(wei) / 1e18
    return eth.toFixed(4)
  } catch {
    return '0.0000'
  }
}

// ============ 数据获取 ============
async function fetchAccounts() {
  const addrs = await rpc('eth_accounts')
  const result = []
  await Promise.all(addrs.map(async addr => {
    const [balance, nonceHex] = await Promise.all([
      rpc('eth_getBalance', [addr, 'latest']),
      rpc('eth_getTransactionCount', [addr, 'latest'])
    ])
    result.push({
      address: addr,
      balance: weiToEth(balance),
      balanceWei: balance,
      nonce: hexToDec(nonceHex),
      privateKey: HARDHAT_DEFAULT_KEYS[addr.toLowerCase()] || null
    })
  }))
  // 按原始顺序排列
  cache.accounts = addrs.map(a => result.find(r => r.address === a))
  return cache.accounts
}

async function fetchBlock(numOrTag) {
  const tag = typeof numOrTag === 'number'
    ? '0x' + numOrTag.toString(16)
    : numOrTag
  const block = await rpc('eth_getBlockByNumber', [tag, true])
  if (!block) return null

  const formatted = {
    number: hexToDec(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: hexToDec(block.timestamp),
    gasUsed: hexToDec(block.gasUsed),
    gasLimit: hexToDec(block.gasLimit),
    miner: block.miner,
    transactions: block.transactions?.length || 0,
    txList: []
  }

  // 处理交易
  if (Array.isArray(block.transactions)) {
    for (const tx of block.transactions) {
      if (typeof tx !== 'object' || !tx.hash) continue
      formatted.txList.push(tx.hash)

      const txData = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: weiToEth(tx.value),
        valueWei: tx.value,
        gasPrice: tx.gasPrice,
        gas: hexToDec(tx.gas),
        nonce: hexToDec(tx.nonce),
        input: tx.input,
        blockNumber: hexToDec(tx.blockNumber),
        transactionIndex: hexToDec(tx.transactionIndex),
        status: 'pending',
        gasUsed: null,
        contractAddress: null
      }

      // 获取收据
      try {
        const receipt = await rpc('eth_getTransactionReceipt', [tx.hash])
        if (receipt) {
          txData.status = hexToDec(receipt.status) === 1 ? 'success' : 'failed'
          txData.gasUsed = hexToDec(receipt.gasUsed)
          txData.contractAddress = receipt.contractAddress

          // 收集事件日志
          if (Array.isArray(receipt.logs)) {
            for (const log of receipt.logs) {
              const logData = {
                id: `${log.transactionHash}-${log.logIndex}`,
                blockNumber: hexToDec(log.blockNumber),
                transactionHash: log.transactionHash,
                address: log.address,
                topics: log.topics,
                data: log.data,
                logIndex: hexToDec(log.logIndex)
              }
              if (!cache.logs.find(l => l.id === logData.id)) {
                cache.logs.unshift(logData)
                if (cache.logs.length > CONFIG.maxLogs) cache.logs.pop()
                broadcast('log', logData)
              }
            }
          }
        }
      } catch { /* 收据获取失败不影响主流程 */ }

      if (!cache.transactions.has(tx.hash)) {
        cache.transactions.set(tx.hash, txData)
        broadcast('transaction', txData)
      }
    }
  }

  return formatted
}

// ============================================================
// WebSocket 连接管理（替代轮询）
// ============================================================

function toWsUrl(url) {
  return url.replace(/^http/, 'ws')
}

// WS 连接状态
const ws = {
  socket:         null,
  url:            null,
  subIdHeads:     null,   // newHeads 订阅 ID
  subIdLogs:      null,   // logs 订阅 ID
  nextId:         10,     // 消息 ID 计数器
  pending:        new Map(), // id → { resolve, reject, timer }
  reconnectTimer: null,
  reconnectDelay: 1000,   // 指数退避初始值，最大 30s
}

// --- 网络初始化（首次连接 & 重连后）---
async function initNetwork() {
  try {
    const [chainIdHex, clientVersion] = await Promise.all([
      rpc('eth_chainId'),
      rpc('web3_clientVersion').catch(() => 'Hardhat'),
    ])
    const newChainId = hexToDec(chainIdHex)

    // Chain ID 变化时清空旧链数据
    if (cache.networkInfo.chainId !== null && cache.networkInfo.chainId !== newChainId) {
      cache.blocks = []
      cache.transactions.clear()
      cache.logs = []
      cache.networkInfo.latestBlock = -1
    }
    cache.networkInfo.chainId = newChainId
    cache.networkInfo.clientVersion = clientVersion
    cache.connected = true

    await fetchAccounts()

    // 补全断线期间遗漏的区块（最多回溯 20 个）
    const latestHex = await rpc('eth_blockNumber')
    const latest = hexToDec(latestHex)
    const start = Math.max(cache.networkInfo.latestBlock + 1, latest - 19)
    for (let i = start; i <= latest; i++) {
      const block = await fetchBlock(i)
      if (!block) continue
      cache.blocks.unshift(block)
      if (cache.blocks.length > CONFIG.maxBlocks) cache.blocks.pop()
      cache.networkInfo.latestBlock = block.number
      broadcast('block', block)
    }

    broadcast('status', {
      connected: true,
      chainId:       cache.networkInfo.chainId,
      clientVersion: cache.networkInfo.clientVersion,
      latestBlock:   cache.networkInfo.latestBlock,
      rpcUrl:        CONFIG.rpcUrl,
    })
    broadcast('accounts', cache.accounts)
  } catch (err) {
    console.error('  初始化网络信息失败:', err.message)
  }
}

// --- 处理 newHeads 订阅事件 ---
async function handleNewHead(header) {
  const num = hexToDec(header.number)
  if (num <= cache.networkInfo.latestBlock) return   // 已处理过

  try {
    const block = await fetchBlock(num)
    if (!block) return
    cache.blocks.unshift(block)
    if (cache.blocks.length > CONFIG.maxBlocks) cache.blocks.pop()
    cache.networkInfo.latestBlock = num
    broadcast('block', block)

    // 每个新块刷新余额（事件驱动，仅在有新块时触发）
    await fetchAccounts()
    broadcast('accounts', cache.accounts)
  } catch (err) {
    console.error(`  处理区块 #${num} 失败:`, err.message)
  }
}

// --- 处理 logs 订阅推送 ---
function handleWsLog(log) {
  const logData = {
    id:              `${log.transactionHash}-${log.logIndex}`,
    blockNumber:     hexToDec(log.blockNumber),
    transactionHash: log.transactionHash,
    address:         log.address,
    topics:          log.topics,
    data:            log.data,
    logIndex:        hexToDec(log.logIndex),
  }
  if (cache.logs.find(l => l.id === logData.id)) return
  cache.logs.unshift(logData)
  if (cache.logs.length > CONFIG.maxLogs) cache.logs.pop()
  broadcast('log', logData)
}

// --- 分发 WS 消息 ---
function handleWsMessage(raw) {
  let msg
  try { msg = JSON.parse(raw) } catch { return }

  // 订阅推送（无 id，method = eth_subscription）
  if (msg.method === 'eth_subscription') {
    const { subscription, result } = msg.params
    if (subscription === ws.subIdHeads) handleNewHead(result)
    else if (subscription === ws.subIdLogs) handleWsLog(result)
    return
  }

  // RPC 响应（有 id，对应 pending 请求）
  if (msg.id != null && ws.pending.has(msg.id)) {
    const { resolve, reject, timer } = ws.pending.get(msg.id)
    clearTimeout(timer)
    ws.pending.delete(msg.id)
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
  }
}

// 通过 WS 发起 JSON-RPC（仅用于 eth_subscribe / eth_unsubscribe）
function wsSend(method, params) {
  return new Promise((resolve, reject) => {
    if (!ws.socket || ws.socket.readyState !== WebSocket.OPEN) {
      return reject(new Error('WS 未就绪'))
    }
    const id = ws.nextId++
    const timer = setTimeout(() => {
      ws.pending.delete(id)
      reject(new Error(`WS RPC 超时: ${method}`))
    }, 8000)
    ws.pending.set(id, { resolve, reject, timer })
    ws.socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
  })
}

// --- 建立订阅并初始化网络数据 ---
async function setupSubscriptions() {
  try {
    ws.subIdHeads = await wsSend('eth_subscribe', ['newHeads'])
    ws.subIdLogs  = await wsSend('eth_subscribe', ['logs', {}])
    console.log(`  ✓ 订阅建立 heads=...${ws.subIdHeads?.slice(-6)}  logs=...${ws.subIdLogs?.slice(-6)}`)
    await initNetwork()
  } catch (err) {
    console.error('  建立订阅失败:', err.message)
    if (ws.socket) ws.socket.close()
  }
}

// --- 指数退避重连 ---
function scheduleReconnect() {
  if (ws.reconnectTimer) return
  console.log(`  → WS 将在 ${ws.reconnectDelay / 1000}s 后重连 (${ws.url})`)
  ws.reconnectTimer = setTimeout(() => {
    ws.reconnectTimer = null
    connectWS(ws.url)
  }, ws.reconnectDelay)
  ws.reconnectDelay = Math.min(ws.reconnectDelay * 2, 30000)
}

// --- 连接 WebSocket ---
function connectWS(url) {
  if (ws.socket) {
    try { ws.socket.close() } catch {}
    ws.socket = null
  }
  ws.url        = url
  ws.subIdHeads = null
  ws.subIdLogs  = null

  let socket
  try {
    socket = new WebSocket(url)
  } catch (err) {
    console.error(`  WS 连接失败 (${url}):`, err.message)
    scheduleReconnect()
    return
  }
  ws.socket = socket

  socket.addEventListener('open', () => {
    console.log(`  ✓ WS 已连接: ${url}`)
    ws.reconnectDelay = 1000  // 重置退避
    setupSubscriptions()
  })

  socket.addEventListener('message', ({ data }) => handleWsMessage(data))

  socket.addEventListener('close', ({ code }) => {
    ws.socket = null
    if (cache.connected) {
      cache.connected = false
      cache.networkInfo.latestBlock = -1
      broadcast('status', { connected: false, error: `WS 连接断开 (code: ${code})` })
    }
    scheduleReconnect()
  })

  socket.addEventListener('error', () => {
    // error 事件后必然触发 close，重连逻辑在 close 中处理
  })
}

// 切换到新节点（节点管理模块调用）
function switchNode(httpUrl) {
  CONFIG.rpcUrl = httpUrl
  // 取消未执行的重连计划，重置退避
  if (ws.reconnectTimer) { clearTimeout(ws.reconnectTimer); ws.reconnectTimer = null }
  ws.reconnectDelay = 1000
  // 清空旧链缓存
  cache.blocks = []
  cache.transactions.clear()
  cache.logs = []
  cache.connected = false
  cache.networkInfo = { chainId: null, clientVersion: null, latestBlock: -1 }
  connectWS(toWsUrl(httpUrl))
}

// ============ 扫描 Artifacts ============
function scanArtifacts(dir) {
  const result = []
  if (!existsSync(dir)) return result

  function scan(d) {
    let entries
    try { entries = readdirSync(d) } catch { return }
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'build-info') continue
      const full = join(d, entry)
      try {
        if (statSync(full).isDirectory()) {
          scan(full)
        } else if (entry.endsWith('.json') && !entry.endsWith('.dbg.json')) {
          const content = JSON.parse(readFileSync(full, 'utf-8'))
          if (content.abi && content.contractName && content.contractName !== 'Migrations') {
            // 去重
            if (!result.find(r => r.name === content.contractName)) {
              result.push({
                name: content.contractName,
                abi: content.abi,
                bytecodeSize: content.bytecode
                  ? Math.floor((content.bytecode.length - 2) / 2)
                  : 0
              })
            }
          }
        }
      } catch { /* 忽略解析错误 */ }
    }
  }

  scan(dir)
  return result
}

// ============ REST API ============

// 连接状态
app.get('/api/status', (req, res) => {
  res.json({
    connected: cache.connected,
    ...cache.networkInfo,
    rpcUrl: CONFIG.rpcUrl
  })
})

// 账户列表
app.get('/api/accounts', async (req, res) => {
  try {
    res.json(await fetchAccounts())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 区块列表（分页）
app.get('/api/blocks', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20'), 100)
  const offset = parseInt(req.query.offset || '0')
  res.json({
    total: cache.blocks.length,
    items: cache.blocks.slice(offset, offset + limit)
  })
})

// 单个区块详情
app.get('/api/blocks/:num', async (req, res) => {
  try {
    const num = parseInt(req.params.num)
    if (isNaN(num)) return res.status(400).json({ error: '无效区块号' })
    const cached = cache.blocks.find(b => b.number === num)
    if (cached) {
      const txDetails = cached.txList.map(h => cache.transactions.get(h)).filter(Boolean)
      return res.json({ ...cached, txDetails })
    }
    const block = await fetchBlock(num)
    if (!block) return res.status(404).json({ error: '区块不存在' })
    const txDetails = block.txList.map(h => cache.transactions.get(h)).filter(Boolean)
    res.json({ ...block, txDetails })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 交易列表
app.get('/api/transactions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50'), 200)
  const offset = parseInt(req.query.offset || '0')
  const all = Array.from(cache.transactions.values()).reverse()
  res.json({ total: all.length, items: all.slice(offset, offset + limit) })
})

// 单个交易详情
app.get('/api/transactions/:hash', async (req, res) => {
  const cached = cache.transactions.get(req.params.hash)
  if (cached) return res.json(cached)
  try {
    const tx = await rpc('eth_getTransactionByHash', [req.params.hash])
    if (!tx) return res.status(404).json({ error: '交易不存在' })
    res.json(tx)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 事件日志
app.get('/api/logs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100'), 500)
  res.json(cache.logs.slice(0, limit))
})

// 合约（扫描 artifacts）
app.get('/api/contracts', (req, res) => {
  const dir = req.query.dir
    ? decodeURIComponent(req.query.dir)
    : CONFIG.artifactsDir
  res.json(scanArtifacts(dir))
})

// EVM 控制（代理白名单 RPC）
const RPC_WHITELIST = new Set([
  'evm_mine',
  'evm_setAutomine',
  'evm_setIntervalMining',
  'evm_increaseTime',
  'evm_setNextBlockTimestamp',
  'evm_snapshot',
  'evm_revert',
  'hardhat_reset',
  'hardhat_setBalance',
  'hardhat_impersonateAccount',
  'hardhat_stopImpersonatingAccount',
  'hardhat_getAutomine'
])

app.post('/api/rpc', async (req, res) => {
  const { method, params = [] } = req.body
  if (!RPC_WHITELIST.has(method)) {
    return res.status(403).json({ error: `不允许调用: ${method}` })
  }
  try {
    const result = await rpc(method, params)

    if (method === 'hardhat_reset') {
      // 重置后清空缓存，WS 订阅仍然有效，通过 initNetwork 重新同步
      setTimeout(async () => {
        cache.blocks = []
        cache.transactions.clear()
        cache.logs = []
        cache.networkInfo.latestBlock = -1
        await initNetwork()
      }, 500)
    } else if (method === 'evm_revert') {
      // 回滚不触发 newHeads 事件，需手动清理失效区块并重新同步
      setTimeout(async () => {
        cache.blocks = []
        cache.transactions.clear()
        cache.networkInfo.latestBlock = -1
        await initNetwork()
      }, 200)
    }
    // evm_mine：WS newHeads 订阅自动处理，无需额外操作

    res.json({ result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// SSE 实时推送
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 立即推送当前状态
  res.write(`event: status\ndata: ${JSON.stringify({
    connected: cache.connected,
    ...cache.networkInfo,
    rpcUrl: CONFIG.rpcUrl
  })}\n\n`)

  // 心跳保活（每 25 秒）
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n') } catch { clearInterval(heartbeat) }
  }, 25000)

  sseClients.add(res)
  req.on('close', () => {
    sseClients.delete(res)
    clearInterval(heartbeat)
  })
})

// ============================================================
// 节点管理
// ============================================================

// 工作目录：存放生成的 hardhat.config.js
const WORKDIR = join(__dirname, 'node-workspace')

// 节点进程状态
const nodeState = {
  child:   null,       // ChildProcess 对象
  status:  'stopped',  // 'stopped' | 'starting' | 'running' | 'stopping'
  pid:     null,
  logs:    [],         // 最近 300 条控制台输出
  accounts: [],        // 从 stdout 解析出的账户
}

// 节点配置（持久化到内存，重启服务后恢复默认）
const nodeConfig = {
  projectDir:     __dirname, // 使用本项目内置的 Hardhat
  port:           8545,
  hostname:       '127.0.0.1',
  chainId:        31337,
  accountCount:   20,
  initialBalance: '10000',   // ETH（字符串，避免浮点问题）
  mnemonic:       'test test test test test test test test test test test junk',
  fork:           '',
  forkBlockNumber: '',
}

// SSE：节点控制台输出推送
const consoleSseClients = new Set()

function broadcastConsole(line, level = 'info') {
  const entry = { line, level, ts: Date.now() }
  nodeState.logs.push(entry)
  if (nodeState.logs.length > 300) nodeState.logs.shift()
  const msg = `event: console\ndata: ${JSON.stringify(entry)}\n\n`
  for (const res of consoleSseClients) {
    try { res.write(msg) } catch { consoleSseClients.delete(res) }
  }
}

function broadcastNodeStatus() {
  const payload = {
    status:   nodeState.status,
    pid:      nodeState.pid,
    accounts: nodeState.accounts,
    config:   nodeConfig,
  }
  const msg = `event: nodeStatus\ndata: ${JSON.stringify(payload)}\n\n`
  for (const res of consoleSseClients) {
    try { res.write(msg) } catch { consoleSseClients.delete(res) }
  }
  // 同时通过主 SSE 推送节点状态变化
  broadcast('nodeStatus', payload)
}

// 查找 Hardhat CLI 入口脚本（优先使用指定项目目录）
function findHardhatCli(projectDir) {
  const candidates = [
    join(projectDir, 'node_modules', 'hardhat', 'dist', 'src', 'cli.js'),
    join(__dirname, 'node_modules', 'hardhat', 'dist', 'src', 'cli.js'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

// 生成最小化 hardhat.config.js（纯对象导出，无外部 import）
function generateConfig(cfg) {
  const balanceWei = (BigInt(Math.floor(parseFloat(cfg.initialBalance))) * BigInt('1000000000000000000')).toString()
  const chainId = parseInt(cfg.chainId) || 31337

  const lines = [
    `// 由 Hardhat GUI 自动生成，请勿手动修改`,
    `export default {`,
    `  networks: {`,
    `    node: {`,
    `      type: "edr-simulated",`,
    `      chainType: "l1",`,
    `      chainId: ${chainId},`,
    `      accounts: {`,
    `        mnemonic: ${JSON.stringify(cfg.mnemonic)},`,
    `        count: ${parseInt(cfg.accountCount) || 20},`,
    `        accountsBalance: "${balanceWei}",`,
    `      },`,
    `    },`,
    `  },`,
    `  solidity: { version: "0.8.28" },`,
    `}`,
  ]
  return lines.join('\n') + '\n'
}

// 初始化工作目录
function ensureWorkdir() {
  if (!existsSync(WORKDIR)) mkdirSync(WORKDIR, { recursive: true })
  const pkgPath = join(WORKDIR, 'package.json')
  if (!existsSync(pkgPath)) {
    writeFileSync(pkgPath, JSON.stringify({ type: 'module' }, null, 2))
  }
}

// 从 stdout 解析账户（Hardhat 启动时打印）
function parseAccountsFromOutput(lines) {
  const accounts = []
  let i = 0
  while (i < lines.length) {
    const addrMatch = lines[i].match(/Account #(\d+):\s*(0x[a-fA-F0-9]{40})/)
    if (addrMatch) {
      const entry = { index: parseInt(addrMatch[1]), address: addrMatch[2], privateKey: null }
      if (i + 1 < lines.length) {
        const keyMatch = lines[i + 1].match(/Private Key:\s*(0x[a-fA-F0-9]{64})/)
        if (keyMatch) { entry.privateKey = keyMatch[1]; i++ }
      }
      accounts.push(entry)
    }
    i++
  }
  return accounts
}

// ---- 启动节点 ----
async function startHardhatNode() {
  if (nodeState.status !== 'stopped') {
    throw new Error('节点已在运行')
  }

  const cfg = nodeConfig
  const hardhatCli = findHardhatCli(cfg.projectDir)
  if (!hardhatCli) {
    throw new Error(`在 ${cfg.projectDir}/node_modules 中未找到 Hardhat，请确认项目目录正确`)
  }

  ensureWorkdir()
  writeFileSync(join(WORKDIR, 'hardhat.config.js'), generateConfig(cfg), 'utf-8')

  // CLI 参数
  const args = ['node']
  if (cfg.hostname)       args.push('--hostname', cfg.hostname)
  if (cfg.port)           args.push('--port', String(cfg.port))
  if (cfg.chainId)        args.push('--chain-id', String(cfg.chainId))
  if (cfg.fork)           args.push('--fork', cfg.fork)
  if (cfg.fork && cfg.forkBlockNumber) args.push('--fork-block-number', String(cfg.forkBlockNumber))

  nodeState.status   = 'starting'
  nodeState.accounts = []
  broadcastNodeStatus()

  const child = spawn(process.execPath, [hardhatCli, ...args], {
    cwd: WORKDIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  nodeState.child = child
  nodeState.pid   = child.pid

  const stdoutBuf = []
  let started = false

  child.stdout.setEncoding('utf-8')
  child.stdout.on('data', chunk => {
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      broadcastConsole(line, 'info')
      stdoutBuf.push(line)

      // 检测启动成功
      if (!started && /Started HTTP.*server at/i.test(line)) {
        started = true
        nodeState.status = 'running'
        nodeState.accounts = parseAccountsFromOutput(stdoutBuf)
        broadcastNodeStatus()
        const newUrl = `http://${cfg.hostname}:${cfg.port}`
        broadcastConsole(`✓ 节点已就绪，监听 ${newUrl}`, 'success')
        // 切换 WS 连接到新节点（同时更新 CONFIG.rpcUrl 并重建订阅）
        switchNode(newUrl)
      }
    }
  })

  child.stderr.setEncoding('utf-8')
  child.stderr.on('data', chunk => {
    for (const line of chunk.split('\n')) {
      if (line.trim()) broadcastConsole(line, 'error')
    }
  })

  child.on('close', code => {
    nodeState.status  = 'stopped'
    nodeState.child   = null
    nodeState.pid     = null
    broadcastConsole(`节点进程已退出（code: ${code ?? 'null'}）`, code === 0 ? 'info' : 'error')
    broadcastNodeStatus()
  })

  child.on('error', err => {
    nodeState.status = 'stopped'
    nodeState.child  = null
    nodeState.pid    = null
    broadcastConsole(`启动失败: ${err.message}`, 'error')
    broadcastNodeStatus()
  })
}

// ---- 停止节点 ----
function stopHardhatNode() {
  const child = nodeState.child
  if (!child) throw new Error('节点未运行')

  nodeState.status = 'stopping'
  broadcastNodeStatus()

  try {
    if (process.platform === 'win32') {
      // Windows：杀进程树
      execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  } catch (err) {
    broadcastConsole(`停止进程时出错: ${err.message}`, 'error')
  }
}

// ---- REST API ----

// 节点状态
app.get('/api/node/status', (req, res) => {
  res.json({
    status:   nodeState.status,
    pid:      nodeState.pid,
    accounts: nodeState.accounts,
    config:   nodeConfig,
  })
})

// 获取/更新配置
app.get('/api/node/config', (req, res) => res.json(nodeConfig))

app.post('/api/node/config', (req, res) => {
  const allowed = ['projectDir','port','hostname','chainId','accountCount','initialBalance','mnemonic','fork','forkBlockNumber']
  for (const k of allowed) {
    if (req.body[k] !== undefined) nodeConfig[k] = req.body[k]
  }
  res.json({ ok: true, config: nodeConfig })
})

// 启动
app.post('/api/node/start', async (req, res) => {
  try {
    // 允许请求体中携带一次性配置覆盖
    if (req.body && typeof req.body === 'object') {
      const allowed = ['projectDir','port','hostname','chainId','accountCount','initialBalance','mnemonic','fork','forkBlockNumber']
      for (const k of allowed) {
        if (req.body[k] !== undefined) nodeConfig[k] = req.body[k]
      }
    }
    await startHardhatNode()
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// 停止
app.post('/api/node/stop', (req, res) => {
  try {
    stopHardhatNode()
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// 控制台日志（历史）
app.get('/api/node/logs', (req, res) => {
  res.json(nodeState.logs)
})

// 控制台实时 SSE
app.get('/api/node/console', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 推送当前节点状态
  res.write(`event: nodeStatus\ndata: ${JSON.stringify({
    status: nodeState.status, pid: nodeState.pid,
    accounts: nodeState.accounts, config: nodeConfig,
  })}\n\n`)

  // 推送历史日志（最近 100 条）
  const recent = nodeState.logs.slice(-100)
  for (const entry of recent) {
    res.write(`event: console\ndata: ${JSON.stringify(entry)}\n\n`)
  }

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n') } catch { clearInterval(heartbeat) }
  }, 25000)

  consoleSseClients.add(res)
  req.on('close', () => {
    consoleSseClients.delete(res)
    clearInterval(heartbeat)
  })
})

// ============ 启动 ============
app.listen(CONFIG.port, () => {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║         Hardhat GUI 已启动             ║')
  console.log('╠════════════════════════════════════════╣')
  console.log(`║  界面地址: http://localhost:${CONFIG.port}        ║`)
  console.log(`║  节点地址: ${CONFIG.rpcUrl}  ║`)
  console.log('╚════════════════════════════════════════╝\n')
  console.log(`  合约目录: ${CONFIG.artifactsDir}`)
  console.log('  等待连接 Hardhat 节点...\n')

  // 建立 WebSocket 连接（含自动重连）
  connectWS(toWsUrl(CONFIG.rpcUrl))
})
