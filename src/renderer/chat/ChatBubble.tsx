interface Props { text: string; streaming: boolean; error: string | null }

export function ChatBubble({ text, streaming, error }: Props) {
  if (!text && !streaming && !error) return null
  return (
    <div
      data-interactive="true"
      className="absolute top-2 left-2 right-2 rounded-2xl px-3 py-2 shadow-md backdrop-blur-md text-sm leading-relaxed select-text"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(255,182,193,0.55)',
        color: '#3d3a4d',
        maxHeight: 180,
        overflow: 'auto',
      }}
    >
      {error ? (
        <span style={{ color: '#c2576b' }}>出错啦：{error}</span>
      ) : (
        <span>
          {text}
          {streaming && (
            <span style={{ color: '#f5a3b8' }} className="ml-0.5 animate-pulse">▍</span>
          )}
        </span>
      )}
    </div>
  )
}
