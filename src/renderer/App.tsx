export default function App() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="bg-black/60 text-white p-4 rounded-xl pointer-events-auto select-none">
        <p>Desktop_Pal transparent window</p>
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
