export type Mode = 'full' | 'lite' | 'static'

/** full: all 3D · lite: mobile / low-power, lightweight visuals · static: reduced motion, no animation */
function detect(): Mode {
  if (typeof window === 'undefined') return 'full'
  const forced = new URLSearchParams(location.search).get('mode')
  if (forced === 'full' || forced === 'lite' || forced === 'static') return forced
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mobile = innerWidth < 768 || matchMedia('(pointer: coarse)').matches
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || navigator.hardwareConcurrency <= 2
  try {
    const c = document.createElement('canvas')
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'static'
  } catch {
    return 'static'
  }
  return mobile || weak ? 'lite' : 'full'
}

export const MODE: Mode = detect()
export const FINE_POINTER = typeof window !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
