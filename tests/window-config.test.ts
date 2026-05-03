import { describe, it, expect } from 'vitest'
import { buildWindowOptions } from '../src/main/window'

describe('buildWindowOptions', () => {
  it('returns transparent always-on-top frameless config', () => {
    const opts = buildWindowOptions('/path/to/preload.js')
    expect(opts.transparent).toBe(true)
    expect(opts.frame).toBe(false)
    expect(opts.alwaysOnTop).toBe(true)
    expect(opts.skipTaskbar).toBe(true)
    expect(opts.hasShadow).toBe(false)
    expect(opts.resizable).toBe(false)
    expect(opts.webPreferences?.contextIsolation).toBe(true)
    expect(opts.webPreferences?.nodeIntegration).toBe(false)
    expect(opts.webPreferences?.preload).toBe('/path/to/preload.js')
  })

  it('uses 400x600 default size', () => {
    const opts = buildWindowOptions('/p')
    expect(opts.width).toBe(400)
    expect(opts.height).toBe(600)
  })
})
