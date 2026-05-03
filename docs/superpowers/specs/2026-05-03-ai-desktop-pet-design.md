# AI 桌宠 Design Spec

- 创建日期: 2026-05-03
- 状态: Design approved, awaiting implementation plan
- 项目目录: `d:\_Personal\Desktop_Pal`

## Context

用户想做一个 AI 桌宠项目,核心动机是「追求视觉效果 / 炫酷玩具」,而非生产力工具或长期陪伴 AI。决定构建一个 **3D VRM 角色 + LLM 对话气泡** 的 Windows 桌面浮层应用。

视觉是核心卖点,AI 智能是配角(够用即可)。VRM 路线的关键优势:VRoid Studio 免费且 2 小时能捏出可用角色,VRoid Hub 海量免费 VRM 可下载,版权清晰;视觉天花板��(360° 旋转、骨骼动画、丰富表情);技术栈现代(Three.js + three-vrm 生态成熟)。

## Goals & Non-Goals

### MVP 验收标准

1. 启动后 VRM 角色浮在桌面右下角,背景透明,不挡下层窗口操作
2. 可拖动移动,右键菜单可退出 / 缩放
3. 鼠标靠近桌宠时,角色头部用 IK 跟随鼠标
4. 静置 3 秒后开始播 idle 动画循环(随机切换:呼吸 / 玩头发 / 打哈欠 / 看周围)
5. 左键单击桌宠弹出输入框;输入文字回车后,角色头顶气泡显示 LLM 流式回复
6. 设置面板:provider 切换(Anthropic / OpenAI-Compatible)、Base URL、API Key、Model ID

### 非 MVP(接口预留,本期不做)

- 语音输出 / 口型同步
- 看屏幕 / 听麦克风
- 长期记忆(向量库)
- 多角色切换 UI(MVP 阶段通过改 settings 文件切)
- 自定义动画导入
- macOS / Linux 适配(代码尽量保持跨平台,但只在 Windows 验证)

## 技术栈

| 层 | 选择 | 备注 |
|---|---|---|
| 桌面壳 | Electron(latest stable) | 透明 / 置顶 / 鼠标穿透在 Windows 上方案最成熟 |
| 渲染 | Three.js + `@pixiv/three-vrm` | VRM 1.0 标准,IK / 表情 / 动画完备 |
| UI | React 18 + Tailwind CSS | 气泡 / 设置面板 / 右键菜单用 DOM |
| LLM | Vercel AI SDK(`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai-compatible`) | 统一抽象,切 provider 改一行 |
| 打包 | electron-builder | Windows nsis 安装包 |
| 语言 | TypeScript(strict) | |
| 构建 | Vite + electron-vite | 主 / 渲染进程统一构建 |

## 架构

### 进程拆分

- **主进程(Node)**: 窗口管理、IPC、LLM 调用、凭据存储、托盘
- **渲染进程(Browser)**: Three.js 渲染、UI、用户交互

API token 只在主进程内存里,**不**经 IPC 暴露给渲染进程。

### 透明窗口策略

- `BrowserWindow`: `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`, `hasShadow: false`
- 窗口默认开启鼠标穿透:`win.setIgnoreMouseEvents(true, { forward: true })`
- 渲染进程每帧根据鼠标位置做命中测试:
  - 鼠标在 VRM 角色像素上 → IPC 通知主进程关穿透
  - 鼠标在 DOM UI(气泡 / 菜单 / 输入框)上 → 关穿透
  - 否则 → 开穿透
- 命中测试: VRM 用 raycaster 打 bounding box;DOM 用 `document.elementFromPoint`

### Three.js 透明渲染

```ts
new WebGLRenderer({ alpha: true, premultipliedAlpha: false, antialias: true })
scene.background = null
renderer.setClearColor(0x000000, 0)
```

### 模块结构

