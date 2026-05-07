import { useEffect, useRef, useState } from 'react'
import { startPassthroughLoop } from './app/passthrough'
import { Live2DStage } from './stage/Live2DStage'
import { CursorTracker } from './stage/CursorTracker'
import { MotionController, type MotionPlayer } from './stage/MotionController'
import { detectExpression, mapToMotion } from './stage/motionMapper'
import { attachDrag } from './app/DragController'
import { ContextMenu } from './app/ContextMenu'
import { useChatStream } from './chat/useChatStream'
import { ChatInput } from './chat/ChatInput'
import { ChatBubble } from './chat/ChatBubble'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Live2DStage | null>(null)
  const [modelPath, setModelPath] = useState<string>('./model/tororo/tororo.model.json')
  const chat = useChatStream()

  // 首次启动: 检测是否还没填任何 token, 自动打开独立设置窗口
  useEffect(() => {
    let cancelled = false
    void window.api.settings.get().then((r) => {
      if (cancelled) return
      if (r.settings.modelPath) setModelPath(r.settings.modelPath)
      if (!r.hasAnthropic && !r.hasOpenAI) {
        window.api.settings.openWindow()
      }
    })
    return () => { cancelled = true }
  }, [])

  // 模型路径变更: 通过 IPC 推到 state, 让 stage useEffect 重跑
  useEffect(() => {
    const off = window.api.stage.onReloadModel((newPath) => {
      setModelPath(newPath || './model/tororo/tororo.model.json')
    })
    return off
  }, [])

  useEffect(() =>
    startPassthroughLoop(
      (i) => window.api.window.setPassthrough(i),
      { extraHit: (x, y) => stageRef.current?.containsPoint(x, y) ?? false },
    ),
  [])

  useEffect(() => {
    if (!canvasRef.current) return
    const stage = new Live2DStage(canvasRef.current)
    stageRef.current = stage
    let cancelled = false
    let tracker: { dispose(): void } | null = null
    let motionRef: { dispose(): void } | null = null
    let tickRef: (() => void) | null = null
    let triggerRef: ((text: string) => void) | null = null
    ;(async () => {
      try {
        const model = await stage.loadModel(modelPath)
        if (cancelled) { stage.model?.destroy?.(); return }
        tracker = new CursorTracker(model, canvasRef.current!)
        const player: MotionPlayer = {
          play: async (group: string, index?: number) => {
            await (model as unknown as { motion(g: string, i?: number): Promise<unknown> }).motion(group, index)
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
        if (cancelled) { stage.model?.destroy?.(); return }
        const motion = new MotionController(player, {
          idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8,
          // idle 期间 30-90s 偶尔来一个 tap, 制造"猫咪自己在玩/伸懒腰"感
          minSwitchSec: 30, maxSwitchSec: 90,
        })
        motionRef = motion
        motion.start()
        const onTick = () => {
          try {
            ;(model as unknown as { update(dt: number): void }).update(stage.app.ticker.deltaMS)
            motion.update(stage.app.ticker.deltaMS / 1000)
          } catch (e) {
            console.error('motion.update threw', e)
          }
        }
        tickRef = onTick
        stage.app.ticker.add(onTick)
        triggerRef = (text: string) => {
          const expr = detectExpression(text)
          const ref = mapToMotion(expr, 8)
          if (ref) motion.playReaction(ref)
        }
        ;(window as unknown as { __triggerMotion?: (t: string) => void }).__triggerMotion = triggerRef
      } catch (e) {
        if (!cancelled) console.error('Live2D model load failed', e)
      }
    })()
    const detachDrag = attachDrag(canvasRef.current, {
      onMove: (dx, dy) => window.api.window.moveBy(dx, dy),
      onClick: () => { /* drag-to-move only */ },
    })
    return () => {
      cancelled = true
      tracker?.dispose()
      motionRef?.dispose()
      if (tickRef) stage.app.ticker.remove(tickRef)
      detachDrag()
      stage.dispose()
      stageRef.current = null
      ;(window as unknown as { __triggerMotion?: (t: string) => void }).__triggerMotion = undefined
      triggerRef = null
    }
  }, [modelPath])

  useEffect(() => {
    const off = window.api.chat.onDone((fullText) => {
      ;(window as unknown as { __triggerMotion?: (t: string) => void }).__triggerMotion?.(fullText)
    })
    return off
  }, [])

  return (
    <div className="w-screen h-screen flex flex-col justify-end">
      {/* 气泡: content-driven 高度, 无内容时 return null → 0px, 鼠标可穿透 */}
      <div className="flex-none px-2">
        <ChatBubble text={chat.text} streaming={chat.streaming} error={chat.error} />
      </div>

      {/* 猫: 固定高度, 永远在此 */}
      <div className="flex-none relative" style={{ height: 260 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ background: 'transparent', cursor: 'grab' }}
        />
      </div>

      {/* 输入框 */}
      <div data-interactive="true" className="flex-none px-2 pb-2 pt-1">
        <ChatInput disabled={chat.streaming} onSubmit={(t) => chat.send(t)} />
      </div>

      <ContextMenu items={[
        { label: 'Settings...', onClick: () => window.api.settings.openWindow() },
        { label: 'Quit', onClick: () => window.api.window.quit() },
      ]} />
    </div>
  )
}
