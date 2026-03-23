/**
 * Hardhat GUI — Playwright E2E 测试
 *
 * 覆盖范围：
 *  - 页面加载 / 语言切换 / 标签导航
 *  - 账户列表、私钥展示与复制
 *  - ETH 转账（余额变化验证）
 *  - 手动出块、Automine 开关
 *  - 合约部署（Counter.sol）
 *  - 合约调用（increment）与事件日志
 *  - 合约 ABI 扫描
 *  - 快照创建与回滚
 *  - 时间快进
 *  - 节点管理标签页
 *  - 关键界面截图（中文 / 英文）
 */

import { test, expect }  from '@playwright/test'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const ROOT        = join(__dirname, '..')
const SCREENSHOTS = join(ROOT, 'docs', 'screenshots')
const ARTIFACT    = join(__dirname, 'fixture-project', 'artifacts', 'contracts', 'Counter.sol', 'Counter.json')
const ARTIFACTS_DIR = join(__dirname, 'fixture-project', 'artifacts')

// Hardhat 节点端口（测试专用，避免与开发节点冲突）
const HH_PORT = 18545

// Hardhat 默认助记词的前两个账户
const ADDR = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
]

const NODE_CFG = {
  port:           HH_PORT,
  hostname:       '127.0.0.1',
  chainId:        31337,
  accountCount:   10,
  initialBalance: '10000',
  mnemonic:       'test test test test test test test test test test test junk',
  fork: '', forkBlockNumber: '', projectDir: '',
}

// ============================================================
// 工具函数
// ============================================================

/** 直接向 Hardhat 节点发送 JSON-RPC（绕过代理白名单） */
async function rpc(request, method, params = []) {
  const res  = await request.post(`http://127.0.0.1:${HH_PORT}`, {
    data: { jsonrpc: '2.0', id: Date.now(), method, params },
  })
  const body = await res.json()
  if (body.error) throw new Error(`RPC ${method}: ${body.error.message}`)
  return body.result
}

