/**
 * 功能3测试：获取消息历史
 */
import { DIFY_BASE_URL, DIFY_API_KEY, TEST_USER, assert, logTest } from './test-config.mjs'

async function createConversationWithMessages() {
  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: '三体问题是什么？',
      response_mode: 'blocking',
      conversation_id: '',
      user: TEST_USER,
    }),
  })

  const data = await response.json()
  return data.conversation_id
}

async function testGetMessages(convId) {
  logTest('3.1 获取消息历史')

  const params = new URLSearchParams({
    user: TEST_USER,
    conversation_id: convId,
    limit: '20',
  })

  const response = await fetch(`${DIFY_BASE_URL}/messages?${params}`, {
    headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
  })

  assert(response.ok, `HTTP 状态码应为 200 (实际: ${response.status})`)

  const data = await response.json()
  console.log(`  消息数量: ${data.data ? data.data.length : 0}`)

  assert(data.hasOwnProperty('data'), '应返回 data 数组')
  assert(data.hasOwnProperty('has_more'), '应返回 has_more 字段')
  assert(Array.isArray(data.data), 'data 应为数组')
  assert(data.data.length > 0, '应至少有1条消息')

  if (data.data.length > 0) {
    const msg = data.data[0]
    assert(msg.id && msg.id.length > 0, '消息应包含 id 字段')
    assert(msg.query !== undefined, '消息应包含 query 字段')
    assert(msg.answer !== undefined, '消息应包含 answer 字段')
    assert(msg.conversation_id === convId, '消息的 conversation_id 应匹配')
    console.log(`  第一条消息:`)
    console.log(`    问: ${msg.query}`)
    console.log(`    答: ${(msg.answer || '').slice(0, 100)}...`)
  }

  return data.data || []
}

async function testGetMessagesWithLimit(convId) {
  logTest('3.2 限制返回数量')

  const params = new URLSearchParams({
    user: TEST_USER,
    conversation_id: convId,
    limit: '1',
  })

  const response = await fetch(`${DIFY_BASE_URL}/messages?${params}`, {
    headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
  })

  assert(response.ok, `HTTP 状态码应为 200`)

  const data = await response.json()
  console.log(`  limit=1 时返回消息数: ${data.data.length}`)

  assert(data.data.length <= 1, 'limit=1 时应最多返回1条消息')
  assert(data.limit === 1, `limit 应为 1 (实际: ${data.limit})`)
}

async function testGetMessagesInvalidConv() {
  logTest('3.3 无效会话ID处理')

  const params = new URLSearchParams({
    user: TEST_USER,
    conversation_id: 'invalid-conv-id-12345',
    limit: '20',
  })

  const response = await fetch(`${DIFY_BASE_URL}/messages?${params}`, {
    headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
  })

  assert(!response.ok, `无效会话ID应返回错误 (实际: ${response.status})`)
  console.log('  无效会话ID正确返回了错误')
}

export async function run() {
  console.log('\n###### 功能3：获取消息历史 ######')

  console.log('  创建测试会话...')
  const convId = await createConversationWithMessages()
  console.log(`  测试会话ID: ${convId}`)

  assert(convId && convId.length > 0, '应成功创建测试会话')

  await testGetMessages(convId)
  await testGetMessagesWithLimit(convId)
  await testGetMessagesInvalidConv()

  // 清理
  await fetch(`${DIFY_BASE_URL}/conversations/${convId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user: TEST_USER }),
  })

  return true
}
