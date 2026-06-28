# 三体问答 AI Bot

基于 Dify AI + ReAct 推理引擎的三体知识问答机器人，支持知识库检索与联网搜索。

## 功能特性

- **ReAct 推理引擎**：先查本地知识库 → 再查 Dify 知识库 → 最后联网搜索，逐级降级确保回答质量
- **本地知识库**：内置 10 条三体核心知识（SQLite 存储），关键词匹配检索
- **联网搜索**：Bing + DuckDuckGo + Wikipedia 三源并行搜索，覆盖面广
- **流式响应**：SSE 流式输出，打字机效果实时展示
- **会话管理**：多会话支持，会话列表、重命名、删除
- **Markdown 渲染**：支持代码块、列表、链接等格式
- **响应式设计**：适配桌面与移动端

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + Vite 5 |
| 后端 | Express + better-sqlite3 |
| AI | Dify API（流式 SSE） |
| 搜索 | Bing HTML + DuckDuckGo API + Wikipedia API |
| 知识库 | SQLite（本地） + Dify 知识库（云端） |

## 项目结构

```
dify_qa_threebody/
├── src/                        # 前端
│   ├── App.jsx                 # 主组件
│   ├── difyApi.js              # Dify API 客户端（会话管理/消息历史）
│   ├── reactApi.js             # ReAct API 客户端（SSE）
│   ├── components/
│   │   ├── Sidebar.jsx         # 侧边栏（会话列表）
│   │   ├── MessageList.jsx     # 消息列表
│   │   ├── ChatInput.jsx       # 输入框
│   │   └── Welcome.jsx         # 欢迎页
│   └── styles/index.css        # 全局样式
├── server/                     # 后端
│   ├── index.mjs               # Express 服务器（SSE 接口）
│   ├── reactEngine.mjs         # ReAct 推理引擎
│   ├── tools/
│   │   ├── knowledgeSearch.mjs # 知识库检索工具
│   │   └── webSearch.mjs       # 网络搜索工具
│   └── data/
│       └── knowledge.json      # 三体知识库数据
├── vite.config.js              # Vite 配置（含 API 代理）
└── package.json
```

## ReAct 工作流程

```
用户提问
  │
  ├─ 1. 查本地知识库 (SQLite)
  │     命中 → 将知识作为参考信息
  │
  ├─ 2. 发送给 Dify (Dify 自动查其知识库 RAG)
  │     检查 retriever_resources 判断是否命中
  │
  ├─ 本地或 Dify 知识库命中 → 返回答案
  │
  └─ 都未命中 → 3. 联网搜索 (Bing+DDG+Wikipedia)
                │
                └─ 用搜索结果增强 query → 重新调用 Dify → 返回答案
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 安装依赖
npm install

# 方式1：同时启动前后端
npm run dev:all

# 方式2：分开启动
npm run server    # 终端1：后端 (端口 3001)
npm run dev       # 终端2：前端 (端口 3000)
```

打开浏览器访问 http://localhost:3000

### 配置

Dify API Key 在 `vite.config.js` 和 `server/reactEngine.mjs` 中配置：

```js
// vite.config.js (前端代理 Dify API)
const apiKey = env.DIFY_API_KEY || 'your-api-key'

// server/reactEngine.mjs (后端调用 Dify)
const DIFY_API_KEY = process.env.DIFY_API_KEY || 'your-api-key'
```

## 知识库内容

本地知识库内置以下三体知识点：

- 三体问题
- 黑暗森林法则
- 面壁计划
- 智子
- 水滴
- 降维打击
- 云天明的童话
- 程心
- 三体游戏
- 地球三体组织 ETO

## API 接口

### ReAct 聊天（SSE 流式）

```
POST /api/react/chat
Body: { query, conversationId, user }

SSE 事件:
  - step        ReAct 推理步骤
  - answer      Dify 答案块（流式）
  - answer_end  答案结束
  - done        全部完成
  - error       错误
```

### Dify API（前端代理）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/dify/chat-messages` | POST | 发送消息 |
| `/api/dify/conversations` | GET | 会话列表 |
| `/api/dify/conversations/:id` | DELETE | 删除会话 |
| `/api/dify/conversations/:id/name` | POST | 重命名会话 |
| `/api/dify/messages` | GET | 消息历史 |

## License

