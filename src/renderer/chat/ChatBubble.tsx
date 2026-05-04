import { useEffect, useRef } from 'react'

interface Props { text: string; streaming: boolean; error: string | null }

const ACCENT = '#5b3a52'        // 深紫主描边
const ACCENT_ERROR = '#c2576b'  // 错误态玫红
const HIGHLIGHT = '#ffd84d'     // 黄色装饰
const PINK_BRIGHT = '#ff6fa3'   // 流式光标 / 高亮粉

export function ChatBubble({ text, streaming, error }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 流式时自动 tail-follow 到底
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text, streaming])

  if (!text && !streaming && !error) return null

  const accent = error ? ACCENT_ERROR : ACCENT
  const bg = error
    ? 'linear-gradient(165deg, #fff5f7 0%, #ffd6df 100%)'
    : 'linear-gradient(165deg, #ffffff 0%, #fff7fb 55%, #ffe0ee 100%)'

  return (
    <div className="absolute top-2 left-2 right-2 select-text" data-interactive="true">
      <div
        className="relative"
        style={{
          // 外层负责定位 + 描边 + 硬阴影 + 抗锯齿
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
        {/* 内层负责"无滚动条 + 底部渐隐"  */}
        <div
          ref={scrollRef}
          className="dp-bubble-scroll"
          style={{
            maxHeight: 130,
            overflowY: 'auto',
            scrollbarWidth: 'none',                     // Firefox
            msOverflowStyle: 'none',                    // legacy IE / Edge
            WebkitMaskImage: 'linear-gradient(180deg, #000 0, #000 80%, transparent 100%)',
            maskImage: 'linear-gradient(180deg, #000 0, #000 80%, transparent 100%)',
          }}
        >
          {error ? (
            <span>呜… {error}</span>
          ) : (
            <span>
              {text}
              {streaming && (
                <span
                  aria-hidden
                  className="animate-pulse"
                  style={{ color: PINK_BRIGHT, marginLeft: 2, fontWeight: 800 }}
                >
                  ▍
                </span>
              )}
            </span>
          )}
        </div>

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
