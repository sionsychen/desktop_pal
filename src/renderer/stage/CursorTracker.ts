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

export class CursorTracker {
  constructor(
    private readonly model: Live2DModel,
    private readonly canvas: HTMLCanvasElement,
  ) {
    window.addEventListener('mousemove', this.onMove)
  }

  private onMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    const { x, y } = clientToStage(rect, e.clientX, e.clientY)
    this.model.focus(x, y)
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMove)
  }
}
