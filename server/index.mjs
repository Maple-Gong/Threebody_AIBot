import express from 'express'
import cors from 'cors'
import { initKnowledgeBase } from './tools/knowledgeSearch.mjs'
import { runReAct } from './reactEngine.mjs'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
initKnowledgeBase()

app.post('/api/react/chat', async (req, res) => {
  const { query, conversationId = '', user = 'react-user' } = req.body
  if (!query || !query.trim()) return res.status(400).json({ error: 'query is required' })
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })
  const s = (e, d) => { res.write('event: ' + e + '\n'); res.write('data: ' + JSON.stringify(d) + '\n\n') }
  try {
    await runReAct({
      query, conversationId, user,
      onStep: (st) => s('step', st),
      onAnswer: (ch) => s('answer', { text: ch.answer, conversationId: ch.conversation_id }),
      onAnswerEnd: (d) => s('answer_end', { conversationId: d.conversation_id }),
    })
    s('done', {})
  } catch (error) {
    s('error', { message: error.message })
  } finally {
    res.end()
  }
})

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.listen(PORT, () => console.log('ReAct server on ' + PORT))
