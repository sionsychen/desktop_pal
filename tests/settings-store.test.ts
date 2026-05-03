import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { SettingsStore } from '../src/main/settings/store'

describe('SettingsStore', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pal-settings-')) })

  it('writes and reads settings.json', () => {
    const store = new SettingsStore(dir)
    const initial = store.load()
    expect(initial.provider).toBeDefined()
    initial.anthropic.model = 'claude-test'
    store.save(initial)
    const reread = new SettingsStore(dir).load()
    expect(reread.anthropic.model).toBe('claude-test')
    expect(existsSync(join(dir, 'settings.json'))).toBe(true)
  })
  it('returns defaults when file missing', () => {
    const s = new SettingsStore(dir).load()
    expect(s.provider).toMatch(/anthropic|openai-compatible/)
  })
  it('overwrites file on save', () => {
    const store = new SettingsStore(dir)
    const s = store.load()
    s.openai.baseURL = 'https://test'
    store.save(s)
    const raw = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf-8'))
    expect(raw.openai.baseURL).toBe('https://test')
  })
})
