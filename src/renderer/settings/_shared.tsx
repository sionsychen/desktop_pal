import { useState, type CSSProperties, type ReactNode } from 'react'

// 洛克王国色板
export const ACCENT = '#5b3a52'      // 深紫描边/文字
export const PINK = '#ff6fa3'        // focus / 选中 / 高亮粉
export const PINK_SOFT = '#ffd6e6'   // 渐变下端
export const YELLOW = '#ffd54a'      // GO! 主色 / 装饰星
export const TEXT = '#5b3a52'

export const FONT_STACK = '"Comic Sans MS", "Hiragino Maru Gothic ProN", "PingFang SC", system-ui, sans-serif'

export function PillInput(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'password'
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={props.type ?? 'text'}
      disabled={props.disabled}
      className="w-full text-sm outline-none"
      style={{
        padding: '8px 14px',
        borderRadius: 9999,
        background: focused
          ? 'linear-gradient(180deg, #ffffff 0%, #fff0f5 100%)'
          : 'linear-gradient(180deg, #fafafa 0%, #f4eaef 100%)',
        border: `2px solid ${focused ? PINK : ACCENT}`,
        boxShadow: focused
          ? `0 2px 0 0 ${PINK}, 0 0 0 3px rgba(255,182,210,0.35)`
          : `0 2px 0 0 ${ACCENT}`,
        color: TEXT,
        fontFamily: FONT_STACK,
        fontWeight: 600,
        transition: 'all 140ms cubic-bezier(.34,1.56,.64,1)',
      }}
      placeholder={props.placeholder}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

export function PillTextarea(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      rows={props.rows ?? 3}
      className="w-full text-sm outline-none resize-none"
      style={{
        padding: '10px 14px',
        borderRadius: 18,
        background: focused
          ? 'linear-gradient(180deg, #ffffff 0%, #fff0f5 100%)'
          : 'linear-gradient(180deg, #fafafa 0%, #f4eaef 100%)',
        border: `2px solid ${focused ? PINK : ACCENT}`,
        boxShadow: focused
          ? `0 2px 0 0 ${PINK}, 0 0 0 3px rgba(255,182,210,0.35)`
          : `0 2px 0 0 ${ACCENT}`,
        color: TEXT,
        fontFamily: FONT_STACK,
        fontWeight: 600,
        lineHeight: 1.5,
        transition: 'all 140ms cubic-bezier(.34,1.56,.64,1)',
      }}
      placeholder={props.placeholder}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
        color: ACCENT,
        fontFamily: FONT_STACK,
        textTransform: 'uppercase',
      }}>
        {children}
      </div>
      {hint && (
        <div style={{ fontSize: 10.5, color: '#9b8590', fontFamily: FONT_STACK, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  )
}

export function ProviderToggle({ value, onChange }: {
  value: 'anthropic' | 'openai-compatible'
  onChange: (v: 'anthropic' | 'openai-compatible') => void
}) {
  const Tab = (props: { id: 'anthropic' | 'openai-compatible'; label: string }) => {
    const active = value === props.id
    return (
      <button
        type="button"
        onClick={() => onChange(props.id)}
        style={{
          flex: 1,
          padding: '8px 14px',
          borderRadius: 9999,
          border: `2px solid ${ACCENT}`,
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: 13,
          color: active ? TEXT : '#9b8590',
          background: active
            ? `linear-gradient(180deg, ${YELLOW} 0%, #ffb14a 100%)`
            : 'linear-gradient(180deg, #ffffff 0%, #efe4ea 100%)',
          boxShadow: active ? `0 3px 0 0 ${ACCENT}` : `0 2px 0 0 #b9a5ad`,
          textShadow: active ? '0 1px 0 rgba(255,255,255,0.5)' : 'none',
          cursor: 'pointer',
          transition: 'transform 100ms ease',
        }}
      >
        {props.label}
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Tab id="anthropic" label="Anthropic" />
      <Tab id="openai-compatible" label="OpenAI-Compatible" />
    </div>
  )
}

export function ChunkyButton(props: {
  variant?: 'primary' | 'ghost'
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const primary = (props.variant ?? 'primary') === 'primary'
  const baseStyle: CSSProperties = {
    padding: '10px 22px',
    borderRadius: 9999,
    border: `2px solid ${ACCENT}`,
    fontFamily: FONT_STACK,
    fontWeight: 800,
    fontSize: 14,
    color: TEXT,
    cursor: props.disabled ? 'default' : 'pointer',
    transition: 'transform 100ms ease, box-shadow 100ms ease',
    textShadow: primary ? '0 1px 0 rgba(255,255,255,0.5)' : 'none',
  }
  const enabledBg = primary
    ? `linear-gradient(180deg, ${YELLOW} 0%, #ffb14a 100%)`
    : 'linear-gradient(180deg, #ffffff 0%, #efe4ea 100%)'
  const disabledBg = 'linear-gradient(180deg, #efe4ea 0%, #d9c8d2 100%)'
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        ...baseStyle,
        background: props.disabled ? disabledBg : enabledBg,
        color: props.disabled ? '#9b8590' : TEXT,
        boxShadow: props.disabled ? '0 2px 0 0 #9b8590' : `0 3px 0 0 ${ACCENT}`,
      }}
      onMouseDown={(e) => {
        if (props.disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(2px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 1px 0 0 ${ACCENT}`
      }}
      onMouseUp={(e) => {
        if (props.disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = ''
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 0 0 ${ACCENT}`
      }}
      onMouseLeave={(e) => {
        if (props.disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = ''
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 0 0 ${ACCENT}`
      }}
    >
      {props.children}
    </button>
  )
}

/** 一个 section 卡片: 浅白底 + 深紫描边 + 黄色 accent label  */
export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.7)',
      border: `2px solid ${ACCENT}`,
      borderRadius: 20,
      padding: '14px 16px 16px 16px',
      position: 'relative',
      boxShadow: `0 3px 0 0 ${ACCENT}`,
      marginBottom: 14,
    }}>
      <div style={{
        position: 'absolute',
        top: -10,
        left: 16,
        background: YELLOW,
        border: `2px solid ${ACCENT}`,
        borderRadius: 9999,
        padding: '2px 10px',
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: 11,
        color: ACCENT,
        textShadow: '0 1px 0 rgba(255,255,255,0.5)',
      }}>
        {title}
      </div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  )
}
