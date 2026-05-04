// 通过 CDP 注入测试,自检桌宠完整链路
import WebSocket from 'ws'

const debugUrl = 'http://localhost:9222/json/list'
const list = await fetch(debugUrl).then((r) => r.json())
const page = list.find((p) => p.url.startsWith('http://localhost:5173/'))
if (!page) {
  console.error('FAIL: renderer page not found')
  process.exit(1)
}
console.log('found renderer:', page.webSocketDebuggerUrl)

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const events = []

function call(method, params = {}) {
  const reqId = ++id
  return new Promise((resolve, reject) => {
    pending.set(reqId, { resolve, reject })
    ws.send(JSON.stringify({ id: reqId, method, params }))
  })
}

await new Promise((r) => ws.once('open', r))
console.log('connected')

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg.result)
    pending.delete(msg.id)
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const args = msg.params.args.map((a) => a.value ?? a.description ?? '?').join(' ')
    events.push(args)
  }
})

await call('Runtime.enable')
await call('Console.enable')

// Step 1: 检查 window.api 各部分
const apiCheck = await call('Runtime.evaluate', {
  expression: 'JSON.stringify({hasApi:!!window.api, chatKeys:Object.keys(window.api?.chat||{}), settingsKeys:Object.keys(window.api?.settings||{}), stageKeys:Object.keys(window.api?.stage||{})})',
  returnByValue: true,
})
console.log('\n=== API surface ===')
console.log(apiCheck.result.value)

// Step 2: 检查 settings
const settingsCheck = await call('Runtime.evaluate', {
  expression: 'window.api.settings.get().then(r => JSON.stringify(r))',
  awaitPromise: true,
  returnByValue: true,
})
console.log('\n=== Settings ===')
console.log(settingsCheck.result?.value || JSON.stringify(settingsCheck))

// Step 3: 设置 receiver, 发消息
await call('Runtime.evaluate', {
  expression: `
    window.__test_received = { delta: [], done: null, error: null }
    window.api.chat.onDelta((t) => { window.__test_received.delta.push(t); console.log('[TEST] delta:', t.slice(0,40)) })
    window.api.chat.onDone((t) => { window.__test_received.done = t; console.log('[TEST] DONE len:', t.length) })
    window.api.chat.onError((m) => { window.__test_received.error = m; console.log('[TEST] ERROR:', m) })
    console.log('[TEST] receivers attached, sending...')
    window.api.chat.send('你好,自检测试,简短回我一句就行')
  `,
})

console.log('\n=== Waiting 30s for response ===')
await new Promise((r) => setTimeout(r, 30000))

const result = await call('Runtime.evaluate', {
  expression: 'JSON.stringify(window.__test_received)',
  returnByValue: true,
})
console.log('\n=== Final state ===')
console.log(result.result.value)

console.log('\n=== Captured console events ===')
events.forEach((e) => console.log('  ' + e))

ws.close()
process.exit(0)
