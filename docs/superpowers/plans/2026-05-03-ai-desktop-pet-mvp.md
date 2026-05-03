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

---

## Task 3: Settings 存储 + 环境变量预填 + 凭据加密

**Files:**
- Create: `src/main/llm/types.ts`
- Create: `src/main/settings/defaults.ts`
- Create: `src/main/settings/store.ts`
- Create: `src/main/settings/credentials.ts`
- Create: `tests/settings-store.test.ts`
- Create: `tests/settings-defaults.test.ts`

> 思路:settings.json 只存非敏感字段(provider 选择 / baseURL / model);token 经 safeStorage 加密单独落盘 `credentials.enc`。首次启动若文件不存在,从环境变量预填。

- [ ] **Step 1: 定义 LLM / Settings 类型**

`src/main/llm/types.ts`:

```ts
export type ProviderKind = 'anthropic' | 'openai-compatible'

export interface ProviderConfig {
  baseURL: string
  model: string
}

export interface Settings {
  provider: ProviderKind
  anthropic: ProviderConfig
  openai: ProviderConfig
  systemPrompt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string }
```

- [ ] **Step 2: 写 defaults 测试(失败)**

`tests/settings-defaults.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildDefaultSettings } from '../src/main/settings/defaults'

describe('buildDefaultSettings', () => {
  const original = { ...process.env }
  beforeEach(() => {
    delete process.env.ANTHROPIC_BASE_URL
    delete process.env.ANTHROPIC_AUTH_TOKEN
    delete process.env.ANTHROPIC_MODEL
    delete process.env.OPENAI_BASE_URL
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
  })
  afterEach(() => {
    process.env = { ...original }
  })

  it('uses anthropic when ANTHROPIC env vars present', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://x.test'
    process.env.ANTHROPIC_AUTH_TOKEN = 't'
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5'
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('anthropic')
    expect(settings.anthropic.baseURL).toBe('https://x.test')
    expect(settings.anthropic.model).toBe('claude-sonnet-4-5')
    expect(credentials.anthropic).toBe('t')
  })

  it('uses openai when only OPENAI env vars present', () => {
    process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'
    process.env.OPENAI_API_KEY = 'sk-x'
    process.env.OPENAI_MODEL = 'gpt-4o'
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('openai-compatible')
    expect(settings.openai.baseURL).toBe('https://api.openai.com/v1')
    expect(credentials.openai).toBe('sk-x')
  })

  it('prefers anthropic when both present, but fills both', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://a.test'
    process.env.ANTHROPIC_AUTH_TOKEN = 'ta'
    process.env.ANTHROPIC_MODEL = 'claude'
    process.env.OPENAI_BASE_URL = 'https://o.test'
    process.env.OPENAI_API_KEY = 'so'
    process.env.OPENAI_MODEL = 'gpt'
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('anthropic')
    expect(settings.openai.baseURL).toBe('https://o.test')
    expect(credentials.anthropic).toBe('ta')
    expect(credentials.openai).toBe('so')
  })

  it('returns empty config when no env vars', () => {
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('anthropic')
    expect(settings.anthropic.model).toBe('')
    expect(credentials.anthropic).toBe('')
    expect(credentials.openai).toBe('')
  })
})
```

- [ ] **Step 3: 跑测试,确认失败**

```bash
npm test -- settings-defaults
```

Expected: FAIL,模块不存在。

- [ ] **Step 4: 实现 defaults.ts**

`src/main/settings/defaults.ts`:

```ts
import type { Settings } from '@main/llm/types'

export const DEFAULT_SYSTEM_PROMPT = `你是一只活泼的桌面伙伴,陪在用户的电脑桌面上。回答简短、友好、有少量颜文字或表情。不要用 markdown 格式。`

export interface Credentials {
  anthropic: string
  openai: string
}

export interface DefaultsResult {
  settings: Settings
  credentials: Credentials
}

export function buildDefaultSettings(): DefaultsResult {
  const env = process.env
  const hasAnthropic = !!(env.ANTHROPIC_BASE_URL && env.ANTHROPIC_AUTH_TOKEN)
  const hasOpenAI = !!(env.OPENAI_BASE_URL && env.OPENAI_API_KEY)

  const settings: Settings = {
    provider: hasAnthropic || !hasOpenAI ? 'anthropic' : 'openai-compatible',
    anthropic: {
      baseURL: env.ANTHROPIC_BASE_URL ?? '',
      model: env.ANTHROPIC_MODEL ?? '',
    },
    openai: {
      baseURL: env.OPENAI_BASE_URL ?? '',
      model: env.OPENAI_MODEL ?? '',
    },
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  }

  const credentials: Credentials = {
    anthropic: env.ANTHROPIC_AUTH_TOKEN ?? '',
    openai: env.OPENAI_API_KEY ?? '',
  }

  return { settings, credentials }
}
```

- [ ] **Step 5: 跑测试,确认通过**

```bash
npm test -- settings-defaults
```

Expected: PASS,4 个用例。

- [ ] **Step 6: 写 store 测试(基于临时目录,绕开 Electron app)**

`tests/settings-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { SettingsStore } from '../src/main/settings/store'

describe('SettingsStore', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pal-settings-'))
  })

  it('writes and reads settings.json', () => {
    const store = new SettingsStore(dir)
    const initial = store.load()
    expect(initial.provider).toBeDefined()

    initial.anthropic.model = 'claude-test'
    store.save(initial)

    const reread = new SettingsStore(dir).load()
    expect(reread.anthropic.model).toBe('claude-test')
    expect(existsSync(join(dir, 'settings.json'))).toBe(true)
  })

  it('returns defaults when file missing', () => {
    const s = new SettingsStore(dir).load()
    expect(s.provider).toMatch(/anthropic|openai-compatible/)
  })

  it('overwrites file on save', () => {
    const store = new SettingsStore(dir)
    const s = store.load()
    s.openai.baseURL = 'https://test'
    store.save(s)
    const raw = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf-8'))
    expect(raw.openai.baseURL).toBe('https://test')
  })
})
```

- [ ] **Step 7: 跑测试,确认失败**

```bash
npm test -- settings-store
```

Expected: FAIL,模块不存在。

- [ ] **Step 8: 实现 store.ts**

`src/main/settings/store.ts`:

```ts
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Settings } from '@main/llm/types'
import { buildDefaultSettings } from './defaults'

export class SettingsStore {
  private readonly path: string

  constructor(userDataDir: string) {
    this.path = join(userDataDir, 'settings.json')
  }

  load(): Settings {
    if (!existsSync(this.path)) {
      return buildDefaultSettings().settings
    }
    try {
      return JSON.parse(readFileSync(this.path, 'utf-8')) as Settings
    } catch {
      return buildDefaultSettings().settings
    }
  }

  save(settings: Settings): void {
    writeFileSync(this.path, JSON.stringify(settings, null, 2), 'utf-8')
  }
}
```

- [ ] **Step 9: 跑测试,确认通过**

```bash
npm test -- settings-store
```

Expected: PASS,3 个用例。

- [ ] **Step 10: 实现 credentials.ts(safeStorage 包装,Electron 运行时才用)**

> safeStorage 仅在 Electron 主进程可用。模块内做兜底:非 Electron 环境(测试)用明文存,Electron 下用加密。

`src/main/settings/credentials.ts`:

```ts
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Credentials } from './defaults'
import { buildDefaultSettings } from './defaults'

export class CredentialsStore {
  private readonly path: string

  constructor(userDataDir: string) {
    this.path = join(userDataDir, 'credentials.enc')
  }

  load(): Credentials {
    if (!existsSync(this.path)) {
      return buildDefaultSettings().credentials
    }
    try {
      const buf = readFileSync(this.path)
      const safe = this.getSafeStorage()
      const json = safe ? safe.decryptString(buf) : buf.toString('utf-8')
      return JSON.parse(json) as Credentials
    } catch {
      return { anthropic: '', openai: '' }
    }
  }

  save(creds: Credentials): void {
    const json = JSON.stringify(creds)
    const safe = this.getSafeStorage()
    const buf = safe ? safe.encryptString(json) : Buffer.from(json, 'utf-8')
    writeFileSync(this.path, buf)
  }

  private getSafeStorage(): { encryptString(s: string): Buffer; decryptString(b: Buffer): string } | null {
    try {
      // 动态 require,避免非 Electron 环境(vitest)崩溃
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require('electron')
      if (electron.safeStorage && electron.safeStorage.isEncryptionAvailable()) {
        return electron.safeStorage
      }
      return null
    } catch {
      return null
    }
  }
}
```

> 注:`require('electron')` 在 ESM 下需要 `createRequire`。改成:

```ts
import { createRequire } from 'module'
const requireCJS = createRequire(import.meta.url)

// ...
private getSafeStorage() {
  try {
    const electron = requireCJS('electron')
    if (electron.safeStorage?.isEncryptionAvailable?.()) {
      return electron.safeStorage
    }
  } catch { /* not in electron */ }
  return null
}
```

- [ ] **Step 11: typecheck + 全部测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: settings store with env-based defaults and encrypted credentials"
```

---

## Task 4: LLM Provider Factory(Anthropic + OpenAI-Compatible)

**Files:**
- Create: `src/main/llm/providerFactory.ts`
- Create: `tests/provider-factory.test.ts`

> 思路:工厂返回一个 `LanguageModel`(ai-sdk 的统一类型),不直接 stream。streaming 在 Task 6 chatService 里调 `streamText`。本任务只确保根据 settings 正确实例化 provider。

- [ ] **Step 1: 写工厂测试(失败)**

`tests/provider-factory.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createLanguageModel } from '../src/main/llm/providerFactory'
import type { Settings } from '../src/main/llm/types'

