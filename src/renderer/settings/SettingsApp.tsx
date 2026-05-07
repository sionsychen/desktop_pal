import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { Settings } from '../../main/llm/types'
import {
  ACCENT, TEXT, MUTED, BORDER, BORDER_FOCUS, SURFACE, SURFACE_ALT, FONT_STACK,
  PillInput, PillTextarea, FieldLabel, ProviderToggle, ChunkyButton, SectionCard,
} from './_shared'

type TabId = 'provider' | 'character' | 'chat' | 'about'

interface TabDef { id: TabId; label: string }
const TABS: TabDef[] = [
  { id: 'provider',  label: '接口' },
  { id: 'character', label: '角色' },
  { id: 'chat',      label: '对话' },
  { id: 'about',     label: '关于' },
]

export default function SettingsApp() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [hasA, setHasA] = useState(false)
  const [hasO, setHasO] = useState(false)
  const [aTok, setATok] = useState('')
  const [oTok, setOTok] = useState('')
  const [tab, setTab] = useState<TabId>('provider')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    window.api.settings.get().then((r) => {
      setSettings(r.settings)
      setHasA(r.hasAnthropic)
      setHasO(r.hasOpenAI)
    })
  }, [])

  if (!settings) {
    return (
      <Shell>
        <div style={{
          height: '100%', display: 'grid', placeItems: 'center',
          fontFamily: FONT_STACK, color: MUTED, fontWeight: 500,
        }}>
          加载中…
        </div>
      </Shell>
    )
  }

  const upd = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })

  const save = async () => {
    setSaving(true)
    try {
      await window.api.settings.set({
        settings,
        anthropicToken: aTok || undefined,
        openaiToken: oTok || undefined,
      })
      if (aTok) setHasA(true)
      if (oTok) setHasO(true)
      setATok('')
      setOTok('')
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1400)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell>
      <header style={{
        padding: '14px 24px',
        borderBottom: `1px solid ${BORDER}`,
        background: SURFACE,
        flex: '0 0 auto',
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: FONT_STACK, fontWeight: 600, fontSize: 16, color: TEXT,
          letterSpacing: '-0.01em',
        }}>
          Desktop_Pal · 设置
        </h1>
        <div style={{
          marginTop: 2,
          fontFamily: FONT_STACK, fontSize: 12, color: MUTED,
        }}>
          配置桌宠与 LLM 后端
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <nav style={{
          width: 180, flex: '0 0 180px',
          padding: '12px 10px',
          background: SURFACE_ALT,
          borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {TABS.map((t) => (
            <SidebarItem key={t.id} active={t.id === tab} onClick={() => setTab(t.id)}
              label={t.label} />
          ))}
          <div style={{ flex: 1 }} />
          <div style={{
            fontFamily: FONT_STACK, fontSize: 11, color: MUTED, textAlign: 'center',
            padding: '8px 4px',
          }}>
            v0.1.0
          </div>
        </nav>

        <main style={{
          flex: 1, padding: '20px 24px 24px 24px', overflowY: 'auto',
          background: SURFACE_ALT,
        }} className="dp-no-scrollbar">
          {tab === 'provider' && (
            <ProviderTab
              settings={settings} upd={upd}
              hasA={hasA} hasO={hasO}
              aTok={aTok} setATok={setATok}
              oTok={oTok} setOTok={setOTok}
            />
          )}
          {tab === 'character' && (
            <CharacterTab settings={settings} upd={upd} />
          )}
          {tab === 'chat' && (
            <ChatTab settings={settings} upd={upd} />
          )}
          {tab === 'about' && (
            <AboutTab />
          )}
        </main>
      </div>

      <footer style={{
        padding: '12px 24px',
        borderTop: `1px solid ${BORDER}`,
        background: SURFACE,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 10, flex: '0 0 auto',
      }}>
        <div style={{
          flex: 1,
          fontFamily: FONT_STACK, fontSize: 12,
          color: savedFlash ? BORDER_FOCUS : MUTED,
          fontWeight: savedFlash ? 600 : 400,
          transition: 'color 200ms ease',
        }}>
          {savedFlash ? '已保存' : ''}
        </div>
        <ChunkyButton variant="ghost" onClick={() => window.close()} disabled={saving}>
          关闭
        </ChunkyButton>
        <ChunkyButton onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </ChunkyButton>
      </footer>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: SURFACE,
      color: TEXT,
      fontFamily: FONT_STACK,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function SidebarItem({ active, onClick, label }: {
  active: boolean; onClick: () => void; label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'rgba(122,108,245,0.10)' : 'transparent',
        fontFamily: FONT_STACK, fontWeight: active ? 600 : 500, fontSize: 13,
        color: active ? BORDER_FOCUS : ACCENT,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (active) return
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)'
      }}
      onMouseLeave={(e) => {
        if (active) return
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

function ProviderTab({ settings, upd, hasA, hasO, aTok, setATok, oTok, setOTok }: {
  settings: Settings
  upd: (p: Partial<Settings>) => void
  hasA: boolean; hasO: boolean
  aTok: string; setATok: (v: string) => void
  oTok: string; setOTok: (v: string) => void
}) {
  return (
    <div>
      <SectionCard title="Provider">
        <FieldLabel hint="选一个 LLM 后端, 后续可随时切换">类型</FieldLabel>
        <ProviderToggle value={settings.provider} onChange={(v) => upd({ provider: v })} />
      </SectionCard>

      {settings.provider === 'anthropic' ? (
        <SectionCard title="Anthropic">
          <Grid>
            <div>
              <FieldLabel hint="留空 = 官方 api.anthropic.com">Base URL</FieldLabel>
              <PillInput
                value={settings.anthropic.baseURL}
                onChange={(v) => upd({ anthropic: { ...settings.anthropic, baseURL: v } })}
                placeholder="https://api.anthropic.com 或自建 relay"
              />
            </div>
            <div>
              <FieldLabel hint="例: claude-sonnet-4-5">模型 ID</FieldLabel>
              <PillInput
                value={settings.anthropic.model}
                onChange={(v) => upd({ anthropic: { ...settings.anthropic, model: v } })}
                placeholder="claude-sonnet-4-5"
              />
            </div>
          </Grid>
          <div style={{ marginTop: 12 }}>
            <FieldLabel hint={hasA ? '已存在 token, 留空保持不变' : '必填: sk-ant-… 开头'}>API Token</FieldLabel>
            <PillInput
              type="password"
              value={aTok}
              onChange={setATok}
              placeholder={hasA ? '••••••••••••' : 'sk-ant-…'}
            />
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="OpenAI-Compatible">
          <Grid>
            <div>
              <FieldLabel hint="必填, 需带 /v1 后缀">Base URL</FieldLabel>
              <PillInput
                value={settings.openai.baseURL}
                onChange={(v) => upd({ openai: { ...settings.openai, baseURL: v } })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div>
              <FieldLabel hint="例: gpt-4o, deepseek-chat">模型 ID</FieldLabel>
              <PillInput
                value={settings.openai.model}
                onChange={(v) => upd({ openai: { ...settings.openai, model: v } })}
                placeholder="gpt-4o"
              />
            </div>
          </Grid>
          <div style={{ marginTop: 12 }}>
            <FieldLabel hint={hasO ? '已存在 key, 留空保持不变' : '必填'}>API Key</FieldLabel>
            <PillInput
              type="password"
              value={oTok}
              onChange={setOTok}
              placeholder={hasO ? '••••••••••••' : 'sk-…'}
            />
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function CharacterTab({ settings, upd }: {
  settings: Settings; upd: (p: Partial<Settings>) => void
}) {
  return (
    <div>
      <SectionCard title="Live2D 模型">
        <FieldLabel hint="留空 = 默认 Tororo">模型 manifest 路径</FieldLabel>
        <PillInput
          value={settings.modelPath ?? ''}
          onChange={(v) => upd({ modelPath: v || undefined })}
          placeholder="./model/tororo/tororo.model.json"
        />
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 6,
          background: SURFACE_ALT,
          border: `1px solid ${BORDER}`,
          fontSize: 12, lineHeight: 1.6, color: MUTED,
          fontFamily: FONT_STACK,
        }}>
          支持 <code style={codeStyle}>.model.json</code> (Cubism 2)
          或 <code style={codeStyle}>.model3.json</code> (Cubism 3+)。改完保存后桌宠会自动重载。
        </div>
      </SectionCard>
    </div>
  )
}

function ChatTab({ settings, upd }: {
  settings: Settings; upd: (p: Partial<Settings>) => void
}) {
  return (
    <div>
      <SectionCard title="System Prompt">
        <FieldLabel hint="给桌宠立人设, 影响所有回复语气">人设描述</FieldLabel>
        <PillTextarea
          rows={6}
          value={settings.systemPrompt}
          onChange={(v) => upd({ systemPrompt: v })}
          placeholder="你是一只活泼可爱的桌面伙伴..."
        />
      </SectionCard>

      <SectionCard title="生成参数">
        <Grid>
          <div>
            <FieldLabel hint="0 – 2, 越高越随机 (留空 = 默认)">Temperature</FieldLabel>
            <PillInput
              value={settings.temperature?.toString() ?? ''}
              onChange={(v) => upd({ temperature: v === '' ? undefined : Number(v) })}
              placeholder="default"
            />
          </div>
          <div>
            <FieldLabel hint="单次回复最大 token 数">Max Tokens</FieldLabel>
            <PillInput
              value={settings.maxTokens?.toString() ?? ''}
              onChange={(v) => upd({ maxTokens: v === '' ? undefined : Number(v) })}
              placeholder="default"
            />
          </div>
        </Grid>
      </SectionCard>
    </div>
  )
}

function AboutTab() {
  return (
    <div>
      <SectionCard title="About">
        <div style={{ fontFamily: FONT_STACK, fontSize: 13, lineHeight: 1.7, color: TEXT }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Desktop_Pal
          </div>
          <div style={{ color: MUTED }}>一只一直陪着你写代码 / 摸鱼 / 发呆的桌宠。</div>
        </div>
      </SectionCard>
      <SectionCard title="快捷键">
        <ul style={{
          margin: 0, paddingLeft: 18,
          fontFamily: FONT_STACK, fontSize: 13, lineHeight: 1.9, color: TEXT,
        }}>
          <li><kbd style={kbdStyle}>Ctrl + Shift + Space</kbd> 召唤桌宠到鼠标附近并聚焦输入</li>
          <li>左键拖拽桌宠 — 移动窗口</li>
          <li>右键桌宠 — 打开菜单</li>
        </ul>
      </SectionCard>
    </div>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {children}
    </div>
  )
}

const codeStyle: CSSProperties = {
  background: '#fff',
  padding: '1px 6px',
  borderRadius: 4,
  border: `1px solid ${BORDER}`,
  fontSize: 12,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  color: TEXT,
}

const kbdStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  margin: '0 2px',
  borderRadius: 4,
  border: `1px solid ${BORDER}`,
  background: '#fff',
  fontSize: 11,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  color: TEXT,
}