```
src/
  main/
    index.ts                  入口,创建窗口 + 托盘
    window.ts                 BrowserWindow 配置 + 穿透切换
    ipc.ts                    IPC 路由注册
    llm/
      types.ts                ChatMessage, StreamChunk
      providerFactory.ts      根据 settings 构造 ai-sdk model
      chatSession.ts          历史 + system prompt + 滑动窗口(20 轮)
    settings/
      store.ts                settings.json 读写
      credentials.ts          safeStorage ��密凭据
  renderer/
    main.tsx                  React 入口
    scene/
      VrmStage.ts             Three.js 场景 + VRM 加载
      MouseLookAt.ts          鼠标 → 头部骨骼 IK(带阻尼)
      IdleController.ts       idle 状态机(weighted random + blend)
      ExpressionController.ts 关键词 → VRM blendshape
    chat/
      ChatBubble.tsx          流式气泡
      ChatInput.tsx           输入框
      useChatStream.ts        IPC chat:* 事件 hook
    app/
      DragController.ts       拖动判定(按下后位移阈值区分 click vs drag)
      ContextMenu.tsx         右键菜单
      HitTest.ts              VRM + DOM 命中测试 → IPC 切穿透
    settings/
      SettingsPanel.tsx       provider 表单
  shared/
    ipc-channels.ts           IPC channel 名常量
```

每个模块单一职责,依赖单向。

### 数据流

#### 对话流

```
用户回车 (ChatInput)
  → IPC chat:send { text }
  → main/chatSession 追加 user message + 滑动窗口裁剪
  → providerFactory.streamText(messages, system)
  → for await chunk: IPC chat:delta { text }
  → renderer ChatBubble 追加显示
  → 完成后 IPC chat:done { fullText }
  → ExpressionController 扫描 fullText 关键词触发表情
```

#### 渲染循环

```
每帧 (requestAnimationFrame):
  IdleController.update(dt)        ← 选当前 idle 动画并 blend
  MouseLookAt.update(mouseNDC)     ← 头骨 lookAt (优先级高于 idle 头部)
  ExpressionController.update(dt)  ← blendshape 衰减
  vrm.update(dt)
  renderer.render(scene, camera)
```

`MouseLookAt` 和 `IdleController` 都写头部骨骼,`MouseLookAt` 后写覆盖前者头部部分;身体姿态由 idle 独占。

## LLM 抽象

### Provider 配置

设置面板下拉:
- **Anthropic**(原生 Anthropic API)
- **OpenAI-Compatible**(OpenAI 官方 / DeepSeek / Moonshot / 公司网关 / 其他兼容)

每个 provider 独立保存以下字段:

| 字段 | Anthropic | OpenAI-Compatible |
|---|---|---|
| Base URL | 可选(留空走官方) | 必填 |
| API Key / Auth Token | 必填 | 必填 |
| Model ID | 必填,自由文本 | 必填,自由文本 |

### 环境变量预填

首次启动若 settings.json 不存在,按以下规则预填:
- 有 `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` → Anthropic provider 预填,model 取 `ANTHROPIC_MODEL`
- 有 `OPENAI_BASE_URL` + `OPENAI_API_KEY` → OpenAI-Compatible provider 预填,model 取 `OPENAI_MODEL`(没有则留空)
- 二者都有时优先 Anthropic,但两组都填好,用户可在 UI 切

### providerFactory 实现要点

```ts
function createModel(settings) {
  if (settings.provider === 'anthropic') {
    const client = createAnthropic({
      baseURL: settings.anthropic.baseURL || undefined,
      apiKey: settings.anthropic.token,
    })
    return client(settings.anthropic.model)
  }
  const client = createOpenAICompatible({
    baseURL: settings.openai.baseURL,
    apiKey: settings.openai.token,
    name: 'custom',
  })
  return client(settings.openai.model)
}
```

> 注: 公司中转网关一般用 bearer `Authorization: Bearer <token>`。`@ai-sdk/anthropic` 默认走 `x-api-key`,如果网关不接受需要在工厂里支持自定义 headers(`fetch` 选项)。**实施时验证一次,不行就用自定义 fetch 注入 Authorization header**。

### 流式调用

```ts
const result = streamText({ model, system, messages, abortSignal })
for await (const delta of result.textStream) {
  ipcSend('chat:delta', { text: delta })
}
```

支持中途取消(用户关闭气泡 → AbortController.abort)。

### 对话历史

