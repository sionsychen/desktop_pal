import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'

export interface NDCPoint { x: number; y: number }

export function computeHeadTarget(
  ndc: NDCPoint,
  camera: THREE.PerspectiveCamera,
  headWorld: THREE.Vector3,
  forwardDistance: number,
): THREE.Vector3 {
  // Build a virtual plane in front of the head, perpendicular to the camera view.
  // Mouse at NDC (0,0) maps to head position; mouse offset shifts target along the plane.
  const camForward = new THREE.Vector3()
  camera.getWorldDirection(camForward)
  const planeOrigin = headWorld.clone().sub(camForward.clone().multiplyScalar(forwardDistance))
  // Compute the half-extents of the camera frustum at the plane's depth.
  const headOffset = planeOrigin.clone().sub(camera.position)
  const planeDist = Math.max(0.0001, headOffset.dot(camForward))
  const fovRad = (camera.fov * Math.PI) / 180
  const halfH = Math.tan(fovRad / 2) * planeDist
  const halfW = halfH * camera.aspect
  // Reconstruct camera-space basis.
  const camUp = camera.up.clone().normalize()
  const camRight = new THREE.Vector3().crossVectors(camForward, camUp).normalize().negate()
  const trueUp = new THREE.Vector3().crossVectors(camRight, camForward).normalize()
  return planeOrigin
    .add(camRight.multiplyScalar(ndc.x * halfW))
    .add(trueUp.multiplyScalar(ndc.y * halfH))
}

export function clampQuaternionAngle(q: THREE.Quaternion, maxAngle: number): THREE.Quaternion {
  const w = Math.min(1, Math.max(-1, q.w))
  const angle = 2 * Math.acos(Math.abs(w))
  if (angle <= maxAngle) return q.clone()
  const t = maxAngle / angle
  const identity = new THREE.Quaternion()
  return identity.slerp(q, t)
}

export class MouseLookAt {
  private mouseNDC: NDCPoint = { x: 0, y: 0 }
  private readonly damping = 6
  private readonly maxAngle = Math.PI / 3

  constructor(
    private readonly vrm: VRM,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
  ) {
    canvas.addEventListener('mousemove', this.onMove)
    window.addEventListener('mousemove', this.onMove)
  }

  private onMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.mouseNDC = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    }
  }

  update(dt: number): void {
    const head = this.vrm.humanoid.getNormalizedBoneNode('head')
    if (!head) return
    const headWorld = new THREE.Vector3()
    head.getWorldPosition(headWorld)
    const target = computeHeadTarget(this.mouseNDC, this.camera, headWorld, 0)
    const headParent = head.parent ?? this.vrm.scene
    const localTarget = target.clone()
    headParent.worldToLocal(localTarget)
    const localPos = head.position
    const dir = localTarget.sub(localPos).normalize()
    const desiredQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
    const clamped = clampQuaternionAngle(desiredQuat, this.maxAngle)
    head.quaternion.slerp(clamped, Math.min(1, dt * this.damping))
  }

  dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMove)
    window.removeEventListener('mousemove', this.onMove)
  }
}
