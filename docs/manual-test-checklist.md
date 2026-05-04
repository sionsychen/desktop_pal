# Desktop_Pal MVP Manual Test Checklist (Live2D Tororo)

## 前置

- [ ] Windows 10/11
- [ ] 环境变量: `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL` (或 OPENAI 那一组)
- [ ] `src/renderer/public/cubism/live2d.min.js` 存在 (按 README 首次配置流程)
- [ ] `src/renderer/public/cubism/live2dcubismcore.min.js` 存在
- [ ] `src/renderer/public/model/tororo/index.json` 存在 (含 `tap_body` motion group)
- [ ] `src/renderer/public/model/tororo/moc/tororo.moc` 和纹理 PNG 存在
- [ ] `npm install` 已完成

## Dev 模式

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

- [ ] 启动后右下角出现 280×420 透明 Tororo 窗口
- [ ] Tororo 白猫静态出现, 背景透出桌面 (无黑底)
- [ ] 鼠标在屏幕上移动时, Tororo 的眼睛 / 脸跟随
- [ ] 静止 6-12 秒后, Tororo 触发一次随机 tap motion (转头 / 眨眼 / 甩尾), 结束后回 idle
- [ ] 在 Tororo 上左键拖动 → 整窗移动
- [ ] 输入 "你好" 回车 → 顶部气泡流式 Claude 回复, 流式时光标 ▍ 闪烁, 完成后消失
- [ ] 回复中含 "哈哈" "笑" → 立刻触发 tap motion 反应, 结束自动回 idle
- [ ] 右键 → 弹菜单 (Settings / Quit)
- [ ] 点 Settings → 切换 provider, 改 Base URL/Model/Token, 保存
- [ ] 重启程序后设置保留 (token 字段显示"已设置"占位)
- [ ] 切到 OpenAI-Compatible (填 DeepSeek 等) → 同样能聊
- [ ] 系统托盘有图标, 右键有 Show/Hide/Quit
- [ ] 鼠标在 Tororo 周围空白区域点击 → 穿透到下方桌面 / 窗口

## 已知 / 接受的问题

- [ ] canvas 全画布命中 (Tororo 周围空白处也不穿透) → 接受, 后续优化
- [ ] Tororo motion 不区分情感, 所有正向反应都从同一个 tap 池随机 → 接受, 后续换有 expression group 的真白猫
- [ ] dev server 长时间跑可能有 network service crash (与 transparent + GPU 路径相关, 跟 Live2D pivot 无关)
- [ ] motion 反应若 'motionFinish' 事件名错配, 10s watchdog 强制回 idle (console.warn 会显示)

## Build & 安装

```bash
npm run build
npm run dist
```

- [ ] `release/Desktop_Pal Setup *.exe` 生成
- [ ] 在干净的 Windows 上安装 (Tororo 资产需要先复制到安装目录或预打包到 extraResources, 见 electron-builder.yml)
- [ ] 桌面 / 开始菜单出现 Desktop_Pal 图标
- [ ] 启动 → 全部 dev 模式的功能可复现
