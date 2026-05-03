import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatStream } from '../src/renderer/chat/useChatStream'

describe('useChatStream', () => {
  let deltaCb: ((t: string) => void) | null = null
  let doneCb: ((t: string) => void) | null = null
  let errCb: ((m: string) => void) | null = null
  let sentText: string | null = null

  beforeEach(() => {
    deltaCb = null; doneCb = null; errCb = null; sentText = null
    ;(globalThis as any).window.api = {
      chat: {
        send: (text: string) => { sentText = text },
        abort: vi.fn(),
        onDelta: (cb: any) => { deltaCb = cb; return () => { deltaCb = null } },
        onDone: (cb: any) => { doneCb = cb; return () => { doneCb = null } },
        onError: (cb: any) => { errCb = cb; return () => { errCb = null } },
      },
    }
  })

  it('aggregates deltas into text and marks done', async () => {
    const { result } = renderHook(() => useChatStream())
    act(() => { result.current.send('hi') })
    expect(sentText).toBe('hi')
    expect(result.current.streaming).toBe(true)
    act(() => { deltaCb?.('Hel'); deltaCb?.('lo') })
    expect(result.current.text).toBe('Hello')
    act(() => { doneCb?.('Hello') })
    expect(result.current.streaming).toBe(false)
    expect(result.current.text).toBe('Hello')
  })

  it('captures error messages', () => {
    const { result } = renderHook(() => useChatStream())
    act(() => { result.current.send('x') })
    act(() => { errCb?.('boom') })
    expect(result.current.error).toBe('boom')
    expect(result.current.streaming).toBe(false)
  })
})
