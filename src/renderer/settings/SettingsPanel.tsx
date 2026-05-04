import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { Settings } from '../../main/llm/types'

interface Props { open: boolean; onClose: () => void; firstRun?: boolean }

const ACCENT = '#5b3a52'   // 深紫描边
const PINK = '#ff6fa3'     // focus / 选中
const PINK_SOFT = '#ffd6e6' // 渐变下端
const YELLOW = '#ffd54a'   // GO! 主色
const TEXT = '#5b3a52'

// —— 通用元素 —————————————————————————————

const FONT_STACK = '"Comic Sans MS", "Hiragino Maru Gothic ProN", "PingFang SC", system-ui, sans-serif'

function PillInput(props: {
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
        padding: '7px 12px',
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

function PillTextarea(props: {
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
        borderRadius: 16,
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
        lineHeight: 1.45,
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

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
        color: ACCENT,
        fontFamily: FONT_STACK,
        textTransform: 'uppercase',
      }}>
        {children}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: '#9b8590', fontFamily: FONT_STACK, marginTop: 1 }}>{hint}</div>
      )}
    </div>
  )
}

function ProviderToggle({ value, onChange }: {
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
          padding: '6px 10px',
          borderRadius: 9999,
          border: `2px solid ${ACCENT}`,
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: 12,
          color: active ? TEXT : '#9b8590',
          background: active
            ? `linear-gradient(180deg, ${YELLOW} 0%, #ffb14a 100%)`
            : 'linear-gradient(180deg, #ffffff 0%, #efe4ea 100%)',
          boxShadow: active ? `0 2px 0 0 ${ACCENT}` : `0 2px 0 0 #b9a5ad`,
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

function ChunkyButton(props: {
  variant?: 'primary' | 'ghost'
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const primary = (props.variant ?? 'primary') === 'primary'
  const baseStyle: CSSProperties = {
    padding: '8px 18px',
    borderRadius: 9999,
    border: `2px solid ${ACCENT}`,
    fontFamily: FONT_STACK,
    fontWeight: 800,
    fontSize: 13,
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

// —— 主面板 ————————————————————————————————

export function SettingsPanel({ open, onClose, firstRun }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [hasA, setHasA] = useState(false)
  const [hasO, setHasO] = useState(false)
  const [aTok, setATok] = useState('')
  const [oTok, setOTok] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    window.api.settings.get().then((r) => {
      setSettings(r.settings)
      setHasA(r.hasAnthropic)
      setHasO(r.hasOpenAI)
      setATok('')
      setOTok('')
    })
  }, [open])

  if (!open || !settings) return null

  const save = async () => {
    setSaving(true)
    try {
      await window.api.settings.set({
        settings,
        anthropicToken: aTok || undefined,
        openaiToken: oTok || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const upd = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })

  return (
    <div
      data-interactive="true"
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(91,58,82,0.55) 0%, rgba(38,18,32,0.85) 100%)',
        // 内层 mask 制造卡通"贴在屏幕"感, modal 比窗口稍小留呼吸位
        padding: 6,
      }}
    >
      <div
        className="w-full overflow-y-auto dp-no-scrollbar"
        style={{
          maxHeight: '100%',
          maxWidth: 320,
          background: 'linear-gradient(170deg, #ffffff 0%, #fff7fb 55%, #ffe0ee 100%)',
          border: `2.5px solid ${ACCENT}`,
          borderRadius: 24,
          boxShadow: `0 5px 0 0 ${ACCENT}, 0 8px 22px -2px rgba(91,58,82,0.4)`,
          padding: '14px 14px 16px 14px',
          color: TEXT,
          position: 'relative',
          fontFamily: FONT_STACK,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* 顶部装饰 */}
        <span aria-hidden style={{
          position: 'absolute', top: -10, left: 28,
          fontSize: 18, color: YELLOW,
          textShadow: `0 1px 0 ${ACCENT}, 1px 0 0 ${ACCENT}, -1px 0 0 ${ACCENT}, 0 -1px 0 ${ACCENT}, 1px 1px 0 ${ACCENT}, -1px -1px 0 ${ACCENT}`,
        }}>★</span>
        <span aria-hidden style={{
          position: 'absolute', top: -8, right: 30,
          fontSize: 13, color: PINK,
          textShadow: `0 1px 0 ${ACCENT}, 1px 0 0 ${ACCENT}, -1px 0 0 ${ACCENT}, 0 -1px 0 ${ACCENT}`,
        }}>♥</span>

        {/* 标题 */}
        <div style={{
          fontSize: 17, fontWeight: 800, color: ACCENT,
          textAlign: 'center', marginBottom: 10,
        }}>
          {firstRun ? '欢迎进来呀' : '设置'}
        </div>

        {/* 首次启动引导 */}
        {firstRun && (
          <div style={{
            background: 'rgba(255,209,221,0.5)',
            border: `1.5px dashed ${PINK}`,
            borderRadius: 14,
            padding: '8px 10px',
            marginBottom: 12,
            fontSize: 11,
            color: ACCENT,
            lineHeight: 1.55,
          }}>
            桌宠需要一个 LLM 后端才能聊天 ✦<br/>
            填好钥匙保存就能开始,后续右键托盘可以再改。
          </div>
        )}

        {/* Provider 切换 */}
        <FieldLabel>Provider</FieldLabel>
        <div style={{ marginBottom: 10 }}>
          <ProviderToggle
            value={settings.provider}
            onChange={(v) => upd({ provider: v })}
          />
        </div>

        {/* Provider 配置卡 */}
        {settings.provider === 'anthropic' ? (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            border: `2px solid ${PINK}`,
            borderRadius: 16,
            padding: 10,
            marginBottom: 10,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <FieldLabel>Anthropic Base URL</FieldLabel>
            <PillInput
              value={settings.anthropic.baseURL}
              onChange={(v) => upd({ anthropic: { ...settings.anthropic, baseURL: v } })}
              placeholder="留空 = 官方 api.anthropic.com"
            />
            <FieldLabel>Model</FieldLabel>
            <PillInput
              value={settings.anthropic.model}
              onChange={(v) => upd({ anthropic: { ...settings.anthropic, model: v } })}
              placeholder="claude-sonnet-4-5 / claude-opus-4-7 …"
            />
            <FieldLabel hint={hasA ? '已有 token,留空保持不变' : '必填'}>API Token</FieldLabel>
            <PillInput
              type="password"
              value={aTok}
              onChange={setATok}
              placeholder={hasA ? '●●●●●●●●●●●●' : 'sk-ant-…'}
            />
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            border: `2px solid ${PINK}`,
            borderRadius: 16,
            padding: 10,
            marginBottom: 10,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <FieldLabel hint="必填">Base URL</FieldLabel>
            <PillInput
              value={settings.openai.baseURL}
              onChange={(v) => upd({ openai: { ...settings.openai, baseURL: v } })}
              placeholder="https://api.openai.com/v1 / DeepSeek …"
            />
            <FieldLabel>Model</FieldLabel>
            <PillInput
              value={settings.openai.model}
              onChange={(v) => upd({ openai: { ...settings.openai, model: v } })}
              placeholder="gpt-4o, deepseek-chat …"
            />
            <FieldLabel hint={hasO ? '已有 key,留空保持不变' : '必填'}>API Key</FieldLabel>
            <PillInput
              type="password"
              value={oTok}
              onChange={setOTok}
              placeholder={hasO ? '●●●●●●●●●●●●' : 'sk-…'}
            />
          </div>
        )}

        {/* System Prompt */}
        <FieldLabel hint="给猫主子立个人设">System Prompt</FieldLabel>
        <div style={{ marginBottom: 10 }}>
          <PillTextarea
            rows={3}
            value={settings.systemPrompt}
            onChange={(v) => upd({ systemPrompt: v })}
            placeholder="你是一只活泼可爱的桌面伙伴..."
          />
        </div>

        {/* 数值组 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <FieldLabel hint="0–2, 越高越随机">Temp</FieldLabel>
            <PillInput
              value={settings.temperature?.toString() ?? ''}
              onChange={(v) => upd({ temperature: v === '' ? undefined : Number(v) })}
              placeholder="default"
            />
          </div>
          <div>
            <FieldLabel hint="单次最大 token">Max</FieldLabel>
            <PillInput
              value={settings.maxTokens?.toString() ?? ''}
              onChange={(v) => upd({ maxTokens: v === '' ? undefined : Number(v) })}
              placeholder="default"
            />
          </div>
        </div>

        {/* 模型路径 */}
        <FieldLabel hint="留空 = Tororo">Live2D 模型路径</FieldLabel>
        <div style={{ marginBottom: 14 }}>
          <PillInput
            value={settings.modelPath ?? ''}
            onChange={(v) => upd({ modelPath: v || undefined })}
            placeholder="./model/tororo/tororo.model.json"
          />
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <ChunkyButton variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </ChunkyButton>
          <ChunkyButton onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存 ✓'}
          </ChunkyButton>
        </div>
      </div>
    </div>
  )
}
