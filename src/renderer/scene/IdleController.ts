import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { VRM } from '@pixiv/three-vrm'
import { VRMAnimationLoaderPlugin, createVRMAnimationClip, type VRMAnimation } from '@pixiv/three-vrm-animation'

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

const IDLE_POOL = ['LookAround', 'Relax', 'Sleepy', 'Thinking'] as const
const REACTION_POOL = ['Angry', 'Blush', 'Clapping', 'Goodbye', 'Jump', 'Sad', 'Surprised'] as const
const ALL_VRMA = [...IDLE_POOL, ...REACTION_POOL] as const
type ClipName = (typeof ALL_VRMA)[number]

const FADE_SEC = 0.4
const SWITCH_MIN = 6
const SWITCH_MAX = 12

export class IdleController {
  private readonly mixer: THREE.AnimationMixer
  private readonly clips = new Map<ClipName, THREE.AnimationClip>()
  private readonly actions = new Map<ClipName, THREE.AnimationAction>()
  private currentIdle: ClipName | null = null
  private oneShot: THREE.AnimationAction | null = null
  private timer = 0
  private nextSwitchAt = 0
  private ready = false

  constructor(private readonly vrm: VRM) {
    this.mixer = new THREE.AnimationMixer(vrm.scene)
    this.mixer.addEventListener('finished', this.onOneShotEnd as never)
    void this.loadAll()
  }

  private async loadAll(): Promise<void> {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser))
    await Promise.all(
      ALL_VRMA.map(async (name) => {
        try {
          const gltf = await loader.loadAsync(`./anim/${name}.vrma`)
          const anims = (gltf.userData as { vrmAnimations?: VRMAnimation[] }).vrmAnimations
          const va = anims?.[0]
          if (!va) return
          const clip = createVRMAnimationClip(va, this.vrm)
          clip.name = name
          this.clips.set(name, clip)
          const action = this.mixer.clipAction(clip)
          this.actions.set(name, action)
        } catch (e) {
          console.warn(`Failed to load ${name}.vrma`, e)
        }
      }),
    )
    this.ready = true
    this.startRandomIdle(0)
  }

  private startRandomIdle(fadeIn: number): void {
    const available = IDLE_POOL.filter((n) => this.actions.has(n))
    if (!available.length) return
    const candidates = available.filter((n) => n !== this.currentIdle)
    const pool = candidates.length ? candidates : available
    const next = pool[Math.floor(Math.random() * pool.length)]
    const prev = this.currentIdle
    this.currentIdle = next
    const action = this.actions.get(next)!
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fadeIn).play()
    if (prev && prev !== next) this.actions.get(prev)?.fadeOut(fadeIn)
    this.scheduleNext()
  }

  private scheduleNext(): void {
    this.timer = 0
    this.nextSwitchAt = SWITCH_MIN + Math.random() * (SWITCH_MAX - SWITCH_MIN)
  }

  private onOneShotEnd = (e: { action: THREE.AnimationAction }): void => {
    if (e.action !== this.oneShot) return
    e.action.fadeOut(FADE_SEC)
    if (this.currentIdle) this.actions.get(this.currentIdle)?.reset().fadeIn(FADE_SEC).play()
    this.oneShot = null
  }

  static reactionFor(expr: 'happy' | 'surprised' | 'sad' | 'thinking' | 'neutral'): ClipName | null {
    switch (expr) {
      case 'happy': return 'Clapping'
      case 'surprised': return 'Surprised'
      case 'sad': return 'Sad'
      case 'thinking': return 'Thinking'
      default: return null
    }
  }

  playReaction(name: ClipName | null): void {
    if (!name || !this.ready) return
    const action = this.actions.get(name)
    if (!action) return
    if (this.oneShot) this.oneShot.fadeOut(FADE_SEC * 0.5)
    if (this.currentIdle) this.actions.get(this.currentIdle)?.fadeOut(FADE_SEC * 0.5)
    action.reset().setLoop(THREE.LoopOnce, 1).fadeIn(FADE_SEC).play()
    action.clampWhenFinished = false
    this.oneShot = action
  }

  update(dt: number): void {
    this.mixer.update(dt)
    if (!this.ready || this.oneShot) return
    this.timer += dt
    if (this.timer >= this.nextSwitchAt) this.startRandomIdle(FADE_SEC)
  }
}
