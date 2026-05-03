export interface PointerSample { x: number; y: number; t: number }
export type GestureResult = 'click' | 'drag-end' | null
export interface MoveDelta { phase: 'move'; dx: number; dy: number }

const DRAG_THRESHOLD_PX = 5

export class DragGesture {
  private start: PointerSample | null = null
  private last: PointerSample | null = null
  private dragging = false
  private totalDx = 0
  private totalDy = 0

  onDown(p: PointerSample): void {
    this.start = p
    this.last = p
    this.dragging = false
    this.totalDx = 0
    this.totalDy = 0
  }

  onMove(p: PointerSample): MoveDelta | null {
    if (!this.start || !this.last) return null
    const dx = p.x - this.last.x
    const dy = p.y - this.last.y
    this.totalDx += Math.abs(dx)
    this.totalDy += Math.abs(dy)
    this.last = p
    if (!this.dragging) {
      const distFromStart = Math.hypot(p.x - this.start.x, p.y - this.start.y)
      if (distFromStart >= DRAG_THRESHOLD_PX) this.dragging = true
    }
    if (this.dragging) return { phase: 'move', dx, dy }
    return null
  }

  onUp(_p: PointerSample): GestureResult {
    const wasDragging = this.dragging
    this.start = null
    this.last = null
    this.dragging = false
    return wasDragging ? 'drag-end' : 'click'
  }
}

export interface DragCallbacks {
  onMove: (dx: number, dy: number) => void
  onClick: () => void
}

export function attachDrag(target: HTMLElement, cb: DragCallbacks): () => void {
  const g = new DragGesture()
  const sample = (e: PointerEvent): PointerSample => ({ x: e.clientX, y: e.clientY, t: e.timeStamp })

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    target.setPointerCapture(e.pointerId)
    g.onDown(sample(e))
  }
  const onMove = (e: PointerEvent) => {
    const r = g.onMove(sample(e))
    if (r) cb.onMove(r.dx, r.dy)
  }
  const onUp = (e: PointerEvent) => {
    if (e.button !== 0) return
    target.releasePointerCapture(e.pointerId)
    const r = g.onUp(sample(e))
    if (r === 'click') cb.onClick()
  }

  target.addEventListener('pointerdown', onDown)
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)

  return () => {
    target.removeEventListener('pointerdown', onDown)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
  }
}
