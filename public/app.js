const { createApp } = Vue

// ============================================================
// 国际化文本 / i18n strings
// ============================================================
const I18N = {
  zh: {
    connected: '已连接', disconnected: '未连接', latestBlock: '最新区块',
    mine: '⛏ 出块', automine: '自动出块', snapshot: '📸 快照', timeCtrl: '⏩ 时间',
    tab_node: '节点', tab_accounts: '账户', tab_blocks: '区块',
    tab_transactions: '交易', tab_contracts: '合约', tab_logs: '日志',
    accountList: '账户列表', refresh: '↺ 刷新',
    notConnected: '⚠ 未连接节点，请启动 npx hardhat node',
    loading: '加载中...',
    colIndex: '#', colAddress: '地址', colBalance: '余额 (ETH)', colNonce: 'Nonce', colAction: '操作',
    copyAddress: '复制地址', privateKeyLabel: '私钥：', unknownKey: '非默认账户，私钥未知',
    hide: '隐藏', show: '显示', copy: '复制',
    blockList: '区块列表', noBlocks: '暂无区块数据',
    colBlock: '区块号', colTime: '时间', colTxCount: '交易数',
    colGasUsed: 'Gas 已用', colGasLimit: 'Gas 限制', colHash: '区块哈希',
    parentHash: '父哈希', miner: '矿工地址',
    colTxHash: '哈希', colFrom: '发送方', colTo: '接收方', colValue: '金额 ETH', colStatus: '状态',
    contractCreation: '合约创建', noTxInBlock: '该区块无交易',
    prevPage: '← 上一页', nextPage: '下一页 →',
    txList: '交易记录', noTx: '暂无交易记录',
    colTxHashFull: '交易哈希', colBlockNum: '区块号', colAmount: '金额 (ETH)', colGasConsumed: 'Gas 消耗',
    fieldHash: '完整哈希', fieldFrom: '发送方', fieldTo: '接收方', fieldContract: '合约地址',
    fieldGasPrice: 'Gas 价格', fieldGasLimit: 'Gas 限制', fieldGasUsed: 'Gas 消耗', fieldNonce: 'Nonce',
    inputData: 'Input Data：',
    contractsTab: '合约', artifactsPlaceholder: 'artifacts 目录（留空使用默认）', scan: '扫描',
    noContracts: '未发现合约文件', checkDir: '请确认 artifacts 目录路径正确',
    selectContract: '从左侧选择合约查看 ABI', deployedAddress: '输入已部署合约地址 0x...',
    eventLogs: '事件日志', clearLog: '清空', noLogs: '暂无事件日志，等待链上交易...',
    startNode: '▶ 启动节点', stopNode: '■ 停止节点',
    nodeConfigTitle: '节点配置', projectDir: 'Hardhat 项目目录',
    projectDirPlaceholder: '留空使用内置 Hardhat',
    projectDirHint: '留空使用内置版本，或填入其他 Hardhat 项目路径',
    listenPort: '监听端口', listenAddr: '监听地址',
    accountConfig: '账户配置', accountCount: '账户数量',
    initialBalance: '初始余额 (ETH)', mnemonic: '助记词 (Mnemonic)',
    forkConfig: 'Fork 配置', forkUrl: 'Fork 源 RPC URL',
    forkBlock: 'Fork 起始区块（留空=最新）', optional: '可选',
    runningAccounts: '运行账户', copyKey: '复制私钥',
    consolePanelTitle: '控制台输出', waitingNode: '等待节点启动...',
    statusStopped: '已停止', statusStarting: '启动中', statusRunning: '运行中', statusStopping: '停止中',
    nodeStartingBtn: '启动中...', nodeStoppingBtn: '停止中...',
    snapshotTitle: '网络快照管理', snapshotDesc: '快照保存当前链状态，可随时回滚。',
    createSnapshot: '创建快照', noSnapshots: '暂无快照', revert: '回滚',
    timeTitle: '时间控制', timeDesc: '快进区块时间戳，不影响系统时钟。',
    timeLabel: '快进秒数：', confirm: '确认快进', cancel: '取消',
    txSuccess: '成功', txFailed: '失败', txPending: '待确认',
    abiFunction: '函数', abiEvent: '事件', abiConstructor: '构造',
    abiReceive: '接收', abiFallback: '回退', abiError: '错误',
    toastCopied: '已复制到剪贴板', toastCopyFail: '复制失败，请手动复制',
    toastMined: '出块成功', toastAutomineOn: '自动出块已开启', toastAutomineOff: '自动出块已关闭',
    toastNodeStartSent: '节点启动指令已发送', toastNodeStopSent: '停止指令已发送',
    toastInvalidSecs: '请输入有效秒数', toastReqFailed: '请求失败：',
    mineTitle: '立即挖出一个区块', automineTitle: '开启后每笔交易自动出块',
  },
  en: {
    connected: 'Connected', disconnected: 'Disconnected', latestBlock: 'Latest Block',
    mine: '⛏ Mine', automine: 'Automine', snapshot: '📸 Snapshot', timeCtrl: '⏩ Time',
    tab_node: 'Node', tab_accounts: 'Accounts', tab_blocks: 'Blocks',
    tab_transactions: 'Transactions', tab_contracts: 'Contracts', tab_logs: 'Logs',
    accountList: 'Accounts', refresh: '↺ Refresh',
    notConnected: '⚠ Not connected. Start npx hardhat node first.',
    loading: 'Loading...',
    colIndex: '#', colAddress: 'Address', colBalance: 'Balance (ETH)', colNonce: 'Nonce', colAction: 'Action',
    copyAddress: 'Copy Address', privateKeyLabel: 'Private Key:', unknownKey: 'Non-default account — private key unknown',
    hide: 'Hide', show: 'Show', copy: 'Copy',
    blockList: 'Blocks', noBlocks: 'No blocks yet',
    colBlock: 'Block', colTime: 'Time', colTxCount: 'Txns',
    colGasUsed: 'Gas Used', colGasLimit: 'Gas Limit', colHash: 'Hash',
    parentHash: 'Parent Hash', miner: 'Miner',
    colTxHash: 'Hash', colFrom: 'From', colTo: 'To', colValue: 'Value ETH', colStatus: 'Status',
    contractCreation: 'Contract Creation', noTxInBlock: 'No transactions in this block',
    prevPage: '← Prev', nextPage: 'Next →',
    txList: 'Transactions', noTx: 'No transactions yet',
    colTxHashFull: 'Tx Hash', colBlockNum: 'Block', colAmount: 'Value (ETH)', colGasConsumed: 'Gas Used',
    fieldHash: 'Hash', fieldFrom: 'From', fieldTo: 'To', fieldContract: 'Contract Address',
    fieldGasPrice: 'Gas Price', fieldGasLimit: 'Gas Limit', fieldGasUsed: 'Gas Used', fieldNonce: 'Nonce',
    inputData: 'Input Data:',
    contractsTab: 'Contracts', artifactsPlaceholder: 'Artifacts dir (blank = default)', scan: 'Scan',
    noContracts: 'No contracts found', checkDir: 'Please verify the artifacts directory path',
    selectContract: 'Select a contract on the left to view its ABI',
    deployedAddress: 'Enter deployed contract address 0x...',
    eventLogs: 'Event Logs', clearLog: 'Clear', noLogs: 'No event logs. Waiting for on-chain activity...',
    startNode: '▶ Start Node', stopNode: '■ Stop Node',
    nodeConfigTitle: 'Node Configuration', projectDir: 'Hardhat Project Directory',
    projectDirPlaceholder: 'Leave blank for built-in Hardhat',
    projectDirHint: 'Leave blank for built-in Hardhat, or enter another project path',
    listenPort: 'Port', listenAddr: 'Hostname',
    accountConfig: 'Account Settings', accountCount: 'Account Count',
    initialBalance: 'Initial Balance (ETH)', mnemonic: 'Mnemonic',
    forkConfig: 'Fork Settings', forkUrl: 'Fork RPC URL',
    forkBlock: 'Fork Block Number (blank = latest)', optional: 'optional',
    runningAccounts: 'Running Accounts', copyKey: 'Copy Key',
    consolePanelTitle: 'Console Output', waitingNode: 'Waiting for node to start...',
    statusStopped: 'Stopped', statusStarting: 'Starting', statusRunning: 'Running', statusStopping: 'Stopping',
    nodeStartingBtn: 'Starting...', nodeStoppingBtn: 'Stopping...',
    snapshotTitle: 'Snapshot Manager', snapshotDesc: 'Snapshots save the chain state and can be reverted at any time.',
    createSnapshot: 'Create Snapshot', noSnapshots: 'No snapshots', revert: 'Revert',
    timeTitle: 'Time Control', timeDesc: 'Advance the block timestamp without affecting the system clock.',
    timeLabel: 'Seconds to advance:', confirm: 'Confirm', cancel: 'Cancel',
    txSuccess: 'Success', txFailed: 'Failed', txPending: 'Pending',
    abiFunction: 'function', abiEvent: 'event', abiConstructor: 'constructor',
    abiReceive: 'receive', abiFallback: 'fallback', abiError: 'error',
    toastCopied: 'Copied to clipboard', toastCopyFail: 'Copy failed — please copy manually',
    toastMined: 'Block mined', toastAutomineOn: 'Automine enabled', toastAutomineOff: 'Automine disabled',
    toastNodeStartSent: 'Node start command sent', toastNodeStopSent: 'Stop command sent',
    toastInvalidSecs: 'Please enter a valid number of seconds', toastReqFailed: 'Request failed: ',
    mineTitle: 'Mine an empty block immediately', automineTitle: 'Auto-mine a block for every transaction',
  }
}

