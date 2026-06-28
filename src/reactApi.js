// ReAct API 客户端 - 通过SSE与后端ReAct引擎通信
const REACT_API = '/api/react/chat'

/**
 * 发送消息并执行ReAct推理循环
 * @param {Object} params
 * @param {string} params.query - 用户问题
 * @param {string} params.conversationId - 会话ID
 * @param {function} params.onStep - ReAct步骤回调
 * @param {function} params.onAnswer - 答案流式回调
 * @param {function} params.onAnswerEnd - 答案结束回调
 * @param {function} params.onDone - 全部完成回调
 * @param {function} params.onError - 错误回调
 * @param {AbortSignal} params.signal - 取消信号
 */
export async function sendReActMessage({ query, conversationId = '', onStep, onAnswer, onAnswerEnd, onDone, onError, signal }) {
  try {
    const response = await fetch(REACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversationId, user: getUserId() }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`ReAct API错误: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = ''
    let finalConvId = conversationId

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          try {
            const data = JSON.parse(dataStr)
            switch (currentEvent) {
              case 'step':
                onStep?.(data)
                break
              case 'answer':
                if (data.conversationId) finalConvId = data.conversationId
                onAnswer?.(data.text || '')
                break
              case 'answer_end':
                if (data.conversationId) finalConvId = data.conversationId
                onAnswerEnd?.(data)
                break
              case 'done':
                onDone?.()
                break
              case 'error':
                throw new Error(data.message || '未知错误')
            }
          } catch (e) {
            if (e.message && !e.message.includes('Unexpected')) throw e
          }
        }
      }
    }

    return { conversationId: finalConvId }
  } catch (error) {
    if (error.name === 'AbortError') return { conversationId, aborted: true }
    onError?.(error)
    throw error
  }
}

function getUserId() {
  const stored = localStorage.getItem('dify_user_id')
  if (stored) return stored
  const id = 'web-user-' + Math.random().toString(36).slice(2, 10)
  localStorage.setItem('dify_user_id', id)
  return id
}
