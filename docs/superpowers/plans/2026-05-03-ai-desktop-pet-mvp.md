# AI Desktop Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Windows 桌面 AI 桌宠 MVP:3D VRM 角色浮在桌面,可拖动 / 鼠标跟随 / idle 动画 / 点击聊天(LLM 流式回复气泡),支持 Anthropic + OpenAI-Compatible 两类 provider。

**Architecture:** Electron(主进程负责窗口、IPC、LLM 调用、凭据)+ React/Three.js(渲染进程负责 VRM 场景与 UI)。透明置顶窗口 + 鼠标穿透命中测试。LLM 通过 Vercel AI SDK 抽象,token 只在主进程内存。

**Tech Stack:** Electron + electron-vite + TypeScript + React 18 + Tailwind + Three.js + @pixiv/three-vrm + Vercel AI SDK(`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai-compatible`) + Vitest + electron-builder。

**Project Path:** `d:\_Personal\Desktop_Pal`

**Spec:** [`docs/superpowers/specs/2026-05-03-ai-desktop-pet-design.md`](../specs/2026-05-03-ai-desktop-pet-design.md)

---

## File Structure

```
src/
  main/
    index.ts                    入口,app 生命周期 + 创建窗口/托盘
    window.ts                   BrowserWindow 工厂 + 透明/置顶/穿透切换
    tray.ts                     系统托盘(退出/显示设置)
    ipc.ts                      IPC channel 注册总入口
    llm/
      types.ts                  ChatMessage / Settings / StreamEvent
      providerFactory.ts        根据 settings 构造 ai-sdk model
      chatSession.ts            历史 + system prompt + 滑动窗口
      chatService.ts            chat:send 处理器(orchestrate session+factory+IPC)
    settings/
      defaults.ts               默认 settings 与 system prompt
      store.ts                  settings.json 读写 + 环境变量预填
      credentials.ts            safeStorage 加密 token
  preload/
    index.ts                    contextBridge 暴露白名单 API
    api.d.ts                    window.api 类型声明
  renderer/
    main.tsx                    React 入口
    App.tsx                     根组件(挂场景 + UI 层)
    scene/
      VrmStage.ts               Three.js scene/camera/renderer + VRM 加载
      MouseLookAt.ts            头部 IK 跟随鼠标
      IdleController.ts         idle 状态机
      ExpressionController.ts   关键词→blendshape
      hitTest.ts                VRM bbox 像素命中
    chat/
      ChatBubble.tsx            流式气泡
      ChatInput.tsx             输入框
      useChatStream.ts          IPC chat:* hook
    app/
      DragController.ts         click vs drag 判定 + 窗口移动
      ContextMenu.tsx           右键菜单
      passthrough.ts            DOM + VRM 命中 → IPC 切穿透
    settings/
      SettingsPanel.tsx         provider 表单
  shared/
    channels.ts                 IPC channel 名常量
resources/
  default.vrm                   占位 VRM(Task 6 放入)
docs/
  superpowers/specs/...         spec(已存在)
  superpowers/plans/...         本文件
```

每个文件单一职责。主/渲染严格分进程;`shared/` 只放纯类型与常量。

---

## Task Sequence Overview

1. **Task 0:** 项目脚手架(electron-vite + TS + Tailwind + Vitest)
2. **Task 1:** 透明置顶窗口 + 托盘 + 基础 IPC 框架
3. **Task 2:** 鼠标穿透切换(passthrough + IPC)
4. **Task 3:** Settings 存储 + 环境变量预填 + 凭据加密
5. **Task 4:** LLM provider factory(Anthropic + OpenAI-Compatible)
6. **Task 5:** ChatSession(历史 + 滑动窗口 + system prompt)
7. **Task 6:** ChatService + chat:* IPC 链路(mock provider 集成测试)
8. **Task 7:** Three.js 透明场景 + VRM 加载
9. **Task 8:** MouseLookAt(头部 IK)
10. **Task 9:** IdleController(状态机 + 动画混合)
11. **Task 10:** DragController + 右键菜单(ContextMenu)
12. **Task 11:** ChatBubble + ChatInput + useChatStream
13. **Task 12:** ExpressionController + 关键词触发
14. **Task 13:** SettingsPanel UI
15. **Task 14:** End-to-end 手测清单 + electron-builder 打包

