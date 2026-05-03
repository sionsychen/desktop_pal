import { useEffect, useState } from 'react'

interface MenuItem { label: string; onClick: () => void }
interface Props { items: MenuItem[] }

export function ContextMenu({ items }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      setPos({ x: e.clientX, y: e.clientY })
    }
    const onClickAway = () => setPos(null)
    window.addEventListener('contextmenu', onContext)
    window.addEventListener('click', onClickAway)
    return () => {
      window.removeEventListener('contextmenu', onContext)
      window.removeEventListener('click', onClickAway)
    }
  }, [])

  if (!pos) return null

  return (
    <div
      data-interactive="true"
      className="absolute bg-neutral-900/95 text-white text-sm rounded shadow-lg py-1 select-none"
      style={{ left: pos.x, top: pos.y, minWidth: 120 }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          className="block w-full text-left px-3 py-1 hover:bg-neutral-700"
          onClick={() => { it.onClick(); setPos(null) }}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
