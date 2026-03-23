// 测试专用服务器启动脚本 — 使用独立端口避免与开发服务器冲突
process.env.PORT = '3099'
await import('../server.js')