每个 Task 自带 TDD 五步 + commit。代码细节在 Task 内部展开(后续批次写入)。

---

## Task 0: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`
- Create: `src/shared/channels.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: 初始化 package.json**

```bash
cd d:/_Personal/Desktop_Pal
npm init -y
```

然后用以下内容覆盖 `package.json`:

```json
{
  "name": "desktop-pal",
  "version": "0.1.0",
  "description": "AI desktop pet with VRM character and LLM chat",
  "main": "out/main/index.js",
  "type": "module",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview",
    "dist": "electron-vite build && electron-builder",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json"
  },
  "keywords": [],
  "license": "MIT"
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm install --save \
  electron \
  react react-dom \
  three @pixiv/three-vrm @pixiv/three-vrm-animation \
  ai @ai-sdk/anthropic @ai-sdk/openai-compatible \
  zod
```

```bash
npm install --save-dev \
  typescript @types/node @types/react @types/react-dom @types/three \
  electron-vite vite @vitejs/plugin-react \
  electron-builder \
  vitest @vitest/ui \
  tailwindcss postcss autoprefixer
```

预期输出:`added N packages`,无 error。

- [ ] **Step 3: 创建 tsconfig.json**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"],
      "@preload/*": ["src/preload/*"]
    },
    "types": ["node", "vite/client"]
  },
  "include": ["src/renderer/**/*", "src/preload/**/*", "src/shared/**/*", "tests/**/*"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"],
      "@shared/*": ["src/shared/*"]
    },
    "types": ["node"]
  },
  "include": ["src/main/**/*", "src/shared/**/*", "electron.vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: 创建 electron-vite 配置**

`electron.vite.config.ts`:

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
      },
    },
  },
})
```

- [ ] **Step 5: 创建 Vitest 配置**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/shared'),
    },
  },
})
```

- [ ] **Step 6: Tailwind 配置**

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: { extend: {} },
  plugins: [],
}
```

`postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 7: 创建最小可启动的 main / preload / renderer**

`src/shared/channels.ts`:

```ts
export const Channels = {
  ChatSend: 'chat:send',
  ChatDelta: 'chat:delta',
  ChatDone: 'chat:done',
  ChatError: 'chat:error',
  ChatAbort: 'chat:abort',
  PassthroughSet: 'passthrough:set',
  WindowMove: 'window:move',
  WindowQuit: 'window:quit',
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsTest: 'settings:test',
} as const
export type ChannelName = (typeof Channels)[keyof typeof Channels]
```

`src/main/index.ts`(最小启动):

```ts
import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

app.commandLine.appendSwitch('force_high_performance_gpu')

async function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

`src/preload/index.ts`(占位,Task 1 扩展):

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
})
```

`src/renderer/index.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Desktop_Pal</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body class="bg-transparent">
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/renderer/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  overflow: hidden;
}
```

`src/renderer/main.tsx`:

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

`src/renderer/App.tsx`:

```tsx
export default function App() {
  return <div className="text-white p-4">Desktop_Pal scaffold OK</div>
}
```

- [ ] **Step 8: 写一个 smoke 测试,确保 Vitest 可跑**

`tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Channels } from '../src/shared/channels'

describe('smoke', () => {
  it('channels constants are defined', () => {
    expect(Channels.ChatSend).toBe('chat:send')
    expect(Object.keys(Channels).length).toBeGreaterThan(5)
  })
})
```

- [ ] **Step 9: 跑测试 + typecheck**

```bash
npm test
```

Expected: `1 passed`。

```bash
npm run typecheck
```

Expected: 无 error。

- [ ] **Step 10: 跑 dev 验证窗口能起**

```bash
npm run dev
```

Expected: Electron 窗口弹出,显示白底文字 "Desktop_Pal scaffold OK"。手动关闭窗口。

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "chore: scaffold electron + react + three + vitest"
```

