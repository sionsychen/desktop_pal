import { useEffect, useState } from 'react'
import type { Settings } from '../../main/llm/types'

interface Props { open: boolean; onClose: () => void }

export function SettingsPanel({ open, onClose }: Props) {
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
      className="absolute inset-0 bg-black/60 flex items-center justify-center"
    >
      <div className="bg-neutral-900 text-white rounded-xl p-5 w-[360px] space-y-3">
        <div className="text-lg font-semibold">设置</div>

        <label className="block text-sm">
          Provider
          <select
            className="mt-1 w-full bg-neutral-800 rounded px-2 py-1"
            value={settings.provider}
            onChange={(e) => upd({ provider: e.target.value as Settings['provider'] })}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai-compatible">OpenAI-Compatible</option>
          </select>
        </label>

        {settings.provider === 'anthropic' ? (
          <fieldset className="space-y-2 border border-neutral-700 rounded p-2">
            <legend className="text-xs text-neutral-400 px-1">Anthropic</legend>
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Base URL (留空走官方)"
              value={settings.anthropic.baseURL}
              onChange={(e) => upd({ anthropic: { ...settings.anthropic, baseURL: e.target.value } })}
            />
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Model ID (e.g. claude-sonnet-4-5)"
              value={settings.anthropic.model}
              onChange={(e) => upd({ anthropic: { ...settings.anthropic, model: e.target.value } })}
            />
            <input
              type="password"
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder={hasA ? '已设置(留空保持不变)' : 'API Token'}
              value={aTok}
              onChange={(e) => setATok(e.target.value)}
            />
          </fieldset>
        ) : (
          <fieldset className="space-y-2 border border-neutral-700 rounded p-2">
            <legend className="text-xs text-neutral-400 px-1">OpenAI-Compatible</legend>
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Base URL (必填)"
              value={settings.openai.baseURL}
              onChange={(e) => upd({ openai: { ...settings.openai, baseURL: e.target.value } })}
            />
            <input
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder="Model ID (e.g. gpt-4o)"
              value={settings.openai.model}
              onChange={(e) => upd({ openai: { ...settings.openai, model: e.target.value } })}
            />
            <input
              type="password"
              className="w-full bg-neutral-800 rounded px-2 py-1"
              placeholder={hasO ? '已设置(留空保持不变)' : 'API Key'}
              value={oTok}
              onChange={(e) => setOTok(e.target.value)}
            />
          </fieldset>
        )}

        <label className="block text-sm">
          System Prompt
          <textarea
            className="mt-1 w-full bg-neutral-800 rounded px-2 py-1 text-sm"
            rows={3}
            value={settings.systemPrompt}
            onChange={(e) => upd({ systemPrompt: e.target.value })}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="px-3 py-1 bg-neutral-700 rounded"
            onClick={onClose}
            disabled={saving}
          >取消</button>
          <button
            className="px-3 py-1 bg-blue-600 rounded"
            onClick={save}
            disabled={saving}
          >{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}
