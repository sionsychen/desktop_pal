import { describe, it, expect } from 'vitest'
import { DragGesture } from '../src/renderer/app/DragController'

describe('DragGesture', () => {
  it('classifies short small-movement release as click', () => {
    const g = new DragGesture()
    const now = 0
    g.onDown({ x: 100, y: 100, t: now })
    g.onMove({ x: 102, y: 101, t: now + 100 })
    const r = g.onUp({ x: 102, y: 101, t: now + 200 })
    expect(r).toBe('click')
  })

  it('classifies movement past threshold as drag (no click)', () => {
    const g = new DragGesture()
    g.onDown({ x: 100, y: 100, t: 0 })
    g.onMove({ x: 130, y: 100, t: 50 })
    const r = g.onUp({ x: 130, y: 100, t: 100 })
    expect(r).toBe('drag-end')
  })

  it('emits incremental dx/dy during drag', () => {
    const g = new DragGesture()
    g.onDown({ x: 100, y: 100, t: 0 })
    expect(g.onMove({ x: 110, y: 105, t: 10 })).toEqual({ phase: 'move', dx: 10, dy: 5 })
    expect(g.onMove({ x: 115, y: 108, t: 20 })).toEqual({ phase: 'move', dx: 5, dy: 3 })
  })

  it('long press without movement is still click (not long-press in MVP)', () => {
    const g = new DragGesture()
    g.onDown({ x: 100, y: 100, t: 0 })
    const r = g.onUp({ x: 100, y: 100, t: 800 })
    expect(r).toBe('click')
  })
})
