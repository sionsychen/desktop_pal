import { useEffect } from 'react'
import { startPassthroughLoop } from './app/passthrough'

export default function App() {
  useEffect(() => {
    return startPassthroughLoop((interactive) => {
      window.api.window.setPassthrough(interactive)
    })
  }, [])

  return (
    <div className="w-screen h-screen relative">
      <div
        data-interactive="true"
        className="absolute bottom-4 right-4 bg-black/70 text-white p-4 rounded-xl select-none"
      >
        <p>Hover me — clicks work here</p>
        <button
          className="mt-2 px-3 py-1 bg-red-500 rounded"
          onClick={() => window.api.window.quit()}
        >
          Quit
        </button>
      </div>
    </div>
  )
}
