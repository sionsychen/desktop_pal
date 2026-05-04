export interface MotionPlayer {
  play(group: string, index?: number): Promise<void>
  onMotionFinish(cb: () => void): () => void
}

export interface MotionControllerOptions {
  idleGroup: string
  tapGroup: string
  tapCount: number
  minSwitchSec?: number
  maxSwitchSec?: number
  maxReactionSec?: number
}

export interface MotionRef { group: string; index?: number }

export class MotionController {
  private readonly idleGroup: string
  private readonly tapGroup: string
  private readonly tapCount: number
  private readonly minSec: number
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
    this.minSec = opts.minSwitchSec ?? 6
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
    this.timer = 0
    this.nextSwitchAt = this.minSec + Math.random() * (this.maxSec - this.minSec)
  }
}
