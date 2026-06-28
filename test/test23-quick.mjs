import { DIFY_BASE_URL, DIFY_API_KEY, TEST_USER, assert, logTest, printSummary } from './test-config.mjs'
import { writeFileSync } from 'fs'

const L = []
console.log = (...a) => { const s = a.join(' '); L.push(s); process.stdout.write(s + '\n') }
console.error = (...a) => { const s = a.join(' '); L.push(s); process.stderr.write(s + '\n') }
const H = { Authorization: `Bearer ${DIFY_API_KEY}` }

async function main() {
  console.log('\n###### 功能2：会话管理 ######')
  logTest('2.1 获取会话列表')
  let r = await fetch(DIFY_BASE_URL + '/conversations?user=' + TEST_USER + '&limit=20', { headers: H })
  assert(r.ok, 'HTTP 200 (实际: ' + r.status + ')')
  let d = await r.json()
  console.log('  会话数量: ' + d.data.length)
  assert(Array.isArray(d.data), 'data 应为数组')
  assert(d.hasOwnProperty('has_more'), '应返回 has_more')
  if (d.data.length === 0) { printSummary(); writeFileSync('test/result-test23.txt', L.join('\n'), 'utf-8'); return }
  const c = d.data[0]
  assert(c.id, '会话应包含 id')

  logTest('2.2 重命名会话')
  const nm = '三体测试-' + Date.now()
  r = await fetch(DIFY_BASE_URL + '/conversations/' + c.id + '/name', { method: 'POST', headers: Object.assign({}, H, { 'Content-Type': 'application/json' }), body: JSON.stringify({ name: nm, user: TEST_USER }) })
  assert(r.ok, 'HTTP 200 (实际: ' + r.status + ')')
  d = await r.json()
  assert(d.name === nm, 'name 应更新')
  await new Promise(r => setTimeout(r, 1500))
  r = await fetch(DIFY_BASE_URL + '/conversations?user=' + TEST_USER + '&limit=20', { headers: H })
  d = await r.json()
  const found = d.data.find(function(x) { return x.id === c.id })
  assert(found && found.name === nm, '列表中名称应已更新')

  logTest('2.3 删除会话')
  if (d.data.length > 1) {
    const dc = d.data[d.data.length - 1]
    r = await fetch(DIFY_BASE_URL + '/conversations/' + dc.id, { method: 'DELETE', headers: Object.assign({}, H, { 'Content-Type': 'application/json' }), body: JSON.stringify({ user: TEST_USER }) })
    assert(r.ok, 'HTTP 2xx (实际: ' + r.status + ')')
    await new Promise(r => setTimeout(r, 1000))
    r = await fetch(DIFY_BASE_URL + '/conversations?user=' + TEST_USER + '&limit=20', { headers: H })
    d = await r.json()
    assert(!d.data.find(function(x) { return x.id === dc.id }), '会话应已删除')
  } else { assert(true, '跳过删除（仅1会话）') }

  console.log('\n###### 功能3：获取消息历史 ######')
  logTest('3.1 获取消息历史')
  r = await fetch(DIFY_BASE_URL + '/messages?user=' + TEST_USER + '&conversation_id=' + c.id + '&limit=20', { headers: H })
  assert(r.ok, 'HTTP 200 (实际: ' + r.status + ')')
  d = await r.json()
  console.log('  消息数量: ' + d.data.length)
  assert(Array.isArray(d.data), 'data 应为数组')
  if (d.data.length > 0) {
    const m = d.data[0]
    assert(m.id, '消息应包含 id')
    assert(m.query !== undefined, '消息应包含 query')
    assert(m.answer !== undefined, '消息应包含 answer')
    console.log('  问: ' + m.query)
    console.log('  答: ' + (m.answer || '').slice(0, 80))
  }

  logTest('3.2 限制返回数量')
  r = await fetch(DIFY_BASE_URL + '/messages?user=' + TEST_USER + '&conversation_id=' + c.id + '&limit=1', { headers: H })
  d = await r.json()
  assert(d.data.length <= 1, 'limit=1 应最多1条')
  assert(d.limit === 1, 'limit 应为1')

  logTest('3.3 无效会话ID')
  r = await fetch(DIFY_BASE_URL + '/messages?user=' + TEST_USER + '&conversation_id=invalid-123&limit=20', { headers: H })
  assert(!r.ok, '无效ID应返回错误')

  printSummary()
  writeFileSync('test/result-test23.txt', L.join('\n'), 'utf-8')
}
main().catch(function(e) { console.error('ERR: ' + e.message); writeFileSync('test/result-test23.txt', L.join('\n') + '\nERR: ' + e.message, 'utf-8') })
