# Live2D Tororo 白猫桌宠替换 VRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace VRM Avatar_Nana + three-vrm rendering stack with Live2D Tororo (white cat, Cubism 2) + pixi.js + pixi-live2d-display. Preserve all chat/window/IPC/UI infrastructure. Single backend, no dual support.

**Architecture:** Renderer-side only. Main process and Preload layer untouched. Add `src/renderer/stage/` directory replacing `src/renderer/scene/` (deleted). PIXI.Application takes over the canvas; Live2DModel handles Tororo rendering. Cursor follows via built-in `model.focus()`. Motion cycling and chat-triggered reactions implemented in pure-logic controllers injected with a `MotionPlayer` interface so tests don't need a real Live2D runtime.

**Tech Stack:** pixi.js@7 / pixi-live2d-display@0.4 / Live2D Cubism 2 runtime (`live2d.min.js` from dylanNew/live2d mirror) / Tororo sample model from akyuu-cn/thermal-cat mirror. All assets already downloaded into `src/renderer/public/cubism/` and `src/renderer/public/model/tororo/` before this plan starts.

---

## Asset State Before Task 1

These are already on disk from the brainstorming download step. **Do NOT redownload.**

```
src/renderer/public/cubism/live2d.min.js              129 KB  Cubism 2 runtime
src/renderer/public/cubism/live2dcubismcore.min.js    207 KB  Cubism 4 core (kept for future)
src/renderer/public/model/tororo/index.json           model manifest (Cubism 2 .model.json equivalent)
src/renderer/public/model/tororo/tororo.pose.json
src/renderer/public/model/tororo/moc/tororo.moc       Cubism 2 binary
src/renderer/public/model/tororo/moc/tororo.2048/texture_00.png   280 KB
src/renderer/public/model/tororo/mtn/00_idle.mtn      idle main
src/renderer/public/model/tororo/mtn/01.mtn..08.mtn   8 tap motions
```

`index.json` content for reference:
```json
{
  "version": "Sample 1.0.0",
  "model": "moc/tororo.moc",
  "textures": ["moc/tororo.2048/texture_00.png"],
  "pose": "tororo.pose.json",
  "name": "tororo",
  "motions": {
    "idle": [{"file": "mtn/00_idle.mtn"}],
    "tap_body": [
      {"file":"mtn/01.mtn"},{"file":"mtn/02.mtn"},{"file":"mtn/03.mtn"},
      {"file":"mtn/04.mtn"},{"file":"mtn/05.mtn"},{"file":"mtn/06.mtn"},
      {"file":"mtn/07.mtn"},{"file":"mtn/08.mtn"}
    ]
  }
}
```

> **Note:** The original mirror's `index.json` uses an empty-string group `""` for tap motions. **Task 1 includes a one-line rename to `tap_body`** so motion calls have a clean group name.

---

## Task Sequence Overview

| Task | Topic | TDD? | Files |
|------|-------|------|-------|
| 1 | npm deps + runtime script tags + .gitignore + index.json fix | no | package.json, index.html, .gitignore, public/model/tororo/index.json, spec |
| 2 | `Live2DStage` + delete VRM stack | no (smoke) | new `stage/Live2DStage.ts`, delete scene/, App.tsx, package.json |
| 3 | `CursorTracker` | yes | new `stage/CursorTracker.ts`, App.tsx, new `tests/cursor-tracker.test.ts` |
| 4 | `MotionController` (idle cycling + reactions) | yes | new `stage/MotionController.ts`, App.tsx, new `tests/motion-controller.test.ts` |
| 5 | `motionMapper` (text → motion) | yes | new `stage/motionMapper.ts`, App.tsx, rename test, delete ExpressionController |
| 6 | README attribution + first-time setup docs | no | README.md |
| 7 | Manual checklist + final verification | no | docs/manual-test-checklist.md |

---

## Task 1: 依赖 + 运行时脚本 + .gitignore + index.json 修订

**Files:**
- Modify: `package.json`
- Modify: `src/renderer/index.html`
- Modify: `.gitignore`
- Modify: `src/renderer/public/model/tororo/index.json`
- Modify: `docs/superpowers/specs/2026-05-04-live2d-tororo-pivot.md` (cleanup, if not already done)

> 思路: 装 pixi 和 pixi-live2d-display；把 Cubism 2 + 4 runtime 在 module 加载之前以经典 `<script>` 引入（pixi-live2d-display 期望 `window.Live2D`/`window.Live2DCubismCore` 在模块加载时已存在）；把 Tororo `index.json` 的空字符串 motion group 重命名为 `tap_body`；把 cubism runtime 和 model 文件加入 .gitignore。

- [ ] **Step 1: 装 npm 依赖**

