import type { ProjectSlug } from '../content'

/** Lightweight SVG/CSS stand-ins for the 3D project scenes (mobile, low-power, reduced motion). */
export default function LiteScene({ slug, animate = true }: { slug: ProjectSlug; animate?: boolean }) {
  const cls = animate ? '' : 'static'
  if (slug === 'phishguard') {
    const rows = [50, 100, 150, 200]
    return (
      <div className={`lite absolute inset-0 ${cls}`} role="img" aria-label="Envelopes flowing toward a shield: safe mail passes in cyan, phishing is stopped and turns red.">
        <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet">
          <path d="M200 30 270 54v70c0 46-40 72-70 92-30-20-70-46-70-92V54Z" fill="rgba(62,230,212,.12)" stroke="var(--cyan)" strokeWidth="2" />
          {rows.map((y, i) => {
            const bad = i % 2 === 1
            return (
              <g key={y} className={animate ? (bad ? 'caught' : 'fly') : ''} style={{ animationDelay: `${-i * 1.1}s`, transform: animate ? undefined : `translateX(${bad ? 90 : 250 + i * 10}px)` }}>
                <rect x="0" y={y} width="34" height="22" rx="3" fill="none" stroke={bad ? 'var(--red)' : 'var(--cyan)'} strokeWidth="2" />
                <path d={`M0 ${y + 1} 17 ${y + 13} 34 ${y + 1}`} fill="none" stroke={bad ? 'var(--red)' : 'var(--cyan)'} strokeWidth="2" />
              </g>
            )
          })}
        </svg>
      </div>
    )
  }
  if (slug === 'github-agent') {
    const steps = ['Discover', 'Scan', 'Prepare', 'Commit', 'Push', 'Verify']
    return (
      <div className={`lite absolute inset-0 ${cls}`} role="img" aria-label="Pipeline Discover, Scan, Prepare, Commit, Push, Verify with a data packet travelling along it.">
        <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet">
          <line x1="40" y1="120" x2="360" y2="120" stroke="var(--line-strong)" strokeWidth="3" />
          {steps.map((s, i) => (
            <g key={s}>
              <circle cx={40 + i * 64} cy="120" r="11" fill="var(--bg)" stroke={i === 1 ? 'var(--amber)' : 'var(--cyan)'} strokeWidth="2.5" />
              <text x={40 + i * 64} y="154" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="var(--muted)">
                {s}
              </text>
            </g>
          ))}
          <rect className={animate ? 'packet' : ''} x="30" y="110" width="20" height="20" rx="3" fill="var(--cyan)" />
          <text x="104" y="86" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="var(--red)" className={animate ? 'blink' : ''}>
            secret detected
          </text>
        </svg>
      </div>
    )
  }
  // churn: decision tree
  const n = (x: number, y: number, on: boolean, key: string) => (
    <circle key={key} cx={x} cy={y} r="7" fill={on ? 'var(--cyan)' : 'var(--bg)'} stroke={on ? 'var(--cyan)' : 'var(--line-strong)'} strokeWidth="2" className={on && animate ? 'blink' : ''} />
  )
  return (
    <div className={`lite absolute inset-0 ${cls}`} role="img" aria-label="A decision tree with a highlighted path ending in a Churn or Stay output.">
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet">
        <g stroke="var(--line-strong)" strokeWidth="2" fill="none">
          <path d="M200 220V170M200 170 130 120M200 170 270 120M130 120 90 70M130 120 170 70M270 120 230 70M270 120 310 70" />
        </g>
        <path d="M200 220V170L270 120 230 70" stroke="var(--cyan)" strokeWidth="3" fill="none" />
        {[
          [200, 170, true],
          [130, 120, false],
          [270, 120, true],
          [90, 70, false],
          [170, 70, false],
          [230, 70, true],
          [310, 70, false],
        ].map(([x, y, on], i) => n(x as number, y as number, on as boolean, String(i)))}
        <rect x="190" y="26" width="76" height="22" rx="6" fill="none" stroke="var(--amber)" strokeWidth="2" />
        <text x="228" y="41" textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="var(--amber)">
          Churn / Stay
        </text>
      </svg>
    </div>
  )
}
