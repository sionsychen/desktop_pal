import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { computeHeadTarget, clampQuaternionAngle } from '../src/renderer/scene/MouseLookAt'

describe('computeHeadTarget', () => {
  it('returns a point in front of the character at given depth', () => {
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
    camera.position.set(0, 1, 3)
    camera.lookAt(0, 1, 0)
    const target = computeHeadTarget({ x: 0, y: 0 }, camera, new THREE.Vector3(0, 1.5, 0), 1)
    expect(target.y).toBeGreaterThan(1)
    expect(target.y).toBeLessThan(2)
  })
})

describe('clampQuaternionAngle', () => {
  it('returns identity unchanged when within limit', () => {
    const q = new THREE.Quaternion()
    const out = clampQuaternionAngle(q, Math.PI / 3)
    expect(out.x).toBe(0)
    expect(out.w).toBe(1)
  })
  it('clamps to max angle when exceeded', () => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))
    const out = clampQuaternionAngle(q, Math.PI / 3)
    const angle = 2 * Math.acos(Math.min(1, Math.abs(out.w)))
    expect(angle).toBeCloseTo(Math.PI / 3, 2)
  })
})