```bash
cd d:/_Personal/Desktop_Pal
npm install pixi.js@^7.4.3 pixi-live2d-display@^0.4.0
```

Expected: 装 2 个包, 0 vulnerabilities。

- [ ] **Step 2: 在 index.html 引 cubism runtime**

修改 `src/renderer/index.html`:

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
    <script src="./cubism/live2d.min.js"></script>
    <script src="./cubism/live2dcubismcore.min.js"></script>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

> 顺序很重要: cubism 必须在 main.tsx 之前同步加载, pixi-live2d-display 模块初始化时检查 `window.Live2D` 存在与否决定 Cubism 2 支持。

- [ ] **Step 3: 修订 .gitignore**

在 `.gitignore` 末尾的"VRM assets"段后追加:

```
# Live2D runtimes (Cubism Core JS — Live2D Inc. proprietary, do not redistribute via git)
src/renderer/public/cubism/*.js

# Live2D models (third-party sample assets)
src/renderer/public/model/**
```

(VRM 那一段在 Task 2 删除 VRM 资源后保留即可,无害。)

- [ ] **Step 4: 重命名 Tororo motion group 名**

完整覆盖 `src/renderer/public/model/tororo/index.json`:

```json
{
  "version": "Sample 1.0.0",
  "model": "moc/tororo.moc",
  "textures": ["moc/tororo.2048/texture_00.png"],
  "pose": "tororo.pose.json",
  "name": "tororo",
  "motions": {
    "idle": [{"file":"mtn/00_idle.mtn"}],
    "tap_body": [
      {"file":"mtn/01.mtn"},{"file":"mtn/02.mtn"},{"file":"mtn/03.mtn"},
      {"file":"mtn/04.mtn"},{"file":"mtn/05.mtn"},{"file":"mtn/06.mtn"},
      {"file":"mtn/07.mtn"},{"file":"mtn/08.mtn"}
    ]
  }
}
```

- [ ] **Step 5: typecheck**

```bash
npm run typecheck
```

Expected: 仍然 clean (依赖装上, runtime 在 html, 代码未改, 应当无影响)。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/renderer/index.html .gitignore src/renderer/public/model/tororo/index.json
git commit -m "chore: add live2d runtimes and tororo sample model"
```

(Cubism 二进制 JS 和模型文件因为 .gitignore 不入此 commit, 这是预期行为。README Task 6 会写明手动获取流程。)

---

## Task 2: Live2DStage 最小可显示 + 删 VRM 栈

**Files:**
- Create: `src/renderer/stage/Live2DStage.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `package.json`
- Delete: `src/renderer/scene/VrmStage.ts`
- Delete: `src/renderer/scene/MouseLookAt.ts`
- Delete: `src/renderer/scene/IdleController.ts`
- Delete: `src/renderer/public/default.vrm`
- Delete: `src/renderer/public/anim/` (directory)
- Delete: `resources/default.vrm`
- Delete: `VRM/Avatar_Nana.vrm`
- Delete: `tests/vrm-framing.test.ts`
- Delete: `tests/mouse-look-at.test.ts`
- Delete: `tests/idle-controller.test.ts`
- Delete deps: `three`, `@types/three`, `@pixiv/three-vrm`, `@pixiv/three-vrm-animation`

> 保留 `src/renderer/scene/ExpressionController.ts` 直到 Task 5 把 detectExpression 迁出后再删。

- [ ] **Step 1: 创建 Live2DStage**

`src/renderer/stage/Live2DStage.ts`:

```ts
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// 把 PIXI 的 Ticker 注册给 Live2DModel,模型才会随 ticker 跑动
Live2DModel.registerTicker(PIXI.Ticker)

export class Live2DStage {
  readonly app: PIXI.Application
  model: Live2DModel | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      resizeTo: canvas,
    })
  }

  async loadModel(modelUrl: string): Promise<Live2DModel> {
    const model = await Live2DModel.from(modelUrl)
    this.app.stage.addChild(model)
    this.fitModel(model)
    this.model = model
    return model
  }

  private fitModel(model: Live2DModel): void {
    const { width, height } = this.app.screen
    // Tororo 原始 canvas size 通常是 ~768; 根据视口高度适配, 留 5% 边距
    const targetHeight = height * 0.95
    const scale = targetHeight / model.height
    model.scale.set(scale)
    model.x = width / 2 - (model.width * scale) / 2 + (model.width * scale) / 2
    model.y = height - model.height * scale
    // 居中: 在 pixi 坐标里, model.x/y 是 anchor 位置, anchor 默认 (0,0) 即左上
    model.x = (width - model.width * scale) / 2 + (model.width * scale) / 2 - (model.width * scale) / 2
    // 简化: 直接居中
    model.x = width / 2
    model.y = height / 2
    model.anchor?.set?.(0.5, 0.5)
  }

  dispose(): void {
    this.app.destroy(false, { children: true, texture: false, baseTexture: false })
    this.model = null
  }
}
```

