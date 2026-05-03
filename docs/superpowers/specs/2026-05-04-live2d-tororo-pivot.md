# Live2D 白猫桌宠 — 替换 VRM 后端

## Context

当前桌宠（commit `9bb3c23` master）跑的是 VRM Avatar_Nana + three-vrm + 11 个 .vrma 动作 + procedural look-at。在桌宠场景下 VRM 暴露了局限：
- VRM 生态围绕**人形 humanoid spec**，标准化骨骼/表情槽/SpringBone 都假设有头/脖子/脊柱/四肢；猫不是
- VRMA 动画按人形骨骼名打关键帧，换非人形角色等于全部失效
- 桌宠用户偏好"小动物"而不是"另一个人形 VTuber"，VRM 的 ARM/SPINE 反复转动放大本就违和的"人扛着小窗"感

替换为 Live2D。Live2D 是 2D 骨骼变形系统，适配任何形状的萌系角色，桌宠场景的事实标准（B 站直播姬、MikuMikuLive、VTube Studio Web）。本期目标：技术栈整体替换、技术验通、视觉占位用 Live2D Cubism 公式 sample 的白猫 Tororo。

## 决策快照

| 维度 | 选择 |
|---|---|
| 模型 | Live2D 公式 sample **Tororo**（白色短毛猫；与 Hijiki 配对） |
| 渲染 SDK | `pixi.js@7` + `pixi-live2d-display@0.4` + `Live2DCubismCore`（Live2D 公司专有 JS bin） |
| 三 JS 路线 | **完全删除**，单一 Live2D 后端 |
| 许可 | Cubism Core SDK 个人/<1000万 JPY 商用免费；README 加归属 |
| 实施分批 | 单一 Task 15，分 7 步顺序提交 |

## 改动清单

### 删除

```
src/renderer/scene/VrmStage.ts
src/renderer/scene/MouseLookAt.ts
src/renderer/scene/IdleController.ts
src/renderer/scene/ExpressionController.ts        ← 见下，部分逻辑迁出
src/renderer/public/default.vrm
src/renderer/public/anim/                          ← 整个目录
resources/default.vrm
VRM/                                               ← 检查后删
tests/vrm-framing.test.ts
tests/mouse-look-at.test.ts
tests/idle-controller.test.ts
tests/expression-mapper.test.ts                   ← 改造为 motion-mapper.test.ts
package.json deps: three / @types/three / @pixiv/three-vrm / @pixiv/three-vrm-animation
```

### 新增

```
src/renderer/stage/Live2DStage.ts                 ← pixi App + 模型加载/dispose
src/renderer/stage/CursorTracker.ts               ← 鼠标 NDC → model.focus(x,y)
src/renderer/stage/MotionController.ts            ← idle 循环 + reaction 一次性
src/renderer/stage/motionMapper.ts                ← 文本 → motion 名（detectExpression 文本分类逻辑迁过来）
src/renderer/public/cubism/live2dcubismcore.min.js ← 手动从 Live2D 下载页拿
src/renderer/public/model/tororo/                  ← Tororo runtime files (.model3.json, .moc3, textures, motions, physics)
package.json deps: pixi.js@^7.4 / pixi-live2d-display@^0.4
tests/cursor-tracker.test.ts
tests/motion-controller.test.ts
tests/motion-mapper.test.ts                       ← 改造自 expression-mapper
docs/manual-test-checklist.md                     ← 重写适配 Live2D
```

### 修改

```
src/renderer/App.tsx                              ← 第二个 useEffect 完全重写
src/renderer/index.html                           ← <script src="./cubism/live2dcubismcore.min.js"> 在 main.tsx 之前
README.md                                         ← 加 Live2D Inc. 归属 + Cubism SDK 使用声明 + Tororo sample 协议链接
.gitignore                                        ← 加 src/renderer/public/cubism/*.js 和 src/renderer/public/model/**
package.json                                      ← 删 three 系，加 pixi 系
```

## 交互能力对接

