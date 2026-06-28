import { writeFileSync } from 'fs'
const B = 'http://localhost:3001'
const L = []
const log = s => { L.push(s); console.log(s) }
async function test(q, label, convId = '') {
  log('\n===== ' + label + ' =====')
  log('Q: ' + q + ' (convId: ' + (convId || 'new') + ')')
  const r = await fetch(B + '/api/react/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, conversationId: convId, user: 'test-conv' }) })
  if (!r.ok) { log('ERR: ' + r.status); return { err: true } }
  const rd = r.body.getReader()
  const dec = new TextDecoder()
  let buf = ''; let ans = ''; let steps = 0; let err = false; let ev = ''; let webFound = false; let finalConvId = convId
  while (true) {
    const { done, value } = await rd.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const ls = buf.split('\n'); buf = ls.pop() || ''
    for (const l of ls) {
      if (l.startsWith('event: ')) ev = l.slice(7).trim()
      else if (l.startsWith('data: ')) {
        try {
          const d = JSON.parse(l.slice(6))
          if (ev === 'step') { steps++; if (d.type === 'observation' && d.tool === 'web_search' && d.found) webFound = true; log('[' + d.type + '] ' + (d.content || d.tool || '').slice(0, 80)) }
          else if (ev === 'answer') { ans += d.text || ''; if (d.conversationId) finalConvId = d.conversationId }
          else if (ev === 'answer_end') { if (d.conversationId) finalConvId = d.conversationId }
          else if (ev === 'done') log('[Done]')
          else if (ev === 'error') { log('[Err] ' + d.message); err = true }
        } catch (e) {}
      }
    }
  }
  log('Steps: ' + steps + ' WebFound: ' + webFound + ' ConvId: ' + finalConvId)
  log('Ans: ' + ans.slice(0, 200))
  log('Result: ' + (err ? 'FAIL' : 'PASS'))
  return { steps, ans, err, webFound, convId: finalConvId }
}
log('===== ReAct API Test =====')

// 测试1: 知识库命中
const r1 = await test('什么是黑暗森林法则', 'KB Hit')

// 测试2: 联网搜索（非三体、非百科的问题）
const r2 = await test('2024年巴黎奥运会有哪些亮点', 'Web Search')
log('  联网搜索是否找到结果: ' + (r2.webFound ? 'YES' : 'NO'))

// 测试3: 会话连续性 - 在同一会话中连续提问两次
log('\n===== 会话连续性测试 =====')
const r3 = await test('什么是水滴', 'Conv Test 1', '')
log('  第一次对话 convId: ' + r3.convId)
const r4 = await test('它的材质是什么', 'Conv Test 2 (same conv)', r3.convId)
log('  第二次对话 convId: ' + r4.convId)
log('  会话ID一致: ' + (r3.convId === r4.convId && r3.convId ? 'YES ✅' : 'NO ❌'))

const hr = await fetch(B + '/api/health')
const hd = await hr.json()
log('\nHealth: ' + JSON.stringify(hd))
writeFileSync('test/result-react.txt', L.join('\n'), 'utf-8')
