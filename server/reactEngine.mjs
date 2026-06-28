// ReAct Engine v2 - 优先使用 Dify 知识库 + 本地知识库，最后网络搜索
// 流程:
//   1. 查本地知识库 (SQLite)
//   2. 发送原始query给Dify (Dify自动查其知识库RAG)
//   3. 检查Dify的retriever_resources判断知识库是否命中
//   4. 如果本地+Dify知识库都没命中 → 上网搜索 → 用增强query重新调用Dify

import { searchKnowledge } from './tools/knowledgeSearch.mjs'
import { searchWeb } from './tools/webSearch.mjs'

const DIFY_BASE_URL = 'https://api.dify.ai/v1'
const DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-Q38z7nYCdwki8gfSI8F4gYW2'

/**
 * 调用Dify chat-messages API (流式)
 * @param {string} query - 发给Dify的query
 * @param {string} conversationId - 会话ID
 * @param {string} user - 用户标识
 * @param {function} onAnswer - 答案块回调
 * @param {function} onAnswerEnd - 结束回调 (返回message_end的data，含retriever_resources)
 * @param {AbortSignal} signal
 * @returns {Promise<{conversationId: string, retrieverResources: Array}>}
 */
async function callDify(query, conversationId, user, onAnswer, onAnswerEnd, signal) {
  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: 'streaming',
      conversation_id: conversationId,
      user,
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Dify API 错误: ${response.status} ${errText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalConvId = conversationId
  let retrieverResources = []

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
          finalConvId = data.conversation_id || finalConvId
          onAnswer?.(data)
        } else if (data.event === 'message_end') {
          // 提取 Dify 知识库检索结果 (retriever_resources)
          if (data.metadata && data.metadata.retriever_resources) {
            retrieverResources = data.metadata.retriever_resources
          }
          onAnswerEnd?.(data)
        }
      } catch (e) {}
    }
  }

  return { conversationId: finalConvId, retrieverResources }
}

/**
 * 运行 ReAct 推理循环
 *
 * 新流程（确保使用 Dify 知识库）：
 *   1. Thought: 先查本地知识库
 *   2. Action: knowledge_search (本地SQLite)
 *   3. Observation: 本地知识库结果
 *   4. Action: dify_chat (发送原始query，Dify自动查其知识库)
 *   5. Observation: Dify回答 + retriever_resources (Dify知识库命中情况)
 *   6. 如果本地知识库命中 OR Dify知识库命中 → 完成
 *      如果都没命中 → 上网搜索 → 用增强query重新调用Dify
 */
export async function runReAct({ query, conversationId = '', user, onStep, onAnswer, onAnswerEnd, signal }) {
  const steps = []
  let finalConvId = conversationId

  const emit = (step) => { steps.push(step); onStep?.(step) }

  // ===== Step 1: 查本地知识库 =====
  emit({ type: 'thought', content: `用户问了"${query}"，先在本地知识库中查找。` })
  emit({ type: 'action', tool: 'knowledge_search', input: query })

  const kbResult = searchKnowledge(query)

  emit({
    type: 'observation',
    tool: 'knowledge_search',
    found: kbResult.found,
    content: kbResult.found
      ? `本地知识库找到 ${kbResult.results.length} 条相关知识：\n${kbResult.summary}`
      : '本地知识库未找到相关内容',
  })

  // ===== Step 2: 发送原始query给Dify (Dify自动查其知识库) =====
  emit({
    type: 'thought',
    content: kbResult.found
      ? '本地知识库有结果，将其作为参考信息，同时发送给Dify让其也查自身知识库。'
      : '本地知识库未找到，发送原始问题给Dify，让Dify用其知识库检索。',
  })
  emit({ type: 'action', tool: 'dify_knowledge_search', input: query })

  // 如果本地知识库有结果，用增强query；否则用原始query（不干扰Dify知识库检索）
  const difyQuery = kbResult.found
    ? `${query}\n\n[本地知识库参考信息]\n${kbResult.summary}`
    : query

  let difyResult
  try {
    difyResult = await callDify(difyQuery, conversationId, user, onAnswer, onAnswerEnd, signal)
    finalConvId = difyResult.conversationId
  } catch (e) {
    if (e.name === 'AbortError') return { steps, conversationId: finalConvId }
    throw e
  }

  // ===== Step 3: 检查Dify知识库命中情况 =====
  const difyKbHit = difyResult.retrieverResources && difyResult.retrieverResources.length > 0

  emit({
    type: 'observation',
    tool: 'dify_knowledge_search',
    found: difyKbHit,
    content: difyKbHit
      ? `Dify知识库命中 ${difyResult.retrieverResources.length} 条：\n${difyResult.retrieverResources.map(r => `  - ${r.content?.slice(0, 80) || r.title || '未知'}`).join('\n')}`
      : 'Dify知识库未命中（retriever_resources为空）',
  })

  // ===== Step 4: 判断是否需要网络搜索 =====
  if (kbResult.found || difyKbHit) {
    // 本地知识库或Dify知识库至少一个命中 → 完成
    emit({
      type: 'thought',
      content: kbResult.found && difyKbHit
        ? '本地知识库和Dify知识库都有结果，回答已完成。'
        : kbResult.found
          ? '本地知识库有结果，回答已完成。'
          : 'Dify知识库有结果，回答已完成。',
    })
    return { steps, conversationId: finalConvId }
  }

  // ===== Step 5: 本地和Dify知识库都没命中 → 上网搜索 =====
  emit({ type: 'thought', content: '本地知识库和Dify知识库都没找到，需要上网搜索。' })
  emit({ type: 'action', tool: 'web_search', input: query })

  const webResult = await searchWeb(query)

  emit({
    type: 'observation',
    tool: 'web_search',
    found: webResult.found,
    content: webResult.found
      ? `网络搜索找到 ${webResult.results.length} 条结果：\n${webResult.summary}`
      : '网络搜索也未找到相关结果',
  })

  // ===== Step 6: 用网络搜索结果增强query，重新调用Dify =====
  if (webResult.found) {
    emit({ type: 'thought', content: '将网络搜索结果作为参考信息，重新调用Dify生成回答。' })
    emit({ type: 'action', tool: 'dify_chat_enhanced', input: `${query} + [网络搜索参考]` })

    const enhancedQuery = `${query}\n\n[网络搜索参考信息]\n${webResult.summary}`

    try {
      const result2 = await callDify(enhancedQuery, finalConvId, user, onAnswer, onAnswerEnd, signal)
      finalConvId = result2.conversationId
    } catch (e) {
      if (e.name === 'AbortError') return { steps, conversationId: finalConvId }
      throw e
    }
  } else {
    emit({ type: 'thought', content: '所有来源都没找到，使用Dify自身知识回答。' })
  }

  return { steps, conversationId: finalConvId }
}
