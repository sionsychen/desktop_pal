export function isInteractiveAtPoint(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y)
  if (!el) return false
  return el.closest('[data-interactive="true"]') !== null
}

export type PassthroughCallback = (interactive: boolean) => void

export interface PassthroughOptions {
  intervalMs?: number
  /** 额外的命中测试,通常用于 Live2D 模型像素/包围盒命中。返回 true 时也算交互区 */
  extraHit?: (x: number, y: number) => boolean
}

export function startPassthroughLoop(cb: PassthroughCallback, opts: PassthroughOptions | number = {}): () => void {
  // 兼容旧签名 startPassthroughLoop(cb, 100)
  const options: PassthroughOptions = typeof opts === 'number' ? { intervalMs: opts } : opts
  const intervalMs = options.intervalMs ?? 100
  let lastInteractive = false
  let mouseX = 0
  let mouseY = 0

  const onMove = (e: MouseEvent) => {
    mouseX = e.clientX
    mouseY = e.clientY
  }
  window.addEventListener('mousemove', onMove)

  const timer = setInterval(() => {
    const domHit = isInteractiveAtPoint(mouseX, mouseY)
    const catHit = options.extraHit ? options.extraHit(mouseX, mouseY) : false
    const interactive = domHit || catHit
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
