/**
 * 功能1测试：发送聊天消息
 * 测试阻塞模式和流式模式
 */
import { DIFY_BASE_URL, DIFY_API_KEY, TEST_USER, assert, logTest } from './test-config.mjs'

// 用于保存测试中创建的会话ID，供后续测试使用
let testConversationId = ''

/**
 * 测试1.1：阻塞模式发送消息
 */
async function testBlockingMessage() {
  logTest('1.1 阻塞模式发送消息')

  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: '你好，请用一句话介绍你自己',
      response_mode: 'blocking',
      conversation_id: '',
      user: TEST_USER,
    }),
  })

  assert(response.ok, `HTTP 响应状态码应为 200 (实际: ${response.status})`)

  const data = await response.json()
  console.log('  响应数据:', JSON.stringify(data, null, 2).slice(0, 500))

  assert(data.answer && data.answer.length > 0, '应返回非空的 answer 字段')
  assert(data.conversation_id && data.conversation_id.length > 0, '应返回非空的 conversation_id')
  assert(data.message_id && data.message_id.length > 0, '应返回非空的 message_id')
  assert(data.event === 'message', `event 应为 "message" (实际: "${data.event}")`)

  testConversationId = data.conversation_id
  console.log(`  会话ID: ${testConversationId}`)
  console.log(`  回答内容: ${data.answer}`)

  return testConversationId
}

/**
 * 测试1.2：流式模式发送消息（使用已有会话）
 */
async function testStreamingMessage(convId) {
  logTest('1.2 流式模式发送消息')

  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: '1加1等于几？',
      response_mode: 'streaming',
      conversation_id: convId,
      user: TEST_USER,
    }),
  })

  assert(response.ok, `HTTP 响应状态码应为 200 (实际: ${response.status})`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullAnswer = ''
  let receivedConversationId = ''
  let messageEndReceived = false
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const dataStr = trimmed.slice(5).trim()
      if (!dataStr) continue

      try {
        const data = JSON.parse(dataStr)

        if (data.event === 'message') {
          fullAnswer += data.answer || ''
          receivedConversationId = data.conversation_id || receivedConversationId
        } else if (data.event === 'message_end') {
          messageEndReceived = true
          console.log('  message_end metadata:', JSON.stringify(data.metadata || {}))
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  console.log(`  流式回答内容: ${fullAnswer}`)

  assert(fullAnswer.length > 0, '流式模式应累积收到非空回答')
  assert(messageEndReceived, '应收到 message_end 事件')
  assert(receivedConversationId === convId, '会话ID应与传入一致')

  return { fullAnswer, conversationId: receivedConversationId }
}

/**
 * 测试1.3：测试错误处理（空 query）
 */
async function testErrorMessage() {
  logTest('1.3 错误处理 - 空query')

  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: '',
      response_mode: 'blocking',
      conversation_id: '',
      user: TEST_USER,
    }),
  })

  assert(!response.ok, `空query应返回错误状态码 (实际: ${response.status})`)

  const errData = await response.json().catch(() => ({}))
  console.log(`  错误响应: ${JSON.stringify(errData)}`)
  assert(true, '错误处理正常（返回了错误响应）')
}

// 导出运行函数和会话ID
export async function run() {
  console.log('\n###### 功能1：发送聊天消息 ######')
  const convId = await testBlockingMessage()
  await testStreamingMessage(convId)
  await testErrorMessage()
  return convId
}

export function getTestConversationId() {
  return testConversationId
}
