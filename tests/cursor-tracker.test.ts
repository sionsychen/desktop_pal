import { describe, it, expect } from 'vitest'
import { clientToStage, distanceToRect } from '../src/renderer/stage/CursorTracker'

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

describe('distanceToRect', () => {
  const rect = { left: 100, top: 50, width: 280, height: 420 } as DOMRect

  it('returns 0 when point is inside the rect', () => {
    expect(distanceToRect(rect, 200, 200)).toBe(0)
    expect(distanceToRect(rect, 100, 50)).toBe(0)        // top-left corner
    expect(distanceToRect(rect, 380, 470)).toBe(0)       // bottom-right corner
  })

  it('returns positive distance when point is left of rect', () => {
    expect(distanceToRect(rect, 50, 200)).toBe(50)       // 50px left
  })

  it('returns positive distance when point is below rect', () => {
    expect(distanceToRect(rect, 200, 600)).toBe(130)     // 130px below
  })

  it('returns hypot distance for diagonal cases', () => {
    // 30px left, 40px above → hypot(30,40)=50
    expect(distanceToRect(rect, 70, 10)).toBe(50)
  })
})
