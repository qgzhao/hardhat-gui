/**
 * Playwright Global Setup
 * 编译 fixture 合约（Counter.sol），供 e2e 测试使用
 */
import { execSync }      from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const ROOT        = join(__dirname, '..')
const FIXTURE_DIR = join(__dirname, 'fixture-project')
const ARTIFACT    = join(FIXTURE_DIR, 'artifacts', 'contracts', 'Counter.sol', 'Counter.json')
const HH_CLI      = join(ROOT, 'node_modules', 'hardhat', 'dist', 'src', 'cli.js')

export default async function globalSetup() {
  if (existsSync(ARTIFACT)) {
    console.log('[setup] Counter artifact already compiled, skipping.')
    return
  }

  console.log('[setup] Compiling Counter.sol via Hardhat…')
  mkdirSync(join(FIXTURE_DIR, 'contracts'), { recursive: true })

  execSync(`node "${HH_CLI}" compile`, {
    cwd:   FIXTURE_DIR,
    stdio: 'inherit',
    env:   { ...process.env, HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true' },
  })

  console.log('[setup] Compilation done.')
}
