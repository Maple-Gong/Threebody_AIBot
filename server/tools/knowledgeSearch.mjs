// MCP Tool 1: Knowledge Base Search - init
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'data', 'knowledge.db')
const JSON_PATH = join(__dirname, '..', 'data', 'knowledge.json')
let db = null
export function initKnowledgeBase() {
  db = new Database(DB_PATH)
  db.exec('CREATE TABLE IF NOT EXISTS knowledge (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, keywords TEXT NOT NULL, content TEXT NOT NULL)')
  const count = db.prepare('SELECT COUNT(*) as c FROM knowledge').get()
  if (count.c === 0) {
    const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))
    const insert = db.prepare('INSERT INTO knowledge (title, keywords, content) VALUES (?, ?, ?)')
    const tx = db.transaction((items) => { for (const item of items) insert.run(item.title, item.keywords, item.content) })
    tx(data)
  }
  return db
}

/**
 * 在知识库中搜索
 * 使用关键词匹配 + LIKE 模糊搜索
 * @param {string} query - 搜索查询
 * @returns {{found: boolean, results: Array, summary: string}}
 */
export function searchKnowledge(query) {
  if (!db) initKnowledgeBase()

  // 提取查询中的关键词（简单分词）
  const words = query.replace(/[？?，,。.！!、]/g, ' ').replace(/的|了|吗|呢|吧|是|有|什么|如何|解释|一下|介绍/g, ' ').trim().split(/\s+/).filter(w => w.length > 0)

  // 构建 SQL：在 title 和 keywords 中搜索匹配
  const results = []
  const seen = new Set()

  for (const word of words) {
    const rows = db.prepare(
      `SELECT * FROM knowledge WHERE title LIKE ? OR keywords LIKE ? OR content LIKE ?`
    ).all(`%${word}%`, `%${word}%`, `%${word}%`)

    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        // 计算匹配分数
        let score = 0
        for (const w of words) {
          if (row.title.includes(w)) score += 3
          if (row.keywords.includes(w)) score += 2
          if (row.content.includes(w)) score += 1
        }
        results.push({ ...row, score })
      }
    }
  }

  // 按匹配分数排序
  results.sort((a, b) => b.score - a.score)

  if (results.length === 0) {
    return { found: false, results: [], summary: '知识库中未找到相关内容' }
  }

  // 取前3条结果
  const top = results.slice(0, 3)
  const summary = top.map(r => `【${r.title}】${r.content}`).join('\n\n')

  return { found: true, results: top, summary }
}

/**
 * MCP工具定义
 */
export const knowledgeSearchTool = {
  name: 'knowledge_search',
  description: '在三体知识库中搜索相关知识。当用户询问三体相关问题时，优先使用此工具查找答案。',
  execute: searchKnowledge,
}