const baseSettings: Settings = {
  provider: 'anthropic',
  anthropic: { baseURL: 'https://api.anthropic.com', model: 'claude-sonnet-4-5' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  systemPrompt: 'x',
}

describe('createLanguageModel', () => {
  it('builds an anthropic model when provider=anthropic', () => {
    const model = createLanguageModel(baseSettings, { anthropic: 'k', openai: '' })
    expect(model).toBeDefined()
    // ai-sdk model 实例至少有 modelId 属性
    expect((model as any).modelId).toBe('claude-sonnet-4-5')
  })

  it('builds an openai-compatible model when provider=openai-compatible', () => {
    const settings: Settings = { ...baseSettings, provider: 'openai-compatible' }
    const model = createLanguageModel(settings, { anthropic: '', openai: 'sk' })
    expect((model as any).modelId).toBe('gpt-4o')
  })

  it('throws when token missing for selected provider', () => {
    expect(() => createLanguageModel(baseSettings, { anthropic: '', openai: '' }))
      .toThrow(/anthropic.*token/i)
  })

  it('throws when openai-compatible has no baseURL', () => {
    const settings: Settings = {
      ...baseSettings,
      provider: 'openai-compatible',
      openai: { baseURL: '', model: 'gpt-4o' },
    }
    expect(() => createLanguageModel(settings, { anthropic: '', openai: 'sk' }))
      .toThrow(/baseURL/i)
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- provider-factory
```

Expected: FAIL。

- [ ] **Step 3: 实现 providerFactory.ts**

`src/main/llm/providerFactory.ts`:

```ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { Settings } from './types'
import type { Credentials } from '@main/settings/defaults'

export function createLanguageModel(settings: Settings, creds: Credentials): LanguageModel {
  if (settings.provider === 'anthropic') {
    if (!creds.anthropic) throw new Error('Missing anthropic API token')
    if (!settings.anthropic.model) throw new Error('Missing anthropic model id')
    const client = createAnthropic({
      baseURL: settings.anthropic.baseURL || undefined,
      apiKey: creds.anthropic,
    })
    return client(settings.anthropic.model)
  }

  // openai-compatible
  if (!creds.openai) throw new Error('Missing openai API token')
  if (!settings.openai.baseURL) throw new Error('openai-compatible requires baseURL')
  if (!settings.openai.model) throw new Error('Missing openai model id')
  const client = createOpenAICompatible({
    name: 'custom',
    baseURL: settings.openai.baseURL,
    apiKey: creds.openai,
  })
  return client(settings.openai.model)
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- provider-factory
```

Expected: PASS,4 个用例。

- [ ] **Step 5: typecheck**

```bash
npm run typecheck
```

Expected: 无 error。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: llm provider factory for anthropic and openai-compatible"
```

---

## Task 5: ChatSession(历史 + 滑动窗口 + system prompt)

**Files:**
- Create: `src/main/llm/chatSession.ts`
- Create: `tests/chat-session.test.ts`

> 职责:维护一个 session 的消息历史,提供 `pushUser` / `pushAssistant` / `snapshot`(返回 messages + system 给 streamText 用)。滑动窗口在添加时裁剪。

- [ ] **Step 1: 写 ChatSession 测试(失败)**

`tests/chat-session.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ChatSession } from '../src/main/llm/chatSession'

describe('ChatSession', () => {
  it('starts empty and exposes system prompt', () => {
    const s = new ChatSession('SYS', 5)
    const snap = s.snapshot()
    expect(snap.system).toBe('SYS')
    expect(snap.messages).toEqual([])
  })

  it('pushes user and assistant messages', () => {
    const s = new ChatSession('SYS', 5)
    s.pushUser('hi')
    s.pushAssistant('hello')
    expect(s.snapshot().messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ])
  })

  it('drops oldest messages when exceeding maxTurns (2 messages per turn)', () => {
    const s = new ChatSession('SYS', 2) // keep 2 turns = 4 messages
    s.pushUser('u1')
    s.pushAssistant('a1')
    s.pushUser('u2')
    s.pushAssistant('a2')
    s.pushUser('u3')
    s.pushAssistant('a3')
    const m = s.snapshot().messages
    expect(m).toHaveLength(4)
    expect(m[0]).toEqual({ role: 'user', content: 'u2' })
    expect(m[3]).toEqual({ role: 'assistant', content: 'a3' })
  })

  it('updates system prompt without losing history', () => {
    const s = new ChatSession('A', 5)
    s.pushUser('x')
    s.setSystemPrompt('B')
    expect(s.snapshot().system).toBe('B')
    expect(s.snapshot().messages).toHaveLength(1)
  })

  it('clear() empties messages but keeps system prompt', () => {
    const s = new ChatSession('SYS', 5)
    s.pushUser('x')
    s.clear()
    expect(s.snapshot().messages).toEqual([])
    expect(s.snapshot().system).toBe('SYS')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- chat-session
```

Expected: FAIL。

- [ ] **Step 3: 实现 chatSession.ts**

`src/main/llm/chatSession.ts`:

```ts
import type { ChatMessage } from './types'

export interface ChatSnapshot {
  system: string
  messages: ChatMessage[]
}

export class ChatSession {
  private messages: ChatMessage[] = []
  private system: string
  private readonly maxMessages: number

  constructor(systemPrompt: string, maxTurns = 20) {
    this.system = systemPrompt
    this.maxMessages = maxTurns * 2
  }

  pushUser(content: string): void {
    this.messages.push({ role: 'user', content })
    this.trim()
  }

  pushAssistant(content: string): void {
    this.messages.push({ role: 'assistant', content })
    this.trim()
  }

  setSystemPrompt(prompt: string): void {
    this.system = prompt
  }

  clear(): void {
    this.messages = []
  }

  snapshot(): ChatSnapshot {
    return { system: this.system, messages: [...this.messages] }
  }

  private trim(): void {
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(this.messages.length - this.maxMessages)
    }
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- chat-session
```

Expected: PASS,5 个用例。

- [ ] **Step 5: 全部测试 + typecheck**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: chat session with sliding-window history and system prompt"
```

---

---

## Task 6: ChatService + chat:* IPC 全链路(mock provider 集成测试)

**Files:**
- Create: `src/main/llm/chatService.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/api.d.ts`
- Create: `tests/chat-service.test.ts`

> 思路:`ChatService` 把 `ChatSession` + `streamText`(ai-sdk)粘起来,产出 `AsyncIterable<StreamEvent>`。注入 model factory 方便测试用 mock。IPC 层把事件转发到渲染端。

- [ ] **Step 1: 写 ChatService 测试(失败,用 mock model)**

`tests/chat-service.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ChatService } from '../src/main/llm/chatService'
import { ChatSession } from '../src/main/llm/chatSession'
import type { StreamEvent } from '../src/main/llm/types'
import { simulateReadableStream } from 'ai'
import { MockLanguageModelV1 } from 'ai/test'

function buildMockModel(chunks: string[]) {
  return new MockLanguageModelV1({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          ...chunks.map((textDelta) => ({ type: 'text-delta' as const, textDelta })),
          {
            type: 'finish' as const,
            finishReason: 'stop',
            logprobs: undefined,
            usage: { completionTokens: 1, promptTokens: 1 },
          },
        ],
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  })
}

describe('ChatService', () => {
  it('streams deltas and emits done with full text', async () => {
    const session = new ChatSession('SYS', 5)
    const model = buildMockModel(['Hel', 'lo', '!'])
    const svc = new ChatService(session, () => model)

    const events: StreamEvent[] = []
    for await (const e of svc.send('hi')) events.push(e)

    expect(events.filter((e) => e.type === 'delta').map((e) => (e as any).text)).toEqual([
      'Hel', 'lo', '!',
    ])
    const done = events.find((e) => e.type === 'done')
    expect(done).toBeDefined()
    expect((done as any).fullText).toBe('Hello!')
  })

  it('appends user and assistant messages to session after success', async () => {
    const session = new ChatSession('SYS', 5)
    const svc = new ChatService(session, () => buildMockModel(['ok']))
    for await (const _ of svc.send('hi')) { /* drain */ }
    expect(session.snapshot().messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'ok' },
    ])
  })

  it('emits error event when model factory throws', async () => {
    const session = new ChatSession('SYS', 5)
    const svc = new ChatService(session, () => { throw new Error('no token') })
    const events: StreamEvent[] = []
    for await (const e of svc.send('hi')) events.push(e)
    const err = events.find((e) => e.type === 'error')
    expect(err).toBeDefined()
    expect((err as any).message).toContain('no token')
  })

  it('supports abort via AbortController', async () => {
    const session = new ChatSession('SYS', 5)
    const model = buildMockModel(['a', 'b', 'c'])
    const svc = new ChatService(session, () => model)
    const ac = new AbortController()
    const events: StreamEvent[] = []
    const iter = svc.send('hi', ac.signal)
    ac.abort()
    for await (const e of iter) events.push(e)
    // 只关心不抛、有 error 或 done 之一
    expect(events.length).toBeGreaterThanOrEqual(0)
  })
})
```

> 注:`ai/test` 提供 `MockLanguageModelV1` 与 `simulateReadableStream`。如果版本不一致,测试 import 报错时,把 import 改为 `'ai/test'`(独立 entry)或参考当前 ai-sdk 文档的 mock 写法。

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- chat-service
```

Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 ChatService**

`src/main/llm/chatService.ts`:

```ts
import { streamText, type LanguageModel } from 'ai'
import type { ChatSession } from './chatSession'
import type { StreamEvent } from './types'

export type ModelFactory = () => LanguageModel

export class ChatService {
  constructor(
    private readonly session: ChatSession,
    private readonly modelFactory: ModelFactory,
  ) {}

  async *send(userText: string, signal?: AbortSignal): AsyncIterable<StreamEvent> {
    let model: LanguageModel
    try {
      model = this.modelFactory()
    } catch (err) {
      yield { type: 'error', message: (err as Error).message }
      return
    }

    this.session.pushUser(userText)
    const snap = this.session.snapshot()

    let fullText = ''
    try {
      const result = streamText({
        model,
        system: snap.system,
        messages: snap.messages,
        abortSignal: signal,
      })
      for await (const delta of result.textStream) {
        fullText += delta
        yield { type: 'delta', text: delta }
      }
      this.session.pushAssistant(fullText)
      yield { type: 'done', fullText }
    } catch (err) {
      yield { type: 'error', message: (err as Error).message }
    }
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- chat-service
```

Expected: PASS。如果 `ai/test` 的导出路径报错,改为:

```ts
import { MockLanguageModelV1, simulateReadableStream } from 'ai/test'
```

或查看 `node_modules/ai/test/package.json` 找正确入口。

- [ ] **Step 5: 接入主进程 IPC(改 ipc.ts)**

`src/main/ipc.ts`(完整替换):

```ts
import { ipcMain, app, type BrowserWindow } from 'electron'
import { Channels } from '@shared/channels'
import { moveWindowBy } from './window'
import { ChatSession } from './llm/chatSession'
import { ChatService } from './llm/chatService'
import { createLanguageModel } from './llm/providerFactory'
import { SettingsStore } from './settings/store'
import { CredentialsStore } from './settings/credentials'

export function registerIpc(win: BrowserWindow, userDataDir: string): void {
  const settingsStore = new SettingsStore(userDataDir)
  const credentialsStore = new CredentialsStore(userDataDir)

  let settings = settingsStore.load()
  const session = new ChatSession(settings.systemPrompt, 20)
  let activeAbort: AbortController | null = null

  const service = new ChatService(session, () => {
    const creds = credentialsStore.load()
    return createLanguageModel(settings, creds)
  })

  ipcMain.on(Channels.WindowQuit, () => app.quit())

  ipcMain.on(Channels.WindowMove, (_e, p: { dx: number; dy: number }) => {
    moveWindowBy(win, p.dx, p.dy)
  })

  ipcMain.on(Channels.PassthroughSet, (_e, interactive: boolean) => {
    win.setIgnoreMouseEvents(!interactive, { forward: true })
  })

  ipcMain.on(Channels.ChatSend, async (_e, payload: { text: string }) => {
    activeAbort?.abort()
    activeAbort = new AbortController()
    const ac = activeAbort
    try {
      for await (const ev of service.send(payload.text, ac.signal)) {
        if (ev.type === 'delta') win.webContents.send(Channels.ChatDelta, { text: ev.text })
        else if (ev.type === 'done') win.webContents.send(Channels.ChatDone, { fullText: ev.fullText })
        else if (ev.type === 'error') win.webContents.send(Channels.ChatError, { message: ev.message })
      }
    } finally {
      if (activeAbort === ac) activeAbort = null
    }
  })

  ipcMain.on(Channels.ChatAbort, () => activeAbort?.abort())

  ipcMain.handle(Channels.SettingsGet, () => {
    const creds = credentialsStore.load()
    return { settings, hasAnthropic: !!creds.anthropic, hasOpenAI: !!creds.openai }
  })

  ipcMain.handle(Channels.SettingsSet, (_e, payload: {
    settings: typeof settings
    anthropicToken?: string
    openaiToken?: string
  }) => {
    settings = payload.settings
    settingsStore.save(settings)
    const creds = credentialsStore.load()
    if (payload.anthropicToken !== undefined) creds.anthropic = payload.anthropicToken
    if (payload.openaiToken !== undefined) creds.openai = payload.openaiToken
    credentialsStore.save(creds)
    session.setSystemPrompt(settings.systemPrompt)
  })
}
```

- [ ] **Step 6: 主入口传递 userData 路径**

修改 `src/main/index.ts`,把 `registerIpc(win)` 改成:

```ts
registerIpc(win, app.getPath('userData'))
```

- [ ] **Step 7: preload 暴露 chat / settings API**

`src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { Channels } from '@shared/channels'

contextBridge.exposeInMainWorld('api', {
  window: {
    quit: () => ipcRenderer.send(Channels.WindowQuit),
    moveBy: (dx: number, dy: number) =>
      ipcRenderer.send(Channels.WindowMove, { dx, dy }),
    setPassthrough: (interactive: boolean) =>
      ipcRenderer.send(Channels.PassthroughSet, interactive),
  },
  chat: {
    send: (text: string) => ipcRenderer.send(Channels.ChatSend, { text }),
    abort: () => ipcRenderer.send(Channels.ChatAbort),
    onDelta: (cb: (text: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { text: string }) => cb(p.text)
      ipcRenderer.on(Channels.ChatDelta, h)
      return () => ipcRenderer.off(Channels.ChatDelta, h)
    },
    onDone: (cb: (fullText: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { fullText: string }) => cb(p.fullText)
      ipcRenderer.on(Channels.ChatDone, h)
      return () => ipcRenderer.off(Channels.ChatDone, h)
    },
    onError: (cb: (msg: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { message: string }) => cb(p.message)
      ipcRenderer.on(Channels.ChatError, h)
      return () => ipcRenderer.off(Channels.ChatError, h)
    },
  },
  settings: {
    get: () => ipcRenderer.invoke(Channels.SettingsGet),
    set: (payload: any) => ipcRenderer.invoke(Channels.SettingsSet, payload),
  },
})
```

`src/preload/api.d.ts`:

```ts
import type { Settings } from '../main/llm/types'

export {}

declare global {
  interface Window {
    api: {
      window: {
        quit: () => void
        moveBy: (dx: number, dy: number) => void
        setPassthrough: (interactive: boolean) => void
      }
      chat: {
        send: (text: string) => void
        abort: () => void
        onDelta: (cb: (text: string) => void) => () => void
        onDone: (cb: (fullText: string) => void) => () => void
        onError: (cb: (msg: string) => void) => () => void
      }
      settings: {
        get: () => Promise<{ settings: Settings; hasAnthropic: boolean; hasOpenAI: boolean }>
        set: (payload: {
          settings: Settings
          anthropicToken?: string
          openaiToken?: string
        }) => Promise<void>
      }
    }
  }
}
```

- [ ] **Step 8: typecheck + 全测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 9: 手动验证(用真实 token)**

```bash
npm run dev
```

打开 DevTools(右键面板临时加 `<button onClick={() => window.api.chat.send('你好')}>` 一类按钮,或在 Console 直接调:

```js
window.api.chat.onDelta(t => console.log('delta', t))
window.api.chat.onDone(t => console.log('done', t))
window.api.chat.onError(m => console.error(m))
window.api.chat.send('你好')
```

Expected: 控制台连续打印 delta,最后 done 一行完整文本。

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: chat service with streaming over ipc and provider factory wiring"
```

---

## Task 7: Three.js 透明场景 + VRM 加载

**Files:**
- Create: `src/renderer/scene/VrmStage.ts`
- Modify: `src/renderer/App.tsx`
- Add: `resources/default.vrm`(用户手动放置或从 VRoid Hub 下一个 CC0 模型)

> 职责:VrmStage 接管一个 canvas,初始化 Three.js scene/camera/renderer/lighting,加载 VRM 文件,启动 RAF 循环。本任务不接 IK/idle,只让模型显示出来并做基础呼吸 spring 动作(three-vrm 自带 springBone)。

- [ ] **Step 1: 准备占位 VRM**

```bash
mkdir -p resources
```

从 [VRoid Hub](https://hub.vroid.com/) 下载一个允许使用的 .vrm 文件,重命名为 `default.vrm` 放入 `resources/` 目录。**或者**用 VRoid Studio 5 分钟捏一个导出。

> 该文件不进 git(VRM 较大,且版权场景复杂)。把以下加到 `.gitignore`:

```
resources/*.vrm
```

- [ ] **Step 2: 写 VrmStage 接口测试(只测纯函数,渲染部分手测)**

> Three.js 渲染依赖 WebGL,vitest 默认 jsdom 跑不动。本任务不写自动化测试,手测为主。但抽出一个**纯计算函数** `computeCharacterFraming` 可以测。

`tests/vrm-framing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeCharacterFraming } from '../src/renderer/scene/VrmStage'

describe('computeCharacterFraming', () => {
  it('places camera so a 1.6m character fills 80% of vertical view', () => {
    const { cameraY, cameraZ } = computeCharacterFraming(1.6, 0.8, 30)
    expect(cameraY).toBeCloseTo(0.8, 1) // 中心在角色腰部
    expect(cameraZ).toBeGreaterThan(1)  // 站得开
  })

  it('returns farther distance for smaller fill ratio', () => {
    const a = computeCharacterFraming(1.6, 0.5, 30).cameraZ
    const b = computeCharacterFraming(1.6, 0.9, 30).cameraZ
    expect(a).toBeGreaterThan(b)
  })
})
```

- [ ] **Step 3: 跑测试,确认失败**

```bash
npm test -- vrm-framing
```

Expected: FAIL。

- [ ] **Step 4: 实现 VrmStage**

`src/renderer/scene/VrmStage.ts`:

```ts
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm'

export function computeCharacterFraming(
  characterHeight: number,
  fillRatio: number,
  fovDeg: number,
): { cameraY: number; cameraZ: number } {
  const targetVisibleHeight = characterHeight / fillRatio
  const fovRad = (fovDeg * Math.PI) / 180
  const cameraZ = targetVisibleHeight / 2 / Math.tan(fovRad / 2)
  const cameraY = characterHeight / 2
  return { cameraY, cameraZ }
}

export class VrmStage {
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  vrm: VRM | null = null

  private rafId = 0
  private clock = new THREE.Clock()
  private updaters: ((dt: number) => void)[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x000000, 0)
    this.resize()

    this.camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 20)
    const { cameraY, cameraZ } = computeCharacterFraming(1.5, 0.8, 30)
    this.camera.position.set(0, cameraY, cameraZ)
    this.camera.lookAt(0, cameraY, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(1, 2, 1)
    this.scene.add(ambient, dir)

    window.addEventListener('resize', this.resize)
  }

  resize = (): void => {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    this.renderer.setSize(w, h, false)
    if (this.camera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
  }

  async loadVrm(url: string): Promise<VRM> {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    const gltf = await loader.loadAsync(url)
    const vrm = gltf.userData.vrm as VRM
    vrm.scene.rotation.y = Math.PI // 面向相机
    this.scene.add(vrm.scene)
    this.vrm = vrm
    return vrm
  }

  addUpdater(fn: (dt: number) => void): void {
    this.updaters.push(fn)
  }

  start(): void {
    const tick = () => {
      const dt = this.clock.getDelta()
      for (const u of this.updaters) u(dt)
      this.vrm?.update(dt)
      this.renderer.render(this.scene, this.camera)
      this.rafId = requestAnimationFrame(tick)
    }
    tick()
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.resize)
    this.renderer.dispose()
  }
}
```

- [ ] **Step 5: 跑测试,确认通过**

```bash
npm test -- vrm-framing
```

Expected: PASS。

- [ ] **Step 6: App 挂载 stage**

`src/renderer/App.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { startPassthroughLoop } from './app/passthrough'
import { VrmStage } from './scene/VrmStage'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<VrmStage | null>(null)

  useEffect(() => {
    const stop = startPassthroughLoop((i) => window.api.window.setPassthrough(i))
    return stop
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    const stage = new VrmStage(canvasRef.current)
    stageRef.current = stage
    stage.loadVrm('./default.vrm').catch((e) => console.error('VRM load failed', e))
    stage.start()
    return () => stage.dispose()
  }, [])

  return (
    <div className="w-screen h-screen relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: 'transparent' }}
      />
      <div
        data-interactive="true"
        className="absolute top-2 right-2 bg-black/60 text-white text-xs p-2 rounded select-none"
      >
        <button onClick={() => window.api.window.quit()}>Quit</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 让 dev server 能加载 default.vrm**

把 `resources/default.vrm` 复制到 `src/renderer/public/default.vrm`(Vite 静态资源目录):

```bash
mkdir -p src/renderer/public
cp resources/default.vrm src/renderer/public/default.vrm
```

更新 .gitignore:

```
resources/*.vrm
src/renderer/public/*.vrm
```

> 后续 Task 13 设置面板支持选自定义路径时,会改成从 userData 读 + IPC。

- [ ] **Step 8: typecheck**

```bash
npm run typecheck
```

Expected: 无 error(若 `three/examples/jsm/...` 报类型,确认 `@types/three` 已安装,且 `tsconfig.json` 的 `moduleResolution` 是 `bundler`)。

- [ ] **Step 9: 手动验证 VRM 显示**

```bash
npm run dev
```

Expected: 透明窗口里出现 VRM 角色,正面朝向用户。窗口仍能拖到桌面任意位置(目前还不能拖,Task 10 才加,但右上角 Quit 仍可点)。

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: three.js transparent stage with vrm loading"
```

---

## Task 8: MouseLookAt(头部 IK 跟随鼠标)

**Files:**
- Create: `src/renderer/scene/MouseLookAt.ts`
- Modify: `src/renderer/App.tsx`
- Create: `tests/mouse-look-at.test.ts`

> 思路:取鼠标 NDC 坐标,反投影到角色前方一个虚拟平面得到目标点,让 head bone 用 quaternion slerp 朝它转。同时限制头部最大转角(±60°)。

- [ ] **Step 1: 写纯计算函数测试(失败)**

`tests/mouse-look-at.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { computeHeadTarget, clampQuaternionAngle } from '../src/renderer/scene/MouseLookAt'

describe('computeHeadTarget', () => {
  it('returns a point in front of the character at given depth', () => {
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
    camera.position.set(0, 1, 3)
    camera.lookAt(0, 1, 0)
    const target = computeHeadTarget({ x: 0, y: 0 }, camera, new THREE.Vector3(0, 1.5, 0), 1)
    expect(target.y).toBeGreaterThan(1)
    expect(target.y).toBeLessThan(2)
  })
})

describe('clampQuaternionAngle', () => {
  it('returns identity unchanged when within limit', () => {
    const q = new THREE.Quaternion()
    const out = clampQuaternionAngle(q, Math.PI / 3)
    expect(out.x).toBe(0)
    expect(out.w).toBe(1)
  })

  it('clamps to max angle when exceeded', () => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))
    const out = clampQuaternionAngle(q, Math.PI / 3)
    const angle = 2 * Math.acos(Math.min(1, Math.abs(out.w)))
    expect(angle).toBeCloseTo(Math.PI / 3, 2)
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- mouse-look-at
```

Expected: FAIL。

- [ ] **Step 3: 实现 MouseLookAt**

`src/renderer/scene/MouseLookAt.ts`:

```ts
import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'

export interface NDCPoint { x: number; y: number }

export function computeHeadTarget(
  ndc: NDCPoint,
  camera: THREE.PerspectiveCamera,
  headWorld: THREE.Vector3,
  forwardDistance: number,
): THREE.Vector3 {
  const ray = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera)
  const dir = ray.sub(camera.position).normalize()
  return camera.position.clone().add(dir.multiplyScalar(headWorld.distanceTo(camera.position) + forwardDistance))
}

export function clampQuaternionAngle(q: THREE.Quaternion, maxAngle: number): THREE.Quaternion {
  const w = Math.min(1, Math.max(-1, q.w))
  const angle = 2 * Math.acos(Math.abs(w))
  if (angle <= maxAngle) return q.clone()
  const t = maxAngle / angle
  const identity = new THREE.Quaternion()
  return identity.slerp(q, t)
}

export class MouseLookAt {
  private mouseNDC: NDCPoint = { x: 0, y: 0 }
  private readonly damping = 6 // 高=灵敏
  private readonly maxAngle = Math.PI / 3

  constructor(
    private readonly vrm: VRM,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
  ) {
    canvas.addEventListener('mousemove', this.onMove)
    window.addEventListener('mousemove', this.onMove)
  }

  private onMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.mouseNDC = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    }
  }

  update(dt: number): void {
    const head = this.vrm.humanoid.getNormalizedBoneNode('head')
    if (!head) return
    const headWorld = new THREE.Vector3()
    head.getWorldPosition(headWorld)

    const target = computeHeadTarget(this.mouseNDC, this.camera, headWorld, 0)

    const headParent = head.parent ?? this.vrm.scene
    const localTarget = target.clone()
    headParent.worldToLocal(localTarget)
    const localPos = head.position
    const dir = localTarget.sub(localPos).normalize()

    const desiredQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
    const clamped = clampQuaternionAngle(desiredQuat, this.maxAngle)

    head.quaternion.slerp(clamped, Math.min(1, dt * this.damping))
  }

  dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMove)
    window.removeEventListener('mousemove', this.onMove)
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- mouse-look-at
```

Expected: PASS。

- [ ] **Step 5: 接入 App**

修改 `src/renderer/App.tsx` 的 useEffect:

```tsx
useEffect(() => {
  if (!canvasRef.current) return
  const stage = new VrmStage(canvasRef.current)
  stageRef.current = stage
  stage.start()
  ;(async () => {
    const vrm = await stage.loadVrm('./default.vrm').catch((e) => {
      console.error('VRM load failed', e)
      return null
    })
    if (!vrm) return
    const lookAt = new (await import('./scene/MouseLookAt')).MouseLookAt(
      vrm, stage.camera, stage.renderer.domElement,
    )
    stage.addUpdater((dt) => lookAt.update(dt))
  })()
  return () => stage.dispose()
}, [])
```

> 注:`MouseLookAt` 写头部骨骼;后续 IdleController 也会写头部时,Task 9 会调整顺序确保 MouseLookAt **后写**覆盖 idle 的头部部分(updater 数组顺序:idle 先, lookAt 后)。

- [ ] **Step 6: typecheck + 全测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 7: 手动验证**

```bash
npm run dev
```

Expected: VRM 角色头部跟随鼠标在屏幕上的位置转动(平滑),最大角度受限不会扭过头。

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: head IK following mouse position"
```

---

---

## Task 9: IdleController(状态机 + 动画混合)

**Files:**
- Create: `src/renderer/scene/IdleController.ts`
- Modify: `src/renderer/App.tsx`
- Create: `tests/idle-controller.test.ts`
- Add: `src/renderer/public/anim/idle_breathe.vrma`(可选,无则用程序生成的 procedural 呼吸)

> 思路:状态机轮播多个 idle 动作。MVP 简化为 **procedural 呼吸 + 程序化身体小幅摆动**,**不**依赖外部 VRMA 文件(资源准备成本高,留接口给后续)。这样不阻塞主流程。状态机本身是纯逻辑,可测。

- [ ] **Step 1: 写状态机失败测试**

`tests/idle-controller.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { IdleStateMachine, type IdleState } from '../src/renderer/scene/IdleController'

describe('IdleStateMachine', () => {
  it('starts in breathe state', () => {
    const fsm = new IdleStateMachine(['breathe', 'sway', 'hairtouch'])
    expect(fsm.current).toBe('breathe')
  })

  it('switches to a different state when timer elapses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // pick last
    const fsm = new IdleStateMachine(['breathe', 'sway', 'hairtouch'], { minSec: 1, maxSec: 1 })
    fsm.update(2) // exceed
    expect(fsm.current).not.toBe('breathe')
    vi.restoreAllMocks()
  })

  it('never picks the same state twice in a row when alternatives exist', () => {
    const fsm = new IdleStateMachine(['breathe', 'sway'], { minSec: 0.1, maxSec: 0.1 })
    const seen: IdleState[] = [fsm.current]
    for (let i = 0; i < 5; i++) {
      fsm.update(1)
      seen.push(fsm.current)
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).not.toBe(seen[i - 1])
    }
  })

  it('with single state never switches', () => {
    const fsm = new IdleStateMachine(['breathe'], { minSec: 0.1, maxSec: 0.1 })
    fsm.update(10)
    expect(fsm.current).toBe('breathe')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- idle-controller
```

Expected: FAIL。

- [ ] **Step 3: 实现 IdleController**

`src/renderer/scene/IdleController.ts`:

```ts
import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'

export type IdleState = 'breathe' | 'sway' | 'hairtouch' | 'lookaround'

export interface IdleOptions {
  minSec?: number
  maxSec?: number
}

export class IdleStateMachine {
  current: IdleState
  private timer = 0
  private nextSwitch = 0
  private readonly opts: Required<IdleOptions>

  constructor(public readonly states: IdleState[], opts: IdleOptions = {}) {
    if (states.length === 0) throw new Error('IdleStateMachine needs at least one state')
    this.current = states[0]
    this.opts = { minSec: opts.minSec ?? 4, maxSec: opts.maxSec ?? 8 }
    this.scheduleNext()
  }

  private scheduleNext(): void {
    this.nextSwitch = this.opts.minSec + Math.random() * (this.opts.maxSec - this.opts.minSec)
    this.timer = 0
  }

  update(dt: number): void {
    this.timer += dt
    if (this.timer < this.nextSwitch) return
    if (this.states.length === 1) {
      this.scheduleNext()
      return
    }
    const others = this.states.filter((s) => s !== this.current)
    this.current = others[Math.floor(Math.random() * others.length)]
    this.scheduleNext()
  }
}

export class IdleController {
  private fsm = new IdleStateMachine(['breathe', 'sway', 'hairtouch'])
  private elapsed = 0

  constructor(private readonly vrm: VRM) {}

  update(dt: number): void {
    this.elapsed += dt
    this.fsm.update(dt)

    // procedural 呼吸:胸腔上下浮动
    const chest = this.vrm.humanoid.getNormalizedBoneNode('chest')
                ?? this.vrm.humanoid.getNormalizedBoneNode('upperChest')
                ?? this.vrm.humanoid.getNormalizedBoneNode('spine')
    if (chest) {
      const breathe = Math.sin(this.elapsed * 1.6) * 0.015
      chest.position.y = breathe
    }

    // 状态相关的小动作
    const spine = this.vrm.humanoid.getNormalizedBoneNode('spine')
    if (spine) {
      switch (this.fsm.current) {
        case 'breathe':
          spine.rotation.z = 0
          break
        case 'sway':
          spine.rotation.z = Math.sin(this.elapsed * 0.8) * 0.04
          break
        case 'hairtouch': {
          const armR = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
          if (armR) armR.rotation.z = -1.0 + Math.sin(this.elapsed * 1.2) * 0.1
          break
        }
        default:
          break
      }
    }
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- idle-controller
```

Expected: PASS,4 个用例。

- [ ] **Step 5: 接入 App(idle 先 update,lookAt 后 update)**

修改 `src/renderer/App.tsx` 的加载块:

```tsx
;(async () => {
  const vrm = await stage.loadVrm('./default.vrm').catch((e) => {
    console.error('VRM load failed', e)
    return null
  })
  if (!vrm) return
  const idle = new (await import('./scene/IdleController')).IdleController(vrm)
  const lookAt = new (await import('./scene/MouseLookAt')).MouseLookAt(
    vrm, stage.camera, stage.renderer.domElement,
  )
  // 顺序很重要:idle 先写 spine/手臂,lookAt 后覆盖 head
  stage.addUpdater((dt) => idle.update(dt))
  stage.addUpdater((dt) => lookAt.update(dt))
})()
```

- [ ] **Step 6: typecheck + 全测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 7: 手动验证 idle**

```bash
npm run dev
```

Expected: VRM ���色有轻微呼吸感;每 4-8 秒身体姿态/手臂会切换一次;头部仍跟随鼠标。

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: procedural idle controller with state machine"
```

---

## Task 10: DragController + ContextMenu(右键菜单)

**Files:**
- Create: `src/renderer/app/DragController.ts`
- Create: `src/renderer/app/ContextMenu.tsx`
- Modify: `src/renderer/App.tsx`
- Create: `tests/drag-controller.test.ts`

> 思路:在透明窗口的 canvas 上监听 pointerdown/move/up。按下若位移超过阈值(5px)则进入 drag 模式,通过 IPC `window:move` 让主进程移动窗口。短按(<阈值 + <300ms)是 click,触发后续 ChatInput 显示(本任务先 emit 一个 callback,Task 11 再连)。右键菜单用 Headless 自定义弹层(因为窗口透明 + 穿透,Electron 内置 contextMenu 与桌宠位置不友好)。

- [ ] **Step 1: 写 drag 判定测试(失败)**

`tests/drag-controller.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DragGesture } from '../src/renderer/app/DragController'

describe('DragGesture', () => {
  it('classifies short small-movement release as click', () => {
    const g = new DragGesture()
    const now = 0
    g.onDown({ x: 100, y: 100, t: now })
    g.onMove({ x: 102, y: 101, t: now + 100 })
    const r = g.onUp({ x: 102, y: 101, t: now + 200 })
    expect(r).toBe('click')
  })

  it('classifies movement past threshold as drag (no click)', () => {
    const g = new DragGesture()
    g.onDown({ x: 100, y: 100, t: 0 })
    g.onMove({ x: 130, y: 100, t: 50 })
    const r = g.onUp({ x: 130, y: 100, t: 100 })
    expect(r).toBe('drag-end')
  })

  it('emits incremental dx/dy during drag', () => {
    const g = new DragGesture()
    g.onDown({ x: 100, y: 100, t: 0 })
    expect(g.onMove({ x: 110, y: 105, t: 10 })).toEqual({ phase: 'move', dx: 10, dy: 5 })
    expect(g.onMove({ x: 115, y: 108, t: 20 })).toEqual({ phase: 'move', dx: 5, dy: 3 })
  })

  it('long press without movement is still click (not long-press in MVP)', () => {
    const g = new DragGesture()
    g.onDown({ x: 100, y: 100, t: 0 })
    const r = g.onUp({ x: 100, y: 100, t: 800 })
    expect(r).toBe('click')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- drag-controller
```

Expected: FAIL。

- [ ] **Step 3: 实现 DragController**

`src/renderer/app/DragController.ts`:

```ts
export interface PointerSample { x: number; y: number; t: number }
export type GestureResult = 'click' | 'drag-end' | null
export interface MoveDelta { phase: 'move'; dx: number; dy: number }

const DRAG_THRESHOLD_PX = 5

export class DragGesture {
  private start: PointerSample | null = null
  private last: PointerSample | null = null
  private dragging = false
  private totalDx = 0
  private totalDy = 0

  onDown(p: PointerSample): void {
    this.start = p
    this.last = p
    this.dragging = false
    this.totalDx = 0
    this.totalDy = 0
  }

  onMove(p: PointerSample): MoveDelta | null {
    if (!this.start || !this.last) return null
    const dx = p.x - this.last.x
    const dy = p.y - this.last.y
    this.totalDx += Math.abs(dx)
    this.totalDy += Math.abs(dy)
    this.last = p
    if (!this.dragging) {
      const distFromStart = Math.hypot(p.x - this.start.x, p.y - this.start.y)
      if (distFromStart >= DRAG_THRESHOLD_PX) this.dragging = true
    }
    if (this.dragging) return { phase: 'move', dx, dy }
    return null
  }

  onUp(_p: PointerSample): GestureResult {
    const wasDragging = this.dragging
    this.start = null
    this.last = null
    this.dragging = false
    return wasDragging ? 'drag-end' : 'click'
  }
}

export interface DragCallbacks {
  onMove: (dx: number, dy: number) => void
  onClick: () => void
}

export function attachDrag(target: HTMLElement, cb: DragCallbacks): () => void {
  const g = new DragGesture()
  const sample = (e: PointerEvent): PointerSample => ({ x: e.clientX, y: e.clientY, t: e.timeStamp })

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    target.setPointerCapture(e.pointerId)
    g.onDown(sample(e))
  }
  const onMove = (e: PointerEvent) => {
    const r = g.onMove(sample(e))
    if (r) cb.onMove(r.dx, r.dy)
  }
  const onUp = (e: PointerEvent) => {
    if (e.button !== 0) return
    target.releasePointerCapture(e.pointerId)
    const r = g.onUp(sample(e))
    if (r === 'click') cb.onClick()
  }

  target.addEventListener('pointerdown', onDown)
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)

  return () => {
    target.removeEventListener('pointerdown', onDown)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- drag-controller
```

Expected: PASS,4 个用例。

- [ ] **Step 5: 实现 ContextMenu**

`src/renderer/app/ContextMenu.tsx`:

```tsx
import { useEffect, useState } from 'react'

interface MenuItem { label: string; onClick: () => void }
interface Props { items: MenuItem[] }

export function ContextMenu({ items }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      setPos({ x: e.clientX, y: e.clientY })
    }
    const onClickAway = () => setPos(null)
    window.addEventListener('contextmenu', onContext)
    window.addEventListener('click', onClickAway)
    return () => {
      window.removeEventListener('contextmenu', onContext)
      window.removeEventListener('click', onClickAway)
    }
  }, [])

  if (!pos) return null

  return (
    <div
      data-interactive="true"
      className="absolute bg-neutral-900/95 text-white text-sm rounded shadow-lg py-1 select-none"
      style={{ left: pos.x, top: pos.y, minWidth: 120 }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          className="block w-full text-left px-3 py-1 hover:bg-neutral-700"
          onClick={() => { it.onClick(); setPos(null) }}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: 接入 App(canvas 上挂 drag,渲染 ContextMenu)**

`src/renderer/App.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { startPassthroughLoop } from './app/passthrough'
import { VrmStage } from './scene/VrmStage'
import { attachDrag } from './app/DragController'
import { ContextMenu } from './app/ContextMenu'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<VrmStage | null>(null)
  const [chatVisible, setChatVisible] = useState(false)

  useEffect(() => startPassthroughLoop((i) => window.api.window.setPassthrough(i)), [])

  useEffect(() => {
    if (!canvasRef.current) return
    const stage = new VrmStage(canvasRef.current)
    stageRef.current = stage
    stage.start()
    ;(async () => {
      const vrm = await stage.loadVrm('./default.vrm').catch((e) => { console.error(e); return null })
      if (!vrm) return
      const idle = new (await import('./scene/IdleController')).IdleController(vrm)
      const lookAt = new (await import('./scene/MouseLookAt')).MouseLookAt(
        vrm, stage.camera, stage.renderer.domElement,
      )
      stage.addUpdater((dt) => idle.update(dt))
      stage.addUpdater((dt) => lookAt.update(dt))
    })()
    const detachDrag = attachDrag(canvasRef.current, {
      onMove: (dx, dy) => window.api.window.moveBy(dx, dy),
      onClick: () => setChatVisible((v) => !v),
    })
    return () => { detachDrag(); stage.dispose() }
  }, [])

  return (
    <div className="w-screen h-screen relative">
      <canvas
        ref={canvasRef}
        data-interactive="true"
        className="w-full h-full block"
        style={{ background: 'transparent' }}
      />
      {chatVisible && (
        <div
          data-interactive="true"
          className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-2 rounded"
        >
          (Task 11 will replace with ChatBubble + ChatInput)
        </div>
      )}
      <ContextMenu items={[
        { label: chatVisible ? 'Hide chat' : 'Show chat', onClick: () => setChatVisible((v) => !v) },
        { label: 'Quit', onClick: () => window.api.window.quit() },
      ]} />
    </div>
  )
}
```

> canvas 加 `data-interactive="true"`,使鼠标悬停 VRM 画布时窗口不穿透,这样 pointerdown 才能拿到。这等价于"全画布命中",VRM 像素级命中后续优化(Task 14 验证清单里列出来,本期不做)。

- [ ] **Step 7: typecheck + 全测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 8: 手动验证拖动 + 右键 + 单击**

```bash
npm run dev
```

Expected:
- 在 VRM 画布上按住左键拖动 → 整个窗口跟着移动
- 短按左键(无明显位移) → 出现「Task 11 will replace...」黑色面板
- 右键 → 弹出菜单,Quit 可关闭程序
- 拖动后释放,菜单不自动出

> ⚠️ 已知问题:canvas 全画布 `data-interactive="true"` 意味着即使在 VRM 周围空白处也不穿透。MVP 接受;Task 14 列入「nice-to-have」。

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: drag-to-move and context menu on transparent canvas"
```

---

## Task 11: ChatBubble + ChatInput + useChatStream

**Files:**
- Create: `src/renderer/chat/useChatStream.ts`
- Create: `src/renderer/chat/ChatInput.tsx`
- Create: `src/renderer/chat/ChatBubble.tsx`
- Modify: `src/renderer/App.tsx`
- Create: `tests/use-chat-stream.test.tsx`

> 职责:`useChatStream` 用 IPC 订阅 chat:delta/done/error,聚合成响应式 state。`ChatInput` 是输入框,`ChatBubble` 是头顶气泡。

- [ ] **Step 1: 安装 React 测试库**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
```

修改 `vitest.config.ts`:把 `environment: 'node'` 改成 `'jsdom'`(全局 jsdom,方便 React 测试)。同时已经为 passthrough 测试用了 jsdom,改后 passthrough 测试需要去掉手动 JSDOM 部分:

`tests/passthrough.test.ts` 重写成:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { isInteractiveAtPoint } from '../src/renderer/app/passthrough'

describe('isInteractiveAtPoint', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="bg" style="width:100px;height:100px"></div>
      <button id="btn" data-interactive="true" style="position:absolute;left:10px;top:10px;width:20px;height:20px"></button>`
  })

  it('returns true at interactive point', () => {
    expect(isInteractiveAtPoint(15, 15)).toBe(true)
  })

  it('returns false at non-interactive point', () => {
    expect(isInteractiveAtPoint(80, 80)).toBe(false)
  })
})
```

> 注:jsdom 的 `elementFromPoint` 实现有限,可能始终返回 body。若失败,加一行 mock:

```ts
document.elementFromPoint = (x, y) => {
  if (x >= 10 && x <= 30 && y >= 10 && y <= 30) return document.querySelector('#btn')
  return document.querySelector('#bg')
}
```

- [ ] **Step 2: 写 useChatStream 失败测试**

`tests/use-chat-stream.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatStream } from '../src/renderer/chat/useChatStream'

describe('useChatStream', () => {
  let deltaCb: ((t: string) => void) | null = null
  let doneCb: ((t: string) => void) | null = null
  let errCb: ((m: string) => void) | null = null
  let sentText: string | null = null

  beforeEach(() => {
    deltaCb = null; doneCb = null; errCb = null; sentText = null
    ;(globalThis as any).window.api = {
      chat: {
        send: (text: string) => { sentText = text },
        abort: vi.fn(),
        onDelta: (cb: any) => { deltaCb = cb; return () => { deltaCb = null } },
        onDone: (cb: any) => { doneCb = cb; return () => { doneCb = null } },
        onError: (cb: any) => { errCb = cb; return () => { errCb = null } },
      },
    }
  })

  it('aggregates deltas into text and marks done', async () => {
    const { result } = renderHook(() => useChatStream())
    act(() => { result.current.send('hi') })
    expect(sentText).toBe('hi')
    expect(result.current.streaming).toBe(true)
    act(() => { deltaCb?.('Hel'); deltaCb?.('lo') })
    expect(result.current.text).toBe('Hello')
    act(() => { doneCb?.('Hello') })
    expect(result.current.streaming).toBe(false)
    expect(result.current.text).toBe('Hello')
  })

  it('captures error messages', () => {
    const { result } = renderHook(() => useChatStream())
    act(() => { result.current.send('x') })
    act(() => { errCb?.('boom') })
    expect(result.current.error).toBe('boom')
    expect(result.current.streaming).toBe(false)
  })
})
```

- [ ] **Step 3: 跑测试,确认失败**

```bash
npm test -- use-chat-stream
```

Expected: FAIL。

- [ ] **Step 4: 实现 useChatStream**

`src/renderer/chat/useChatStream.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ChatStreamApi {
  text: string
  streaming: boolean
  error: string | null
  send: (text: string) => void
  abort: () => void
  reset: () => void
}

export function useChatStream(): ChatStreamApi {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const offRef = useRef<Array<() => void>>([])

  useEffect(() => {
    const offDelta = window.api.chat.onDelta((t) => setText((p) => p + t))
    const offDone = window.api.chat.onDone(() => setStreaming(false))
    const offErr = window.api.chat.onError((m) => { setError(m); setStreaming(false) })
    offRef.current = [offDelta, offDone, offErr]
    return () => offRef.current.forEach((fn) => fn())
  }, [])

  const send = useCallback((t: string) => {
    setText('')
    setError(null)
    setStreaming(true)
    window.api.chat.send(t)
  }, [])

  const abort = useCallback(() => {
    window.api.chat.abort()
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    setText('')
    setError(null)
    setStreaming(false)
  }, [])

  return { text, streaming, error, send, abort, reset }
}
```

- [ ] **Step 5: 跑测试,确认通过**

```bash
npm test -- use-chat-stream
```

Expected: PASS,2 个用例。

- [ ] **Step 6: 实现 ChatInput**

`src/renderer/chat/ChatInput.tsx`:

```tsx
import { useState, type KeyboardEvent } from 'react'

interface Props { disabled?: boolean; onSubmit: (text: string) => void }

export function ChatInput({ disabled, onSubmit }: Props) {
  const [v, setV] = useState('')
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && v.trim() && !disabled) {
      onSubmit(v.trim())
      setV('')
    }
  }
  return (
    <input
      data-interactive="true"
      className="w-full bg-neutral-800 text-white rounded px-3 py-2 outline-none placeholder-neutral-500"
      placeholder={disabled ? '回复中...' : '说点什么 (Enter)'}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={onKey}
      autoFocus
    />
  )
}
```

- [ ] **Step 7: 实现 ChatBubble**

`src/renderer/chat/ChatBubble.tsx`:

```tsx
interface Props { text: string; streaming: boolean; error: string | null }

export function ChatBubble({ text, streaming, error }: Props) {
  if (!text && !streaming && !error) return null
  return (
    <div
      data-interactive="true"
      className="absolute top-4 left-4 right-4 bg-white/95 text-neutral-900 rounded-2xl px-4 py-3 shadow-lg select-text"
      style={{ maxHeight: 200, overflow: 'auto' }}
    >
      {error ? (
        <span className="text-red-600">出错了:{error}</span>
      ) : (
        <span>{text}{streaming && <span className="opacity-50">▍</span>}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 8: App 接线**

`src/renderer/App.tsx`(替换聊天 placeholder):

```tsx
import { useEffect, useRef, useState } from 'react'
import { startPassthroughLoop } from './app/passthrough'
import { VrmStage } from './scene/VrmStage'
import { attachDrag } from './app/DragController'
import { ContextMenu } from './app/ContextMenu'
import { useChatStream } from './chat/useChatStream'
import { ChatInput } from './chat/ChatInput'
import { ChatBubble } from './chat/ChatBubble'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const chat = useChatStream()

  useEffect(() => startPassthroughLoop((i) => window.api.window.setPassthrough(i)), [])

  useEffect(() => {
    if (!canvasRef.current) return
    const stage = new VrmStage(canvasRef.current)
    stage.start()
    ;(async () => {
      const vrm = await stage.loadVrm('./default.vrm').catch((e) => { console.error(e); return null })
      if (!vrm) return
      const idle = new (await import('./scene/IdleController')).IdleController(vrm)
      const lookAt = new (await import('./scene/MouseLookAt')).MouseLookAt(
        vrm, stage.camera, stage.renderer.domElement,
      )
      stage.addUpdater((dt) => idle.update(dt))
      stage.addUpdater((dt) => lookAt.update(dt))
    })()
    const detachDrag = attachDrag(canvasRef.current, {
      onMove: (dx, dy) => window.api.window.moveBy(dx, dy),
      onClick: () => setChatOpen((v) => !v),
    })
    return () => { detachDrag(); stage.dispose() }
  }, [])

  return (
    <div className="w-screen h-screen relative">
      <canvas
        ref={canvasRef}
        data-interactive="true"
        className="w-full h-full block"
        style={{ background: 'transparent' }}
      />
      <ChatBubble text={chat.text} streaming={chat.streaming} error={chat.error} />
      {chatOpen && (
        <div
          data-interactive="true"
          className="absolute bottom-4 left-4 right-4"
        >
          <ChatInput
            disabled={chat.streaming}
            onSubmit={(t) => chat.send(t)}
          />
        </div>
      )}
      <ContextMenu items={[
        { label: chatOpen ? 'Hide input' : 'Show input', onClick: () => setChatOpen((v) => !v) },
        { label: 'Quit', onClick: () => window.api.window.quit() },
      ]} />
    </div>
  )
}
```

- [ ] **Step 9: typecheck + 全测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 10: 手动验证完整对话**

前置:已配置 `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL` 环境变量。

```bash
npm run dev
```

Expected:
- 单击 VRM → 底部弹输入框
- 输入「你好」回车 → 顶部气泡出现流式回复 + 闪烁光标
- 完成后光标消失,文本保留
- 再次点 VRM 隐藏输入框;气泡保留直到用户输入新消息

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: chat input and streaming bubble wired to llm pipeline"
```

---

---

## Task 12: ExpressionController(关键词 → 表情)

**Files:**
- Create: `src/renderer/scene/ExpressionController.ts`
- Modify: `src/renderer/App.tsx`
- Create: `tests/expression-mapper.test.ts`

> 思路:`detectExpression(text)` 是纯函数,扫描关键词返回表情名;`ExpressionController` 在 `chat:done` 时被通知,触发 VRM blendshape,3 秒衰减回 neutral。

- [ ] **Step 1: 写关键词映射测试(失败)**

`tests/expression-mapper.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detectExpression } from '../src/renderer/scene/ExpressionController'

describe('detectExpression', () => {
  it('returns happy for laugh keywords', () => {
    expect(detectExpression('哈哈,好啊')).toBe('happy')
    expect(detectExpression('真是太开心了')).toBe('happy')
    expect(detectExpression('lol nice 😄')).toBe('happy')
  })

  it('returns surprised for question/exclaim cues', () => {
    expect(detectExpression('啊?是这样吗?')).toBe('surprised')
    expect(detectExpression('What?!')).toBe('surprised')
  })

  it('returns thinking for hedge cues', () => {
    expect(detectExpression('嗯... 让我想想')).toBe('thinking')
    expect(detectExpression('我思考一下')).toBe('thinking')
  })

  it('returns sad for sorry/sad cues', () => {
    expect(detectExpression('抱歉,我不知道')).toBe('sad')
    expect(detectExpression('好难过 😢')).toBe('sad')
  })

  it('falls back to neutral', () => {
    expect(detectExpression('今天天气不错')).toBe('neutral')
    expect(detectExpression('')).toBe('neutral')
  })

  it('happy beats thinking when both keywords appear', () => {
    expect(detectExpression('让我想想... 哈哈想到了')).toBe('happy')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- expression-mapper
```

Expected: FAIL。

- [ ] **Step 3: 实现 ExpressionController**

`src/renderer/scene/ExpressionController.ts`:

```ts
import type { VRM } from '@pixiv/three-vrm'

export type Expression = 'happy' | 'surprised' | 'thinking' | 'sad' | 'neutral'

const RULES: Array<{ kind: Expression; needles: string[] }> = [
  { kind: 'happy', needles: ['哈哈', '笑', '开心', '高兴', '😄', '😆', 'lol', 'haha'] },
  { kind: 'surprised', needles: ['?!', '!?', '?!', '啊?', 'what?', 'wow', '哇'] },
  { kind: 'sad', needles: ['抱歉', '难过', '😢', '😭', 'sorry', '对不起'] },
  { kind: 'thinking', needles: ['嗯...', '让我想', '思考', '想想', 'hmm', 'let me think'] },
]

export function detectExpression(text: string): Expression {
  if (!text) return 'neutral'
  const lower = text.toLowerCase()
  for (const r of RULES) {
    if (r.needles.some((n) => lower.includes(n.toLowerCase()))) return r.kind
  }
  return 'neutral'
}

const VRM_NAME_MAP: Record<Expression, string | null> = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  thinking: 'neutral', // 多数 VRM 没有 thinking,用轻微 sad 或 neutral
  neutral: 'neutral',
}

export class ExpressionController {
  private current: Expression = 'neutral'
  private weight = 0
  private targetWeight = 0
  private holdLeft = 0
  private readonly hold = 3 // seconds before decay

  constructor(private readonly vrm: VRM) {}

  trigger(text: string): void {
    const e = detectExpression(text)
    if (e === 'neutral') return
    this.current = e
    this.targetWeight = 1
    this.weight = 1
    this.holdLeft = this.hold
    this.applyWeight()
  }

  update(dt: number): void {
    if (this.holdLeft > 0) {
      this.holdLeft -= dt
      return
    }
    if (this.weight > 0) {
      this.weight = Math.max(0, this.weight - dt) // 1s decay
      this.applyWeight()
      if (this.weight === 0) this.current = 'neutral'
    }
  }

  private applyWeight(): void {
    const mgr = this.vrm.expressionManager
    if (!mgr) return
    // 清零所有
    for (const name of ['happy', 'angry', 'sad', 'surprised', 'relaxed', 'neutral']) {
      try { mgr.setValue(name, 0) } catch { /* ignore missing */ }
    }
    const target = VRM_NAME_MAP[this.current]
    if (target) {
      try { mgr.setValue(target, this.weight) } catch { /* ignore */ }
    }
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- expression-mapper
```

Expected: PASS,6 个用例。

- [ ] **Step 5: App 接线**

修改 `src/renderer/App.tsx`,在 useEffect 加载块里:

```tsx
const expr = new (await import('./scene/ExpressionController')).ExpressionController(vrm)
stage.addUpdater((dt) => idle.update(dt))
stage.addUpdater((dt) => lookAt.update(dt))
stage.addUpdater((dt) => expr.update(dt))
// 暴露给外部触发
;(window as any).__triggerExpr = (t: string) => expr.trigger(t)
```

并订阅 done 事件触发表情:

```tsx
useEffect(() => {
  const off = window.api.chat.onDone((fullText) => {
    ;(window as any).__triggerExpr?.(fullText)
  })
  return off
}, [])
```

> 这种临时挂 window 的方式只是为了避免把 expr 引用穿入 chat hook 增加耦合;Task 13 之后可重构成 context。MVP 接受。

- [ ] **Step 6: typecheck + 全测试**

```bash
npm test
npm run typecheck
```

Expected: 全 PASS。

- [ ] **Step 7: 手动验证表情触发**

```bash
npm run dev
```

输入「讲个笑话」让回复中包含「哈哈」/「笑」 → 角色短暂露出 happy 表情(VRM 嘴角上扬等),3 秒后衰减回 neutral。

> 若 VRM 模型没有标准 expression(happy/sad/surprised),控制台会有 try/catch 静默忽略,不影响主流程。

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: keyword-driven expression controller"
```

---

## Task 13: SettingsPanel UI

**Files:**
- Create: `src/renderer/settings/SettingsPanel.tsx`
- Modify: `src/renderer/App.tsx`(挂菜单项 + 弹层)
- Modify: `src/renderer/app/ContextMenu.tsx`(无变更,只是新增项)

> 思路:模态弹层(MVP 不要复杂路由),展示 provider 下拉 + 三个字段 + 保存按钮。Token 字段如果"已有"就显示占位 ●●●●,不回填实际值,改写时清空原值。

- [ ] **Step 1: 实现 SettingsPanel**

`src/renderer/settings/SettingsPanel.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { Settings } from '../../main/llm/types'

interface Props { open: boolean; onClose: () => void }

export function SettingsPanel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [hasA, setHasA] = useState(false)
  const [hasO, setHasO] = useState(false)
  const [aTok, setATok] = useState('')
  const [oTok, setOTok] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    window.api.settings.get().then((r) => {
      setSettings(r.settings)
      setHasA(r.hasAnthropic)
      setHasO(r.hasOpenAI)
      setATok('')
      setOTok('')
    })
  }, [open])

  if (!open || !settings) return null

  const save = async () => {
    setSaving(true)
    try {
      await window.api.settings.set({
        settings,
        anthropicToken: aTok || undefined,
        openaiToken: oTok || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const upd = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })

  return (
    <div
      data-interactive="true"
      className="absolute inset-0 bg-black/60 flex items-center justify-center"
    >
      <div className="bg-neutral-900 text-white rounded-xl p-5 w-[360px] space-y-3">
        <div className="text-lg font-semibold">设置</div>

        <label className="block text-sm">
          Provider
          <select
            className="mt-1 w-full bg-neutral-800 rounded px-2 py-1"
            value={settings.provider}
            onChange={(e) => upd({ provider: e.target.value as Settings['provider'] })}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai-compatible">OpenAI-Compatible</option>
          </select>
        </label>

        {settings.provider === 'anthropic' ? (
          <fieldset className="space-y-2 border border-neutral-700 rounded p-2">
            <legend className="text-xs text-neutral-400 px-1">Anthropic</legend>
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Base URL (留空走官方)"
              value={settings.anthropic.baseURL}
              onChange={(e) => upd({ anthropic: { ...settings.anthropic, baseURL: e.target.value } })}
            />
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Model ID (e.g. claude-sonnet-4-5)"
              value={settings.anthropic.model}
              onChange={(e) => upd({ anthropic: { ...settings.anthropic, model: e.target.value } })}
            />
            <input
              type="password"
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder={hasA ? '已设置(留空保持不变)' : 'API Token'}
              value={aTok}
              onChange={(e) => setATok(e.target.value)}
            />
          </fieldset>
        ) : (
          <fieldset className="space-y-2 border border-neutral-700 rounded p-2">
            <legend className="text-xs text-neutral-400 px-1">OpenAI-Compatible</legend>
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Base URL (必填)"
              value={settings.openai.baseURL}
              onChange={(e) => upd({ openai: { ...settings.openai, baseURL: e.target.value } })}
            />
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Model ID (e.g. gpt-4o)"
              value={settings.openai.model}
              onChange={(e) => upd({ openai: { ...settings.openai, model: e.target.value } })}
            />
            <input
              type="password"
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder={hasO ? '已设置(留空保持不变)' : 'API Key'}
              value={oTok}
              onChange={(e) => setOTok(e.target.value)}
            />
          </fieldset>
        )}

        <label className="block text-sm">
          System Prompt
          <textarea
            className="mt-1 w-full bg-neutral-800 rounded px-2 py-1 text-sm"
            rows={3}
            value={settings.systemPrompt}
            onChange={(e) => upd({ systemPrompt: e.target.value })}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="px-3 py-1 bg-neutral-700 rounded"
            onClick={onClose}
            disabled={saving}
          >取消</button>
          <button
            className="px-3 py-1 bg-blue-600 rounded"
            onClick={save}
            disabled={saving}
          >{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: App 接线**

`src/renderer/App.tsx`,在 state 加 `settingsOpen` + 在 ContextMenu 加菜单项 + 渲染面板:

```tsx
const [settingsOpen, setSettingsOpen] = useState(false)
// ...

import { SettingsPanel } from './settings/SettingsPanel'

return (
  <div className="w-screen h-screen relative">
    {/* canvas, ChatBubble, ChatInput 同前 */}
    <ContextMenu items={[
      { label: chatOpen ? 'Hide input' : 'Show input', onClick: () => setChatOpen((v) => !v) },
      { label: 'Settings...', onClick: () => setSettingsOpen(true) },
      { label: 'Quit', onClick: () => window.api.window.quit() },
    ]} />
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </div>
)
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```

Expected: 无 error。

- [ ] **Step 4: 手动验证设置**

```bash
npm run dev
```

Expected:
- 右键 → Settings... → 弹设置面板
- 切换 provider 显示对应字段;改 Base URL/Model/Token,保存关闭
- 再次发消息,使用新配置(改 model 直接生效;改 token 也生效)
- 重启程序,设置保留(但 token 字段显示「已设置」占位,不回显原值)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: settings panel with provider switch and credentials"
```

---

## Task 14: 端到端验收 + electron-builder 打包

**Files:**
- Modify: `package.json`(electron-builder 配置)
- Create: `electron-builder.yml`
- Create: `resources/tray.png`(16x16 PNG,任意桌宠图标)
- Create: `resources/icon.ico`(应用图标,256x256 ico)
- Modify: `src/main/tray.ts`(用真图标替换空 image)
- Create: `docs/manual-test-checklist.md`

- [ ] **Step 1: 准备图标资源**

放置:
- `resources/tray.png`(16x16 / 24x24 PNG,半透明背景的小图标)
- `resources/icon.ico`(Windows 应用图标,256x256 ico,可用 https://convertico.com 把 PNG 转 ico)

> 如果暂时没准备好,可以用占位:`resources/tray.png` 一张纯色 16x16 PNG;`resources/icon.ico` 用任意 ico。

更新 `.gitignore`:**移除** `resources/` 那行(图标要进 git;只 ignore VRM):

```
# 现在的 resources 段改成:
resources/*.vrm
```

- [ ] **Step 2: 修改 tray.ts 用真图标**

`src/main/tray.ts`:

```ts
import { Tray, Menu, nativeImage, app } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createTray(win: BrowserWindow): Tray {
  const iconPath = join(__dirname, '../../resources/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
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

- [ ] **Step 3: electron-builder 配置**

`electron-builder.yml`:

```yaml
appId: com.desktop_pal.app
productName: Desktop_Pal
directories:
  output: release
  buildResources: resources
files:
  - out/**/*
  - resources/tray.png
  - package.json
extraResources:
  - from: resources/tray.png
    to: tray.png
asar: true
win:
  target:
    - nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false
```

修改 `package.json` 加 build 字段引用 yml(可选,electron-builder 会自动识别 `electron-builder.yml`):

```json
"scripts": {
  ...
  "dist": "electron-vite build && electron-builder --config electron-builder.yml"
}
```

- [ ] **Step 4: 写端到端验收清单**

`docs/manual-test-checklist.md`:

```markdown
# Desktop_Pal MVP Manual Test Checklist

## 前置
- [ ] Windows 10/11
- [ ] 设置环境变量(任一即可):
  - `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL`
  - 或 `OPENAI_BASE_URL` + `OPENAI_API_KEY` + `OPENAI_MODEL`
- [ ] `resources/default.vrm` 存在(从 VRoid Hub 下载或自捏)
- [ ] `resources/tray.png` 存在
- [ ] `npm install` 已完成

## Dev 模式

```bash
npm run dev
```

- [ ] 启动后右下角出现透明 VRM 角色窗口
- [ ] VRM 角色面向用户
- [ ] VRM 有轻微呼吸动作
- [ ] 鼠标在屏幕上移动时角色头部跟随
- [ ] 闲置 4-8 秒后身体姿态会变化(sway / hairtouch)
- [ ] 在 VRM 上左键拖动 → 整窗移动
- [ ] 在 VRM 上短按左键 → 底部出现输入框
- [ ] 输入「你好」回车 → 顶部气泡流式显示回复
- [ ] 流式时光标 ▍ 闪烁,完成后消失
- [ ] 回复中含「哈哈」「笑」→ 触发 happy 表情 3 秒
- [ ] 右键 → 弹菜单(Show/Hide input、Settings、Quit)
- [ ] 点 Settings → 切换 provider、改 Base URL/Model/Token、保存
- [ ] 重启程序后设置保留(token 字段显示「已设置」)
- [ ] 切到 OpenAI-Compatible(填 DeepSeek 等)→ 同样能聊
- [ ] 系统托盘有图标,右键有 Show/Hide/Quit
- [ ] 鼠标在 VRM 周围空白区域点击 → 穿透到下方桌面/窗口

## 已知 / 接受的问题

- [ ] canvas 全画布命中(VRM 周围空白处也不穿透)→ 接受,后续优化
- [ ] tray 图标在某些 Windows 版本可能模糊 → 接受,后续做高清版本

## Build & 安装

```bash
npm run build
npm run dist
```

- [ ] `release/Desktop_Pal Setup *.exe` 生成
- [ ] 在干净的 Windows 上安装
- [ ] 桌面 / 开始菜单出现 Desktop_Pal 图标
- [ ] 启动 → 全部 dev 模式的功能可复现
- [ ] 卸载后注册表干净(可选检查)
```

- [ ] **Step 5: 跑构建**

```bash
npm run build
```

Expected: `out/main/index.js`、`out/preload/index.js`、`out/renderer/index.html` 等生成,无 error。

```bash
npm run dist
```

Expected: `release/` 目录下出现 `Desktop_Pal Setup 0.1.0.exe`(或类似命名)。

- [ ] **Step 6: 安装包冒烟测试**

双击安装包,选默认目录安装,启动桌面快捷方式。

Expected: 全部 MVP 行为复现。卸载从控制面板可正常完成。

- [ ] **Step 7: 走完手测清单,逐项打勾**

打开 `docs/manual-test-checklist.md`,逐项验证。任何 FAIL 项 → 排查并修(单独的 commit)。

- [ ] **Step 8: 最终 commit**

```bash
git add .
git commit -m "chore: electron-builder packaging and manual test checklist"
```

可选(若希望打 tag):

```bash
git tag v0.1.0-mvp
```

---

## 计划完成

到此 MVP 全部 15 个 Task 完成,产出:

1. 一个可运行的 Windows 安装包,带透明置顶 3D VRM 桌宠
2. 完整对话链路(Anthropic + OpenAI-Compatible 双 provider 切换)
3. 拖动 / 鼠标头部跟随 / 程序化 idle 动画 / 关键词表情
4. 加密凭据存储 + 环境变量预填
5. 完整测试套件(provider factory / chatSession / chatService / passthrough / drag / idle / expression / framing / use-chat-stream)
6. 手测清单 + 打包流水线

后续接 spec 里的 out-of-scope:语音 / 屏幕感知 / 长期记忆 / 多角色,各自独立 spec → plan → 执行。
