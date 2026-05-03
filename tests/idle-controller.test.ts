import { describe, it, expect, vi } from 'vitest'
import { IdleStateMachine, type IdleState } from '../src/renderer/scene/IdleController'

describe('IdleStateMachine', () => {
  it('starts in breathe state', () => {
    const fsm = new IdleStateMachine(['breathe', 'sway', 'hairtouch'])
    expect(fsm.current).toBe('breathe')
  })

  it('switches to a different state when timer elapses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // pick last
    const fsm = new IdleStateMachine(['breathe', 'sway', 'hairtouch'], { minSec: 1, maxSec: 1 })
    fsm.update(2) // exceed
    expect(fsm.current).not.toBe('breathe')
    vi.restoreAllMocks()
  })

  it('never picks the same state twice in a row when alternatives exist', () => {
    const fsm = new IdleStateMachine(['breathe', 'sway'], { minSec: 0.1, maxSec: 0.1 })
    const seen: IdleState[] = [fsm.current]
    for (let i = 0; i < 5; i++) {
      fsm.update(1)
      seen.push(fsm.current)
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).not.toBe(seen[i - 1])
    }
  })

  it('with single state never switches', () => {
    const fsm = new IdleStateMachine(['breathe'], { minSec: 0.1, maxSec: 0.1 })
    fsm.update(10)
    expect(fsm.current).toBe('breathe')
  })
})
