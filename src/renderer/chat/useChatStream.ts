import { useCallback, useEffect, useRef, useState } from 'react'

export interface ChatStreamApi {
  text: string
  streaming: boolean
  error: string | null
  send: (text: string) => void
  abort: () => void
  reset: () => void
}

export function useChatStream(): ChatStreamApi {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const offRef = useRef<Array<() => void>>([])

  useEffect(() => {
    const offDelta = window.api.chat.onDelta((t) => setText((p) => p + t))
    const offDone = window.api.chat.onDone(() => setStreaming(false))
    const offErr = window.api.chat.onError((m) => { setError(m); setStreaming(false) })
    const offCleared = window.api.chat.onCleared(() => {
      setText(''); setError(null); setStreaming(false)
    })
    offRef.current = [offDelta, offDone, offErr, offCleared]
    return () => offRef.current.forEach((fn) => fn())
  }, [])

  const send = useCallback((t: string) => {
    setText('')
    setError(null)
    setStreaming(true)
    window.api.chat.send(t)
  }, [])

  const abort = useCallback(() => {
    window.api.chat.abort()
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    setText('')
    setError(null)
    setStreaming(false)
  }, [])

  return { text, streaming, error, send, abort, reset }
}
