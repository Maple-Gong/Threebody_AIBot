/**
 * 测试配置：直接调用 Dify API（带 API Key）
 * 用于独立验证 API 连通性，不经过 Vite proxy
 */

export const DIFY_BASE_URL = 'https://api.dify.ai/v1'
export const DIFY_API_KEY = 'app-Q38z7nYCdwki8gfSI8F4gYW2'
export const TEST_USER = 'test-user-threebody-fixed'

let passed = 0
let failed = 0

export function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`)
    passed++
  } else {
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message}`)
    failed++
  }
}

export function logTest(name) {
  console.log(`\n========== 测试: ${name} ==========`)
}

export function printSummary() {
  console.log('\n========================================')
  const color = failed === 0 ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}测试结果: ${passed} 通过, ${failed} 失败\x1b[0m`)
  console.log('========================================')
  return failed === 0
}

export function getTestUser() {
  return TEST_USER
}
