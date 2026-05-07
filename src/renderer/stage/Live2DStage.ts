import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// 把 PIXI 的 Ticker 注册给 Live2DModel,模型才会随 ticker 跑动
// pixi-live2d-display 的 @pixi/ticker 类型路径与 pixi.js 内嵌的不同名,这里强转跳过
Live2DModel.registerTicker(PIXI.Ticker as unknown as Parameters<typeof Live2DModel.registerTicker>[0])

const FIT_PADDING = 0.96  // 模型 bbox 占 canvas 的最大比例 (留 4% 呼吸空间)

export class Live2DStage {
  readonly app: PIXI.Application
  readonly canvas: HTMLCanvasElement
  model: Live2DModel | null = null
  private readonly resizeObserver: ResizeObserver

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // 不传 resizeTo, 不让 PIXI 自己读 canvas 尺寸; 我们用 ResizeObserver 单一驱动
    this.app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      width: canvas.clientWidth || 1,
      height: canvas.clientHeight || 1,
    })
    this.app.stage.eventMode = 'none'
    this.app.stage.interactiveChildren = false

    this.resizeObserver = new ResizeObserver(() => this.refit())
    this.resizeObserver.observe(canvas)
  }

  async loadModel(modelUrl: string): Promise<Live2DModel> {
    const model = await Live2DModel.from(modelUrl, {
      // pixi-live2d-display@0.4 的 auto-interact 依赖 pixi v6 的 InteractionManager,
      // 在 pixi v7 会抛 'manager.on is not a function'。我们用自己的 CursorTracker
      autoInteract: false,
    })
    if (!this.app.stage) {
      model.destroy?.()
      throw new Error('Live2DStage disposed before model loaded')
    }
    this.app.stage.addChild(model as unknown as PIXI.DisplayObject)
    this.model = model
    this.refit()
    return model
  }

  /** 把模型 fit 进 canvas client box, 水平居中, 垂直底部对齐 */
  refit(): void {
    const cw = this.canvas.clientWidth
    const ch = this.canvas.clientHeight
    if (cw <= 0 || ch <= 0) return

    // 同步 PIXI renderer 到 canvas 当前 client 尺寸 (不写 canvas style, 那是 CSS 的事)
    this.app.renderer.resize(cw, ch)

    if (!this.model) return

    this.model.scale.set(1)
    this.model.position.set(0, 0)
    this.model.pivot.set(0, 0)
    const bounds = this.model.getLocalBounds()

    const scale = Math.min(
      (ch * FIT_PADDING) / bounds.height,
      (cw * FIT_PADDING) / bounds.width,
    )
    this.model.scale.set(scale)
    // 水平居中, 底部对齐: bbox 底贴 canvas 底
    this.model.x = cw / 2 - (bounds.x + bounds.width / 2) * scale
    this.model.y = ch - (bounds.y + bounds.height) * scale
  }

  /** 用模型 bounding box 做 screen-space 命中测试。Tororo 的 bbox ≈ 80% 拟合身形,
   * 对桌宠场景够用; 真像素 alpha 测试代价更高,留作未来优化 */
  containsPoint(clientX: number, clientY: number): boolean {
    if (!this.model) return false
    const rect = this.canvas.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const b = this.model.getBounds()
    return localX >= b.x && localX <= b.x + b.width && localY >= b.y && localY <= b.y + b.height
  }

  dispose(): void {
    this.resizeObserver.disconnect()
    // texture/baseTexture 保留:Cubism 运行时全局缓存了贴图,销毁会让后续 loadModel 拿不到资源
    this.app.destroy(false, { children: true, texture: false, baseTexture: false })
    this.model = null
  }
}