| 现有能力 | Live2D 实现 | 文件 |
|---|---|---|
| 鼠标头部跟随 | `model.focus(clientX, clientY)`（pixi-live2d-display 内置；它内部映射到 ParamAngleX/Y/Z + ParamEyeBallX/Y） | `CursorTracker.ts` |
| Idle 循环 | `model.motion('Idle')` 触发 + 6–12s 计时切换；Tororo 只 1 个 idle motion，效果是循环+偶尔被 TapBody 打断 | `MotionController.ts` |
| 反应（happy/sad/...） | Tororo 资产**未确认是否带 expression group**，但确定有 motion groups（至少 Idle + TapBody）。降级方案：保留 detectExpression 文本分类，'happy' → `model.motion('TapBody')`；其他 expr 在 Step 5 落实时按 Tororo 实际 motion ��表二次决策；缺失映射时静默无反应 | `motionMapper.ts` + `MotionController.playReaction` |
| 拖动窗口 | DOM pointerdown，无关渲染 | `attachDrag` 不动 |
| 鼠标穿透 | `data-interactive="true"` + `document.elementFromPoint` 不动 | passthrough 不动 |
| ChatBubble / ChatInput | 完全保留洛克王国版 | 不动 |
| ContextMenu / Settings | 完全保留 | 不动 |

## 透明窗口 + WebGL

```ts
const app = new PIXI.Application({
  view: canvas,
  backgroundAlpha: 0,
  antialias: true,
  resolution: window.devicePixelRatio,
  autoDensity: true,
})
```

`pixi.js` 默认 premultiplied alpha；不需要像 three 那样设 `premultipliedAlpha: false`。BrowserWindow 的 `transparent: true + backgroundColor: '#00000000'` 不变。验证：背景透出桌面，无黑底。

## 实施分 7 步（每步独立 commit）

### Step 1 — 装依赖 + 放静态资源

