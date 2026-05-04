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
}

export interface MotionRef { group: string; index?: number }

export class MotionController {
  private readonly idleGroup: string
  private readonly tapGroup: string
  private readonly tapCount: number
  private readonly minSec: number
  private readonly maxSec: number

  private timer = 0
  private nextSwitchAt = 0
  private playingReaction = false
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
  }

  start(): void {
    void this.player.play(this.idleGroup, 0)
    this.scheduleNext()
    this.offFinish = this.player.onMotionFinish(() => {
      if (this.playingReaction) {
        this.playingReaction = false
        void this.player.play(this.idleGroup, 0)
      }
    })
  }

  update(dt: number): void {
    if (this.playingReaction) return
    this.timer += dt
    if (this.timer < this.nextSwitchAt) return
    const idx = Math.floor(Math.random() * this.tapCount)
    void this.player.play(this.tapGroup, idx)
    this.scheduleNext()
  }

  playReaction(ref: MotionRef): void {
    this.playingReaction = true
    void this.player.play(ref.group, ref.index)
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
