interface Props { text: string; streaming: boolean; error: string | null }

export function ChatBubble({ text, streaming, error }: Props) {
  if (!text && !streaming && !error) return null
  const accent = error ? '#e85a7a' : '#5b3a52'
  const bg = error
    ? 'linear-gradient(180deg, #fff0f3 0%, #ffd6df 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #fff7fb 60%, #ffe6f0 100%)'
  return (
    <div className="absolute top-2 left-2 right-2 select-text" data-interactive="true">
      <div
        className="relative rounded-3xl px-3.5 py-2.5"
        style={{
          background: bg,
          border: `2.5px solid ${accent}`,
          boxShadow: `0 4px 0 0 ${accent}`,
          color: accent,
          fontFamily: '"Comic Sans MS", "Hiragino Maru Gothic ProN", "PingFang SC", system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          lineHeight: 1.55,
          maxHeight: 180,
          overflow: 'auto',
        }}
      >
        {/* tail pointer toward character below */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -10,
            transform: 'translateX(-50%)',
            width: 16, height: 16,
            background: 'inherit',
            borderRight: `2.5px solid ${accent}`,
            borderBottom: `2.5px solid ${accent}`,
            borderRadius: '0 0 4px 0',
            rotate: '45deg',
          }}
        />
        {/* sparkle decoration */}
        <span
          aria-hidden
          style={{
            position: 'absolute', top: -8, right: 12,
            color: '#ffd84d',
            fontSize: 14,
            textShadow: `0 1px 0 ${accent}, 1px 0 0 ${accent}, -1px 0 0 ${accent}, 0 -1px 0 ${accent}`,
          }}
        >
          ✦
        </span>
        {error ? (
          <span>呜… {error}</span>
        ) : (
          <span>
            {text}
            {streaming && (
              <span
                className="ml-0.5 animate-pulse"
                style={{ color: '#ff6fa3' }}
              >
                ▍
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
