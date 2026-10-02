# Forward Pass: portfolio of Tharun Venkata Sai Kumar

The site is a neural network you scroll through: hero = input layer, sections = hidden layers, contact = output neuron.
React + Vite + TypeScript, Tailwind CSS v4, React Three Fiber + drei, GSAP ScrollTrigger.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Update content
Everything lives in **`src/content.ts`**: bio, skills (and which projects used each skill), internship, projects, education, links.

To-do before publishing:
- `internship.period` still reads `[ADD START – END MONTHS]`.
- Put your resume PDF at **`public/Tharun_Venkata_Sai_Kumar_Resume.pdf`** (the `resume.status` tag shows `add_pdf` until it exists).
- Set `VITE_SITE_URL` in `.env` (e.g. `https://yourname.vercel.app`) so the Open Graph image URL is absolute.
  `public/og.png` was generated from `scripts/og.html`.

## Render modes
| mode | when | what you get |
|---|---|---|
| `full` | desktop, fine pointer | everything: 3D background, particle name, skills graph, 3 project scenes, orb, custom cursor |
| `lite` | mobile / coarse pointer / ≤2 cores or ≤2 GB RAM | lighter background network, SVG/CSS project scenes, tappable skill chips |
| `static` | `prefers-reduced-motion` or no WebGL | no WebGL, no scroll animation, same content |

Force one with `?mode=full|lite|static`. 3D scenes are lazy-loaded, only render while on screen, and cap DPR at 1.5.

## Extras
- `Ctrl/Cmd + K`: terminal-style palette (`projects`, `skills`, `resume`, `contact`, `github`, `theme`)
- Type `sudo hire tharun` anywhere for a neuron confetti burst
- "↻ replay init" in the hero re-runs the particle intro

## Deploy
Vercel / Netlify auto-detect Vite: build `npm run build`, output `dist`.