---

## Task 1: 透明置顶窗口 + 托盘 + IPC 基础框架

**Files:**
- Modify: `src/main/index.ts`
- Create: `src/main/window.ts`
- Create: `src/main/tray.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`
- Create: `src/preload/api.d.ts`
- Modify: `src/renderer/App.tsx`
- Create: `tests/window-config.test.ts`

- [ ] **Step 1: 写 window 配置的失败测试**

`tests/window-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildWindowOptions } from '../src/main/window'

describe('buildWindowOptions', () => {
  it('returns transparent always-on-top frameless config', () => {
    const opts = buildWindowOptions('/path/to/preload.js')
    expect(opts.transparent).toBe(true)
    expect(opts.frame).toBe(false)
    expect(opts.alwaysOnTop).toBe(true)
    expect(opts.skipTaskbar).toBe(true)
    expect(opts.hasShadow).toBe(false)
    expect(opts.resizable).toBe(false)
    expect(opts.webPreferences?.contextIsolation).toBe(true)
    expect(opts.webPreferences?.nodeIntegration).toBe(false)
    expect(opts.webPreferences?.preload).toBe('/path/to/preload.js')
  })

  it('uses 400x600 default size', () => {
    const opts = buildWindowOptions('/p')
    expect(opts.width).toBe(400)
    expect(opts.height).toBe(600)
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- window-config
```

Expected: FAIL `Cannot find module '../src/main/window'`。

- [ ] **Step 3: 实现 window.ts**

`src/main/window.ts`:

```ts
import { BrowserWindow, screen } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'

export function buildWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 400,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }
}

export function createPetWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow(buildWindowOptions(preloadPath))
  win.setAlwaysOnTop(true, 'screen-saver')
  // 默认右下角
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  win.setPosition(width - 420, height - 620)
  return win
}

export function moveWindowBy(win: BrowserWindow, dx: number, dy: number): void {
  const [x, y] = win.getPosition()
  win.setPosition(Math.round(x + dx), Math.round(y + dy))
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- window-config
```

Expected: PASS。

- [ ] **Step 5: 实现 tray.ts**

`src/main/tray.ts`:

```ts
import { Tray, Menu, nativeImage, app } from 'electron'
import type { BrowserWindow } from 'electron'

export function createTray(win: BrowserWindow): Tray {
  // MVP: 用空透明 16x16 图标占位,后续放真图标
  const icon = nativeImage.createEmpty()
  const tray = new Tray(icon)
  const menu = Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setToolTip('Desktop_Pal')
  tray.setContextMenu(menu)
  return tray
}
```

> 注: `nativeImage.createEmpty()` 在某些 Windows 版本会让托盘图标看不见。后续 Task 14 替换成 `resources/tray.png`(16x16 PNG)。

- [ ] **Step 6: 实现 ipc.ts(注册 quit / move 两个最简通道)**

`src/main/ipc.ts`:

```ts
import { ipcMain, app, type BrowserWindow } from 'electron'
import { Channels } from '@shared/channels'
import { moveWindowBy } from './window'

export function registerIpc(win: BrowserWindow): void {
  ipcMain.on(Channels.WindowQuit, () => app.quit())

  ipcMain.on(Channels.WindowMove, (_e, payload: { dx: number; dy: number }) => {
    moveWindowBy(win, payload.dx, payload.dy)
  })
}
```

- [ ] **Step 7: 重写 main/index.ts 串起来**

`src/main/index.ts`:

