import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { isInteractiveAtPoint } from '../src/renderer/app/passthrough'

// JSDOM has no layout engine, so elementFromPoint is unimplemented.
// We polyfill a minimal hit-test using inline-style px values, returning
// the deepest (last-in-document-order) element whose box contains (x, y).
function installElementFromPointStub(doc: Document): void {
  ;(doc as unknown as { elementFromPoint: (x: number, y: number) => Element | null }).elementFromPoint =
    (x: number, y: number) => {
      const all = doc.querySelectorAll<HTMLElement>('*')
      let hit: Element | null = null
      all.forEach((el) => {
        const left = parseInt(el.style.left || '0', 10) || 0
        const top = parseInt(el.style.top || '0', 10) || 0
        const width = parseInt(el.style.width || '0', 10) || 0
        const height = parseInt(el.style.height || '0', 10) || 0
        if (width > 0 && height > 0 && x >= left && x <= left + width && y >= top && y <= top + height) {
          hit = el
        }
      })
      return hit
    }
}

describe('isInteractiveAtPoint', () => {
  beforeEach(() => {
    const dom = new JSDOM(`<html><body>
      <div id="bg" style="width:100px;height:100px"></div>
      <button id="btn" data-interactive="true" style="position:absolute;left:10px;top:10px;width:20px;height:20px"></button>
    </body></html>`)
    ;(globalThis as any).document = dom.window.document
    installElementFromPointStub(dom.window.document)
  })

  it('returns true when point hits an interactive element', () => {
    expect(isInteractiveAtPoint(15, 15)).toBe(true)
  })

  it('returns false when point hits a non-interactive element', () => {
    expect(isInteractiveAtPoint(80, 80)).toBe(false)
  })

  it('returns true when ancestor is interactive', () => {
    document.body.innerHTML = `
      <div data-interactive="true" style="position:absolute;left:0px;top:0px;width:100px;height:100px">
        <span id="inner" style="display:block;width:50px;height:50px"></span>
      </div>`
    expect(isInteractiveAtPoint(10, 10)).toBe(true)
  })
})