> Live2DModel 不一定继承 `Container` 的标准 anchor, 上面的 anchor 调用是 best-effort。如果运行时报"anchor is undefined", 改为通过 `model.pivot.set(model.width/2, model.height/2)` 来居中。

- [ ] **Step 2: 重写 App.tsx 用 Live2DStage**

完整覆盖 `src/renderer/App.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { startPassthroughLoop } from './app/passthrough'
import { Live2DStage } from './stage/Live2DStage'
import { attachDrag } from './app/DragController'
import { ContextMenu } from './app/ContextMenu'
import { useChatStream } from './chat/useChatStream'
import { ChatInput } from './chat/ChatInput'
import { ChatBubble } from './chat/ChatBubble'
import { SettingsPanel } from './settings/SettingsPanel'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const chat = useChatStream()

  useEffect(() => startPassthroughLoop((i) => window.api.window.setPassthrough(i)), [])

  useEffect(() => {
    if (!canvasRef.current) return
    const stage = new Live2DStage(canvasRef.current)
    ;(async () => {
      try {
        await stage.loadModel('./model/tororo/index.json')
      } catch (e) {
        console.error('Live2D model load failed', e)
      }
    })()
    const detachDrag = attachDrag(canvasRef.current, {
      onMove: (dx, dy) => window.api.window.moveBy(dx, dy),
      onClick: () => { /* drag-to-move only */ },
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
      <div data-interactive="true" className="absolute bottom-2 left-2 right-2">
        <ChatInput disabled={chat.streaming} onSubmit={(t) => chat.send(t)} />
      </div>
      <ContextMenu items={[
        { label: 'Settings...', onClick: () => setSettingsOpen(true) },
        { label: 'Quit', onClick: () => window.api.window.quit() },
      ]} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
```

(Task 3-5 会再加 cursor / motion / mapper 三段 useEffect 副作用。)

- [ ] **Step 3: 删除 VRM 渲染文件**

```bash
rm src/renderer/scene/VrmStage.ts
rm src/renderer/scene/MouseLookAt.ts
rm src/renderer/scene/IdleController.ts
rm tests/vrm-framing.test.ts
rm tests/mouse-look-at.test.ts
rm tests/idle-controller.test.ts
rm src/renderer/public/default.vrm
rm -rf src/renderer/public/anim
rm -f resources/default.vrm
rm -rf VRM
```

(`src/renderer/scene/ExpressionController.ts` 留到 Task 5 处理。)

- [ ] **Step 4: 卸 VRM/Three 依赖**

```bash
npm uninstall three @types/three @pixiv/three-vrm @pixiv/three-vrm-animation
```

Expected: 卸 4 个包。

- [ ] **Step 5: typecheck + 测试**

```bash
npm run typecheck
npm test
```

Expected:
- typecheck clean (旧 VRM 测试和文件已删, ExpressionController 还引用 `@pixiv/three-vrm` 但既然 Task 5 才删, 它依赖的 type 已经卸, 会报错)

> ⚠️ ExpressionController.ts 现在引用 `@pixiv/three-vrm` 的 `VRM` 类型, 这些 type 在 Step 4 卸了后会 typecheck 报错。**临时**把 ExpressionController.ts 改成:

```ts
// src/renderer/scene/ExpressionController.ts (临时改, Task 5 会删)
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
```

(删掉 ExpressionController class 和 VRM_NAME_MAP, 只保留 detectExpression + RULES + Expression type。)

再跑:
```bash
npm run typecheck
npm test
```

Expected: typecheck clean, 测试 11 文件全过 (剩 chat-service / chat-session / drag-controller / expression-mapper / passthrough / provider-factory / settings-defaults / settings-store / smoke / use-chat-stream / window-config)。

- [ ] **Step 6: 手动验证白猫显示**

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

Expected: 桌面右下出现透明窗, 内含 Tororo 白猫静态贴图 (无动作, 无鼠标跟随)。背景能透出桌面。

