import { describe, it, expect } from 'vitest'
import { computeCharacterFraming } from '../src/renderer/scene/VrmStage'

describe('computeCharacterFraming', () => {
  it('places camera so a 1.6m character fills 80% of vertical view', () => {
    const { cameraY, cameraZ } = computeCharacterFraming(1.6, 0.8, 30)
    expect(cameraY).toBeCloseTo(0.8, 1)
    expect(cameraZ).toBeGreaterThan(1)
  })
  it('returns farther distance for smaller fill ratio', () => {
    const a = computeCharacterFraming(1.6, 0.5, 30).cameraZ
    const b = computeCharacterFraming(1.6, 0.9, 30).cameraZ
    expect(a).toBeGreaterThan(b)
  })
})
