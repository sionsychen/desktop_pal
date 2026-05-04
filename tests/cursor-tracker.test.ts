import { describe, it, expect } from 'vitest'
import { clientToStage } from '../src/renderer/stage/CursorTracker'

describe('clientToStage', () => {
  it('returns (0,0) when client point is at rect top-left', () => {
    const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 100, 50)).toEqual({ x: 0, y: 0 })
  })

  it('returns (rect.width, rect.height) when client point is at rect bottom-right', () => {
    const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 100 + 280, 50 + 420)).toEqual({ x: 280, y: 420 })
  })

  it('returns center of rect when client point is rect center', () => {
    const rect = { left: 0, top: 0, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 140, 210)).toEqual({ x: 140, y: 210 })
  })

  it('returns negative asymmetric values when client point is above-left of rect', () => {
    const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 80, 30)).toEqual({ x: -20, y: -20 })
  })

  it('catches x/y swap with asymmetric deltas', () => {
    const rect = { left: 10, top: 20, width: 280, height: 420 } as DOMRect
    expect(clientToStage(rect, 50, 30)).toEqual({ x: 40, y: 10 })
  })
})
