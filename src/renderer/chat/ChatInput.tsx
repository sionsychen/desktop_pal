import { useState, type KeyboardEvent } from 'react'

interface Props { disabled?: boolean; onSubmit: (text: string) => void }

export function ChatInput({ disabled, onSubmit }: Props) {
  const [v, setV] = useState('')
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && v.trim() && !disabled) {
      onSubmit(v.trim())
      setV('')
    }
  }
  return (
    <input
      data-interactive="true"
      className="w-full bg-neutral-800 text-white rounded px-3 py-2 outline-none placeholder-neutral-500"
      placeholder={disabled ? '回复中...' : '说点什么 (Enter)'}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={onKey}
      autoFocus
    />
  )
}
