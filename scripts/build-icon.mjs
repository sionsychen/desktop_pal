#!/usr/bin/env node
// 用 Tororo 纹理切脸生成 256×256 PNG, 再包装成 NSIS 兼容的 ICO (含 PNG payload)
import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TEXTURE = join(ROOT, 'src/renderer/public/model/tororo/moc/tororo.2048/texture_00.png')
const OUT_DIR = join(ROOT, 'resources')
const OUT_ICO = join(OUT_DIR, 'icon.ico')
const OUT_PNG = join(OUT_DIR, 'icon-256.png')
const OUT_TRAY = join(OUT_DIR, 'tray.png')

await mkdir(OUT_DIR, { recursive: true })

// 脸+耳+眼+嘴用 sharp composite 拼出真正的小猫脸
// 各 sprite 在 2048×2048 texture 里的实测位置:
//   face mesh:    (1320, 30)   720×690
//   left ear:     (1240, 1400) 130×220   (粉)
//   right ear:    (1390, 1400) 130×220
//   left eye:     (940, 1500)  90×90     (闭眼小弧)  → 但有更大的睁眼版本
//   nose:         (1100, 1400) 60×30
// 简化:用 (1300, 30, 730, 1620) 这个超大块,把脸 + 下方的眼/鼻/耳一起圈进来
//      然后等比缩到 256, 让所有零件以可识别比例呈现

const png256 = await sharp(TEXTURE)
  .extract({ left: 1240, top: 30, width: 770, height: 1620 })
  .resize(256, 256, { fit: 'cover' })
  .png()
  .toBuffer()
await writeFile(OUT_PNG, png256)

// 16x16 tray 版
const png16 = await sharp(TEXTURE)
  .extract({ left: 1240, top: 30, width: 770, height: 1620 })
  .resize(16, 16, { fit: 'cover' })
  .png()
  .toBuffer()
await writeFile(OUT_TRAY, png16)

// 用 PNG payload 包出最简 ICO (Vista+)
// ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + PNG body
const dir = Buffer.from([0, 0, 1, 0, 1, 0])
const entry = Buffer.alloc(16)
// 256 在 byte 表示里是 0 (256-color sentinel)
entry[0] = 0  // bWidth (0=256)
entry[1] = 0  // bHeight (0=256)
entry[2] = 0  // bColorCount
entry[3] = 0  // bReserved
entry.writeUInt16LE(1, 4)        // wPlanes
entry.writeUInt16LE(32, 6)       // wBitCount
entry.writeUInt32LE(png256.length, 8)  // dwBytesInRes
entry.writeUInt32LE(22, 12)      // dwImageOffset (固定 22)
const ico = Buffer.concat([dir, entry, png256])
await writeFile(OUT_ICO, ico)

console.log('icon.ico ' + ico.length + 'B (256x256 PNG payload)')
console.log('tray.png ' + png16.length + 'B (16x16)')
console.log('icon-256.png ' + png256.length + 'B (256x256, sanity check)')
