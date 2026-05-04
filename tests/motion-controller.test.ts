import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MotionController, type MotionPlayer } from '../src/renderer/stage/MotionController'

function buildMockPlayer(): MotionPlayer & { calls: Array<[string, number?]>, finishCb: (() => void) | null } {
  const player: any = {
    calls: [],
    finishCb: null,
    play: vi.fn(async (group: string, index?: number) => {
      player.calls.push([group, index])
    }),
    onMotionFinish: (cb: () => void) => { player.finishCb = cb; return () => { player.finishCb = null } },
  }
  return player
}

describe('MotionController', () => {
  let player: ReturnType<typeof buildMockPlayer>
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    player = buildMockPlayer()
  })

  it('plays idle motion immediately on start', () => {
    const c = new MotionController(player, { idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8 })
    c.start()
    expect(player.calls[0]).toEqual(['idle', 0])
  })

  it('plays a tap motion when timer elapses past nextSwitchAt', () => {
    const c = new MotionController(player, {
      idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8,
      minSwitchSec: 1, maxSwitchSec: 1,
    })
    c.start()
    player.calls.length = 0
    c.update(2)
    expect(player.calls[0][0]).toBe('tap_body')
    expect(player.calls[0][1]).toBeGreaterThanOrEqual(0)
    expect(player.calls[0][1]).toBeLessThan(8)
  })

  it('playReaction triggers a tap motion regardless of timer', () => {
    const c = new MotionController(player, { idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8 })
    c.start()
    player.calls.length = 0
    c.playReaction({ group: 'tap_body', index: 3 })
    expect(player.calls[0]).toEqual(['tap_body', 3])
  })

  it('returns to idle when reaction finishes', () => {
    const c = new MotionController(player, { idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8 })
    c.start()
    player.calls.length = 0
    c.playReaction({ group: 'tap_body', index: 3 })
    expect(player.calls.map((x: any) => x[0])).toEqual(['tap_body'])
    player.finishCb?.()
    expect(player.calls[player.calls.length - 1][0]).toBe('idle')
  })

  it('does not auto-cycle while a reaction is playing', () => {
    const c = new MotionController(player, {
      idleGroup: 'idle', tapGroup: 'tap_body', tapCount: 8,
      minSwitchSec: 1, maxSwitchSec: 1,
    })
    c.start()
    c.playReaction({ group: 'tap_body', index: 3 })
    player.calls.length = 0
    c.update(5)
    expect(player.calls).toEqual([])
  })
})
