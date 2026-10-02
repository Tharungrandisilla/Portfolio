import { useEffect, useRef, useState } from 'react'
import { FINE_POINTER, MODE } from '../env'
import { layers, profile } from '../content'
import { getState, scrollToLayer, setState, showToast, toggleTheme, useStore } from '../store'
import { downloadResume } from './Sections'
import { Icon } from './ui'

/* ---------------- top bar ---------------- */

export function Topbar() {
  const theme = useStore((s) => s.theme)
  const active = useStore((s) => s.active)
  return (
    <header className="topbar">
      <a href="#input" className="brand" onClick={(e) => (e.preventDefault(), scrollToLayer('input'))} aria-label="Back to top">
        <i aria-hidden="true" />
        <span>tvsk<span className="cy">.ai</span></span>
        <span className="muted hidden sm:inline" aria-hidden="true">
          / {layers[active].label.toLowerCase()}
        </span>
      </a>
      <div className="flex gap-2">
        <button className="tbtn" onClick={() => setState({ paletteOpen: true })} aria-label="Open command palette (Ctrl or Command + K)">
          <span aria-hidden="true">&gt;_</span>
          <kbd aria-hidden="true">{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <button className="tbtn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? Icon.sun : Icon.moon}
          <span className="hidden sm:inline">{theme}</span>
        </button>
      </div>
    </header>
  )
}

export function Indicator() {
  const active = useStore((s) => s.active)
  return (
    <nav className="indicator" aria-label="Layer navigation">
      {layers.map((l, i) => {
        const name = l.label
        return (
          <div key={l.id} style={{ display: 'contents' }}>
            {i > 0 && <span className="link" aria-hidden="true" />}
            <button onClick={() => scrollToLayer(l.id)} aria-current={active === i} aria-label={name}>
              <span className="lbl">{name}</span>
              <span className="n" />
            </button>
          </div>
        )
      })}
    </nav>
  )
}

export function Progress() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current?.firstElementChild as HTMLElement | undefined
    const on = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      if (el) el.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
    }
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <div className="progress" ref={ref as never} aria-hidden="true">
      <i />
    </div>
  )
}

/* ---------------- custom cursor ---------------- */

export function Cursor() {
  const el = useRef<HTMLDivElement>(null)
  const enabled = FINE_POINTER && MODE !== 'static'
  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    let x = innerWidth / 2
    let y = innerHeight / 2
    let cx = x
    let cy = y
    let raf = 0
    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      const t = e.target as Element | null
      el.current?.classList.toggle('hot', !!t?.closest('a,button,[role=button],input,textarea,[data-magnetic]'))
    }
    const loop = () => {
      cx += (x - cx) * 0.28
      cy += (y - cy) * 0.28
      if (el.current) el.current.style.transform = `translate(${cx}px, ${cy}px)`
      raf = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [enabled])
  return enabled ? <div className="cursor" ref={el} aria-hidden="true" /> : null
}

/* ---------------- command palette ---------------- */

interface Cmd {
  name: string
  hint: string
  run: () => string
}

const COMMANDS: Cmd[] = [
  { name: 'projects', hint: 'jump to projects', run: () => (scrollToLayer('projects'), 'navigating → projects') },
  { name: 'skills', hint: 'jump to skills', run: () => (scrollToLayer('skills'), 'navigating → skills') },
  {
    name: 'resume',
    hint: 'download resume',
    run: () => (downloadResume(), `downloading ${profile.resume.slice(1)} …`),
  },
  { name: 'contact', hint: 'jump to contact', run: () => (scrollToLayer('contact'), 'navigating → contact') },
  { name: 'github', hint: 'open GitHub profile', run: () => (window.open(profile.github, '_blank', 'noopener'), 'opening github.com/Tharungrandisilla') },
  { name: 'theme', hint: 'toggle dark / light', run: () => (toggleTheme(), `theme → ${getState().theme}`) },
]

