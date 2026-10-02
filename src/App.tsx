import { lazy, Suspense, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MODE } from './env'
import { layers, profile } from './content'
import { live, setState, getState } from './store'
import { Cursor, Confetti, Indicator, Palette, Progress, Toast, Topbar } from './components/Chrome'
import { About, Contact, Education, Footer, Hero, Internship, Projects, Skills } from './components/Sections'

const Background = lazy(() => import('./three/Background'))

function useScrollSpy() {
  useEffect(() => {
    let raf = 0
    const compute = () => {
      raf = 0
      const els = layers.map((l) => document.getElementById(l.id))
      if (els.some((e) => !e)) return
      const tops = els.map((e) => e!.getBoundingClientRect().top + scrollY)
      const y = scrollY + innerHeight * 0.4
      let i = 0
      for (let k = 0; k < tops.length; k++) if (y >= tops[k]) i = k
      // the camera sits exactly on layer k when section k's top meets the top of the viewport
      let j = 0
      for (let k = 0; k < tops.length; k++) if (scrollY >= tops[k] - 1) j = k
      const next = tops[j + 1]
      live.layerFloat = next === undefined ? j : j + Math.min(1, Math.max(0, (scrollY - tops[j]) / (next - tops[j])))
      if (i !== getState().active) {
        live.flashAt = performance.now() / 1000
        setState({ active: i })
      }
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }
    compute()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    const late = setTimeout(compute, 1200)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      clearTimeout(late)
    }
  }, [])
}

function useMouse() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      live.mouse.x = (e.clientX / innerWidth) * 2 - 1
      live.mouse.y = -(e.clientY / innerHeight) * 2 + 1
    }
    addEventListener('pointermove', move, { passive: true })
    return () => removeEventListener('pointermove', move)
  }, [])
}

function useResumeCheck() {
  useEffect(() => {
    fetch(profile.resume, { method: 'HEAD' })
      .then((r) => {
        const ok = r.ok && /pdf|octet/i.test(r.headers.get('content-type') ?? '')
        setState({ resumeReady: ok ? 'ready' : 'missing' })
      })
      .catch(() => setState({ resumeReady: 'missing' }))
  }, [])
}

function useScrollMotion() {
  useEffect(() => {
    if (MODE === 'static') return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        }),
      )
      gsap.to('.tl-fill', {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.timeline', start: 'top 65%', end: 'bottom 70%', scrub: 0.4 },
      })
      gsap.utils.toArray<HTMLElement>('.tl-node').forEach((n) =>
        ScrollTrigger.create({
          trigger: n,
          start: 'top 68%',
          onEnter: () => n.classList.add('lit'),
          onLeaveBack: () => n.classList.remove('lit'),
        }),
      )
    })
    const r = setTimeout(() => ScrollTrigger.refresh(), 1500)
    return () => {
      clearTimeout(r)
      ctx.revert()
    }
  }, [])
}

export default function App() {
  useScrollSpy()
  useMouse()
  useResumeCheck()
  useScrollMotion()
  useEffect(() => {
    document.documentElement.classList.toggle('is-static', MODE === 'static')
  }, [])

  return (
    <>
      <a href="#about" className="skip-link">
        Skip to content
      </a>
      {MODE !== 'static' && (
        <Suspense fallback={null}>
          <Background />
        </Suspense>
      )}
      <Topbar />
      <Indicator />
      <Progress />
      <main id="main">
        <Hero />
        <About />
        <Skills />
        <Internship />
        <Projects />
        <Education />
        <Contact />
      </main>
      <Footer />
      <Palette />
      <Confetti />
      <Toast />
      <Cursor />
    </>
  )
}
