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
import { SettingsPanel } from './settings/SettingsPanel'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const chat = useChatStream()

  useEffect(() => startPassthroughLoop((i) => window.api.window.setPassthrough(i)), [])

  useEffect(() => {
    if (!canvasRef.current) return
    const stage = new Live2DStage(canvasRef.current)
    let cancelled = false
    let tracker: { dispose(): void } | null = null
    let motionRef: { dispose(): void } | null = null
    let tickRef: (() => void) | null = null
    let triggerRef: ((text: string) => void) | null = null
    ;(async () => {
      try {
        const model = await stage.loadModel('./model/tororo/tororo.model.json')
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
        })
        motionRef = motion
        motion.start()
        const onTick = () => {
          try {
            // Live2DModel.registerTicker 在 pixi v7 下没自动挂上, 手动驱动
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
      ;(window as unknown as { __triggerMotion?: (t: string) => void }).__triggerMotion = undefined
      triggerRef = null
    }
  }, [])

  useEffect(() => {
    const off = window.api.chat.onDone((fullText) => {
      ;(window as unknown as { __triggerMotion?: (t: string) => void }).__triggerMotion?.(fullText)
    })
    return off
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
