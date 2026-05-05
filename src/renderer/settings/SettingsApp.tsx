import { useEffect, useState, type ReactNode } from 'react'
import type { Settings } from '../../main/llm/types'
import {
  ACCENT, PINK, YELLOW, TEXT, FONT_STACK,
  PillInput, PillTextarea, FieldLabel, ProviderToggle, ChunkyButton, SectionCard,
} from './_shared'

type TabId = 'provider' | 'character' | 'chat' | 'about'

interface TabDef { id: TabId; label: string; icon: string }
const TABS: TabDef[] = [
  { id: 'provider',  label: '接口',   icon: '✦' },
  { id: 'character', label: '角色',   icon: '★' },
  { id: 'chat',      label: '对话',   icon: '♥' },
  { id: 'about',     label: '外观',   icon: '✿' },
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
          fontFamily: FONT_STACK, color: ACCENT, fontWeight: 700,
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
      {/* 顶部 */}
      <header style={{
        padding: '14px 24px 12px 24px',
        borderBottom: `2px solid ${ACCENT}`,
        background: `linear-gradient(180deg, #fff7fb 0%, #ffe9f2 100%)`,
        position: 'relative',
        flex: '0 0 auto',
      }}>
        <span aria-hidden style={decoStar(YELLOW, ACCENT, 22)} className="dp-deco-left">★</span>
        <span aria-hidden style={decoHeart(PINK, ACCENT, 16)} className="dp-deco-right">♥</span>
        <h1 style={{
          margin: 0, textAlign: 'center',
          fontFamily: FONT_STACK, fontWeight: 800, fontSize: 20, color: ACCENT,
          letterSpacing: '0.04em',
        }}>
          Desktop_Pal · 设置
        </h1>
        <div style={{
          textAlign: 'center', marginTop: 2,
          fontFamily: FONT_STACK, fontSize: 11, color: '#9b8590',
        }}>
          配置桌宠与 LLM 后端
        </div>
      </header>

      {/* 主体 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 侧栏 */}
        <nav style={{
          width: 168, flex: '0 0 168px',
          padding: '18px 12px',
          background: 'linear-gradient(180deg, #fff0f6 0%, #ffe0ec 100%)',
          borderRight: `2px solid ${ACCENT}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {TABS.map((t) => (
            <SidebarItem key={t.id} active={t.id === tab} onClick={() => setTab(t.id)}
              icon={t.icon} label={t.label} />
          ))}
          <div style={{ flex: 1 }} />
          <div style={{
            fontFamily: FONT_STACK, fontSize: 10, color: '#9b8590', textAlign: 'center',
            padding: '8px 4px', lineHeight: 1.4,
          }}>
            v0.1.0 · Tororo Edition
          </div>
        </nav>

        {/* 内容区 */}
        <main style={{
          flex: 1, padding: '20px 24px 24px 24px', overflowY: 'auto',
          background: 'linear-gradient(180deg, #fffafd 0%, #fff7fb 100%)',
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

      {/* 底部 */}
      <footer style={{
        padding: '12px 24px',
        borderTop: `2px solid ${ACCENT}`,
        background: 'linear-gradient(180deg, #fff7fb 0%, #ffe9f2 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 10, flex: '0 0 auto',
      }}>
        <div style={{
          flex: 1,
          fontFamily: FONT_STACK, fontSize: 12, color: savedFlash ? '#2f8a3e' : '#9b8590',
          fontWeight: savedFlash ? 800 : 600,
          transition: 'color 200ms ease',
        }}>
          {savedFlash ? '✓ 已保存' : '改完记得保存哦~'}
        </div>
        <ChunkyButton variant="ghost" onClick={() => window.close()} disabled={saving}>
          关闭
        </ChunkyButton>
        <ChunkyButton onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存 ✓'}
        </ChunkyButton>
      </footer>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#fff7fb',
      color: TEXT,
      fontFamily: FONT_STACK,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function SidebarItem({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: string; label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderRadius: 14,
        border: `2px solid ${active ? ACCENT : 'transparent'}`,
        background: active
          ? 'linear-gradient(180deg, #ffffff 0%, #fff0f6 100%)'
          : 'transparent',
        boxShadow: active ? `0 2px 0 0 ${ACCENT}` : 'none',
        fontFamily: FONT_STACK, fontWeight: 800, fontSize: 14,
        color: active ? ACCENT : '#7d6571',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 120ms ease',
      }}
    >
      <span style={{ color: active ? PINK : '#b9a5ad', fontSize: 16 }}>{icon}</span>
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
      <SectionCard title="PROVIDER">
        <FieldLabel hint="选一个 LLM 后端,后续可随时切换">类型</FieldLabel>
        <ProviderToggle value={settings.provider} onChange={(v) => upd({ provider: v })} />
      </SectionCard>

      {settings.provider === 'anthropic' ? (
        <SectionCard title="ANTHROPIC">
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
            <FieldLabel hint={hasA ? '已存在 token,留空保持不变' : '必填: sk-ant-… 开头'}>API Token</FieldLabel>
            <PillInput
              type="password"
              value={aTok}
              onChange={setATok}
              placeholder={hasA ? '●●●●●●●●●●●●' : 'sk-ant-…'}
            />
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="OPENAI-COMPATIBLE">
          <Grid>
            <div>
              <FieldLabel hint="必填,需带 /v1 后缀">Base URL</FieldLabel>
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
            <FieldLabel hint={hasO ? '已存在 key,留空保持不变' : '必填'}>API Key</FieldLabel>
            <PillInput
              type="password"
              value={oTok}
              onChange={setOTok}
              placeholder={hasO ? '●●●●●●●●●●●●' : 'sk-…'}
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
      <SectionCard title="LIVE2D 模型">
        <FieldLabel hint="留空 = 默认 Tororo (白猫)">模型 manifest 路径</FieldLabel>
        <PillInput
          value={settings.modelPath ?? ''}
          onChange={(v) => upd({ modelPath: v || undefined })}
          placeholder="./model/tororo/tororo.model.json"
        />
        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(255,209,221,0.4)',
          border: `1.5px dashed ${PINK}`,
          fontSize: 12, lineHeight: 1.5, color: ACCENT,
        }}>
          指向 <code style={{ background: '#fff', padding: '0 4px', borderRadius: 4 }}>.model.json</code> (Cubism 2)
          或 <code style={{ background: '#fff', padding: '0 4px', borderRadius: 4 }}>.model3.json</code> (Cubism 3+)
          的相对路径。改完保存后桌宠会自动重载。
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
      <SectionCard title="SYSTEM PROMPT">
        <FieldLabel hint="给猫主子立人设, 影响所有回复语气">人设描述</FieldLabel>
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
            <FieldLabel hint="0 – 2, 越高越随机活泼 (留空=默认)">Temperature</FieldLabel>
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
      <SectionCard title="ABOUT">
        <div style={{ fontFamily: FONT_STACK, fontSize: 13, lineHeight: 1.7, color: ACCENT }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            Desktop_Pal <span style={{ color: PINK }}>♥</span> Tororo
          </div>
          <div>一只一直陪着你写代码 / 摸鱼 / 发呆的白猫桌宠。</div>
          <div style={{ marginTop: 8, color: '#7d6571' }}>更多外观选项 (主题色 / 气泡透明度 / 装饰元素) 后续会加进来 ✦</div>
        </div>
      </SectionCard>
      <SectionCard title="快捷键">
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT_STACK, fontSize: 13, lineHeight: 1.8, color: ACCENT }}>
          <li><b>Ctrl+Shift+Space</b> · 召唤桌宠到鼠标附近并聚焦输入</li>
          <li>左键拖拽桌宠 · 移动窗口</li>
          <li>右键桌宠 · 打开菜单</li>
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

function decoStar(c: string, stroke: string, size: number) {
  return {
    position: 'absolute' as const, top: 8, left: 18,
    fontSize: size, color: c, lineHeight: 1,
    textShadow: `0 1px 0 ${stroke}, 1px 0 0 ${stroke}, -1px 0 0 ${stroke}, 0 -1px 0 ${stroke}, 1px 1px 0 ${stroke}, -1px -1px 0 ${stroke}`,
  }
}
function decoHeart(c: string, stroke: string, size: number) {
  return {
    position: 'absolute' as const, top: 12, right: 22,
    fontSize: size, color: c, lineHeight: 1,
    textShadow: `0 1px 0 ${stroke}, 1px 0 0 ${stroke}, -1px 0 0 ${stroke}, 0 -1px 0 ${stroke}`,
  }
}
