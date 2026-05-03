import type { VRM } from '@pixiv/three-vrm'

export type Expression = 'happy' | 'surprised' | 'thinking' | 'sad' | 'neutral'

const RULES: Array<{ kind: Expression; needles: string[] }> = [
  { kind: 'happy', needles: ['哈哈', '笑', '开心', '高兴', '😄', '😆', 'lol', 'haha'] },
  { kind: 'surprised', needles: ['?!', '!?', '?!', '啊?', 'what?', 'wow', '哇'] },
  { kind: 'sad', needles: ['抱歉', '难过', '😢', '😭', 'sorry', '对不起'] },
  { kind: 'thinking', needles: ['嗯...', '让我想', '思考', '想想', 'hmm', 'let me think'] },
]

export function detectExpression(text: string): Expression {
  if (!text) return 'neutral'
  const lower = text.toLowerCase()
  for (const r of RULES) {
    if (r.needles.some((n) => lower.includes(n.toLowerCase()))) return r.kind
  }
  return 'neutral'
}

const VRM_NAME_MAP: Record<Expression, string | null> = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  thinking: 'neutral', // 多数 VRM 没有 thinking,用轻微 sad 或 neutral
  neutral: 'neutral',
}

export class ExpressionController {
  private current: Expression = 'neutral'
  private weight = 0
  private targetWeight = 0
  private holdLeft = 0
  private readonly hold = 3 // seconds before decay

  constructor(private readonly vrm: VRM) {}

  trigger(text: string): void {
    const e = detectExpression(text)
    if (e === 'neutral') return
    this.current = e
    this.targetWeight = 1
    this.weight = 1
    this.holdLeft = this.hold
    this.applyWeight()
  }

  update(dt: number): void {
    if (this.holdLeft > 0) {
      this.holdLeft -= dt
      return
    }
    if (this.weight > 0) {
      this.weight = Math.max(0, this.weight - dt) // 1s decay
      this.applyWeight()
      if (this.weight === 0) this.current = 'neutral'
    }
  }

  private applyWeight(): void {
    const mgr = this.vrm.expressionManager
    if (!mgr) return
    // 清零所有
    for (const name of ['happy', 'angry', 'sad', 'surprised', 'relaxed', 'neutral']) {
      try { mgr.setValue(name, 0) } catch { /* ignore missing */ }
    }
    const target = VRM_NAME_MAP[this.current]
    if (target) {
      try { mgr.setValue(target, this.weight) } catch { /* ignore */ }
    }
  }
}
