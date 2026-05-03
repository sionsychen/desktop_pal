import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'

export type IdleState = 'breathe' | 'sway' | 'hairtouch' | 'lookaround'

export interface IdleOptions {
  minSec?: number
  maxSec?: number
}

export class IdleStateMachine {
  current: IdleState
  private timer = 0
  private nextSwitch = 0
  private readonly opts: Required<IdleOptions>

  constructor(public readonly states: IdleState[], opts: IdleOptions = {}) {
    if (states.length === 0) throw new Error('IdleStateMachine needs at least one state')
    this.current = states[0]
    this.opts = { minSec: opts.minSec ?? 4, maxSec: opts.maxSec ?? 8 }
    this.scheduleNext()
  }

  private scheduleNext(): void {
    this.nextSwitch = this.opts.minSec + Math.random() * (this.opts.maxSec - this.opts.minSec)
    this.timer = 0
  }

  update(dt: number): void {
    this.timer += dt
    if (this.timer < this.nextSwitch) return
    if (this.states.length === 1) {
      this.scheduleNext()
      return
    }
    const others = this.states.filter((s) => s !== this.current)
    this.current = others[Math.floor(Math.random() * others.length)]
    this.scheduleNext()
  }
}

export class IdleController {
  private fsm = new IdleStateMachine(['breathe', 'sway', 'hairtouch'])
  private elapsed = 0

  constructor(private readonly vrm: VRM) {}

  update(dt: number): void {
    this.elapsed += dt
    this.fsm.update(dt)

    // procedural 呼吸:胸腔上下浮动
    const chest = this.vrm.humanoid.getNormalizedBoneNode('chest')
                ?? this.vrm.humanoid.getNormalizedBoneNode('upperChest')
                ?? this.vrm.humanoid.getNormalizedBoneNode('spine')
    if (chest) {
      const breathe = Math.sin(this.elapsed * 1.6) * 0.015
      chest.position.y = breathe
    }

    // 状态相关的小动作
    const spine = this.vrm.humanoid.getNormalizedBoneNode('spine')
    if (spine) {
      switch (this.fsm.current) {
        case 'breathe':
          spine.rotation.z = 0
          break
        case 'sway':
          spine.rotation.z = Math.sin(this.elapsed * 0.8) * 0.04
          break
        case 'hairtouch': {
          const armR = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
          if (armR) armR.rotation.z = -1.0 + Math.sin(this.elapsed * 1.2) * 0.1
          break
        }
        default:
          break
      }
    }
  }
}
