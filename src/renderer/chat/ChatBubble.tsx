interface Props { text: string; streaming: boolean; error: string | null }

export function ChatBubble({ text, streaming, error }: Props) {
  if (!text && !streaming && !error) return null
  return (
    <div
      data-interactive="true"
      className="absolute top-4 left-4 right-4 bg-white/95 text-neutral-900 rounded-2xl px-4 py-3 shadow-lg select-text"
      style={{ maxHeight: 200, overflow: 'auto' }}
    >
      {error ? (
        <span className="text-red-600">出错了:{error}</span>
      ) : (
        <span>{text}{streaming && <span className="opacity-50">▍</span>}</span>
      )}
    </div>
  )
}
