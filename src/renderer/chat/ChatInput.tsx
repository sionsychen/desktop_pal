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
  const ringColor = focused ? '#ff6fa3' : '#5b3a52'
  return (
    <div
      data-interactive="true"
      className="relative flex items-center gap-2 pl-3 pr-1.5 py-1.5 select-none"
      style={{
        borderRadius: 9999,
        background: 'linear-gradient(180deg, #ffffff 0%, #fff0f5 55%, #ffd6e6 100%)',
        border: `2.5px solid ${ringColor}`,
        boxShadow: focused
          ? `0 4px 0 0 ${ringColor}, 0 0 0 4px rgba(255,182,210,0.35)`
          : `0 4px 0 0 ${ringColor}`,
        transition: 'all 160ms cubic-bezier(.34,1.56,.64,1)',
        transform: focused ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <span
        aria-hidden
        className="text-base leading-none"
        style={{
          color: focused ? '#ffd84d' : '#ffaecd',
          textShadow: '0 1px 0 #5b3a52, 1px 0 0 #5b3a52, -1px 0 0 #5b3a52, 0 -1px 0 #5b3a52',
          transition: 'color 160ms ease',
        }}
      >
        ★
      </span>
      <input
        className="flex-1 min-w-0 bg-transparent outline-none text-sm"
        style={{
          color: '#5b3a52',
          fontFamily: '"Comic Sans MS", "Hiragino Maru Gothic ProN", "PingFang SC", system-ui, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
        placeholder={disabled ? '回复中…' : '说点什么…'}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
      />
      <button
        type="button"
        onClick={() => {
          if (v.trim() && !disabled) {
            onSubmit(v.trim())
            setV('')
          }
        }}
        disabled={!v.trim() || disabled}
        className="text-[11px] leading-none rounded-full select-none"
        style={{
          padding: '6px 10px',
          background: v.trim() && !disabled
            ? 'linear-gradient(180deg, #ffd54a 0%, #ffb14a 100%)'
            : 'linear-gradient(180deg, #efe4ea 0%, #d9c8d2 100%)',
          color: v.trim() && !disabled ? '#5b3a52' : '#9b8590',
          border: '2px solid #5b3a52',
          boxShadow: v.trim() && !disabled
            ? '0 2px 0 0 #5b3a52'
            : '0 2px 0 0 #9b8590',
          fontWeight: 800,
          fontFamily: '"Comic Sans MS", system-ui, sans-serif',
          textShadow: v.trim() && !disabled ? '0 1px 0 rgba(255,255,255,0.5)' : 'none',
          cursor: v.trim() && !disabled ? 'pointer' : 'default',
          transition: 'transform 100ms ease',
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0px 0 0 #5b3a52' }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}
      >
        GO!
      </button>
    </div>
  )
}
