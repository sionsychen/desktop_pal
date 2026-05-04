import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// 把 PIXI 的 Ticker 注册给 Live2DModel,模型才会随 ticker 跑动
// pixi-live2d-display 的 @pixi/ticker 类型路径与 pixi.js 内嵌的不同名,这里强转跳过
Live2DModel.registerTicker(PIXI.Ticker as unknown as Parameters<typeof Live2DModel.registerTicker>[0])

export class Live2DStage {
  readonly app: PIXI.Application
  readonly canvas: HTMLCanvasElement
  model: Live2DModel | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      resizeTo: canvas,
    })
    // 关掉 stage 的 pixi 事件监听; Live2DModel 不是标准 DisplayObject,
    // 会让 pixi v7 的 EventBoundary 调 isInteractive() 时炸
    this.app.stage.eventMode = 'none'
    this.app.stage.interactiveChildren = false
    window.addEventListener('resize', this.onWindowResize)
  }

  private onWindowResize = (): void => {
    this.refit()
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

  refit(): void {
    if (!this.model) return
    // canvas.clientWidth 在某些时机返回 pixi 给 canvas 设的 HTML 属性默认值 800x600
    // 直接用 viewport 尺寸,这是 BrowserWindow 的 content area, 跟实际窗口一致
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 同步 canvas + renderer 到真实尺寸
    this.canvas.style.width = vw + 'px'
    this.canvas.style.height = vh + 'px'
    this.app.renderer.resize(vw, vh)

    this.model.scale.set(1)
    this.model.position.set(0, 0)
    this.model.pivot.set(0, 0)
    const bounds = this.model.getLocalBounds()

    // 同时按宽和高约束,取小的那个 → 整个 bbox 进窗口,不截断
    const scaleByH = (vh * 0.92) / bounds.height
    const scaleByW = (vw * 0.92) / bounds.width
    const scale = Math.min(scaleByH, scaleByW)
    this.model.scale.set(scale)
    this.model.x = vw / 2 - (bounds.x + bounds.width / 2) * scale
    this.model.y = vh / 2 - (bounds.y + bounds.height / 2) * scale
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
    window.removeEventListener('resize', this.onWindowResize)
    // texture/baseTexture 保留:Cubism 运行时全局缓存了贴图,销毁会让后续 loadModel 拿不到资源
    this.app.destroy(false, { children: true, texture: false, baseTexture: false })
    this.model = null
  }
}
