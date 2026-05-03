# Desktop_Pal MVP Manual Test Checklist

## 前置
- [ ] Windows 10/11
- [ ] 设置环境变量(任一即可):
  - `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL`
  - 或 `OPENAI_BASE_URL` + `OPENAI_API_KEY` + `OPENAI_MODEL`
- [ ] `resources/default.vrm` 存在(从 VRoid Hub 下载或自捏)
- [ ] `resources/tray.png` 存在
- [ ] `npm install` 已完成

## Dev 模式

```bash
npm run dev
```

- [ ] 启动后右下角出现透明 VRM 角色窗口
- [ ] VRM 角色面向用户
- [ ] VRM 有轻微呼吸动作
- [ ] 鼠标在屏幕上移动时角色头部跟随
- [ ] 闲置 4-8 秒后身体姿态会变化(sway / hairtouch)
- [ ] 在 VRM 上左键拖动 → 整窗移动
- [ ] 在 VRM 上短按左键 → 底部出现输入框
- [ ] 输入「你好」回车 → 顶部气泡流式显示回复
- [ ] 流式时光标 ▍ 闪烁,完成后消失
- [ ] 回复中含「哈哈」「笑」→ 触发 happy 表情 3 秒
- [ ] 右键 → 弹菜单(Show/Hide input、Settings、Quit)
- [ ] 点 Settings → 切换 provider、改 Base URL/Model/Token、保存
- [ ] 重启程序后设置保留(token 字段显示「已设置」)
- [ ] 切到 OpenAI-Compatible(填 DeepSeek 等)→ 同样能聊
- [ ] 系统托盘有图标,右键有 Show/Hide/Quit
- [ ] 鼠标在 VRM 周围空白区域点击 → 穿透到下方桌面/窗口

## 已知 / 接受的问题

- [ ] canvas 全画布命中(VRM 周围空白处也不穿透)→ 接受,后续优化
- [ ] tray 图标在某些 Windows 版本可能模糊 → 接受,后续做高清版本

## Build & 安装

```bash
npm run build
npm run dist
```

- [ ] `release/Desktop_Pal Setup *.exe` 生成
- [ ] 在干净的 Windows 上安装
- [ ] 桌面 / 开始菜单出现 Desktop_Pal 图标
- [ ] 启动 → 全部 dev 模式的功能可复现
- [ ] 卸载后注册表干净(可选检查)
