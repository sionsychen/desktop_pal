export {}

declare global {
  interface Window {
    api: {
      window: {
        quit: () => void
        moveBy: (dx: number, dy: number) => void
        setPassthrough: (interactive: boolean) => void
      }
    }
  }
}
