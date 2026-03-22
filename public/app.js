const { createApp } = Vue

createApp({
  data() {
    return {
      // 标签页
      activeTab: 'accounts',
      tabs: [
        { id: 'accounts',     label: '账户' },
        { id: 'blocks',       label: '区块' },
        { id: 'transactions', label: '交易' },
        { id: 'contracts',    label: '合约' },
        { id: 'logs',         label: '日志' }
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
      blockDetail:     {},        // blockNumber => 区块详情

      // 合约
      selectedContract:   null,
      contractAddresses:  {},
      artifactsDir:       '',

      // EVM 控制
      automine:    true,
      timeAdvance: 3600,

      // Modal 显示
      showSnapshotModal: false,
      showTimeModal:     false,

      // 分页
      blocksPage: 0,
      txPage:     0,

      // Toast
      toast: { show: false, message: '', type: 'info' },
      toastTimer: null,

      // SSE
      eventSource: null,
    }
  },

  mounted() {
    this.initSSE()
    this.loadInitialData()
  },

  beforeUnmount() {
    if (this.eventSource) this.eventSource.close()
  },

  methods: {

    // ==============================
    // 初始化
    // ==============================
    async loadInitialData() {
      await Promise.allSettled([
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
          // 更新状态（如从 pending → success）
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
      if (res !== null) this.showToast('出块成功', 'success')
    },

    async toggleAutomine() {
      const res = await this.rpcCall('evm_setAutomine', [this.automine])
      if (res !== null) {
        this.showToast(`自动出块已${this.automine ? '开启' : '关闭'}`, 'success')
      } else {
        this.automine = !this.automine // 失败则回滚
      }
    },

    async createSnapshot() {
      const snapshotId = await this.rpcCall('evm_snapshot', [])
      if (snapshotId !== null) {
        this.snapshots.push({
          id: snapshotId,
          time: new Date().toLocaleString('zh-CN'),
          blockNumber: this.status.latestBlock
        })
        this.showToast(`快照 ${snapshotId} 创建成功`, 'success')
      }
    },

    async revertSnapshot(snap) {
      const ok = await this.rpcCall('evm_revert', [snap.id])
      if (ok) {
        // 回滚后删除此快照及之后的所有快照
        const idx = this.snapshots.indexOf(snap)
        this.snapshots.splice(idx)
        this.showToast(`已回滚到快照 ${snap.id}`, 'success')
        this.showSnapshotModal = false
        // 刷新数据
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
      if (secs <= 0) return this.showToast('请输入有效秒数', 'error')
      const res = await this.rpcCall('evm_increaseTime', [secs])
      if (res !== null) {
        this.showTimeModal = false
        this.showToast(`时间已快进 ${this.formatDuration(secs)}`, 'success')
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
        this.showToast('请求失败：' + err.message, 'error')
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
        this.showToast('已复制到剪贴板', 'success')
      } catch {
        this.showToast('复制失败，请手动复制', 'error')
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
      return new Date(ts * 1000).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    },

    formatDuration(secs) {
      if (!secs || secs <= 0) return '0 秒'
      const s = parseInt(secs)
      if (s < 60)   return `${s} 秒`
      if (s < 3600) return `${Math.floor(s / 60)} 分 ${s % 60} 秒`
      if (s < 86400) return `${Math.floor(s / 3600)} 小时 ${Math.floor((s % 3600) / 60)} 分`
      return `${Math.floor(s / 86400)} 天`
    },

    statusLabel(status) {
      return { success: '成功', failed: '失败', pending: '待确认' }[status] || '--'
    },

    statusClass(status) {
      return { success: 'badge-green', failed: 'badge-red', pending: 'badge-yellow' }[status] || ''
    },

    abiTypeLabel(type) {
      return {
        function:    '函数',
        event:       '事件',
        constructor: '构造',
        receive:     '接收',
        fallback:    '回退',
        error:       '错误'
      }[type] || type
    }
  }
}).mount('#app')
