import { lazy, Suspense, useState, type FormEvent } from 'react'
import { MODE } from '../env'
import {
  about,
  contact,
  education,
  internship,
  layers,
  profile,
  projects,
  skillCategories,
  skillProjects,
  type Project,
} from '../content'
import { live, setState, useStore, getState, scrollToLayer, showToast } from '../store'
import { Counter, Decode, Icon, LayerHeading, Magnetic, Tilt, useInView } from './ui'
import LiteScene from './LiteScene'

const SkillsGraph = lazy(() => import('../three/SkillsGraph'))
const ProjectScene = lazy(() => import('../three/ProjectScenes'))
const ContactOrb = lazy(() => import('../three/ContactOrb'))

const FULL = MODE === 'full'

export function downloadResume() {
  const a = document.createElement('a')
  a.href = profile.resume
  a.download = 'Tharun_Venkata_Sai_Kumar_Resume.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setState({ resumeReady: 'downloaded' })
}

function Status({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <span className="tag">
      <i className={`dot ${warn ? 'am' : ''}`} />
      <span>
        {k}: <span className={warn ? 'am' : 'cy'}>{v}</span>
      </span>
    </span>
  )
}

/* ------------------------------ 0 · Input ------------------------------ */

export function Hero() {
  const resume = useStore((s) => s.resumeReady)
  const [pre, post] = profile.tagline.split('AI-powered software')
  return (
    <section id="input" className="layer hero" aria-labelledby="hero-h">
      <div className="wrap">
        <div className="flex flex-wrap gap-2 mb-7">
          <Status k="model.status" v="ready" />
          
          <Status
            k="resume.status"
            v={resume === 'missing' ? 'add_pdf' : resume === 'checking' ? 'checking' : resume}
            warn={resume === 'missing'}
          />
          {MODE !== 'static' && (
            <button className="tag" style={{ cursor: 'pointer' }} onClick={() => (live.replay += 1)} aria-label="Replay the particle intro">
              ↻ replay init
            </button>
          )}
        </div>
        <p className="static-name" aria-hidden="true">
          {profile.shortName}
        </p>
        <h1 id="hero-h">
          <span style={{ color: 'var(--text)' }}>{profile.name}</span>
          <span aria-hidden="true"> · </span>
          <span className="am">{profile.title}</span>
        </h1>
        <p className="tagline">
          {pre}
          <em>AI-powered software</em>
          {post}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-9">
          <Magnetic href="#projects" className="btn primary" onClick={(e: Event) => {
              e.preventDefault()
              scrollToLayer('projects')
            }}>
            View Projects {Icon.arrow}
          </Magnetic>
          <Magnetic
            href={profile.resume}
            download="Tharun_Venkata_Sai_Kumar_Resume.pdf"
            className="btn"
            onClick={() => setState({ resumeReady: 'downloaded' })}
          >
            Download Resume {Icon.download}
          </Magnetic>
          <Magnetic href={profile.github} className="btn icon" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
            {Icon.github}
          </Magnetic>
          <Magnetic href={profile.linkedin} className="btn icon" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
            {Icon.linkedin}
          </Magnetic>
        </div>
        <p className="mono muted mt-10 text-xs" aria-hidden="true">
          ↓ scroll to run the forward pass
        </p>
      </div>
    </section>
  )
}

/* ------------------------------ 1 · About ------------------------------ */

