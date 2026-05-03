import { useEffect, useRef, useState } from 'react'
import { startPassthroughLoop } from './app/passthrough'
import { VrmStage } from './scene/VrmStage'
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
    const stage = new VrmStage(canvasRef.current)
    stage.start()
    ;(async () => {
      const vrm = await stage.loadVrm('./default.vrm').catch((e) => { console.error(e); return null })
      if (!vrm) return
      const { IdleController } = await import('./scene/IdleController')
      const idle = new IdleController(vrm)
      const lookAt = new (await import('./scene/MouseLookAt')).MouseLookAt(
        vrm, stage.camera, stage.renderer.domElement,
      )
      // animation mixer must update BEFORE lookAt so head IK overrides idle head bone
      stage.addUpdater((dt) => idle.update(dt))
      stage.addUpdater((dt) => lookAt.update(dt))
      const { ExpressionController, detectExpression } = await import('./scene/ExpressionController')
      const expr = new ExpressionController(vrm)
      stage.addUpdater((dt) => expr.update(dt))
      ;(window as any).__triggerExpr = (t: string) => {
        expr.trigger(t)
        idle.playReaction(IdleController.reactionFor(detectExpression(t)))
      }
    })()
    const detachDrag = attachDrag(canvasRef.current, {
      onMove: (dx, dy) => window.api.window.moveBy(dx, dy),
      onClick: () => { /* drag-to-move only; input is always visible */ },
    })
    return () => { detachDrag(); stage.dispose() }
  }, [])

  useEffect(() => {
    const off = window.api.chat.onDone((fullText) => {
      ;(window as any).__triggerExpr?.(fullText)
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
      <div
        data-interactive="true"
        className="absolute bottom-2 left-2 right-2"
      >
        <ChatInput
          disabled={chat.streaming}
          onSubmit={(t) => chat.send(t)}
        />
      </div>
      <ContextMenu items={[
        { label: 'Settings...', onClick: () => setSettingsOpen(true) },
        { label: 'Quit', onClick: () => window.api.window.quit() },
      ]} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
