import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Settings } from '@main/llm/types'
import { buildDefaultSettings } from './defaults'

export class SettingsStore {
  private readonly path: string
  constructor(userDataDir: string) { this.path = join(userDataDir, 'settings.json') }
  load(): Settings {
    if (!existsSync(this.path)) return buildDefaultSettings().settings
    try { return JSON.parse(readFileSync(this.path, 'utf-8')) as Settings }
    catch { return buildDefaultSettings().settings }
  }
  save(settings: Settings): void {
    writeFileSync(this.path, JSON.stringify(settings, null, 2), 'utf-8')
  }
}
