import type { Live2DModel } from 'pixi-live2d-display'

export function clientToStage(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

/** 鼠标距离 canvas 矩形最近边的距离, 在矩形内部为 0 */
export function distanceToRect(rect: DOMRect, clientX: number, clientY: number): number {
  const dx = Math.max(rect.left - clientX, 0, clientX - (rect.left + rect.width))
  const dy = Math.max(rect.top - clientY, 0, clientY - (rect.top + rect.height))
  return Math.hypot(dx, dy)
}

export class CursorTracker {
  /** 鼠标距 canvas 边缘超过此像素时, 头部回正不再追踪 */
  static readonly TRACK_RADIUS_PX = 220

  constructor(
    private readonly model: Live2DModel,
    private readonly canvas: HTMLCanvasElement,
  ) {
    window.addEventListener('mousemove', this.onMove)
  }

  private onMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    if (distanceToRect(rect, e.clientX, e.clientY) > CursorTracker.TRACK_RADIUS_PX) {
      // 鼠标远离猫窗,头部回到正前方
      this.model.focus(rect.width / 2, rect.height / 2)
      return
    }
    const { x, y } = clientToStage(rect, e.clientX, e.clientY)
    this.model.focus(x, y)
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMove)
  }
}