createApp({
  data() {
    return {
      // 语言
      lang: localStorage.getItem('hh-gui-lang') || 'zh',

      // 标签页
      activeTab: 'accounts',
      tabs: [
        { id: 'node' },
        { id: 'accounts' },
        { id: 'blocks' },
        { id: 'transactions' },
        { id: 'contracts' },
        { id: 'logs' }
      ],

      // 网络状态
      status: {
        connected: false,
        chainId: null,
        clientVersion: null,
        latestBlock: -1,
        rpcUrl: ''
      },

      // 数据
      accounts:     [],
      blocks:       { total: 0, items: [] },
      transactions: { total: 0, items: [] },
      contracts:    [],
      logs:         [],
      snapshots:    [],

      // UI 展开状态
      expandedAccount: null,
      expandedBlock:   null,
      expandedTx:      null,
      showKey:         false,
      blockDetail:     {},

      // 合约
      selectedContract:   null,
      contractAddresses:  {},
      artifactsDir:       '',

      // EVM 控制
      automine:    true,
      timeAdvance: 3600,

      // Modal
      showSnapshotModal: false,
      showTimeModal:     false,

      // 分页
      blocksPage: 0,
      txPage:     0,

      // Toast
      toast: { show: false, message: '', type: 'info' },
      toastTimer: null,

      // SSE
      eventSource:     null,
      consoleSse:      null,

      // 节点管理
      node: {
        status:   'stopped',
        pid:      null,
        accounts: [],
        config: {
          projectDir:     '',
          port:           8545,
          hostname:       '127.0.0.1',
          chainId:        31337,
          accountCount:   20,
          initialBalance: '10000',
          mnemonic:       'test test test test test test test test test test test junk',
          fork:           '',
          forkBlockNumber: '',
        }
      },
      nodeLogs:     [],
      showAdvanced: false,
      showFork:     false,
    }
  },

  mounted() {
    document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en'
    this.initSSE()
    this.loadInitialData()
  },

  beforeUnmount() {
    if (this.eventSource) this.eventSource.close()
    if (this.consoleSse)  this.consoleSse.close()
  },

  computed: {
    nodeStatusLabel() {
      const map = {
        stopped: 'statusStopped', starting: 'statusStarting',
        running: 'statusRunning', stopping: 'statusStopping'
      }
      return this.t(map[this.node.status] || 'statusStopped')
    },
    nodeStatusClass() {
      return { stopped: 'count-gray', starting: 'count-yellow', running: 'count-green', stopping: 'count-yellow' }[this.node.status] || ''
    },
    nodeStatusDot() {
      return { stopped: '●', starting: '◌', running: '●', stopping: '◌' }[this.node.status] || '●'
    },
  },

  methods: {

    // ==============================
    // 国际化
    // ==============================
    t(key) {
      return I18N[this.lang]?.[key] ?? key
    },

    toggleLang() {
      this.lang = this.lang === 'zh' ? 'en' : 'zh'
      localStorage.setItem('hh-gui-lang', this.lang)
      document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en'
    },

    // 带变量的本地化辅助方法
    blocksCountLabel(n) {
      return this.lang === 'zh' ? `共 ${n} 个区块` : `${n} block${n !== 1 ? 's' : ''}`
    },
    txCountLabel(n) {
      return this.lang === 'zh' ? `共 ${n} 笔` : `${n} txn${n !== 1 ? 's' : ''}`
    },
    logsCountLabel(n) {
      return this.lang === 'zh' ? `${n} 条记录` : `${n} record${n !== 1 ? 's' : ''}`
    },
    blockTxsLabel(n) {
      return this.lang === 'zh' ? `该区块交易（${n} 笔）` : `${n} transaction${n !== 1 ? 's' : ''} in block`
    },
    pageLabel(page, total) {
      return this.lang === 'zh' ? `第 ${page} 页 / 共 ${total} 页` : `Page ${page} of ${total}`
    },
    membersLabel(n, b) {
      return this.lang === 'zh' ? `${n} 个成员 · ${b} bytes` : `${n} members · ${b} bytes`
    },

    // ==============================
    // 初始化
    // ==============================
    async loadInitialData() {
      await Promise.allSettled([
        this.loadNodeStatus(),
        this.loadAccounts(),
        this.loadBlocks(),
        this.loadTransactions(),
        this.loadContracts(),
        this.loadLogs(),
        this.checkAutomine()
      ])
    },

    async checkAutomine() {
      try {
        const res = await this.rpcCall('hardhat_getAutomine', [])
        if (res !== null) this.automine = res
      } catch { /* 非 Hardhat 节点忽略 */ }
    },

    // ==============================
    // SSE 实时推送
    // ==============================
    initSSE() {
      this.eventSource = new EventSource('/api/events')

      this.eventSource.addEventListener('status', e => {
        const data = JSON.parse(e.data)
        Object.assign(this.status, data)
      })

      this.eventSource.addEventListener('block', e => {
        const block = JSON.parse(e.data)
        if (!this.blocks.items.find(b => b.number === block.number)) {
          this.blocks.items.unshift(block)
          this.blocks.total++
          if (this.blocks.items.length > 200) this.blocks.items.pop()
        }
        this.status.latestBlock = block.number
      })

      this.eventSource.addEventListener('transaction', e => {
        const tx = JSON.parse(e.data)
        const idx = this.transactions.items.findIndex(t => t.hash === tx.hash)
        if (idx === -1) {
          this.transactions.items.unshift(tx)
          this.transactions.total++
          if (this.transactions.items.length > 500) this.transactions.items.pop()
        } else {
          Object.assign(this.transactions.items[idx], tx)
        }
      })

      this.eventSource.addEventListener('log', e => {
        const log = JSON.parse(e.data)
        if (!this.logs.find(l => l.id === log.id)) {
          this.logs.unshift(log)
          if (this.logs.length > 500) this.logs.pop()
        }
      })

      this.eventSource.addEventListener('accounts', e => {
        this.accounts = JSON.parse(e.data)
      })

      this.eventSource.onerror = () => {
        this.status.connected = false
      }

      this.eventSource.addEventListener('nodeStatus', e => {
        const data = JSON.parse(e.data)
        this.applyNodeStatus(data)
      })
    },

    initConsoleSse() {
      if (this.consoleSse) return
      this.consoleSse = new EventSource('/api/node/console')

      this.consoleSse.addEventListener('console', e => {
        const entry = JSON.parse(e.data)
        this.nodeLogs.push(entry)
        if (this.nodeLogs.length > 500) this.nodeLogs.shift()
        this.$nextTick(() => {
          const el = this.$refs.consoleRef
          if (el) el.scrollTop = el.scrollHeight
        })
      })

      this.consoleSse.addEventListener('nodeStatus', e => {
        this.applyNodeStatus(JSON.parse(e.data))
      })
    },

    applyNodeStatus(data) {
      this.node.status   = data.status
      this.node.pid      = data.pid
      this.node.accounts = data.accounts || []
      if (data.config) Object.assign(this.node.config, data.config)
    },

    // ==============================
    // 节点管理
    // ==============================
    async loadNodeStatus() {
      const data = await this.get('/api/node/status')
      if (data) this.applyNodeStatus(data)
    },

    async startNode() {
      const res = await this.post('/api/node/start', this.node.config)
      if (res === null) return
      this.initConsoleSse()
      this.showToast(this.t('toastNodeStartSent'), 'info')
    },

    async stopNode() {
      const res = await this.post('/api/node/stop', {})
      if (res !== null) this.showToast(this.t('toastNodeStopSent'), 'info')
    },

    // ==============================
    // 数据加载
    // ==============================
    async loadAccounts() {
      const data = await this.get('/api/accounts')
      if (data) this.accounts = data
    },

    async loadBlocks() {
      const data = await this.get(`/api/blocks?limit=20&offset=${this.blocksPage * 20}`)
      if (data) this.blocks = data
    },

    async loadTransactions() {
      const data = await this.get(`/api/transactions?limit=50&offset=${this.txPage * 50}`)
      if (data) this.transactions = data
    },

    async loadContracts() {
      const url = this.artifactsDir
        ? `/api/contracts?dir=${encodeURIComponent(this.artifactsDir)}`
        : '/api/contracts'
      const data = await this.get(url)
      if (data) this.contracts = data
    },

    async loadLogs() {
      const data = await this.get('/api/logs')
      if (data) this.logs = data
    },

    // ==============================
    // 标签页切换
    // ==============================
    switchTab(id) {
      this.activeTab = id
      this.expandedAccount = null
      this.expandedBlock   = null
      this.expandedTx      = null
      if (id === 'node') this.initConsoleSse()
    },

    // ==============================
    // 展开行
    // ==============================
    toggleAccount(addr) {
      this.expandedAccount = this.expandedAccount === addr ? null : addr
      this.showKey = false
    },

    async toggleBlock(num) {
      if (this.expandedBlock === num) {
        this.expandedBlock = null
        return
      }
      this.expandedBlock = num
      if (!this.blockDetail[num]) {
        const data = await this.get(`/api/blocks/${num}`)
        if (data) this.blockDetail[num] = data
      }
    },

    toggleTx(hash) {
      this.expandedTx = this.expandedTx === hash ? null : hash
    },

    // ==============================
    // 分页
    // ==============================
    prevPage(type) {
      if (type === 'blocks') {
        this.blocksPage = Math.max(0, this.blocksPage - 1)
        this.loadBlocks()
      } else {
        this.txPage = Math.max(0, this.txPage - 1)
        this.loadTransactions()
      }
    },

    nextPage(type) {
      if (type === 'blocks') {
        this.blocksPage++
        this.loadBlocks()
      } else {
        this.txPage++
        this.loadTransactions()
      }
    },

    // ==============================
    // EVM 控制
    // ==============================
    async mine() {
      const res = await this.rpcCall('evm_mine', [])
      if (res !== null) this.showToast(this.t('toastMined'), 'success')
    },

    async toggleAutomine() {
      const res = await this.rpcCall('evm_setAutomine', [this.automine])
      if (res !== null) {
        this.showToast(this.t(this.automine ? 'toastAutomineOn' : 'toastAutomineOff'), 'success')
      } else {
        this.automine = !this.automine
      }
    },

    async createSnapshot() {
      const snapshotId = await this.rpcCall('evm_snapshot', [])
      if (snapshotId !== null) {
        this.snapshots.push({
          id: snapshotId,
          time: new Date().toLocaleString(this.lang === 'zh' ? 'zh-CN' : 'en-US'),
          blockNumber: this.status.latestBlock
        })
        const msg = this.lang === 'zh'
          ? `快照 ${snapshotId} 创建成功`
          : `Snapshot ${snapshotId} created`
        this.showToast(msg, 'success')
      }
    },

    async revertSnapshot(snap) {
      const ok = await this.rpcCall('evm_revert', [snap.id])
      if (ok) {
        const idx = this.snapshots.indexOf(snap)
        this.snapshots.splice(idx)
        const msg = this.lang === 'zh'
          ? `已回滚到快照 ${snap.id}`
          : `Reverted to snapshot ${snap.id}`
        this.showToast(msg, 'success')
        this.showSnapshotModal = false
        this.blocksPage = 0
        this.txPage = 0
        await Promise.allSettled([
          this.loadAccounts(),
          this.loadBlocks(),
          this.loadTransactions(),
          this.loadLogs()
        ])
      }
    },

    async advanceTime() {
      const secs = parseInt(this.timeAdvance) || 0
      if (secs <= 0) return this.showToast(this.t('toastInvalidSecs'), 'error')
      const res = await this.rpcCall('evm_increaseTime', [secs])
      if (res !== null) {
        this.showTimeModal = false
        const msg = this.lang === 'zh'
          ? `时间已快进 ${this.formatDuration(secs)}`
          : `Time advanced by ${this.formatDuration(secs)}`
        this.showToast(msg, 'success')
      }
    },

    // ==============================
    // HTTP 工具
    // ==============================
    async get(url) {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      } catch (err) {
        this.showToast(this.t('toastReqFailed') + err.message, 'error')
        return null
      }
    },

    async post(url, body) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        return data
      } catch (err) {
        this.showToast(err.message, 'error')
        return null
      }
    },

    async rpcCall(method, params) {
      try {
        const res = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, params })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        return data.result
      } catch (err) {
        this.showToast(err.message, 'error')
        return null
      }
    },

    // ==============================
    // 剪贴板
    // ==============================
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.showToast(this.t('toastCopied'), 'success')
      } catch {
        this.showToast(this.t('toastCopyFail'), 'error')
      }
    },

    // ==============================
    // Toast 通知
    // ==============================
    showToast(message, type = 'info') {
      clearTimeout(this.toastTimer)
      this.toast = { show: true, message, type }
      this.toastTimer = setTimeout(() => { this.toast.show = false }, 3000)
    },

    // ==============================
    // 格式化工具
    // ==============================
    formatTime(ts) {
      if (!ts) return '--'
      return new Date(ts * 1000).toLocaleString(this.lang === 'zh' ? 'zh-CN' : 'en-US', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    },

    formatDuration(secs) {
      if (!secs || secs <= 0) return this.lang === 'zh' ? '0 秒' : '0s'
      const s = parseInt(secs)
      if (this.lang === 'en') {
        if (s < 60)    return `${s}s`
        if (s < 3600)  return `${Math.floor(s / 60)}m ${s % 60}s`
        if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
        return `${Math.floor(s / 86400)}d`
      }
      if (s < 60)    return `${s} 秒`
      if (s < 3600)  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`
      if (s < 86400) return `${Math.floor(s / 3600)} 小时 ${Math.floor((s % 3600) / 60)} 分`
      return `${Math.floor(s / 86400)} 天`
    },

    statusLabel(status) {
      const map = { success: 'txSuccess', failed: 'txFailed', pending: 'txPending' }
      return this.t(map[status]) || '--'
    },

    statusClass(status) {
      return { success: 'badge-green', failed: 'badge-red', pending: 'badge-yellow' }[status] || ''
    },

    abiTypeLabel(type) {
      const map = {
        function: 'abiFunction', event: 'abiEvent', constructor: 'abiConstructor',
        receive: 'abiReceive', fallback: 'abiFallback', error: 'abiError'
      }
      return this.t(map[type] || type)
    }
  }
}).mount('#app')
