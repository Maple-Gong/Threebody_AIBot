// MCP Tool 2: Web Search - 多源搜索（Bing HTML + DuckDuckGo + Wikipedia）

async function searchBing(query) {
  try {
    const url = 'https://www.bing.com/search?q=' + encodeURIComponent(query) + '&setlang=zh-CN'
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    })
    if (!resp.ok) return []
    const html = await resp.text()
    const results = []
    const algoRegex = /<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g
    let match
    let count = 0
    while ((match = algoRegex.exec(html)) !== null && count < 5) {
      const linkUrl = match[1]
      const title = match[2].replace(/<[^>]+>/g, '').trim()
      const snippet = match[3].replace(/<[^>]+>/g, '').trim()
      if (title && snippet) {
        results.push({ title, content: snippet, url: linkUrl, source: 'Bing' })
        count++
      }
    }
    return results
  } catch (e) {
    console.error('[WebSearch] Bing failed:', e.message)
    return []
  }
}

async function searchDuckDuckGo(query) {
  try {
    const ddgUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1'
    const ddgResp = await fetch(ddgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!ddgResp.ok) return []
    const ddgData = await ddgResp.json()
    const results = []
    if (ddgData.AbstractText) {
      results.push({ title: ddgData.Heading || query, content: ddgData.AbstractText, url: ddgData.AbstractURL || '', source: 'DuckDuckGo' })
    }
    if (ddgData.RelatedTopics) {
      for (const topic of ddgData.RelatedTopics.slice(0, 3)) {
        if (topic.Text) {
          results.push({ title: topic.Text.slice(0, 50), content: topic.Text, url: topic.FirstURL || '', source: 'DuckDuckGo' })
        } else if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics.slice(0, 2)) {
            if (sub.Text) {
              results.push({ title: sub.Text.slice(0, 50), content: sub.Text, url: sub.FirstURL || '', source: 'DuckDuckGo' })
            }
          }
        }
      }
    }
    return results
  } catch (e) {
    console.error('[WebSearch] DDG failed:', e.message)
    return []
  }
}

async function searchWikipedia(query) {
  try {
    const wikiUrl = 'https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&format=json&srlimit=3'
    const wikiResp = await fetch(wikiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!wikiResp.ok) return []
    const wikiData = await wikiResp.json()
    const results = []
    if (wikiData.query && wikiData.query.search) {
      for (const item of wikiData.query.search) {
        const snippet = item.snippet.replace(/<[^>]+>/g, '')
        results.push({ title: item.title, content: snippet, url: 'https://zh.wikipedia.org/wiki/' + encodeURIComponent(item.title), source: 'Wikipedia' })
      }
    }
    return results
  } catch (e) {
    console.error('[WebSearch] Wiki failed:', e.message)
    return []
  }
}

export async function searchWeb(query) {
  try {
    // 并行搜索多个源
    const [bingResults, ddgResults, wikiResults] = await Promise.all([
      searchBing(query),
      searchDuckDuckGo(query),
      searchWikipedia(query),
    ])
    // 合并结果
    const allResults = [...bingResults, ...ddgResults, ...wikiResults]
    if (allResults.length === 0) {
      return { found: false, results: [], summary: '网络搜索未找到相关结果' }
    }
    const top = allResults.slice(0, 5)
    const summary = top.map(r => '[' + r.title + '] ' + r.content).join('\n\n')
    return { found: true, results: top, summary }
  } catch (error) {
    console.error('[WebSearch] failed:', error.message)
    return { found: false, results: [], summary: '网络搜索失败: ' + error.message }
  }
}

export const webSearchTool = { name: 'web_search', description: '在互联网上搜索信息', execute: searchWeb }
