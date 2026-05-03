import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm'

export function computeCharacterFraming(
  characterHeight: number,
  fillRatio: number,
  fovDeg: number,
): { cameraY: number; cameraZ: number } {
  const targetVisibleHeight = characterHeight / fillRatio
  const fovRad = (fovDeg * Math.PI) / 180
  const cameraZ = targetVisibleHeight / 2 / Math.tan(fovRad / 2)
  const cameraY = characterHeight / 2
  return { cameraY, cameraZ }
}

export class VrmStage {
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  vrm: VRM | null = null

  private rafId = 0
  private clock = new THREE.Clock()
  private updaters: ((dt: number) => void)[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false, antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x000000, 0)
    this.resize()

    this.camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 20)
    const { cameraY, cameraZ } = computeCharacterFraming(1.5, 0.8, 30)
    this.camera.position.set(0, cameraY, cameraZ)
    this.camera.lookAt(0, cameraY, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(1, 2, 1)
    this.scene.add(ambient, dir)

    window.addEventListener('resize', this.resize)
  }

  resize = (): void => {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    this.renderer.setSize(w, h, false)
    if (this.camera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
  }

  async loadVrm(url: string): Promise<VRM> {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    const gltf = await loader.loadAsync(url)
    const vrm = gltf.userData.vrm as VRM
    // VRM 1.0 默认朝 +Z(对着相机);VRM 0.x 朝 -Z 需要翻 180°
    const meta = (vrm as unknown as { meta?: { metaVersion?: string } }).meta
    if (meta?.metaVersion !== '1') vrm.scene.rotation.y = Math.PI
    this.scene.add(vrm.scene)
    this.vrm = vrm
    return vrm
  }

  addUpdater(fn: (dt: number) => void): void { this.updaters.push(fn) }

  start(): void {
    const tick = () => {
      const dt = this.clock.getDelta()
      for (const u of this.updaters) u(dt)
      this.vrm?.update(dt)
      this.renderer.render(this.scene, this.camera)
      this.rafId = requestAnimationFrame(tick)
    }
    tick()
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.resize)
    this.renderer.dispose()
  }
}
