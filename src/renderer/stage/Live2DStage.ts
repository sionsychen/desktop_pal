import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// 把 PIXI 的 Ticker 注册给 Live2DModel,模型才会随 ticker 跑动
// pixi-live2d-display 的 @pixi/ticker 类型路径与 pixi.js 内嵌的不同名,这里强转跳过
Live2DModel.registerTicker(PIXI.Ticker as unknown as Parameters<typeof Live2DModel.registerTicker>[0])

export class Live2DStage {
  readonly app: PIXI.Application
  model: Live2DModel | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      resizeTo: canvas,
    })
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
    const { width: vw, height: vh } = this.app.screen

    // 重置 transform,先用 scale=1 拿干净的本地 bounds
    this.model.scale.set(1)
    this.model.position.set(0, 0)
    this.model.pivot.set(0, 0)
    const bounds = this.model.getLocalBounds()

    // 按窗口高度的 92% 缩放(留 4% 上下边距)
    const scale = (vh * 0.92) / bounds.height
    this.model.scale.set(scale)

    // 把 bbox 中心点对齐到窗口中心
    this.model.x = vw / 2 - (bounds.x + bounds.width / 2) * scale
    this.model.y = vh / 2 - (bounds.y + bounds.height / 2) * scale
  }

  dispose(): void {
    // texture/baseTexture 保留:Cubism 运行时全局缓存了贴图,销毁会让后续 loadModel 拿不到资源
    this.app.destroy(false, { children: true, texture: false, baseTexture: false })
    this.model = null
  }
}
