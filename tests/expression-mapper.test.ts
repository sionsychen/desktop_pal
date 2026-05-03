import { describe, it, expect } from 'vitest'
import { detectExpression } from '../src/renderer/scene/ExpressionController'

describe('detectExpression', () => {
  it('returns happy for laugh keywords', () => {
    expect(detectExpression('哈哈,好啊')).toBe('happy')
    expect(detectExpression('真是太开心了')).toBe('happy')
    expect(detectExpression('lol nice 😄')).toBe('happy')
  })

  it('returns surprised for question/exclaim cues', () => {
    expect(detectExpression('啊?是这样吗?')).toBe('surprised')
    expect(detectExpression('What?!')).toBe('surprised')
  })

  it('returns thinking for hedge cues', () => {
    expect(detectExpression('嗯... 让我想想')).toBe('thinking')
    expect(detectExpression('我思考一下')).toBe('thinking')
  })

  it('returns sad for sorry/sad cues', () => {
    expect(detectExpression('抱歉,我不知道')).toBe('sad')
    expect(detectExpression('好难过 😢')).toBe('sad')
  })

  it('falls back to neutral', () => {
    expect(detectExpression('今天天气不错')).toBe('neutral')
    expect(detectExpression('')).toBe('neutral')
  })

  it('happy beats thinking when both keywords appear', () => {
    expect(detectExpression('让我想想... 哈哈想到了')).toBe('happy')
  })
})
