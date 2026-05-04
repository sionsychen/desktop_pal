#!/usr/bin/env node
// 启动一个隐形 Electron, 加载 Tororo, 等模型渲染好截图,
// 把截图当 256×256 ICO 烧到 resources/icon.ico
//
// 用法: node scripts/render-icon.mjs (需要 dev server 已启动在 5173)
// 或: 直接走 production renderer build → 内联 file:// 加载

import { app, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RENDERER_INDEX = `file://${join(ROOT, 'out/renderer/index.html').replace(/\\/g, '/')}`

await app.whenReady()

const win = new BrowserWindow({
  width: 320, height: 320,
  show: false,
  transparent: true,
  frame: false,
  backgroundColor: '#00000000',
  webPreferences: {
    preload: join(ROOT, 'out/preload/index.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  },
})

await win.loadURL(RENDERER_INDEX)

// 等模型加载完 (loadModel 后 + 几帧 ticker 推进)
await new Promise((r) => setTimeout(r, 4000))

const png = await win.webContents.capturePage()
const buf = png.toPNG()

// 截图 320×320 (含一些边距), resize 到 256×256
const png256 = await sharp(buf).resize(256, 256, { fit: 'cover' }).png().toBuffer()
const png16 = await sharp(buf).resize(16, 16, { fit: 'cover' }).png().toBuffer()

await writeFile(join(ROOT, 'resources/icon-256.png'), png256)
await writeFile(join(ROOT, 'resources/tray.png'), png16)

const dir = Buffer.from([0, 0, 1, 0, 1, 0])
const entry = Buffer.alloc(16)
entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0
entry.writeUInt16LE(1, 4)
entry.writeUInt16LE(32, 6)
entry.writeUInt32LE(png256.length, 8)
entry.writeUInt32LE(22, 12)
const ico = Buffer.concat([dir, entry, png256])
await writeFile(join(ROOT, 'resources/icon.ico'), ico)

console.log('rendered icon.ico ' + ico.length + 'B')
console.log('rendered tray.png ' + png16.length + 'B')

app.quit()
