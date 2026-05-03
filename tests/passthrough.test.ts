import { describe, it, expect, beforeEach } from 'vitest'
import { isInteractiveAtPoint } from '../src/renderer/app/passthrough'

describe('isInteractiveAtPoint', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="bg" style="width:100px;height:100px"></div>
      <button id="btn" data-interactive="true" style="position:absolute;left:10px;top:10px;width:20px;height:20px"></button>`
    // jsdom's elementFromPoint returns null. Provide a deterministic stub.
    document.elementFromPoint = (x: number, y: number) => {
      if (x >= 10 && x <= 30 && y >= 10 && y <= 30) return document.querySelector('#btn')
      return document.querySelector('#bg')
    }
  })

  it('returns true at interactive point', () => {
    expect(isInteractiveAtPoint(15, 15)).toBe(true)
  })

  it('returns false at non-interactive point', () => {
    expect(isInteractiveAtPoint(80, 80)).toBe(false)
  })
})