如果模型不显示, 看 DevTools console:
- "live2d.min.js not loaded" → Task 1 Step 2 顺序错了
- "404 on tororo.moc" → vite static asset 路径问题, 检查 `src/renderer/public/model/tororo/` 是否真的复制过去了
- "Cannot read property 'anchor' of undefined" → fit 函数里的 anchor 调用要换成 pivot, 见 Step 1 备注

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace vrm three.js stack with live2d stage (tororo)"
```

---

## Task 3: CursorTracker (鼠标跟随)

**Files:**
- Create: `src/renderer/stage/CursorTracker.ts`
- Create: `tests/cursor-tracker.test.ts`
- Modify: `src/renderer/App.tsx`

> pixi-live2d-display 的 `model.focus(x, y)` 接受 pixi stage 坐标 (像素), 内部归一化后映射到 ParamAngleX/Y/Z + ParamEyeBallX/Y。我们这里 canvas 跟 stage 同尺寸, 所以直接传 clientX-rect.left, clientY-rect.top 即可。但为了便于测试, 抽出纯函数 `clientToStage(rect, clientX, clientY) → {x, y}`。

- [ ] **Step 1: 写失败测试**

`tests/cursor-tracker.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clientToStage } from '../src/renderer/stage/CursorTracker'

describe('clientToStage', () => {
  it('returns (0,0) when client point is at rect top-left', () => {
    const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 100, 50)).toEqual({ x: 0, y: 0 })
  })

  it('returns (rect.width, rect.height) when client point is at rect bottom-right', () => {
    const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 100 + 280, 50 + 420)).toEqual({ x: 280, y: 420 })
  })

  it('returns center of rect when client point is rect center', () => {
    const rect = { left: 0, top: 0, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 140, 210)).toEqual({ x: 140, y: 210 })
  })

  it('returns negative values when client point is above-left of rect', () => {
    const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 80, 30)).toEqual({ x: -20, y: -20 })
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- cursor-tracker
```

Expected: FAIL, 模块不存在。

- [ ] **Step 3: 实现 CursorTracker**

`src/renderer/stage/CursorTracker.ts`:

```ts
import type { Live2DModel } from 'pixi-live2d-display'

export function clientToStage(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

export class CursorTracker {
  constructor(
    private readonly model: Live2DModel,
    private readonly canvas: HTMLCanvasElement,
  ) {
    window.addEventListener('mousemove', this.onMove)
  }

  private onMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    const { x, y } = clientToStage(rect, e.clientX, e.clientY)
    this.model.focus(x, y)
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMove)
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- cursor-tracker
```

Expected: PASS, 4 用例。

- [ ] **Step 5: 接入 App.tsx**

修改 `src/renderer/App.tsx` 第二个 useEffect 的 async block:

```tsx
;(async () => {
  try {
    const model = await stage.loadModel('./model/tororo/index.json')
    const { CursorTracker } = await import('./stage/CursorTracker')
    const tracker = new CursorTracker(model, canvasRef.current!)
    // 注意: cleanup 现在需要包括 tracker.dispose
    ;(stage as unknown as { __tracker: CursorTracker }).__tracker = tracker
  } catch (e) {
    console.error('Live2D model load failed', e)
  }
})()
```

并修改 cleanup return 句:

```tsx
return () => {
  detachDrag()
  ;(stage as unknown as { __tracker?: { dispose(): void } }).__tracker?.dispose()
  stage.dispose()
}
```

(暂时挂在 stage 对象上, Task 4 会引入正式的 controllers 容器。)

- [ ] **Step 6: typecheck + 全测试**

```bash
npm run typecheck
npm test
```

Expected: typecheck clean, 测试全过 (新增 4 用例)。

- [ ] **Step 7: 手动验证**

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

Expected: 鼠标在桌面上移动, Tororo 的眼睛/脸跟随。

- [ ] **Step 8: Commit**

```bash
git add src/renderer/stage/CursorTracker.ts tests/cursor-tracker.test.ts src/renderer/App.tsx
git commit -m "feat: live2d cursor tracking via model.focus"
```

---

## Task 4: MotionController (idle 循环 + 反应)

**Files:**
- Create: `src/renderer/stage/MotionController.ts`
- Create: `tests/motion-controller.test.ts`
- Modify: `src/renderer/App.tsx`

> 不依赖 pixi-live2d-display 真 runtime, 用 `MotionPlayer` 接口注入。MotionController 负责: 启动 idle 循环 + 计时 6-12s 切换 tap motion + 一次性反应 + 反应结束回 idle。

- [ ] **Step 1: 写失败测试**

`tests/motion-controller.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MotionController, type MotionPlayer } from '../src/renderer/stage/MotionController'

function buildMockPlayer(): MotionPlayer & { calls: Array<[string, number?]>, finishCb: (() => void) | null } {
  const player: any = {
    calls: [],
    finishCb: null,
    play: vi.fn(async (group: string, index?: number) => {
      player.calls.push([group, index])
    }),
    onMotionFinish: (cb: () => void) => { player.finishCb = cb; return () => { player.finishCb = null } },
  }
  return player
}

