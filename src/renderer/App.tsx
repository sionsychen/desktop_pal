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

  return (
    <div className="w-screen h-screen relative">
      <canvas ref={canvasRef} className="w-full h-full block" style={{ background: 'transparent' }} />
      <div data-interactive="true" className="absolute top-2 right-2 bg-black/60 text-white text-xs p-2 rounded select-none">
        <button onClick={() => window.api.window.quit()}>Quit</button>
      </div>
    </div>
  )
}