- `npm install pixi.js@^7.4 pixi-live2d-display@^0.4`
- 手动下载 [Cubism SDK for Web](https://www.live2d.com/en/sdk/download/web/)，从 zip 取出 `Core/live2dcubismcore.min.js` 放到 `src/renderer/public/cubism/`
- 手动下载 [Cubism Sample Models](https://www.live2d.com/en/learn/sample/) 中的 Tororo 包，整个目录放到 `src/renderer/public/model/tororo/`
- `.gitignore` 加 `src/renderer/public/cubism/*.js` 和 `src/renderer/public/model/**`（这些 binary 不入库，README 给下载链接）
- `index.html` 在 `<script type="module" src="./main.tsx">` 之前加 `<script src="./cubism/live2dcubismcore.min.js"></script>`
- commit: "chore: add live2d cubism sdk and tororo sample assets"

### Step 2 — Live2DStage 最小可显示 + 删 VRM

- 写 `src/renderer/stage/Live2DStage.ts`：构造一个 PIXI.Application 接管 canvas，`Live2DModel.from('./model/tororo/runtime/tororo.model3.json')`，stage.addChild(model)，居中缩放，dispose 清理 ticker + app
- 删 `src/renderer/scene/VrmStage.ts`、`MouseLookAt.ts`、`IdleController.ts`（**保留** `ExpressionController.ts` 给 Step 5 迁逻辑用）
- 删 `src/renderer/public/default.vrm`、`src/renderer/public/anim/`、`resources/default.vrm`、`VRM/`（git rm）
- 删依赖 `three / @types/three / @pixiv/three-vrm / @pixiv/three-vrm-animation`
- 删测试 `tests/vrm-framing.test.ts`、`tests/mouse-look-at.test.ts`、`tests/idle-controller.test.ts`
- 改 App.tsx 第二个 useEffect：用 `Live2DStage` 替换 `VrmStage`；暂时删 idle/lookAt/expr 接入代码（Step 3-5 逐一加回）
- typecheck + 跑 dev：白猫静态显示，无报错
- commit: "feat: replace vrm three.js stack with live2d stage (tororo)"

### Step 3 — CursorTracker

- 写 `src/renderer/stage/CursorTracker.ts`：`new CursorTracker(model, canvas)`，listen window mousemove，把 clientX/Y 通过 `canvas.getBoundingClientRect()` 归一化后调 `model.focus(x, y)`，return dispose
- App.tsx 接入
- 写 `tests/cursor-tracker.test.ts`：纯计算函数 `clientToFocus(rect, clientX, clientY) → {x,y}`（NDC：左下 -1,-1 / 右上 1,1）的失败测试 → 实现 → 通过
- typecheck + 全测试
- commit: "feat: live2d cursor tracking via model.focus"

### Step 4 — MotionController

- 写 `src/renderer/stage/MotionController.ts`：构造时立刻 `model.motion('Idle')` 启动循环；`update(dt)` 计时 6–12s 切换（Tororo 只 1 个 idle，等于重新触发；如果 motion group 数量 > 1 才真正 random pick）；`playReaction(group, index?)` 一次性触发，结束后回 idle
  - 触发 motion 时设 priority=NORMAL/FORCE，避免叠加
  - listen `model.internalModel.motionManager.on('motionFinish', ...)` 切回 idle
- 写 `tests/motion-controller.test.ts`：mock model，测计时切换逻辑（不依赖 PIXI/Live2D runtime）—— 注入 `motionPlayer` 接口（`{ play(group, index): Promise<void> }`）让 MotionController 调用，便于断言
- App.tsx 接入
- commit: "feat: idle cycling and reaction motion controller"

### Step 5 — Motion Mapper（文本 → 动作）

- 把现有 `src/renderer/scene/ExpressionController.ts` 里的 `detectExpression(text)` 函数搬到 `src/renderer/stage/motionMapper.ts`，加 `mapToMotion(expr) → { group: 'TapBody', index: 0 } | null`：'happy' → TapBody，其余 → null（Tororo 资产限制）
- 测试 `tests/motion-mapper.test.ts`：保留原 6 个 detectExpression 用例 + 加 mapToMotion 映射用例
- 删 `src/renderer/scene/ExpressionController.ts`（已经搬完）
- App.tsx：chat.onDone → `motionMapper.detectExpression(text) → mapToMotion → motionController.playReaction`
- commit: "feat: text-keyword to motion mapping for chat reactions"

### Step 6 — README + 合规

- README 新增 "## Third-party assets and SDKs" 段：
  - Live2D Cubism Core SDK（©Live2D Inc.，链接到 [Live2D Inc.](https://www.live2d.com/) 和[出版协议](https://www.live2d.com/en/sdk/license/)）
  - Tororo sample 模型（©Live2D Inc.，[sample 协议](https://www.live2d.com/en/learn/sample/)，仅用于学习与原型，不重发布）
  - pixi.js (MIT)
  - pixi-live2d-display (MIT)
- 加 "## First-time setup" 段说明 Cubism Core JS 和 Tororo 资源要手动下载放对路径
- commit: "docs: third-party attribution and live2d setup instructions"

### Step 7 — 验收

- 重写 `docs/manual-test-checklist.md` 适配 Live2D：删 "VRM 头跟随" 改 "Tororo 眼/脸跟鼠标"；删"4-8s 身体姿态变"改"循环 idle + 偶尔甩尾"；删"哈哈→happy 表情"改"哈哈→TapBody 反应"
- `npm test` 全绿、`npm run typecheck` 干净、`npm run build` 出 `out/` 无错
- `unset ELECTRON_RUN_AS_NODE && npm run dev` 跑一遍：白猫显示、鼠标跟脸、聊天流程通、洛克王国 UI 不变形
- commit: "test: live2d-adapted manual checklist and verification"

## 验证

实施完成后这条命令链应该全过：
```bash
cd d:/_Personal/Desktop_Pal
npm test           # 全绿（删了 VRM 测试，留 cursor-tracker / motion-controller / motion-mapper / 共 ~30+ 用例）
npm run typecheck  # 干净
npm run build      # out/ 产物完整
unset ELECTRON_RUN_AS_NODE && npm run dev   # 桌面右下出白猫透明窗
```

手动验收（按 docs/manual-test-checklist.md）：
1. Tororo 出现在透明窗里，背景能透桌面
2. 鼠标动 → 猫脸 / 眼跟随
3. 静默 6–12s → motion 切换（Tororo 只 1 个 idle，效果=重新触发）
4. 输入"你好" → 顶部气泡流式 Claude 回复
5. 回复含"哈哈" → TapBody 动作触发，结束自动回 idle
6. 拖窗口、右键菜单、Settings、Quit 全不变

## 风险

- **Cubism Core JS 手动获取**：Live2D 公司不允许 npm mirror 这个 binary，每次新机器要从官网下。可写 `scripts/fetch-cubism-core.mjs` 提示用户去哪下，但**不做自动下载**避免违协议
- **Tororo motion 资产规模待 Step 1 落地后确认**：sample 通常 Idle + TapBody 2 组，可能更多。如反应库太单调，本期接受；后续要丰富视觉时换有 expression group 的真白猫（BOOTH 50–200 元同人）
- **pixi.js 版本锁 v7**：v8 跟 pixi-live2d-display 不兼容，要等社区适配。lock pixi 在 ^7.4
- **WebGL 透明锯齿**：Windows + transparent BrowserWindow + WebGL alpha 边缘可能有 fringe，VRM 那边也有，pixi 默认 premultiplied 应该比 three 好一点，但要看实测
- **dev server crash on long-run**：之前 VRM 时期 dev 长时间跑过几次 network service crash，可能跟 transparent + GPU 路径有关，跟换栈无关，但要留意是否好转/恶化
