import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

type Listener = () => void

/** Mutable, per-frame data read by the 3D scenes (no React re-renders). */
export const live = {
  mouse: { x: 0, y: 0 }, // normalised device coords, -1..1
  layerFloat: 0, // continuous layer position, 0..6
  flashAt: 0, // performance.now()/1000 of last layer activation
  replay: 0, // incremented to re-run the hero assembly
  hot: false,
}

interface State {
  theme: Theme
  active: number
  resumeReady: 'checking' | 'ready' | 'missing' | 'downloaded'
  paletteOpen: boolean
  toast: string
}

let state: State = {
  theme: (document.documentElement.dataset.theme as Theme) === 'light' ? 'light' : 'dark',
  active: 0,
  resumeReady: 'checking',
  paletteOpen: false,
  toast: '',
}
const listeners = new Set<Listener>()

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export const getState = () => state

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => sel(state),
  )
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('fp-theme', theme)
  } catch {
    /* storage unavailable */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0A0C10' : '#F3F5F8')
  setState({ theme })
}
export const toggleTheme = () => setTheme(state.theme === 'dark' ? 'light' : 'dark')

let toastTimer: number | undefined
export function showToast(msg: string) {
  setState({ toast: msg })
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => setState({ toast: '' }), 3200)
}

export function scrollToLayer(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
