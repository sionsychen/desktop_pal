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