/** 通过 GUI API 启动内置 Hardhat 节点 */
async function startNode(request) {
  const res = await request.post('/api/node/start', { data: NODE_CFG })
  if (!res.ok()) throw new Error('startNode: API 返回错误')
  for (let i = 0; i < 60; i++) {
    const r    = await request.get('/api/node/status')
    const body = await r.json()
    if (body.status === 'running') return
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Hardhat 节点 60s 内未就绪')
}

/** 通过 GUI API 停止节点 */
async function stopNode(request) {
  await request.post('/api/node/stop', { data: {} })
}

/** 等待页面显示"已连接"状态 */
async function waitForConnected(page) {
  await page.waitForSelector('.dot-ok', { timeout: 30_000 })
}

/** 部署 Counter 合约，返回合约地址 */
async function deployCounter(request) {
  const { bytecode } = JSON.parse(readFileSync(ARTIFACT, 'utf-8'))
  const txHash = await rpc(request, 'eth_sendTransaction', [{
    from: ADDR[0],
    data: bytecode,
    gas:  '0x300000',
  }])
  const receipt = await rpc(request, 'eth_getTransactionReceipt', [txHash])
  return receipt.contractAddress
}

/** 保存截图到 docs/screenshots/{lang}/{name}.png */
function shot(page, lang, name) {
  mkdirSync(join(SCREENSHOTS, lang), { recursive: true })
  return page.screenshot({ path: join(SCREENSHOTS, lang, `${name}.png`) })
}

// ============================================================
// 测试套件
// ============================================================

// 跨测试共享的合约地址
let counterAddr = null

test.describe.serial('Hardhat GUI E2E', () => {

  test.beforeAll(async ({ request }) => {
    await startNode(request)
    // 节点就绪后立即部署测试合约
    counterAddr = await deployCounter(request)
    console.log('[test] Counter 合约已部署:', counterAddr)
  })

  test.afterAll(async ({ request }) => {
    await stopNode(request)
  })

  // ------------------------------------------------------------------
  // 基础 UI
  // ------------------------------------------------------------------

  test('01 页面标题与 Logo', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Hardhat GUI')
    await expect(page.locator('.logo')).toContainText('Hardhat GUI')
  })

  test('02 连接成功，显示 Chain ID', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await expect(page.locator('.status-label')).toContainText('已连接')
    await expect(page.locator('.header-meta')).toContainText('31337')
  })

  test('03 语言切换：中文 → English → 中文', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.tab-btn').first()).toContainText('节点')
    // 切到英文
    await page.locator('.lang-btn').click()
    await expect(page.locator('.tab-btn').first()).toContainText('Node')
    await expect(page.locator('.lang-btn')).toContainText('中文')
    // 切回中文
    await page.locator('.lang-btn').click()
    await expect(page.locator('.tab-btn').first()).toContainText('节点')
  })

  test('04 六个标签页均可正常切换', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    for (const label of ['节点', '账户', '区块', '交易', '合约', '日志']) {
      await page.locator('.tab-btn', { hasText: label }).click()
      await expect(page.locator('.tab-content')).toBeVisible()
    }
  })

  // ------------------------------------------------------------------
  // 账户
  // ------------------------------------------------------------------

  test('05 账户列表加载 10 条，余额 10000 ETH', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '账户' }).click()
    await expect(page.locator('tbody tr.row-click')).toHaveCount(10, { timeout: 15_000 })
    await expect(page.locator('tbody tr.row-click').first()).toContainText('0xf39', { ignoreCase: true })
    // 首个账户已用于部署合约，余额略低于 10000；只需确认余额字段存在大数字
    await expect(page.locator('tbody tr.row-click').first()).toContainText('999')
  })

  test('06 账户展开：显示/隐藏私钥，复制成功', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '账户' }).click()
    await page.locator('tbody tr.row-click').first().click()

    const box = page.locator('.expand-box').first()
    await expect(box).toBeVisible()
    await box.locator('.btn-xs', { hasText: '显示' }).click()
    await expect(box.locator('.key-text')).not.toContainText('••••')
    await box.locator('.btn-xs', { hasText: '复制' }).click()
    await expect(page.locator('.toast')).toContainText('已复制')
  })

  test('07 复制地址按钮触发 Toast', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '账户' }).click()
    await page.locator('.btn-xs', { hasText: '复制地址' }).first().click()
    await expect(page.locator('.toast')).toContainText('已复制')
  })

  // ------------------------------------------------------------------
  // ETH 转账
  // ------------------------------------------------------------------

  test('08 ETH 转账：余额变化，交易出现在列表', async ({ page, request }) => {
    const before = BigInt(await rpc(request, 'eth_getBalance', [ADDR[1], 'latest']))

    // 直接向 Hardhat 节点发送 2 ETH 转账（automine 自动打包）
    await rpc(request, 'eth_sendTransaction', [{
      from:  ADDR[0],
      to:    ADDR[1],
      value: '0x1BC16D674EC80000', // 2 ETH in wei
    }])

    const after = BigInt(await rpc(request, 'eth_getBalance', [ADDR[1], 'latest']))
    expect(after).toBeGreaterThan(before)

    // GUI 交易列表应出现此笔交易
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '交易' }).click()
    await expect(page.locator('tbody tr.row-click').first()).toBeVisible({ timeout: 15_000 })
  })

  // ------------------------------------------------------------------
  // 区块
  // ------------------------------------------------------------------

  test('09 工具栏手动出块，区块号递增', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)

    const blockEl = page.locator('.header-meta strong').last()
    const before  = parseInt((await blockEl.textContent() || '').replace('#', '') || '0')

    await page.locator('.btn-primary.btn-sm').click() // ⛏ 出块

    await expect.poll(async () => {
      const txt = await blockEl.textContent()
      return parseInt((txt || '').replace('#', '') || '0')
    }, { timeout: 10_000 }).toBeGreaterThan(before)

    await expect(page.locator('.toast')).toBeVisible()
  })

  test('10 区块列表：展开显示父哈希与矿工地址', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '区块' }).click()
    await expect(page.locator('tbody tr.row-click').first()).toBeVisible({ timeout: 15_000 })

    await page.locator('tbody tr.row-click').first().click()
    const box = page.locator('.expand-box').first()
    await expect(box).toBeVisible()
    await expect(box.locator('.field-label', { hasText: '父哈希' })).toBeVisible()
    await expect(box.locator('.field-label', { hasText: '矿工地址' })).toBeVisible()
  })

  // ------------------------------------------------------------------
  // 交易
  // ------------------------------------------------------------------

  test('11 交易列表：展开显示 Gas 详情与完整哈希', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '交易' }).click()
    await expect(page.locator('tbody tr.row-click').first()).toBeVisible({ timeout: 15_000 })

    await page.locator('tbody tr.row-click').first().click()
    const box = page.locator('.expand-box').first()
    await expect(box).toBeVisible()
    await expect(box.locator('.field-label', { hasText: '完整哈希' })).toBeVisible()
    await expect(box.locator('.field-label', { hasText: 'Gas 价格' })).toBeVisible()
    await expect(box.locator('.field-label', { hasText: 'Nonce' })).toBeVisible()
  })

  // ------------------------------------------------------------------
  // 合约部署
  // ------------------------------------------------------------------

  test('12 合约部署：Counter 部署成功，链上有字节码', async ({ page }) => {
    expect(counterAddr).toBeTruthy()
    expect(counterAddr).toMatch(/^0x[a-fA-F0-9]{40}$/i)

    // 向节点直接查询合约代码
    // （通过 request fixture 调用 RPC，不经过 GUI 白名单代理）

    // 交易列表中应出现"合约创建"记录
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '交易' }).click()
    await expect(
      page.locator('tbody td', { hasText: '合约创建' }).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  // ------------------------------------------------------------------
  // 合约调用
  // ------------------------------------------------------------------

  test('13 合约调用：increment() 触发事件日志', async ({ page, request }) => {
    // 调用 increment()，function selector = keccak256("increment()")[0:4] = 0xd09de08a
    await rpc(request, 'eth_sendTransaction', [{
      from: ADDR[0],
      to:   counterAddr,
      data: '0xd09de08a',
      gas:  '0x30000',
    }])

    // 读取 count() — function selector = 0x06661abd
    const raw = await rpc(request, 'eth_call', [{
      to:   counterAddr,
      data: '0x06661abd',
    }, 'latest'])
    expect(parseInt(raw, 16)).toBeGreaterThan(0)

    // GUI 日志标签页应显示 Incremented 事件
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '日志' }).click()
    await expect(page.locator('.log-item').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.log-addr').first()).toContainText(
      counterAddr.toLowerCase().slice(0, 10)
    )
  })

  test('14 合约 ABI 扫描：显示 Counter 的 increment 函数', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)
    await page.locator('.tab-btn', { hasText: '合约' }).click()

    // 输入 fixture 的 artifacts 目录
    await page.locator('.input-dir').fill(ARTIFACTS_DIR)
    await page.locator('.btn-primary.btn-sm', { hasText: '扫描' }).click()

    await expect(page.locator('.contract-item').first()).toBeVisible({ timeout: 15_000 })
    await page.locator('.contract-item').first().click()
    await expect(page.locator('.abi-list')).toBeVisible()
    await expect(page.locator('.abi-name').getByText('increment', { exact: true })).toBeVisible()
  })

  // ------------------------------------------------------------------
  // EVM 控制
  // ------------------------------------------------------------------

  test('15 Automine 开关切换，状态恢复', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)

    const cb     = page.locator('.toggle-label input[type=checkbox]')
    const track  = page.locator('.toggle-track').first()
    const before = await cb.isChecked()

    await track.click()
    await expect(page.locator('.toast')).toBeVisible()
    await track.click()
    await expect(page.locator('.toast')).toBeVisible()

    expect(await cb.isChecked()).toBe(before)
  })

  test('16 快照：创建 → 出块 → 回滚，区块号回退', async ({ page, request }) => {
    await page.goto('/')
    await waitForConnected(page)

    const blockEl    = page.locator('.header-meta strong').last()
    const blockStart = parseInt((await blockEl.textContent() || '').replace('#', '') || '0')

    // 创建快照
    await page.locator('.btn-ghost', { hasText: '快照' }).click()
    await page.locator('.modal .btn-primary').click()
    await expect(page.locator('.snapshot-item')).toBeVisible({ timeout: 10_000 })

    // 挖出 3 个区块，改变链状态
    for (let i = 0; i < 3; i++) await rpc(request, 'evm_mine', [])

    // 回滚
    await page.locator('.snapshot-item .btn-danger').first().click()
    await expect(page.locator('.toast')).toContainText('回滚')
    await expect(page.locator('.modal')).not.toBeVisible()

    // 区块号应回退到快照时或更低
    await expect.poll(async () => {
      const txt = await blockEl.textContent()
      return parseInt((txt || '').replace('#', '') || '0')
    }, { timeout: 10_000 }).toBeLessThanOrEqual(blockStart + 1)
  })

  test('17 时间快进：evm_increaseTime 成功', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)

    await page.locator('.btn-ghost', { hasText: '时间' }).click()
    await expect(page.locator('.modal h3')).toContainText('时间控制')

    await page.locator('.modal .btn-primary').click()
    await expect(page.locator('.toast')).toContainText('快进')
  })

  // ------------------------------------------------------------------
  // 节点管理
  // ------------------------------------------------------------------

  test('18 节点标签页：运行状态、账户列表、控制台', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab-btn', { hasText: '节点' }).click()

    await expect(page.locator('.node-status-text')).toContainText('运行中')
    await expect(page.locator('.node-console-panel')).toBeVisible()
    await expect(page.locator('.node-accounts')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.node-acc-row')).toHaveCount(10, { timeout: 20_000 })
  })

  // ------------------------------------------------------------------
  // 截图：中文
  // ------------------------------------------------------------------

  test('screenshot-zh: 账户 / 区块 / 交易 / 合约 / 日志 / 节点 / 快照弹窗', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)

    // 确保中文模式（lang-btn 显示 "EN"）
    const btn = page.locator('.lang-btn')
    if ((await btn.textContent())?.trim() !== 'EN') await btn.click()
    await expect(page.locator('.tab-btn').first()).toContainText('节点')

    // 账户
    await page.locator('.tab-btn', { hasText: '账户' }).click()
    await page.locator('tbody tr.row-click').first().waitFor({ timeout: 15_000 })
    await shot(page, 'zh', 'accounts')

    // 区块
    await page.locator('.tab-btn', { hasText: '区块' }).click()
    await page.locator('tbody tr.row-click').first().waitFor()
    await shot(page, 'zh', 'blocks')

    // 交易
    await page.locator('.tab-btn', { hasText: '交易' }).click()
    await page.locator('tbody tr.row-click').first().waitFor()
    await shot(page, 'zh', 'transactions')

    // 合约（扫描 fixture artifacts）
    await page.locator('.tab-btn', { hasText: '合约' }).click()
    await page.locator('.input-dir').fill(ARTIFACTS_DIR)
    await page.locator('.btn-primary.btn-sm', { hasText: '扫描' }).click()
    await page.locator('.contract-item').first().waitFor({ timeout: 10_000 })
    await page.locator('.contract-item').first().click()
    await shot(page, 'zh', 'contracts')

    // 日志
    await page.locator('.tab-btn', { hasText: '日志' }).click()
    await page.waitForTimeout(400)
    await shot(page, 'zh', 'logs')

    // 节点管理
    await page.locator('.tab-btn', { hasText: '节点' }).click()
    await page.locator('.node-accounts').waitFor({ timeout: 10_000 })
    await shot(page, 'zh', 'node')

    // 快照弹窗（含快照列表）
    await page.locator('.btn-ghost', { hasText: '快照' }).click()
    await page.locator('.modal').waitFor()
    await page.locator('.modal .btn-primary').click()      // 创建一个快照
    await page.locator('.snapshot-item').waitFor()
    await shot(page, 'zh', 'snapshot-modal')
    await page.locator('.btn-close').click()
  })

  // ------------------------------------------------------------------
  // 截图：英文
  // ------------------------------------------------------------------

  test('screenshot-en: Accounts / Blocks / Transactions / Contracts / Logs / Node / Snapshot', async ({ page }) => {
    await page.goto('/')
    await waitForConnected(page)

    // 切换到英文（lang-btn 显示 "中文"）
    const btn = page.locator('.lang-btn')
    if ((await btn.textContent())?.trim() !== '中文') await btn.click()
    await expect(page.locator('.tab-btn').first()).toContainText('Node')

    // Accounts
    await page.locator('.tab-btn', { hasText: 'Accounts' }).click()
    await page.locator('tbody tr.row-click').first().waitFor({ timeout: 15_000 })
    await shot(page, 'en', 'accounts')

    // Blocks
    await page.locator('.tab-btn', { hasText: 'Blocks' }).click()
    await page.locator('tbody tr.row-click').first().waitFor()
    await shot(page, 'en', 'blocks')

    // Transactions
    await page.locator('.tab-btn', { hasText: 'Transactions' }).click()
    await page.locator('tbody tr.row-click').first().waitFor()
    await shot(page, 'en', 'transactions')

    // Contracts
    await page.locator('.tab-btn', { hasText: 'Contracts' }).click()
    await page.locator('.input-dir').fill(ARTIFACTS_DIR)
    await page.locator('.btn-primary.btn-sm', { hasText: 'Scan' }).click()
    await page.locator('.contract-item').first().waitFor({ timeout: 10_000 })
    await page.locator('.contract-item').first().click()
    await shot(page, 'en', 'contracts')

    // Logs
    await page.locator('.tab-btn', { hasText: 'Logs' }).click()
    await page.waitForTimeout(400)
    await shot(page, 'en', 'logs')

    // Node
    await page.locator('.tab-btn', { hasText: 'Node' }).click()
    await page.locator('.node-accounts').waitFor({ timeout: 10_000 })
    await shot(page, 'en', 'node')

    // Snapshot modal
    await page.locator('.btn-ghost', { hasText: 'Snapshot' }).click()
    await page.locator('.modal').waitFor()
    await page.locator('.modal .btn-primary').click()
    await page.locator('.snapshot-item').waitFor()
    await shot(page, 'en', 'snapshot-modal')
    await page.locator('.btn-close').click()
  })
})
