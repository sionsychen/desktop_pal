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
  const [chatOpen, setChatOpen] = useState(false)
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
      const idle = new (await import('./scene/IdleController')).IdleController(vrm)
      const lookAt = new (await import('./scene/MouseLookAt')).MouseLookAt(
        vrm, stage.camera, stage.renderer.domElement,
      )
      stage.addUpdater((dt) => idle.update(dt))
      stage.addUpdater((dt) => lookAt.update(dt))
      const expr = new (await import('./scene/ExpressionController')).ExpressionController(vrm)
      stage.addUpdater((dt) => expr.update(dt))
      ;(window as any).__triggerExpr = (t: string) => expr.trigger(t)
    })()
    const detachDrag = attachDrag(canvasRef.current, {
      onMove: (dx, dy) => window.api.window.moveBy(dx, dy),
      onClick: () => setChatOpen((v) => !v),
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
        { label: 'Settings...', onClick: () => setSettingsOpen(true) },
        { label: 'Quit', onClick: () => window.api.window.quit() },
      ]} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
