import { useState, type CSSProperties, type ReactNode } from 'react'

// 现代中性配色 (设置窗口不走可爱风)
export const ACCENT = '#4a4a55'      // 主文字色
export const TEXT = '#2a2a32'        // 正文
export const MUTED = '#7a7a85'       // 次级/提示
export const BORDER = '#e3e3ea'      // 边线
export const BORDER_FOCUS = '#7a6cf5' // focus / primary accent
export const SURFACE = '#ffffff'
export const SURFACE_ALT = '#fafafb'
// 保留名字兼容 (旧引用), 不再用于新样式
export const PINK = '#ff6fa3'
export const YELLOW = '#ffd54a'

export const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif'

const FOCUS_RING = `0 0 0 3px rgba(122,108,245,0.18)`

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
        padding: '8px 12px',
        borderRadius: 6,
        background: props.disabled ? '#f5f5f8' : SURFACE,
        border: `1px solid ${focused ? BORDER_FOCUS : BORDER}`,
        boxShadow: focused ? FOCUS_RING : 'none',
        color: TEXT,
        fontFamily: FONT_STACK,
        fontSize: 13,
        fontWeight: 400,
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
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
        padding: '8px 12px',
        borderRadius: 6,
        background: SURFACE,
        border: `1px solid ${focused ? BORDER_FOCUS : BORDER}`,
        boxShadow: focused ? FOCUS_RING : 'none',
        color: TEXT,
        fontFamily: FONT_STACK,
        fontSize: 13,
        fontWeight: 400,
        lineHeight: 1.55,
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
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
        fontSize: 12,
        fontWeight: 500,
        color: TEXT,
        fontFamily: FONT_STACK,
      }}>
        {children}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_STACK, marginTop: 2 }}>{hint}</div>
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
          padding: '7px 12px',
          borderRadius: 5,
          border: 'none',
          fontFamily: FONT_STACK,
          fontWeight: active ? 600 : 500,
          fontSize: 13,
          color: active ? TEXT : MUTED,
          background: active ? SURFACE : 'transparent',
          boxShadow: active ? '0 1px 2px rgba(16,24,40,0.08)' : 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease',
        }}
      >
        {props.label}
      </button>
    )
  }
  return (
    <div style={{
      display: 'flex',
      gap: 2,
      padding: 3,
      background: '#f2f2f5',
      borderRadius: 7,
      border: `1px solid ${BORDER}`,
    }}>
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
  const base: CSSProperties = {
    padding: '8px 16px',
    borderRadius: 6,
    fontFamily: FONT_STACK,
    fontWeight: 500,
    fontSize: 13,
    cursor: props.disabled ? 'default' : 'pointer',
    transition: 'background 120ms ease, border-color 120ms ease',
    border: `1px solid ${primary ? BORDER_FOCUS : BORDER}`,
    background: props.disabled
      ? '#f5f5f8'
      : primary ? BORDER_FOCUS : SURFACE,
    color: props.disabled
      ? MUTED
      : primary ? '#fff' : TEXT,
  }
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      style={base}
      onMouseEnter={(e) => {
        if (props.disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.background = primary ? '#6c5ee0' : '#f6f6f9'
      }}
      onMouseLeave={(e) => {
        if (props.disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.background = primary ? BORDER_FOCUS : SURFACE
      }}
    >
      {props.children}
    </button>
  )
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: '14px 16px 16px 16px',
      marginBottom: 14,
    }}>
      <h3 style={{
        margin: '0 0 12px 0',
        fontFamily: FONT_STACK,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: MUTED,
      }}>
        {title}
      </h3>
      <div>{children}</div>
    </section>
  )
}
