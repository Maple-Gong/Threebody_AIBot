import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置：通过 proxy 代理 Dify API，在服务端注入 API Key，避免暴露到浏览器
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.DIFY_API_KEY || 'app-Q38z7nYCdwki8gfSI8F4gYW2'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        // ReAct 后端 API 代理
        '/api/react': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        // Dify API 代理
        '/api/dify': {
          target: 'https://api.dify.ai/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dify/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
            })
          },
        },
      },
    },
  }
})
