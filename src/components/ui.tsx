import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { MODE } from '../env'
import { layers } from '../content'

/** True once the element has entered the viewport; `visible` tracks current intersection. */
export function useInView<T extends Element>(margin = '0px', once = false) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.isIntersecting) setSeen(true)
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin, once])
  return { ref, seen, visible }
}

const GLYPHS = '01<>[]{}/\\#%$=+*~▒░'

/** Text that "decodes" into place like tokens being generated. */
export function Decode({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const { ref, seen } = useInView<HTMLSpanElement>('0px 0px -10% 0px')
  const [out, setOut] = useState(MODE === 'static' ? text : '')
  useEffect(() => {
    if (MODE === 'static' || !seen) return
    let raf = 0
    const start = performance.now() + delay
    const dur = Math.min(1100, 260 + text.length * 28)
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / dur))
      const locked = Math.floor(p * text.length)
      let s = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        s += i < locked || ch === ' ' || ch === '/' ? ch : p === 0 ? '' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      }
      setOut(s)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setOut(text)
    }
    raf = requestAnimationFrame(tick)
    // rAF is throttled in background tabs; guarantee the final text lands
    const done = window.setTimeout(() => setOut(text), delay + dur + 250)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [seen, text, delay])
  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{out || ' '.repeat(0)}</span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

/** Wraps a button/anchor so it leans toward the cursor. */
export function Magnetic({
  children,
  as = 'a',
  className = 'btn',
  strength = 0.28,
  ...rest
}: {
  children: ReactNode
  as?: 'a' | 'button'
  className?: string
  strength?: number
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null)
  const on = MODE === 'full'
  const props = {
    ref: ref as never,
    className,
    'data-magnetic': true,
    onMouseMove: on
      ? (e: React.MouseEvent) => {
          const el = ref.current
          if (!el) return
          const r = el.getBoundingClientRect()
          const x = (e.clientX - (r.left + r.width / 2)) * strength
          const y = (e.clientY - (r.top + r.height / 2)) * strength
          el.style.transform = `translate(${x}px, ${y}px)`
        }
      : undefined,
    onMouseLeave: on
      ? () => {
          if (ref.current) ref.current.style.transform = ''
        }
      : undefined,
    ...rest,
  }
  return as === 'a' ? <a {...props}>{children}</a> : <button {...props}>{children}</button>
}

export function Counter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
}) {
  const { ref, seen } = useInView<HTMLElement>()
  const [v, setV] = useState(MODE === 'static' ? value : 0)
  useEffect(() => {
    if (!seen || MODE === 'static') return
    let raf = 0
    const t0 = performance.now()
    const tick = (n: number) => {
      const p = Math.min(1, (n - t0) / 1600)
      setV(value * (1 - Math.pow(1 - p, 4)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, value])
  return (
    <b ref={ref}>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </b>
  )
}

/** 3D tilt wrapper: children can use translateZ for parallax depth. */
export function Tilt({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const on = MODE === 'full'
  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      style={style}
      onMouseMove={
        on
          ? (e) => {
              const el = ref.current!
              const r = el.getBoundingClientRect()
              const px = (e.clientX - r.left) / r.width - 0.5
              const py = (e.clientY - r.top) / r.height - 0.5
              el.classList.add('moving')
              el.style.transform = `rotateY(${px * 7}deg) rotateX(${-py * 7}deg)`
            }
          : undefined
      }
      onMouseLeave={
        on
          ? () => {
              const el = ref.current!
              el.classList.remove('moving')
              el.style.transform = ''
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

export function LayerHeading({ index, id }: { index: number; id: string }) {
  const l = layers[index]
  return (
    <header className="lh" data-reveal>
      <h2 id={`${id}-h`}>
        <Decode text={l.label} />
      </h2>
    </header>
  )
}

export const Icon = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
}
