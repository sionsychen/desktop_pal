import WebSocket from 'ws'

const list = await fetch('http://localhost:9222/json/list').then((r) => r.json())
const page = list.find((p) => p.url.startsWith('http://localhost:5173/'))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
function call(method, params = {}) {
  const reqId = ++id
  return new Promise((r) => { pending.set(reqId, r); ws.send(JSON.stringify({ id: reqId, method, params })) })
}
await new Promise((r) => ws.once('open', r))
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
})
await call('Runtime.enable')

// 1. 找所有有 data-interactive 属性的元素
const r1 = await call('Runtime.evaluate', {
  expression: `
    JSON.stringify(Array.from(document.querySelectorAll('[data-interactive]')).map(el => {
      const b = el.getBoundingClientRect()
      return { tag: el.tagName, cls: (el.className||'').toString().slice(0, 80), x:b.x, y:b.y, w:b.width, h:b.height }
    }))
  `,
  returnByValue: true,
})
console.log('=== data-interactive ===')
console.log(JSON.stringify(r1, null, 2).slice(0, 2000))

// 2. ChatBubble 是否存在
const r2 = await call('Runtime.evaluate', {
  expression: `
    const root = document.getElementById('root')
    const tree = []
    function walk(el, depth) {
      if (depth > 6) return
      tree.push({d:depth, tag:el.tagName, cls:(el.className||'').toString().slice(0,40), text: el.textContent?.slice(0,30)})
      for (const c of el.children) walk(c, depth+1)
    }
    walk(root, 0)
    JSON.stringify(tree)
  `,
  returnByValue: true,
})
console.log('\n=== root tree ===')
JSON.parse(r2.result.value).forEach(n => console.log(' '.repeat(n.d*2) + n.tag + ' .' + n.cls + (n.text ? ' "' + n.text + '"' : '')))

// 3. window dimensions
const r3 = await call('Runtime.evaluate', {
  expression: 'JSON.stringify({iw:window.innerWidth,ih:window.innerHeight,ow:window.outerWidth,oh:window.outerHeight})',
  returnByValue: true,
})
console.log('\n=== window dims ===')
console.log(r3.result.value)

ws.close()
process.exit(0)
