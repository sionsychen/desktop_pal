import { useState, type KeyboardEvent } from 'react'

interface Props { disabled?: boolean; onSubmit: (text: string) => void }

export function ChatInput({ disabled, onSubmit }: Props) {
  const [v, setV] = useState('')
  const [focused, setFocused] = useState(false)
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && v.trim() && !disabled) {
      onSubmit(v.trim())
      setV('')
    }
  }
  return (
    <div
      data-interactive="true"
      className="rounded-full backdrop-blur-md flex items-center gap-2 pl-3 pr-2 py-1.5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,236,242,0.88) 100%)',
        border: focused
          ? '1.5px solid rgba(245,163,184,0.85)'
          : '1px solid rgba(255,182,193,0.55)',
        boxShadow: focused
          ? '0 4px 18px -2px rgba(245,163,184,0.45), 0 0 0 4px rgba(255,209,221,0.35)'
          : '0 2px 10px -2px rgba(245,163,184,0.25)',
        transition: 'all 180ms ease',
      }}
    >
      <span
        aria-hidden
        style={{ color: focused ? '#f5a3b8' : '#e7b8c5', transition: 'color 180ms ease' }}
        className="text-base leading-none select-none"
      >
        ✦
      </span>
      <input
        className="flex-1 min-w-0 bg-transparent text-neutral-700 text-sm outline-none"
        style={{
          fontFamily: '"PingFang SC", "Hiragino Sans", system-ui, sans-serif',
          letterSpacing: '0.01em',
        }}
        placeholder={disabled ? '回复中…' : '说点什么…'}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
      />
      <kbd
        className="text-[10px] px-1.5 py-0.5 rounded-md select-none"
        style={{
          background: 'rgba(255,182,193,0.25)',
          color: '#b06b80',
          border: '1px solid rgba(255,182,193,0.4)',
          opacity: v.trim() && !disabled ? 1 : 0.45,
          transition: 'opacity 180ms ease',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Enter ↵
      </kbd>
    </div>
  )
}
