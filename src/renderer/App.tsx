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
