import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createRequire } from 'module'
import type { Credentials } from './defaults'
import { buildDefaultSettings } from './defaults'

const requireCJS = createRequire(import.meta.url)

export class CredentialsStore {
  private readonly path: string
  constructor(userDataDir: string) { this.path = join(userDataDir, 'credentials.enc') }
  load(): Credentials {
    if (!existsSync(this.path)) return buildDefaultSettings().credentials
    try {
      const buf = readFileSync(this.path)
      const safe = this.getSafeStorage()
      const json = safe ? safe.decryptString(buf) : buf.toString('utf-8')
      return JSON.parse(json) as Credentials
    } catch { return { anthropic: '', openai: '' } }
  }
  save(creds: Credentials): void {
    const json = JSON.stringify(creds)
    const safe = this.getSafeStorage()
    const buf = safe ? safe.encryptString(json) : Buffer.from(json, 'utf-8')
    writeFileSync(this.path, buf)
  }
  private getSafeStorage(): { encryptString(s: string): Buffer; decryptString(b: Buffer): string } | null {
    try {
      const electron = requireCJS('electron') as any
      if (electron?.safeStorage?.isEncryptionAvailable?.()) return electron.safeStorage
    } catch { /* not in electron */ }
    return null
  }
}