- 内存数组,session 级别(关闭程序丢失,MVP 不持久化)
- 滑动窗口:超过 20 轮(40 条消息)从头丢弃
- system prompt 固定一段角色人设(默认值在代码里,后续可在设置面板自定义)
- Anthropic provider 启用 prompt caching:system block 加 `cacheControl: { type: 'ephemeral' }`,5 分钟 TTL,多轮命中省 token。OpenAI-Compatible 不启用(协议不通用)

### 关键词 → 表情映射

简单字符串匹配,无情感分析:

| 关键词(任一命中) | 表情 |
|---|---|
| 哈哈 / 笑 / 开心 / 😄 | happy |
| ?? / 啊? | surprised |
| 嗯... / 让我想想 / 思考 | thinking |
| 抱歉 / 难过 / 😢 | sad |
| (默认) | neutral |

由 `ExpressionController` 在 `chat:done` 后扫描全文,触发对应 VRM blendshape,3 秒后衰减回 neutral。

## 安全

- 凭据用 Electron `safeStorage.encryptString` 加密后写入 `app.getPath('userData')/credentials.enc`
- settings.json 只存非敏感配置(provider 选择、base URL、model ID)
- token 只在主进程内存,IPC 严禁返回给渲染进程
- 渲染进程开启 `contextIsolation: true`,`nodeIntegration: false`,通过 `contextBridge` 暴露白名单 API

## 资产

- 默认 VRM 模型: 项目自带一个 VRoid 范例模型(从 VRoid Hub CC0 模型挑一个,放在 `resources/default.vrm`)
- 用户替换: 设置面板「选择模型...」按钮 → 文件对话框 → 复制到 userData 目录引用
- idle 动画: 用 mixamo 或自己 K 的几段 fbx,转成 VRM 兼容的 glTF 动画(`@pixiv/three-vrm-animation` 支持 VRMA 格式)
- MVP 至少 4 段:idle_breathe / idle_hair / idle_yawn / idle_lookaround

## 关键技术坑预案

1. **Windows 透明窗口边缘锯齿**: `transparent: true` + 子像素渲染会有 1px 黑边,设 `backgroundColor: '#00000000'`(全透明)+ canvas alpha
2. **鼠标穿透切换抖动**: 命中测试每帧跑可能开关频繁;加 100ms 防抖,且只在状态变化时 IPC
3. **VRM 朝向**: VRoid 导出默认朝 -Z,three-vrm 自动处理,但镜像渲染时注意 `vrm.scene.rotation.y = Math.PI`
4. **多 GPU 笔记本**: Electron 默认走集显,Three.js 性能掉;启动加 `app.commandLine.appendSwitch('force_high_performance_gpu')`
5. **HiDPI**: `renderer.setPixelRatio(window.devicePixelRatio)`,在 4K 屏不糊
6. **首次启动无 token**: 不要直接报错,弹设置面板提示填写

## 测试策略

- **单元**: `chatSession`(滑动窗口 / system prompt 注入)、`HitTest`(像素命中)、关键词→表情映射
- **集成**: 用 mock provider(返回固定流)跑 chat:send → chat:delta → chat:done 全链路
- **手测清单**: MVP 6 项验收 + 4 个技术坑场景
- LLM 真实调用不进 CI,本地手测

## 关键文件清单(实施时主要改 / 新建)

新建,无现有代码改动(全新项目)。

## 验证(End-to-end)

实施完成后,在 Windows 上:

1. `pnpm install && pnpm dev` 启动开发模式,观察 VRM 浮层
2. 拖动 / 右键菜单 / 鼠标跟随 / idle 动画 4 项目视检查
3. 配置 Anthropic provider(用现有 `ANTHROPIC_*` env)→ 输入「你好」→ 看到流式回复 + 表情
4. 切到 OpenAI-Compatible,填一个 DeepSeek key → 同样测试
5. 关程序重开,设置和凭据保持
6. `pnpm build && pnpm dist` 出 nsis 安装包,在干净 Windows 上装一次能跑

## 后续(out of scope,接口预留)

- 语音(TTS + 口型同步): `ChatBubble` 完成后 emit `speak(text)`,空实现先放着
- 屏幕感知: 主进程加 screenshot 模块 → 多模态消息(Anthropic vision / OpenAI vision)
- 长期记忆: `chatSession` 接口预留 `memoryProvider`
- 多角色: settings 里 model 列表改成数组 + 默认选中