describe('MotionController', () => {
  let player: ReturnType<typeof buildMockPlayer>
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    player = buildMockPlayer()
  })

  it('plays idle motion immediately on start', () => {
    const c = new MotionController(player, { idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8 })
    c.start()
    expect(player.calls[0]).toEqual(['idle', 0])
  })

  it('plays a tap motion when timer elapses past nextSwitchAt', () => {
    const c = new MotionController(player, {
      idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8,
      minSwitchSec: 1, maxSwitchSec: 1,
    })
    c.start()
    player.calls.length = 0
    c.update(2)
    expect(player.calls[0][0]).toBe('tap_body')
    expect(player.calls[0][1]).toBeGreaterThanOrEqual(0)
    expect(player.calls[0][1]).toBeLessThan(8)
  })

  it('playReaction triggers a tap motion regardless of timer', () => {
    const c = new MotionController(player, { idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8 })
    c.start()
    player.calls.length = 0
    c.playReaction({ group: 'tap_body', index: 3 })
    expect(player.calls[0]).toEqual(['tap_body', 3])
  })

  it('returns to idle when reaction finishes', () => {
    const c = new MotionController(player, { idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8 })
    c.start()
    player.calls.length = 0
    c.playReaction({ group: 'tap_body', index: 3 })
    expect(player.calls.map((x: any) => x[0])).toEqual(['tap_body'])
    player.finishCb?.()
    expect(player.calls[player.calls.length - 1][0]).toBe('idle')
  })

  it('does not auto-cycle while a reaction is playing', () => {
    const c = new MotionController(player, {
      idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8,
      minSwitchSec: 1, maxSwitchSec: 1,
    })
    c.start()
    c.playReaction({ group: 'tap_body', index: 3 })
    player.calls.length = 0
    c.update(5)
    expect(player.calls).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- motion-controller
```

Expected: FAIL, 模块不存在。

- [ ] **Step 3: 实现 MotionController**

`src/renderer/stage/MotionController.ts`:

```ts
export interface MotionPlayer {
  play(group: string, index?: number): Promise<void>
  onMotionFinish(cb: () => void): () => void
}

export interface MotionControllerOptions {
  idleGroup: string
  tapGroup: string
  tapCount: number
  minSwitchSec?: number
  maxSwitchSec?: number
}

export interface MotionRef { group: string; index?: number }

export class MotionController {
  private readonly idleGroup: string
  private readonly tapGroup: string
  private readonly tapCount: number
  private readonly minSec: number
  private readonly maxSec: number

  private timer = 0
  private nextSwitchAt = 0
  private playingReaction = false
  private offFinish: (() => void) | null = null

  constructor(
    private readonly player: MotionPlayer,
    opts: MotionControllerOptions,
  ) {
    this.idleGroup = opts.idleGroup
    this.tapGroup = opts.tapGroup
    this.tapCount = opts.tapCount
    this.minSec = opts.minSwitchSec ?? 6
    this.maxSec = opts.maxSwitchSec ?? 12
  }

  start(): void {
    void this.player.play(this.idleGroup, 0)
    this.scheduleNext()
    this.offFinish = this.player.onMotionFinish(() => {
      if (this.playingReaction) {
        this.playingReaction = false
        void this.player.play(this.idleGroup, 0)
      }
    })
  }

  update(dt: number): void {
    if (this.playingReaction) return
    this.timer += dt
    if (this.timer < this.nextSwitchAt) return
    const idx = Math.floor(Math.random() * this.tapCount)
    void this.player.play(this.tapGroup, idx)
    this.scheduleNext()
  }

  playReaction(ref: MotionRef): void {
    this.playingReaction = true
    void this.player.play(ref.group, ref.index)
  }

  dispose(): void {
    this.offFinish?.()
    this.offFinish = null
  }

  private scheduleNext(): void {
    this.timer = 0
    this.nextSwitchAt = this.minSec + Math.random() * (this.maxSec - this.minSec)
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- motion-controller
```

Expected: PASS, 5 用例。

- [ ] **Step 5: 接入 App.tsx (含真实 MotionPlayer 适配)**

修改 `src/renderer/App.tsx` 第二个 useEffect, 在 cursor tracker 创建之后加:

```tsx
const { MotionController } = await import('./stage/MotionController')

// 真实 MotionPlayer: 直接用 model.motion / model.internalModel.motionManager
const player = {
  play: async (group: string, index?: number) => {
    await model.motion(group, index)
  },
  onMotionFinish: (cb: () => void) => {
    const handler = () => cb()
    const mgr = (model as unknown as {
      internalModel: { motionManager: { on(e: string, h: () => void): void; off(e: string, h: () => void): void } }
    }).internalModel.motionManager
    mgr.on('motionFinish', handler)
    return () => mgr.off('motionFinish', handler)
  },
}

const motion = new MotionController(player, {
  idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8,
})
motion.start()

// 用 PIXI ticker 驱动 update
const onTick = () => motion.update(stage.app.ticker.deltaMS / 1000)
stage.app.ticker.add(onTick)

;(stage as unknown as { __motion: typeof motion; __onTick: typeof onTick }).__motion = motion
;(stage as unknown as { __onTick: typeof onTick }).__onTick = onTick
```

修改 cleanup:

```tsx
return () => {
  detachDrag()
  const ext = stage as unknown as {
    __tracker?: { dispose(): void }
    __motion?: { dispose(): void }
    __onTick?: () => void
  }
  ext.__tracker?.dispose()
  ext.__motion?.dispose()
  if (ext.__onTick) stage.app.ticker.remove(ext.__onTick)
  stage.dispose()
}
```

- [ ] **Step 6: typecheck + 全测试**

```bash
npm run typecheck
npm test
```

Expected: 全过 (新增 5 用例)。

- [ ] **Step 7: 手动验证 idle 切换**

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

Expected: 静止 6-12s 后 Tororo 触发一次 tap motion (转头/甩尾/眨眼之类), 然后回 idle。鼠标继续跟随。

- [ ] **Step 8: Commit**

```bash
git add src/renderer/stage/MotionController.ts tests/motion-controller.test.ts src/renderer/App.tsx
git commit -m "feat: idle cycling and reaction motion controller"
```

---

## Task 5: motionMapper (文本 → 动作映射)

**Files:**
- Create: `src/renderer/stage/motionMapper.ts`
- Create: `tests/motion-mapper.test.ts`
- Delete: `src/renderer/scene/ExpressionController.ts`
- Delete: `tests/expression-mapper.test.ts`
- Delete: `src/renderer/scene/` (空目录)
- Modify: `src/renderer/App.tsx`

> 把 detectExpression 文本分类逻辑迁出, 加 mapToMotion 函数把 Expression → MotionRef。Tororo 反应库简单: happy/surprised → 随机 tap, sad/thinking → 同样随机 tap (无差异化资产), neutral → null。

- [ ] **Step 1: 写失败测试**

`tests/motion-mapper.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectExpression, mapToMotion } from '../src/renderer/stage/motionMapper'

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

describe('mapToMotion', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
  })

  it('returns null for neutral', () => {
    expect(mapToMotion('neutral', 8)).toBeNull()
  })

  it('returns a tap_body MotionRef for happy', () => {
    const r = mapToMotion('happy', 8)
    expect(r).toEqual({ group: 'tap_body', index: 3 }) // floor(0.4 * 8) = 3
  })

  it('returns a tap_body MotionRef for surprised, sad, thinking', () => {
    expect(mapToMotion('surprised', 8)?.group).toBe('tap_body')
    expect(mapToMotion('sad', 8)?.group).toBe('tap_body')
    expect(mapToMotion('thinking', 8)?.group).toBe('tap_body')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

```bash
npm test -- motion-mapper
```

Expected: FAIL, 模块不存在。

- [ ] **Step 3: 实现 motionMapper**

`src/renderer/stage/motionMapper.ts`:

```ts
import type { MotionRef } from './MotionController'

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

export function mapToMotion(expr: Expression, tapCount: number): MotionRef | null {
  if (expr === 'neutral') return null
  // Tororo 资产没有按情感区分的 motion, 全部反应都从 tap_body 池里随机
  const index = Math.floor(Math.random() * tapCount)
  return { group: 'tap_body', index }
}
```

- [ ] **Step 4: 跑测试,确认通过**

```bash
npm test -- motion-mapper
```

Expected: PASS, 9 用例 (6 detectExpression + 3 mapToMotion)。

- [ ] **Step 5: 删除旧 ExpressionController 和测试**

```bash
rm src/renderer/scene/ExpressionController.ts
rm tests/expression-mapper.test.ts
rmdir src/renderer/scene  # 应该空了
```

- [ ] **Step 6: 接入 App.tsx (chat.onDone → 反应)**

在 `src/renderer/App.tsx` 第二个 useEffect 内, motion controller 创建后, 加:

```tsx
const { detectExpression, mapToMotion } = await import('./stage/motionMapper')
;(window as any).__triggerMotion = (text: string) => {
  const expr = detectExpression(text)
  const ref = mapToMotion(expr, 8)
  if (ref) motion.playReaction(ref)
}
```

并替换/新增第三个 useEffect:

```tsx
useEffect(() => {
  const off = window.api.chat.onDone((fullText) => {
    ;(window as any).__triggerMotion?.(fullText)
  })
  return off
}, [])
```

- [ ] **Step 7: typecheck + 全测试**

```bash
npm run typecheck
npm test
```

Expected: 全过 (motion-mapper 新增 9 用例; expression-mapper 已删, 净增 3 用例; vrm 系列已 Task 2 删)。

- [ ] **Step 8: 手动验证 chat → 反应**

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

输 "你好,讲个笑话"。Expected: Claude 回复中含 "哈哈" → Tororo 立刻触发一次随机 tap motion, 结束后回 idle。

- [ ] **Step 9: Commit**

```bash
git add src/renderer/stage/motionMapper.ts tests/motion-mapper.test.ts src/renderer/App.tsx
git rm src/renderer/scene/ExpressionController.ts tests/expression-mapper.test.ts
git commit -m "feat: text-keyword to motion mapping for chat reactions"
```

---

## Task 6: README + first-time setup

**Files:**
- Modify: `README.md`

> 第三方资产合规说明 + 新机器首次配置流程。

- [ ] **Step 1: 重写 README.md 加新段落**

读取当前 `README.md` 确认结构 (前面任务可能已经有一些内容)。在末尾追加 (或合并已有 Setup 段):

```markdown
## First-time setup

桌宠资产因协议/体积原因不入 git, 新机器首次启动需要手动放置:

1. **Live2D Cubism 2 runtime** (~129KB)
   - 下载: <https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js>
   - 放到: `src/renderer/public/cubism/live2d.min.js`

2. **Live2D Cubism 4 core** (~207KB, 备用)
   - 下载: <https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js>
   - 放到: `src/renderer/public/cubism/live2dcubismcore.min.js`

3. **Tororo 模型** (~586KB)
   - 镜像源: <https://github.com/akyuu-cn/thermal-cat/tree/master/live2d_api/model/tororo>
   - 放到: `src/renderer/public/model/tororo/` (保留原目录结构: `index.json`, `tororo.pose.json`, `moc/`, `mtn/`)
   - 修订 `index.json` 把 motion group `""` 改为 `"tap_body"` (本仓库已修订, 直接用本仓库历史里的版本即可)

4. **环境变量** (Claude API 后端):
   - `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_MODEL`
   - 或 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`OPENAI_MODEL`

5. **`unset ELECTRON_RUN_AS_NODE`** 后再 `npm run dev`。

## Third-party assets and SDKs

桌宠用到的第三方组件:

- **Live2D Cubism Core SDK** © Live2D Inc. ([官网](https://www.live2d.com/) / [出版协议](https://www.live2d.com/en/sdk/license/)) — 个人 / 年营收 < 1000 万 JPY 商用免费, 不重发布二进制
- **Live2D Cubism 2 Web Runtime** (`live2d.min.js`) © Live2D Inc., 通过 [dylanNew/live2d](https://github.com/dylanNew/live2d) 镜像取得
- **Tororo sample 模型** © Live2D Inc. ([sample 协议](https://www.live2d.com/en/learn/sample/)) — 仅学习与原型, 不重发布; 通过 [akyuu-cn/thermal-cat](https://github.com/akyuu-cn/thermal-cat) 镜像取得
- **pixi.js** (MIT) — 2D WebGL 渲染基础
- **pixi-live2d-display** (MIT) — pixi 上的 Cubism 适配, 由 [@guansss](https://github.com/guansss/pixi-live2d-display) 维护
```

> 如果当前 README 已经有 Setup 或 Third-party 段, 合并不要重复; 如果完全没有 README 或只有最简版, 建议在最上面留 1-2 行项目简介, 再加两段。

- [ ] **Step 2: typecheck + 测试 (无源码改动, 应直接过)**

```bash
npm run typecheck
npm test
```

Expected: 全过, 数字不变。

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: third-party attribution and live2d setup instructions"
```

---

## Task 7: 手动验收清单 + 最终验证

**Files:**
- Modify: `docs/manual-test-checklist.md`

- [ ] **Step 1: 重写 manual-test-checklist.md**

完整覆盖 `docs/manual-test-checklist.md`:

```markdown
# Desktop_Pal MVP Manual Test Checklist (Live2D Tororo)

## 前置

- [ ] Windows 10/11
- [ ] 环境变量: `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL` (或 OPENAI 那一组)
- [ ] `src/renderer/public/cubism/live2d.min.js` 存在 (按 README 首次配置流程)
- [ ] `src/renderer/public/cubism/live2dcubismcore.min.js` 存在
- [ ] `src/renderer/public/model/tororo/index.json` 存在 (含 `tap_body` motion group)
- [ ] `src/renderer/public/model/tororo/moc/tororo.moc` 和纹理 PNG 存在
- [ ] `npm install` 已完成

## Dev 模式

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

- [ ] 启动后右下角出现 280×420 透明 Tororo 窗口
- [ ] Tororo 白猫静态出现, 背景透出桌面 (无黑底)
- [ ] 鼠标在屏幕上移动时, Tororo 的眼睛 / 脸跟随
- [ ] 静止 6-12 秒后, Tororo 触发一次随机 tap motion (转头 / 眨眼 / 甩尾), 结束后回 idle
- [ ] 在 Tororo 上左键拖动 → 整窗移动
- [ ] 输入 "你好" 回车 → 顶部气泡流式 Claude 回复, 流式时光标 ▍ 闪烁, 完成后消失
- [ ] 回复中含 "哈哈" "笑" → 立刻触发 tap motion 反应, 结束自动回 idle
- [ ] 右键 → 弹菜单 (Settings / Quit)
- [ ] 点 Settings → 切换 provider, 改 Base URL/Model/Token, 保存
- [ ] 重启程序后设置保留 (token 字段显示"已设置"占位)
- [ ] 切到 OpenAI-Compatible (填 DeepSeek 等) → 同样能聊
- [ ] 系统托盘有图标, 右键有 Show/Hide/Quit
- [ ] 鼠标在 Tororo 周围空白区域点击 → 穿透到下方桌面 / 窗口

## 已知 / 接受的问题

- [ ] canvas 全画布命中 (Tororo 周围空白处也不穿透) → 接受, 后续优化
- [ ] Tororo motion 不区分情感, 所有正向反应都从同一个 tap 池随机 → 接受, 后续换有 expression group 的真白猫

## Build & 安装

```bash
npm run build
npm run dist
```

- [ ] `release/Desktop_Pal Setup *.exe` 生成
- [ ] 在干净的 Windows 上安装 (Tororo 资产需要先复制到安装目录或预打包到 extraResources, 见 electron-builder.yml)
- [ ] 桌面 / 开始菜单出现 Desktop_Pal 图标
- [ ] 启动 → 全部 dev 模式的功能可复现
```

- [ ] **Step 2: 跑完整测试链**

```bash
npm test
npm run typecheck
npm run build
```

Expected: 全过, `out/main/index.cjs`, `out/preload/index.cjs`, `out/renderer/index.html` + assets 全部生成无错。

- [ ] **Step 3: 启动 dev 走一遍清单**

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

按 `docs/manual-test-checklist.md` 逐项打勾。任何 FAIL 项 → 单独 commit 修复, 不要堆到本任务。

- [ ] **Step 4: Commit**

```bash
git add docs/manual-test-checklist.md
git commit -m "test: live2d-adapted manual checklist and verification"
```

---

## Verification (整个 plan 完成后)

```bash
cd d:/_Personal/Desktop_Pal
npm test           # 应该 ~13 文件 / ~40+ tests 全过 (删了 4 个 vrm 文件, 新增 cursor-tracker / motion-controller / motion-mapper)
npm run typecheck  # 干净
npm run build      # out/ 完整, 没有 vrm/three 引用残留
```

期望文件结构:

```
src/renderer/
  stage/                            ← 新
    Live2DStage.ts
    CursorTracker.ts
    MotionController.ts
    motionMapper.ts
  scene/                            ← 已删
  app/                              ← 不变
    DragController.ts
    ContextMenu.tsx
    passthrough.ts
  chat/                             ← 不变
    ChatBubble.tsx
    ChatInput.tsx
    useChatStream.ts
  settings/                         ← 不变
  App.tsx
  main.tsx
  index.html
  styles.css
  public/
    cubism/                         ← Live2D runtime (gitignored)
    model/tororo/                   ← Tororo (gitignored)
src/main/                           ← 完全不动
src/preload/                        ← 完全不动
tests/
  cursor-tracker.test.ts            ← 新
  motion-controller.test.ts         ← 新
  motion-mapper.test.ts             ← 新 (替换 expression-mapper)
  drag-controller.test.ts           ← 不变
  passthrough.test.ts               ← 不变
  use-chat-stream.test.tsx          ← 不变
  chat-service.test.ts              ← 不变
  chat-session.test.ts              ← 不变
  provider-factory.test.ts          ← 不变
  settings-defaults.test.ts         ← 不变
  settings-store.test.ts            ← 不变
  smoke.test.ts                     ← 不变
  window-config.test.ts             ← 不变
```

```
package.json deps 应不再含: three, @types/three, @pixiv/three-vrm, @pixiv/three-vrm-animation
package.json deps 应含: pixi.js@^7.4.x, pixi-live2d-display@^0.4.x
```

手动验收 (按 `docs/manual-test-checklist.md`):
1. Tororo 显示, 背景透出桌面
2. 鼠标动 → 猫脸/眼跟随
3. 静默 6-12s → tap motion 切换
4. "你好" → 流式回复
5. 回复含 "哈哈" → 触发 tap motion
6. 拖窗 / 右键菜单 / Settings / Quit 全 OK
