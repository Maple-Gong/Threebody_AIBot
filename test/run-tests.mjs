import { printSummary } from './test-config.mjs'
import { writeFileSync } from 'fs'

const args = process.argv.slice(2)
const target = args[0] || 'all'

const lines = []
const origLog = console.log
const origErr = console.error
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); lines.push(s); origLog(s) }
console.error = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); lines.push(s); origErr(s) }

async function main() {
  let allPassed = true

  if (target === 'test1' || target === 'all') {
    const { run } = await import('./test1-send-message.mjs')
    const convId = await run()
    if (!convId) allPassed = false
  }

  if (target === 'test2' || target === 'all') {
    const { run } = await import('./test2-conversations.mjs')
    const ok = await run()
    if (!ok) allPassed = false
  }

  if (target === 'test3' || target === 'all') {
    const { run } = await import('./test3-messages.mjs')
    const ok = await run()
    if (!ok) allPassed = false
  }

  const ok = printSummary()
  lines.push('')
  writeFileSync(`test/result-${target}.txt`, lines.join('\n'), 'utf-8')
  origLog(`结果已保存到 test/result-${target}.txt`)
  process.exit(ok ? 0 : 1)
}

main().catch(err => {
  console.error('测试执行出错:', err)
  writeFileSync(`test/result-${target}.txt`, lines.join('\n') + '\n错误: ' + err.message, 'utf-8')
  process.exit(1)
})
