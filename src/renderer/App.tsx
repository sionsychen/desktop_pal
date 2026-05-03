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