export function About() {
  return (
    <section id="about" className="layer" aria-labelledby="about-h">
      <div className="wrap">
        <LayerHeading index={1} id="about" />
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] items-start">
          <p className="about-text" data-reveal>
            {about.summary}
          </p>
          <aside className="panel model-card" data-reveal aria-label="Quick facts">
            <div className="head">
              <span>model_card.json</span>
              <span className="cy">v1.0</span>
            </div>
            <dl>
              {about.card.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ 2 · Skills ------------------------------ */

export function Skills() {
  const [hover, setHover] = useState<string | null>(null)
  const [cat, setCat] = useState<string | null>(null)
  const { ref, seen } = useInView<HTMLDivElement>('300px')

  const linked = hover ? (skillProjects[hover] ?? []) : []
  const names = linked.map((s) => projects.find((p) => p.slug === s)!.name)

  return (
    <section id="skills" className="layer" aria-labelledby="skills-h">
      <div className="wrap">
        <LayerHeading index={2} id="skills" />
        <div className="grid gap-3 mb-5 sm:grid-cols-[1fr_auto] items-start" data-reveal>
          <div className="flex flex-wrap gap-x-5 gap-y-1" role="group" aria-label="Filter skills by category">
            {skillCategories.map((c) => (
              <button
                key={c.id}
                className="legend-row"
                style={{ ['--c' as string]: c.color }}
                aria-pressed={cat === c.id}
                onClick={() => setCat(cat === c.id ? null : c.id)}
              >
                <i />
                {c.name}
              </button>
            ))}
          </div>
          <p className="skill-readout" aria-live="polite">
            {hover ? (
              <>
                <span className="am">{hover}</span> →{' '}
                {names.length ? <>used in: <span className="cy">{names.join(', ')}</span></> : <span className="muted">no linked project</span>}
              </>
            ) : (
              <span className="muted">{FULL ? 'drag to rotate · hover a node' : 'tap a skill'}</span>
            )}
          </p>
        </div>

        {FULL ? (
          <div className="skills-stage" ref={ref} data-reveal>
            {seen && (
              <Suspense fallback={<p className="mono muted p-6 text-sm">loading embeddings…</p>}>
                <SkillsGraph onHover={setHover} focusCat={cat} />
              </Suspense>
            )}
            <ul className="sr-only">
              {skillCategories.map((c) => (
                <li key={c.id}>
                  {c.name}: {c.skills.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2" data-reveal>
            {skillCategories
              .filter((c) => !cat || c.id === cat)
              .map((c) => (
                <div key={c.id} className="panel p-4" style={{ ['--c' as string]: c.color }}>
                  <h3 className="mono text-xs mb-3" style={{ color: c.color, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {c.name}
                  </h3>
                  <div className="chips">
                    {c.skills.map((s) => (
                      <button key={s} className="chip" aria-pressed={hover === s} onClick={() => setHover(hover === s ? null : s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------------------ 3 · Internship ------------------------------ */

export function Internship() {
  return (
    <section id="internship" className="layer" aria-labelledby="internship-h">
      <div className="wrap">
        <LayerHeading index={3} id="internship" />
        <div className="timeline">
          <div className="tl-track" aria-hidden="true">
            <div className="tl-fill" />
          </div>
          <div className="tl-node">
            <div className="panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 style={{ fontSize: '1.5rem' }}>{internship.role}</h3>
              </div>
              <p className="mono muted text-sm mt-1">{internship.company}</p>
            </div>
          </div>
          {internship.points.map((p, i) => (
            <div className="tl-node" key={i}>
              <div className="panel">
                <p className="mono muted text-xs mb-1" aria-hidden="true">
                  step_{String(i + 1).padStart(2, '0')}
                </p>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ 4 · Projects ------------------------------ */

function ProjectCard({ p, i }: { p: Project; i: number }) {
  const { ref, seen } = useInView<HTMLDivElement>('350px')
  const flip = i % 2 === 1
  return (
    <article className={`proj accent-${p.accent}`} aria-labelledby={`p-${p.slug}`} data-reveal>
      <Tilt>
        <div className={`proj-card ${flip ? 'flip' : ''}`}>
          <div className="scene-col" ref={ref}>
            {FULL ? (
              seen && (
                <Suspense fallback={<p className="mono muted p-5 text-xs">loading scene…</p>}>
                  <ProjectScene slug={p.slug} />
                </Suspense>
              )
            ) : (
              <LiteScene slug={p.slug} animate={MODE === 'lite'} />
            )}
            <p className="ann">
              <span style={{ color: 'var(--accent)' }}>scene_{p.index}</span> · {p.scene}
            </p>
          </div>
          <div className="info-col">
            <span className="mono muted text-xs">project_{p.index} / {p.slug}</span>
            <h3 id={`p-${p.slug}`}>{p.name}</h3>
            <p className="muted text-sm" style={{ marginTop: '-0.4rem' }}>
              {p.subtitle}
            </p>
            {p.badge && <span className="badge">{p.badge}</span>}
            {p.metrics && (
              <div className="metrics" role="group" aria-label="Key metrics">
                {p.metrics.map((m) => (
                  <div className="metric" key={m.label}>
                    <Counter value={m.value} decimals={m.decimals} prefix={m.prefix} suffix={m.suffix} />
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            )}
            {p.extraMetrics && <p className="mono muted text-xs" style={{ marginTop: '-0.3rem' }}>{p.extraMetrics}</p>}
            <ul>
              {p.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="stack" aria-label="Tech stack">
              {p.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <div>
              <Magnetic href={p.github} className="btn" target="_blank" rel="noopener noreferrer">
                {Icon.github} View on GitHub {Icon.arrow}
              </Magnetic>
            </div>
          </div>
        </div>
      </Tilt>
    </article>
  )
}

export function Projects() {
  return (
    <section id="projects" className="layer" aria-labelledby="projects-h">
      <div className="wrap" style={{ width: 'min(1240px, 100% - 2.5rem)' }}>
        <LayerHeading index={4} id="projects" />
        {projects.map((p, i) => (
          <ProjectCard key={p.slug} p={p} i={i} />
        ))}
        <div className="text-center">
          <Magnetic href={profile.github} className="btn primary" target="_blank" rel="noopener noreferrer">
            View all on GitHub {Icon.arrow}
          </Magnetic>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ 5 · Education ------------------------------ */

export function Education() {
  return (
    <section id="education" className="layer" aria-labelledby="education-h">
      <div className="wrap">
        <LayerHeading index={5} id="education" />
        <div className="edu-grid">
          <div className="grid gap-3">
            {education.schools.map((s) => (
              <div className="panel p-5" key={s.name} data-reveal>
                <div className="flex flex-wrap justify-between gap-2">
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', margin: 0 }}>{s.name}</h4>
                  <span className="mono am text-sm">{s.period}</span>
                </div>
                <p className="muted text-sm">{s.place}</p>
                <p className="mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 content-start">
            <h3 className="mono muted text-xs" style={{ fontWeight: 500 }}>
              checkpoints / certifications
            </h3>
            {education.certifications.map((c) => (
              <div className="panel ckpt" key={c.name} data-reveal>
                <span className="cy">ckpt · {c.date}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600 }}>{c.name}</span>
                <span className="muted">{c.issuer}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ 6 · Output ------------------------------ */

export function Contact() {
  const [orbHover, setOrbHover] = useState(false)
  const [panelHover, setPanelHover] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const show = orbHover || panelHover || open
  live.hot = show

  const [sending, setSending] = useState(false)
  const EJS = {
    service: import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined,
    template: import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined,
    key: import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined,
  }
  const emailjsOn = !!(EJS.service && EJS.template && EJS.key)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailjsOn) {
      // EmailJS not configured: fall back to the visitor's email client
      const subject = `Portfolio contact from ${form.name || 'a visitor'}`
      const body = `${form.message}\n\n—\n${form.name}${form.email ? ` <${form.email}>` : ''}`
      window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      showToast('opening your email client…')
      return
    }
    setSending(true)
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EJS.service,
          template_id: EJS.template,
          user_id: EJS.key,
          template_params: {
            from_name: form.name,
            from_email: form.email,
            reply_to: form.email,
            message: form.message,
            to_email: profile.email,
          },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setForm({ name: '', email: '', message: '' })
      showToast('message sent ✓ thanks, I will reply soon')
    } catch (err) {
      console.error('EmailJS error:', err)
      const why = err instanceof Error ? err.message.slice(0, 90) : ''
      showToast(`send failed${why ? ` (${why})` : ''}. Please email ${profile.email}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="contact" className="layer" style={{ minHeight: '100svh' }} aria-labelledby="contact-h">
      <div className="wrap">
        <LayerHeading index={6} id="contact" />
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-stretch">
          <div className={`out-stage ${show ? 'open' : ''}`} data-reveal>
            {FULL ? (
              <Suspense fallback={null}>
                <ContactOrb />
              </Suspense>
            ) : (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <div className={MODE === 'lite' ? 'lite-orb' : 'lite-orb still'} />
              </div>
            )}
            <span className="tag orb-hint">
              <i className="dot am" />
              <span>contact.neuron: {show ? 'active' : 'idle'} · hover or tap</span>
            </span>
            <button
              className="orb-btn"
              aria-expanded={show}
              aria-controls="contact-options"
              aria-label="Reveal contact options"
              onMouseEnter={() => setOrbHover(true)}
              onMouseLeave={() => setOrbHover(false)}
              onClick={() => setOpen((o) => !o)}
            />
            <div
              id="contact-options"
              className="reveal-panel"
              onMouseEnter={() => setPanelHover(true)}
              onMouseLeave={() => setPanelHover(false)}
            >
              <a href={`mailto:${profile.email}`}>
                <span className="muted">email</span>
                <span>{profile.email}</span>
              </a>
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                <span className="muted">linkedin</span>
                <span>/in/tharun-grandisilla</span>
              </a>
              <a href={profile.github} target="_blank" rel="noopener noreferrer">
                <span className="muted">github</span>
                <span>/Tharungrandisilla</span>
              </a>
            </div>
          </div>

          <form className="panel p-6 grid gap-4 content-start" onSubmit={submit} data-reveal>
            <p className="mono muted text-xs">{emailjsOn ? 'POST /inference · delivered straight to my inbox' : 'POST /inference · opens your email client (mailto)'}</p>
            <div className="field">
              <label htmlFor="c-name">name</label>
              <input id="c-name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="c-email">your email</label>
              <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="c-msg">message</label>
              <textarea id="c-msg" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div>
              <button className="btn primary" type="submit" data-magnetic disabled={sending}>
                {sending ? 'Sending…' : 'Send message'} {Icon.arrow}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const resume = getState().resumeReady
  return (
    <footer className="foot">
      <div className="wrap flex flex-wrap justify-between gap-3">
        <span>
          <Decode text={contact.footer} /> <span aria-hidden="true">▮</span>
        </span>
        <span>
          © {new Date().getFullYear()} {profile.name} · model.status: ready{resume === 'ready' ? '' : ''}
        </span>
      </div>
    </footer>
  )
}

export const LAYER_IDS = layers.map((l) => l.id)
