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
    const model = await Live2DModel.from(modelUrl)
    // 跨 pixi 版本类型不一致,这里强转
    this.app.stage.addChild(model as unknown as PIXI.DisplayObject)
    this.fitModel(model)
    this.model = model
    return model
  }

  private fitModel(model: Live2DModel): void {
    const { width, height } = this.app.screen
    // 95% 视口高度适配
    const targetHeight = height * 0.95
    const scale = targetHeight / model.height
    model.scale.set(scale)
    // 居中
    model.x = width / 2
    model.y = height / 2
    // anchor / pivot 居中,best-effort
    if ((model as unknown as { anchor?: { set(x: number, y: number): void } }).anchor) {
      ;(model as unknown as { anchor: { set(x: number, y: number): void } }).anchor.set(0.5, 0.5)
    } else {
      model.pivot.set(model.width / (2 * scale), model.height / (2 * scale))
    }
  }

  dispose(): void {
    this.app.destroy(false, { children: true, texture: false, baseTexture: false })
    this.model = null
  }
}
