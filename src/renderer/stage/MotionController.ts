export interface MotionPlayer {
  play(group: string, index?: number): Promise<void>
  onMotionFinish(cb: () => void): () => void
}

export interface MotionControllerOptions {
  idleGroup: string
  tapGroup: string
  tapCount: number
  /** 闲置循环触发 tap 动作的时间下界,秒。null/0 = 不自动触发(只在 chat reaction 时播 tap) */
  minSwitchSec?: number | null
  /** 闲置循环触发 tap 动作的时间上界,秒 */
  maxSwitchSec?: number
  maxReactionSec?: number
}

export interface MotionRef { group: string; index?: number }

export class MotionController {
  private readonly idleGroup: string
  private readonly tapGroup: string
  private readonly tapCount: number
  private readonly minSec: number | null
  private readonly maxSec: number
  private readonly maxReactionSec: number

  private timer = 0
  private nextSwitchAt = 0
  private playingReaction = false
  private reactionTimer = 0
  private offFinish: (() => void) | null = null

  constructor(
    private readonly player: MotionPlayer,
    opts: MotionControllerOptions,
  ) {
    this.idleGroup = opts.idleGroup
    this.tapGroup = opts.tapGroup
    this.tapCount = opts.tapCount
    this.minSec = opts.minSwitchSec === undefined ? 6 : opts.minSwitchSec
    this.maxSec = opts.maxSwitchSec ?? 12
    this.maxReactionSec = opts.maxReactionSec ?? 10
  }

  start(): void {
    void this.player.play(this.idleGroup, 0).catch((e) => console.warn('motion play failed', e))
    this.scheduleNext()
    this.offFinish = this.player.onMotionFinish(() => {
      if (this.playingReaction) {
        this.playingReaction = false
        this.reactionTimer = 0
        void this.player.play(this.idleGroup, 0).catch((e) => console.warn('motion play failed', e))
      }
    })
  }

  update(dt: number): void {
    if (this.playingReaction) {
      this.reactionTimer += dt
      if (this.reactionTimer >= this.maxReactionSec) {
        console.warn('motion reaction watchdog fired; resuming idle')
        this.playingReaction = false
        this.reactionTimer = 0
        void this.player.play(this.idleGroup, 0).catch((e) => console.warn('motion play failed', e))
      }
      return
    }
    // minSec=null 表示禁用 idle 期间的自动 tap 循环
    if (this.minSec === null || this.minSec <= 0) return
    this.timer += dt
    if (this.timer < this.nextSwitchAt) return
    const idx = Math.floor(Math.random() * this.tapCount)
    void this.player.play(this.tapGroup, idx).catch((e) => console.warn('motion play failed', e))
    this.scheduleNext()
  }

  playReaction(ref: MotionRef): void {
    this.playingReaction = true
    this.reactionTimer = 0
    void this.player.play(ref.group, ref.index).catch((e) => console.warn('motion play failed', e))
  }

  dispose(): void {
    this.offFinish?.()
    this.offFinish = null
  }

  private scheduleNext(): void {
    if (this.minSec === null || this.minSec <= 0) return
    this.timer = 0
    this.nextSwitchAt = this.minSec + Math.random() * (this.maxSec - this.minSec)
  }
}
