import { useEffect, useRef, useState } from 'react'

interface Props { text: string; streaming: boolean; error: string | null }

const ACCENT = '#5b3a52'        // 深紫主描边
const ACCENT_ERROR = '#c2576b'  // 错误态玫红
const HIGHLIGHT = '#ffd84d'     // 黄色装饰
const PINK_BRIGHT = '#ff6fa3'   // 流式光标 / 高亮粉

const FADE_MS = 200

// 字数 / 5 + 5s, 即每字 200ms + 5s buffer; clamp [5s, 30s]
function calcHideMs(text: string): number {
  return Math.max(5000, Math.min(30000, text.length * 200 + 5000))
}

export function ChatBubble({ text, streaming, error }: Props) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)  // fade-out 结束后才 unmount, 释放 overlay 高度
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 仅在 streaming 结束 (有 text) 或 error 时显示, streaming 期间不显示
  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current)
      unmountTimerRef.current = null
    }
    if (error) {
      setMounted(true)
      setVisible(true)
      return
    }
    if (streaming) {
      setVisible(false)
      // streaming 瞬间不需要 fade, 直接 unmount
      setMounted(false)
      return
    }
    if (text) {
      setMounted(true)
      setVisible(true)
      hideTimerRef.current = setTimeout(() => {
        setVisible(false)
        // 等 fade 结束再 unmount, 让 overlay 高度也收缩, 猫同步弹回
        unmountTimerRef.current = setTimeout(() => setMounted(false), FADE_MS)
      }, calcHideMs(text))
    } else {
      setVisible(false)
      setMounted(false)
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      if (unmountTimerRef.current) {
        clearTimeout(unmountTimerRef.current)
        unmountTimerRef.current = null
      }
    }
  }, [text, streaming, error])

  // streaming 期间不挂载, hide-fade 完成后不挂载 → overlay 高度为 0 → 猫恢复全高
  if (streaming) return null
  if (!mounted) return null
  if (!text && !error) return null

  const accent = error ? ACCENT_ERROR : ACCENT
  const bg = error
    ? 'linear-gradient(165deg, #fff5f7 0%, #ffd6df 100%)'
    : 'linear-gradient(165deg, #ffffff 0%, #fff7fb 55%, #ffe0ee 100%)'

  return (
    <div
      className="select-text"
      data-interactive={visible ? 'true' : undefined}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <div
        className="relative"
        style={{
          background: bg,
          border: `2.5px solid ${accent}`,
          borderRadius: 22,
          boxShadow: `0 4px 0 0 ${accent}, 0 6px 14px -2px rgba(91,58,82,0.25)`,
          color: accent,
          fontFamily: '"Comic Sans MS", "Hiragino Maru Gothic ProN", "PingFang SC", system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          lineHeight: 1.55,
          padding: '10px 14px 12px 14px',
        }}
      >
        {error ? (
          <span>呜… {error}</span>
        ) : (
          <span>{text}</span>
        )}

        {/* 角色头顶尾巴 (棱角朝下) */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -9,
            transform: 'translateX(-50%) rotate(45deg)',
            width: 14, height: 14,
            background: 'inherit',
            borderRight: `2.5px solid ${accent}`,
            borderBottom: `2.5px solid ${accent}`,
            borderRadius: '0 0 4px 0',
          }}
        />

        {/* 右上 sparkle */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -10, right: 14,
            fontSize: 16,
            color: HIGHLIGHT,
            textShadow: `0 1px 0 ${accent}, 1px 0 0 ${accent}, -1px 0 0 ${accent}, 0 -1px 0 ${accent}, 1px 1px 0 ${accent}, -1px -1px 0 ${accent}`,
          }}
        >
          ✦
        </span>

        {/* 左上小爱心装饰,只在非错误态出现 */}
        {!error && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -8, left: 16,
              fontSize: 11,
              color: PINK_BRIGHT,
              textShadow: `0 1px 0 ${accent}, 1px 0 0 ${accent}, -1px 0 0 ${accent}, 0 -1px 0 ${accent}`,
            }}
          >
            ♥
          </span>
        )}
      </div>
    </div>
  )
}
