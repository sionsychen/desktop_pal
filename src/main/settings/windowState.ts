import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface WindowState {
  x: number
  y: number
  width: number
  height: number
}

export class WindowStateStore {
  private readonly path: string

  constructor(userDataDir: string) {
    this.path = join(userDataDir, 'window-state.json')
  }

  load(): WindowState | null {
    if (!existsSync(this.path)) return null
    try {
      const raw = JSON.parse(readFileSync(this.path, 'utf-8'))
      if (
        typeof raw.x === 'number' && typeof raw.y === 'number' &&
        typeof raw.width === 'number' && typeof raw.height === 'number' &&
        raw.width > 0 && raw.height > 0
      ) {
        return raw as WindowState
      }
    } catch {
      // fall through
    }
    return null
  }

  save(state: WindowState): void {
    try {
      writeFileSync(this.path, JSON.stringify(state, null, 2), 'utf-8')
    } catch {
      // best-effort,丢失不影响主流程
    }
  }
}
