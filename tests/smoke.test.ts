import { describe, it, expect } from 'vitest'
import { Channels } from '../src/shared/channels'

describe('smoke', () => {
  it('channels constants are defined', () => {
    expect(Channels.ChatSend).toBe('chat:send')
    expect(Object.keys(Channels).length).toBeGreaterThan(5)
  })
})