```ts
import { app } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createPetWindow } from './window'
import { createTray } from './tray'
import { registerIpc } from './ipc'

const __dirname = dirname(fileURLToPath(import.meta.url))

app.commandLine.appendSwitch('force_high_performance_gpu')

app.whenReady().then(async () => {
  const preload = join(__dirname, '../preload/index.js')
  const win = createPetWindow(preload)
  registerIpc(win)
  createTray(win)

  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 8: 扩展 preload 暴露 IPC API**

`src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { Channels } from '@shared/channels'

contextBridge.exposeInMainWorld('api', {
  window: {
    quit: () => ipcRenderer.send(Channels.WindowQuit),
    moveBy: (dx: number, dy: number) =>
      ipcRenderer.send(Channels.WindowMove, { dx, dy }),
  },
})
```

`src/preload/api.d.ts`:

```ts
export {}

declare global {
  interface Window {
    api: {
      window: {
        quit: () => void
        moveBy: (dx: number, dy: number) => void
      }
    }
  }
}
```

把 `api.d.ts` 加进 renderer 的 tsconfig 解析:在 `tsconfig.json` 的 `include` 里已包含 `src/preload/**/*`,无需改。

- [ ] **Step 9: 渲染端临时 UI 验证**

`src/renderer/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="bg-black/60 text-white p-4 rounded-xl pointer-events-auto select-none">
        <p>Desktop_Pal transparent window</p>
        <button
          className="mt-2 px-3 py-1 bg-red-500 rounded"
          onClick={() => window.api.window.quit()}
        >
          Quit
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: 跑测试 + typecheck**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS,无 error。

- [ ] **Step 11: 手动验证窗口外观**

```bash
npm run dev
```

Expected: 一个右下角的小窗,**背景透明**,中间有半透明黑底文字 "Desktop_Pal transparent window" + Quit 按钮。点 Quit 退出。系统托盘有图标(可能不可见,正常),右键有 Show/Hide/Quit。

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: transparent always-on-top window + tray + ipc skeleton"
```

---

## Task 2: 鼠标穿透切换

**Files:**
- Modify: `src/main/window.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/api.d.ts`
- Create: `src/renderer/app/passthrough.ts`
- Modify: `src/renderer/App.tsx`
- Create: `tests/passthrough.test.ts`

> 思路:窗口默认开穿透;DOM 上需要交互的元素(气泡/按钮)加 `data-interactive="true"` 标记。每 100ms 渲染端用 `document.elementFromPoint` 命中测试,状态变化时才 IPC 通知主进程切。VRM 命中在 Task 8 之后接入,本任务先做 DOM 部分。

- [ ] **Step 1: 写命中测试函数的失败测试**

`tests/passthrough.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { isInteractiveAtPoint } from '../src/renderer/app/passthrough'

describe('isInteractiveAtPoint', () => {
  beforeEach(() => {
    const dom = new JSDOM(`<html><body>
      <div id="bg" style="width:100px;height:100px"></div>
      <button id="btn" data-interactive="true" style="position:absolute;left:10px;top:10px;width:20px;height:20px"></button>
    </body></html>`)
    ;(globalThis as any).document = dom.window.document
  })

  it('returns true when point hits an interactive element', () => {
    expect(isInteractiveAtPoint(15, 15)).toBe(true)
  })

  it('returns false when point hits a non-interactive element', () => {
    expect(isInteractiveAtPoint(80, 80)).toBe(false)
  })

  it('returns true when ancestor is interactive', () => {
    document.body.innerHTML = `
      <div data-interactive="true" style="width:100px;height:100px">
        <span id="inner" style="display:block;width:50px;height:50px"></span>
      </div>`
    expect(isInteractiveAtPoint(10, 10)).toBe(true)
  })
})
```

需要装 jsdom:

```bash
npm install --save-dev jsdom @types/jsdom
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- passthrough
```

Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 passthrough.ts**

`src/renderer/app/passthrough.ts`:

```ts
export function isInteractiveAtPoint(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y)
  if (!el) return false
  return el.closest('[data-interactive="true"]') !== null
}

export type PassthroughCallback = (interactive: boolean) => void

