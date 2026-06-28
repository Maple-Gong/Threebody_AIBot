/**
 * Dify API 服务层
 *
 * 通过 Vite proxy 代理请求到 https://api.dify.ai/v1
 * API Key 在代理层（服务端）注入，前端不暴露 API Key
 *
 * 前端请求路径：/api/dify/xxx -> 代理到 -> https://api.dify.ai/v1/xxx
 */

const API_BASE = '/api/dify'

// 用户标识：同一浏览器会话保持一致，用于会话隔离
const USER_ID = (() => {
  const stored = localStorage.getItem('dify_user_id')
  if (stored) return stored
  const id = 'web-user-' + Math.random().toString(36).slice(2, 10)
  localStorage.setItem('dify_user_id', id)
  return id
})()

export function getUserId() {
  return USER_ID
}

/**
 * 发送聊天消息（流式模式）
 *
 * @param {Object} params
 * @param {string} params.query - 用户消息
 * @param {string} params.conversationId - 会话ID（新对话传空字符串）
 * @param {function} [params.onMessage] - 收到消息块回调 (chunk) => void
 * @param {function} [params.onMessageEnd] - 消息结束回调 (data) => void
 * @param {function} [params.onError] - 错误回调 (error) => void
 * @param {AbortSignal} [params.signal] - 可选的 AbortSignal 用于取消请求
 * @returns {Promise<{conversationId: string, messageId: string}>}
 */
export async function sendChatMessageStream({ query, conversationId = '', onMessage, onMessageEnd, onError, signal }) {
  try {
    const response = await fetch(`${API_BASE}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: USER_ID,
      }),
      signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      let errMsg = `HTTP ${response.status}`
      try {
        const errJson = JSON.parse(errText)
        errMsg = errJson.message || errMsg
      } catch {
        errMsg = errText || errMsg
      }
      throw new Error(errMsg)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let resultConversationId = conversationId
    let resultMessageId = ''

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
          switch (data.event) {
            case 'message':
              resultConversationId = data.conversation_id || resultConversationId
              resultMessageId = data.message_id || resultMessageId
              onMessage?.(data)
              break
            case 'message_end':
              onMessageEnd?.(data)
              break
            case 'error':
              throw new Error(data.message || 'API 返回错误')
            case 'ping':
              break
            default:
              break
          }
        } catch (e) {
          if (e.message && e.message !== 'API 返回错误' && !e.message.includes('Unexpected')) {
            // 重新抛出业务错误
            if (e.message.includes('API') || e.message.includes('HTTP')) throw e
          }
        }
      }
    }

    return { conversationId: resultConversationId, messageId: resultMessageId }
  } catch (error) {
    if (error.name === 'AbortError') return { conversationId, messageId: '' }
    onError?.(error)
    throw error
  }
}

/**
 * 发送聊天消息（阻塞模式）
 */
export async function sendChatMessageBlocking(query, conversationId = '') {
  const response = await fetch(`${API_BASE}/chat-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: 'blocking',
      conversation_id: conversationId,
      user: USER_ID,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    let errMsg = `HTTP ${response.status}`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.message || errMsg
    } catch {}
    throw new Error(errMsg)
  }

  return await response.json()
}

/**
 * 获取会话列表
 *
 * @param {number} limit - 返回数量限制
 * @param {string|null} lastId - 分页用的最后一条ID
 * @returns {Promise<{data: Array, has_more: boolean, limit: number}>}
 */
export async function getConversations(limit = 20, lastId = null) {
  const params = new URLSearchParams({
    user: USER_ID,
    limit: String(limit),
  })
  if (lastId) params.append('last_id', lastId)

  const response = await fetch(`${API_BASE}/conversations?${params}`)

  if (!response.ok) {
    throw new Error(`获取会话列表失败: HTTP ${response.status}`)
  }

  return await response.json()
}

/**
 * 删除会话
 *
 * @param {string} conversationId - 会话ID
 * @returns {Promise<object>}
 */
export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: USER_ID }),
  })

  if (!response.ok) {
    throw new Error(`删除会话失败: HTTP ${response.status}`)
  }

  // 删除接口可能返回 204 No Content
  if (response.status === 204) {
    return { result: 'success' }
  }

  return await response.json()
}

/**
 * 重命名会话
 *
 * @param {string} conversationId - 会话ID
 * @param {string} name - 新名称
 * @returns {Promise<object>}
 */
export async function renameConversation(conversationId, name) {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, user: USER_ID }),
  })

  if (!response.ok) {
    throw new Error(`重命名会话失败: HTTP ${response.status}`)
  }

  return await response.json()
}

/**
 * 获取会话的消息历史
 *
 * @param {string} conversationId - 会话ID
 * @param {number} limit - 返回数量限制
 * @param {string|null} lastId - 分页用的最后一条ID
 * @returns {Promise<{data: Array, has_more: boolean, limit: number}>}
 */
export async function getMessages(conversationId, limit = 20, lastId = null) {
  const params = new URLSearchParams({
    user: USER_ID,
    conversation_id: conversationId,
    limit: String(limit),
  })
  if (lastId) params.append('last_id', lastId)

  const response = await fetch(`${API_BASE}/messages?${params}`)

  if (!response.ok) {
    throw new Error(`获取消息历史失败: HTTP ${response.status}`)
  }

  return await response.json()
}

/**
 * 停止消息生成
 *
 * @param {string} taskId - 任务ID（从流式响应的 message 事件中获取）
 * @returns {Promise<object>}
 */
export async function stopMessage(taskId) {
  const response = await fetch(`${API_BASE}/chat-messages/${taskId}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: USER_ID }),
  })

  if (!response.ok) {
    throw new Error(`停止消息失败: HTTP ${response.status}`)
  }

  return await response.json()
}

/**
 * 上传文件
 *
 * @param {File} file - 文件对象
 * @returns {Promise<{id: string, name: string, size: number, extension: string, mime_type: string}>}
 */
export async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user', USER_ID)

  const response = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`文件上传失败: HTTP ${response.status}`)
  }

  return await response.json()
}