export function Palette() {
  const open = useStore((s) => s.paletteOpen)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [out, setOut] = useState('')
  const inp = useRef<HTMLInputElement>(null)
  const prevFocus = useRef<Element | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setState({ paletteOpen: !getState().paletteOpen })
      } else if (e.key === 'Escape' && getState().paletteOpen) setState({ paletteOpen: false })
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      prevFocus.current = document.activeElement
      setQ('')
      setSel(0)
      setOut('')
      requestAnimationFrame(() => inp.current?.focus())
    } else (prevFocus.current as HTMLElement | null)?.focus?.()
  }, [open])

  if (!open) return null
  const list = COMMANDS.filter((c) => c.name.startsWith(q.trim().toLowerCase()))

  const run = (c?: Cmd) => {
    if (!c) {
      setOut(q.trim() ? `command not found: ${q.trim()}  (try: ${COMMANDS.map((x) => x.name).join(' · ')})` : '')
      return
    }
    const msg = c.run()
    setOut(msg)
    setTimeout(() => setState({ paletteOpen: false }), 350)
  }

  return (
    <div className="pal-back" onMouseDown={(e) => e.target === e.currentTarget && setState({ paletteOpen: false })}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="bar">
          <i /> <i /> <i />
          <span style={{ marginLeft: 8 }}>tharun@forward-pass: ~</span>
        </div>
        <div className="inp">
          <span style={{ color: '#3EE6D4' }} aria-hidden="true">
            ❯
          </span>
          <input
            ref={inp}
            value={q}
            placeholder="type a command…"
            aria-label="Command"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => (setQ(e.target.value), setSel(0), setOut(''))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(list.length - 1, s + 1)))
              if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(0, s - 1)))
              if (e.key === 'Enter') run(list[sel])
              if (e.key === 'Tab') (e.preventDefault(), list[sel] && setQ(list[sel].name))
            }}
          />
        </div>
        <ul role="listbox" aria-label="Commands">
          {list.map((c, i) => (
            <li key={c.name} role="presentation">
              <button role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
                <span>{c.name}</span>
                <span>{c.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="out" aria-live="polite">
          {out}
        </div>
      </div>
    </div>
  )
}

/* ---------------- easter egg: confetti of neurons ---------------- */

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let buf = ''
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return
      buf = (buf + e.key.toLowerCase()).slice(-16)
      if (buf.endsWith('sudo hire tharun')) {
        buf = ''
        window.dispatchEvent(new Event('fp:confetti'))
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const fire = () => {
      showToast('sudo: permission granted · hire.status = true ✓')
      if (MODE === 'static') return
      const c = ref.current
      if (!c) return
      const dpr = Math.min(devicePixelRatio, 2)
      c.width = innerWidth * dpr
      c.height = innerHeight * dpr
      const g = c.getContext('2d')!
      g.scale(dpr, dpr)
      const cols = ['#3EE6D4', '#FFB547', '#6FA8FF', '#ffffff']
      const ps = Array.from({ length: 130 }, () => {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
        const v = 7 + Math.random() * 11
        return { x: innerWidth / 2, y: innerHeight * 0.75, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 3, c: cols[(Math.random() * cols.length) | 0] }
      })
      const t0 = performance.now()
      const frame = (now: number) => {
        const age = (now - t0) / 1000
        g.clearRect(0, 0, innerWidth, innerHeight)
        const fade = Math.max(0, 1 - Math.max(0, age - 2) / 1.4)
        g.globalAlpha = fade
        for (const p of ps) {
          p.vy += 0.28
          p.vx *= 0.992
          p.x += p.vx
          p.y += p.vy
        }
        g.lineWidth = 1
        for (let i = 0; i < ps.length; i++)
          for (let j = i + 1; j < ps.length; j += 3) {
            const dx = ps[i].x - ps[j].x
            const dy = ps[i].y - ps[j].y
            const d = dx * dx + dy * dy
            if (d < 2600) {
              g.strokeStyle = ps[i].c
              g.globalAlpha = fade * (1 - d / 2600) * 0.6
              g.beginPath()
              g.moveTo(ps[i].x, ps[i].y)
              g.lineTo(ps[j].x, ps[j].y)
              g.stroke()
            }
          }
        g.globalAlpha = fade
        for (const p of ps) {
          g.fillStyle = p.c
          g.shadowColor = p.c
          g.shadowBlur = 10
          g.beginPath()
          g.arc(p.x, p.y, p.r, 0, 7)
          g.fill()
        }
        g.shadowBlur = 0
        if (age < 3.4) requestAnimationFrame(frame)
        else g.clearRect(0, 0, innerWidth, innerHeight)
      }
      requestAnimationFrame(frame)
    }
    addEventListener('fp:confetti', fire)
    return () => removeEventListener('fp:confetti', fire)
  }, [])

  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}

export function Toast() {
  const t = useStore((s) => s.toast)
  return t ? (
    <div className="toast" role="status">
      {t}
    </div>
  ) : null
}
