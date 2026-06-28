/**
 * 功能2测试：会话管理（列表/删除/重命名）
 */
import { DIFY_BASE_URL, DIFY_API_KEY, TEST_USER, assert, logTest } from './test-config.mjs'
import { readFileSync } from 'fs'

function getLastConvId() {
  try {
    return readFileSync('test/.last-conv-id', 'utf-8').trim()
  } catch {
    return ''
  }
}

async function testGetConversations() {
  logTest('2.1 获取会话列表')

  const params = new URLSearchParams({ user: TEST_USER, limit: '20' })
  const response = await fetch(`${DIFY_BASE_URL}/conversations?${params}`, {
    headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
  })

  assert(response.ok, `HTTP 状态码应为 200 (实际: ${response.status})`)

  const data = await response.json()
  console.log(`  会话数量: ${data.data ? data.data.length : 0}`)

  assert(data.hasOwnProperty('data'), '应返回 data 数组')
  assert(data.hasOwnProperty('has_more'), '应返回 has_more 字段')
  assert(Array.isArray(data.data), 'data 应为数组')

  if (data.data.length > 0) {
    const conv = data.data[0]
    assert(conv.id && conv.id.length > 0, '会话应包含 id 字段')
    assert(conv.name !== undefined, '会话应包含 name 字段')
    console.log(`  第一个会话: id=${conv.id}, name="${conv.name}"`)
  }

  return data.data || []
}

async function testRenameConversation(convId) {
  logTest('2.2 重命名会话')

  if (!convId) {
    console.log('  跳过：没有可用的会话ID')
    assert(true, '跳过重命名测试（无会话）')
    return
  }

  const newName = '三体问答-' + Date.now()

  const response = await fetch(`${DIFY_BASE_URL}/conversations/${convId}/name`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName, user: TEST_USER }),
  })

  assert(response.ok, `HTTP 状态码应为 200 (实际: ${response.status})`)

  const data = await response.json()
  console.log(`  重命名结果: ${JSON.stringify(data).slice(0, 200)}`)

  assert(data.id === convId, '返回的 id 应与请求一致')
  assert(data.name === newName, `name 应为 "${newName}"`)

  // 等待1秒让API缓存更新后再验证列表
  await new Promise(r => setTimeout(r, 1000))

  // 验证列表中名称已更新
  const listParams = new URLSearchParams({ user: TEST_USER, limit: '20' })
  const listResp = await fetch(`${DIFY_BASE_URL}/conversations?${listParams}`, {
    headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
  })
  const listData = await listResp.json()
  const found = listData.data.find(c => c.id === convId)
  assert(found && found.name === newName, '列表中会话名称应已更新')
}

async function testDeleteConversation(convId) {
  logTest('2.3 删除会话')

  if (!convId) {
    console.log('  跳过：没有可用的会话ID')
    assert(true, '跳过删除测试（无会话）')
    return
  }

  const response = await fetch(`${DIFY_BASE_URL}/conversations/${convId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user: TEST_USER }),
  })

  assert(response.ok, `HTTP 状态码应为 2xx (实际: ${response.status})`)

  // 删除接口可能返回 204 No Content，不应尝试解析JSON
  if (response.status !== 204) {
    const data = await response.json().catch(() => ({}))
    console.log(`  删除结果: ${JSON.stringify(data)}`)
  } else {
    console.log('  删除返回 204 No Content（成功）')
  }

  // 等待1秒让API缓存更新
  await new Promise(r => setTimeout(r, 1000))

  // 验证已从列表删除
  const listParams = new URLSearchParams({ user: TEST_USER, limit: '20' })
  const listResp = await fetch(`${DIFY_BASE_URL}/conversations?${listParams}`, {
    headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
  })
  const listData = await listResp.json()
  const stillExists = listData.data.find(c => c.id === convId)
  assert(!stillExists, '会话应已从列表中删除')
}

// 创建测试会话
async function createTestConversation() {
  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: '测试会话创建',
      response_mode: 'blocking',
      conversation_id: '',
      user: TEST_USER,
    }),
  })
  const data = await response.json()
  return data.conversation_id
}

export async function run() {
  console.log('\n###### 功能2：会话管理 ######')

  // 先获取列表
  const conversations = await testGetConversations()

  // 创建新的测试会话用于重命名和删除测试
  console.log('\n  创建测试会话用于重命名/删除测试...')
  const testConvId = await createTestConversation()
  console.log(`  新会话ID: ${testConvId}`)
  assert(testConvId && testConvId.length > 0, '应成功创建测试会话')

  await testRenameConversation(testConvId)
  await testDeleteConversation(testConvId)

  return true
}
