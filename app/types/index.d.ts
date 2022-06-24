export {}

declare global {
  interface Window {
    Modernizr: { on: (feature: string, cb: (result: boolean) => void) => void }
  }
}
