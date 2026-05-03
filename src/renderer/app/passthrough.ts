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