export function startPassthroughLoop(cb: PassthroughCallback, intervalMs = 100): () => void {
  let lastInteractive = false
  let mouseX = 0
  let mouseY = 0

  const onMove = (e: MouseEvent) => {
    mouseX = e.clientX
    mouseY = e.clientY
  }
  window.addEventListener('mousemove', onMove)

  const timer = setInterval(() => {
    const interactive = isInteractiveAtPoint(mouseX, mouseY)
    if (interactive !== lastInteractive) {
      lastInteractive = interactive
      cb(interactive)
    }
  }, intervalMs)

  return () => {
    clearInterval(timer)
    window.removeEventListener('mousemove', onMove)
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- passthrough
```

Expected: PASS,3 个用例。

- [ ] **Step 5: 主进程暴露 setIgnoreMouseEvents 控制**

修改 `src/main/ipc.ts`:

```ts
import { ipcMain, app, type BrowserWindow } from 'electron'
import { Channels } from '@shared/channels'
import { moveWindowBy } from './window'

export function registerIpc(win: BrowserWindow): void {
  ipcMain.on(Channels.WindowQuit, () => app.quit())

  ipcMain.on(Channels.WindowMove, (_e, payload: { dx: number; dy: number }) => {
    moveWindowBy(win, payload.dx, payload.dy)
  })

  ipcMain.on(Channels.PassthroughSet, (_e, interactive: boolean) => {
    win.setIgnoreMouseEvents(!interactive, { forward: true })
  })
}
```

main/index.ts 启动时默认开穿透:在 `registerIpc(win)` 之后加一行:

```ts
win.setIgnoreMouseEvents(true, { forward: true })
```

- [ ] **Step 6: preload 暴露 API**

修改 `src/preload/index.ts`,在 `window` 对象同级加:

```ts
contextBridge.exposeInMainWorld('api', {
  window: {
    quit: () => ipcRenderer.send(Channels.WindowQuit),
    moveBy: (dx: number, dy: number) =>
      ipcRenderer.send(Channels.WindowMove, { dx, dy }),
    setPassthrough: (interactive: boolean) =>
      ipcRenderer.send(Channels.PassthroughSet, interactive),
  },
})
```

修改 `src/preload/api.d.ts`:

```ts
export {}

declare global {
  interface Window {
    api: {
      window: {
        quit: () => void
        moveBy: (dx: number, dy: number) => void
        setPassthrough: (interactive: boolean) => void
      }
    }
  }
}
```

- [ ] **Step 7: 渲染端启动循环 + 验证 UI**

修改 `src/renderer/App.tsx`:

```tsx
import { useEffect } from 'react'
import { startPassthroughLoop } from './app/passthrough'

export default function App() {
  useEffect(() => {
    return startPassthroughLoop((interactive) => {
      window.api.window.setPassthrough(interactive)
    })
  }, [])

  return (
    <div className="w-screen h-screen relative">
      <div
        data-interactive="true"
        className="absolute bottom-4 right-4 bg-black/70 text-white p-4 rounded-xl select-none"
      >
        <p>Hover me — clicks work here</p>
        <button
          className="mt-2 px-3 py-1 bg-red-500 rounded"
          onClick={() => window.api.window.quit()}
        >
          Quit
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: 跑测试 + typecheck**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 9: 手动验证穿透**

```bash
npm run dev
```

Expected:
- 在窗口空白区域点击,点击穿透到下方桌面 / 其他窗口(可以选中桌面图标)
- 鼠标移到右下角黑色面板上,可正常点 Quit 按钮
- 把鼠标在面板内/外快速移动几次,无明显卡顿

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: mouse passthrough toggling via DOM hit-test"
```

---

> **后续 Task(3-14)将在下一批写入。** 当前批次:Task 0 + Task 1 + Task 2,覆盖项目脚手架、透明窗口、托盘、IPC 框架、鼠标穿透。
>
> 下一批计划包含:Task 3 Settings 存储 + 凭据加密 / Task 4 LLM provider factory / Task 5 ChatSession。
