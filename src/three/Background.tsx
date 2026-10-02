import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MODE } from '../env'
import { getState, live } from '../store'
import { profile } from '../content'

const LAYERS = 7
const GAP = 16
const CAM_Z0 = 9
const LITE = MODE === 'lite'
const PER_LAYER = LITE ? 22 : 46
const HERO_N = LITE ? 900 : 2200
const PULSES = LITE ? 26 : 64

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CYAN = { dark: new THREE.Color('#3EE6D4'), light: new THREE.Color('#0A8F84') }
const AMBER = { dark: new THREE.Color('#FFB547'), light: new THREE.Color('#C77A00') }

const COMMON_FRAG_TAIL = `
  #include <colorspace_fragment>
}`

/* ---------------- network (nodes, edges, pulses) ---------------- */

interface Net {
  nodes: THREE.Points
  edges: THREE.LineSegments
  pulses: THREE.Points
  pos: Float32Array // node positions
  nodeLayer: number[]
  edgeList: { a: number; b: number; layer: number }[]
  outEdges: number[][]
  edgesByLayer: number[][]
  uniforms: { shared: Record<string, THREE.IUniform> }
}

function buildNet(): Net {
  const r = rng(7)
  const count = LAYERS * PER_LAYER
  const pos = new Float32Array(count * 3)
  const layerA = new Float32Array(count)
  const sizeA = new Float32Array(count)
  const tintA = new Float32Array(count)
  const phaseA = new Float32Array(count)
  const nodeLayer: number[] = []
  for (let l = 0; l < LAYERS; l++) {
    for (let k = 0; k < PER_LAYER; k++) {
      const i = l * PER_LAYER + k
      const ang = r() * Math.PI * 2
      // keep an open corridor around the camera axis so we can fly through
      const rad = 3.4 + Math.sqrt(r()) * 15
      pos[i * 3] = Math.cos(ang) * rad * 1.35
      pos[i * 3 + 1] = Math.sin(ang) * rad * 0.8
      pos[i * 3 + 2] = -l * GAP - 3 + (r() - 0.5) * 5
      layerA[i] = l
      sizeA[i] = 0.1 + r() * 0.14
      tintA[i] = r() < 0.14 ? 1 : 0
      phaseA[i] = r() * 6.28
      nodeLayer.push(l)
    }
  }
  const shared: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uActive: { value: 0 },
    uFlash: { value: 0 },
    uFlashLayer: { value: 0 },
    uPx: { value: 1000 },
    uCyan: { value: CYAN.dark.clone() },
    uAmber: { value: AMBER.dark.clone() },
    uLight: { value: 0 },
  }

  const ng = new THREE.BufferGeometry()
  ng.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  ng.setAttribute('aLayer', new THREE.BufferAttribute(layerA, 1))
  ng.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1))
  ng.setAttribute('aTint', new THREE.BufferAttribute(tintA, 1))
  ng.setAttribute('aPhase', new THREE.BufferAttribute(phaseA, 1))
  const nm = new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aLayer; attribute float aSize; attribute float aTint; attribute float aPhase;
      uniform float uTime, uActive, uFlash, uFlashLayer, uPx;
      varying float vAct; varying float vTint; varying float vDist;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float act = smoothstep(1.4, 0.0, abs(aLayer - uActive));
        float fl = uFlash * step(abs(aLayer - uFlashLayer), 0.1);
        float tw = 0.78 + 0.22 * sin(uTime * 1.3 + aPhase);
        vAct = (0.3 + 0.7 * act) * tw + fl * 1.3;
        vTint = aTint; vDist = -mv.z;
        float s = aSize * (1.0 + act * 0.5 + fl * 1.6);
        gl_PointSize = clamp(s * uPx / max(-mv.z, 0.5), 1.0, 30.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCyan, uAmber; uniform float uLight;
      varying float vAct; varying float vTint; varying float vDist;
      void main(){
        float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
        float core = smoothstep(0.5, 0.0, r);
        float fade = smoothstep(80.0, 14.0, vDist) * smoothstep(0.6, 3.5, vDist);
        float a = (pow(core, 1.5) * 0.8 + step(r, 0.12) * 0.4) * vAct * fade * (1.0 + uLight * 0.6);
        gl_FragColor = vec4(mix(uCyan, uAmber, vTint), a);
        ${COMMON_FRAG_TAIL}`,
  })
  const nodes = new THREE.Points(ng, nm)
  nodes.frustumCulled = false

  // edges: each node feeds its 3 nearest neighbours in the next layer
  const edgeList: Net['edgeList'] = []
  const outEdges: number[][] = Array.from({ length: count }, () => [])
  const edgesByLayer: number[][] = Array.from({ length: LAYERS }, () => [])
  for (let l = 0; l < LAYERS - 1; l++) {
    for (let k = 0; k < PER_LAYER; k++) {
      const a = l * PER_LAYER + k
      const cand: [number, number][] = []
      for (let m = 0; m < PER_LAYER; m++) {
        const b = (l + 1) * PER_LAYER + m
        const dx = pos[a * 3] - pos[b * 3]
        const dy = pos[a * 3 + 1] - pos[b * 3 + 1]
        cand.push([dx * dx + dy * dy, b])
      }
      cand.sort((p, q) => p[0] - q[0])
      for (let j = 0; j < 3; j++) {
        const idx = edgeList.length
        edgeList.push({ a, b: cand[j][1], layer: l })
        outEdges[a].push(idx)
        edgesByLayer[l].push(idx)
      }
    }
  }
  const ePos = new Float32Array(edgeList.length * 6)
  const eLayer = new Float32Array(edgeList.length * 2)
  edgeList.forEach((e, i) => {
    for (let c = 0; c < 3; c++) {
      ePos[i * 6 + c] = pos[e.a * 3 + c]
      ePos[i * 6 + 3 + c] = pos[e.b * 3 + c]
    }
    eLayer[i * 2] = e.layer
    eLayer[i * 2 + 1] = e.layer + 1
  })
  const eg = new THREE.BufferGeometry()
  eg.setAttribute('position', new THREE.BufferAttribute(ePos, 3))
  eg.setAttribute('aLayer', new THREE.BufferAttribute(eLayer, 1))
  const em = new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aLayer; uniform float uActive;
      varying float vAct; varying float vDist;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float act = smoothstep(1.5, 0.0, abs(aLayer - uActive));
        vAct = 0.07 + 0.3 * act; vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCyan; uniform float uLight;
      varying float vAct; varying float vDist;
      void main(){
        float fade = smoothstep(80.0, 14.0, vDist) * smoothstep(0.5, 4.0, vDist);
        gl_FragColor = vec4(uCyan, vAct * fade * (1.0 + uLight * 1.8));
        ${COMMON_FRAG_TAIL}`,
  })
  const edges = new THREE.LineSegments(eg, em)
  edges.frustumCulled = false

  // signal pulses
  const pg = new THREE.BufferGeometry()
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3))
  const pt = new Float32Array(PULSES)
  for (let i = 0; i < PULSES; i++) pt[i] = i % 3 === 0 ? 1 : 0
  pg.setAttribute('aTint', new THREE.BufferAttribute(pt, 1))
  const pm = new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aTint; uniform float uPx; varying float vTint; varying float vDist;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vTint = aTint; vDist = -mv.z;
        gl_PointSize = clamp(0.2 * uPx / max(-mv.z, 0.5), 2.0, 26.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCyan, uAmber; uniform float uLight;
      varying float vTint; varying float vDist;
      void main(){
        float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
        float fade = smoothstep(80.0, 14.0, vDist) * smoothstep(0.5, 3.0, vDist);
        float a = (pow(smoothstep(0.5, 0.0, r), 1.3) + step(r, 0.1)) * fade;
        gl_FragColor = vec4(mix(vec3(1.0), mix(uCyan, uAmber, vTint), 0.55 + uLight * 0.45), min(a, 1.0));
        ${COMMON_FRAG_TAIL}`,
  })
  const pulses = new THREE.Points(pg, pm)
  pulses.frustumCulled = false

  return { nodes, edges, pulses, pos, nodeLayer, edgeList, outEdges, edgesByLayer, uniforms: { shared } }
}

function Network() {
  const net = useMemo(buildNet, [])
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const state = useRef({
    camZ: CAM_Z0,
    lastActive: 0,
    theme: '',
    pulseEdge: new Int32Array(PULSES),
    pulseT: new Float32Array(PULSES),
    pulseSpeed: new Float32Array(PULSES),
  })

  const spawn = (i: number, layer: number) => {
    const s = state.current
    const list = net.edgesByLayer[Math.max(0, Math.min(LAYERS - 2, layer))]
    s.pulseEdge[i] = list[(Math.random() * list.length) | 0]
    s.pulseT[i] = -Math.random() * 0.6
    s.pulseSpeed[i] = 0.35 + Math.random() * 0.4
  }
  useEffect(() => {
    for (let i = 0; i < PULSES; i++) {
      spawn(i, 0)
      state.current.pulseT[i] = Math.random()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = state.current
    const u = net.uniforms.shared
    const t = st.clock.elapsedTime
    u.uTime.value = t
    u.uActive.value = live.layerFloat
    u.uFlash.value = Math.exp(-(performance.now() / 1000 - live.flashAt) * 2.4)
    u.uFlashLayer.value = getState().active
    u.uPx.value = gl.domElement.height / (2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360))

    // theme
    const theme = getState().theme
    if (theme !== s.theme) {
      s.theme = theme
      u.uCyan.value.copy(CYAN[theme])
      u.uAmber.value.copy(AMBER[theme])
      u.uLight.value = theme === 'light' ? 1 : 0
      const blend = theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending
      for (const o of [net.nodes, net.edges, net.pulses]) {
        const m = o.material as THREE.ShaderMaterial
        m.blending = blend
        m.needsUpdate = true
      }
    }

    // camera fly-through
    const targetZ = CAM_Z0 - live.layerFloat * GAP
    s.camZ += (targetZ - s.camZ) * (1 - Math.exp(-dt * 3.2))
    const mx = live.mouse.x
    const my = live.mouse.y
    camera.position.x += (mx * 1.1 - camera.position.x) * (1 - Math.exp(-dt * 2))
    camera.position.y += (my * 0.7 + Math.sin(t * 0.2) * 0.15 - camera.position.y) * (1 - Math.exp(-dt * 2))
    camera.position.z = s.camZ
    camera.lookAt(camera.position.x * 0.35, camera.position.y * 0.35, s.camZ - 10)

    // burst of pulses when a new layer activates
    const active = getState().active
    if (active !== s.lastActive) {
      s.lastActive = active
      for (let i = 0; i < Math.min(26, PULSES); i++) spawn(i, active - 1)
    }

    // pulses travel forward along edges, biased toward the active layer
    const arr = (net.pulses.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < PULSES; i++) {
      s.pulseT[i] += dt * s.pulseSpeed[i]
      if (s.pulseT[i] >= 1) {
        const e = net.edgeList[s.pulseEdge[i]]
        const outs = net.outEdges[e.b]
        if (outs.length && Math.random() < 0.92) {
          s.pulseEdge[i] = outs[(Math.random() * outs.length) | 0]
          s.pulseT[i] = 0
        } else {
          spawn(i, Math.round(live.layerFloat) - 1 + ((Math.random() * 3) | 0) - (Math.random() < 0.5 ? 0 : 0))
        }
      }
      const e = net.edgeList[s.pulseEdge[i]]
      const k = Math.max(0, s.pulseT[i])
      const vis = s.pulseT[i] < 0 ? -9999 : 0
      for (let c = 0; c < 3; c++) {
        arr[i * 3 + c] = net.pos[e.a * 3 + c] * (1 - k) + net.pos[e.b * 3 + c] * k
      }
      if (vis) arr[i * 3 + 2] = vis
    }
    net.pulses.geometry.attributes.position.needsUpdate = true
  })

  return (
    <>
      <primitive object={net.edges} />
      <primitive object={net.nodes} />
      <primitive object={net.pulses} />
    </>
  )
}

/* ---------------- hero: particles that assemble the name ---------------- */

function sampleText(text: string, n: number): Float32Array {
  const W = 1400
  const H = 380
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const fam = '"Space Grotesk", "Arial Black", sans-serif'
  g.font = `700 330px ${fam}`
  const m = g.measureText(text).width
  if (m > W * 0.96) g.font = `700 ${(330 * W * 0.96) / m}px ${fam}`
  g.fillText(text, W / 2, H / 2 + 12)
  const d = g.getImageData(0, 0, W, H).data
  const pts: number[] = []
  for (let y = 0; y < H; y += 3)
    for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 128) pts.push(x / W - 0.5, -(y / H - 0.5) * (H / W))
  const total = pts.length / 2
  const out = new Float32Array(n * 2)
  const r = rng(11)
  for (let i = 0; i < n; i++) {
    const j = ((r() * total) | 0) * 2
    out[i * 2] = pts[j] + (r() - 0.5) * 0.002
    out[i * 2 + 1] = pts[j + 1] + (r() - 0.5) * 0.002
  }
  return out
}

function Hero() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const group = useRef<THREE.Group>(null)
  const textPts = useRef<Float32Array | null>(null)
  const data = useMemo(() => {
    const r = rng(23)
    const cur = new Float32Array(HERO_N * 3)
    const start = new Float32Array(HERO_N * 3)
    const delay = new Float32Array(HERO_N)
    const theta = new Float32Array(HERO_N)
    const phi = new Float32Array(HERO_N)
    const rad = new Float32Array(HERO_N)
    const glow = new Float32Array(HERO_N)
    const tint = new Float32Array(HERO_N)
    for (let i = 0; i < HERO_N; i++) {
      const a = r() * Math.PI * 2
      const b = Math.acos(2 * r() - 1)
      const R = 9 + r() * 7
      start[i * 3] = Math.sin(b) * Math.cos(a) * R
      start[i * 3 + 1] = Math.sin(b) * Math.sin(a) * R * 0.7
      start[i * 3 + 2] = Math.cos(b) * R - 4
      cur.set(start.subarray(i * 3, i * 3 + 3), i * 3)
      delay[i] = r() * 1.1
      theta[i] = r() * Math.PI * 2
      phi[i] = Math.acos(2 * r() - 1)
      rad[i] = 3.2 + r() * 2.8
      tint[i] = r() < 0.1 ? 1 : 0
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(cur, 3))
    geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1))
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPx: { value: 1000 },
        uAlpha: { value: 1 },
        uCyan: { value: CYAN.dark.clone() },
        uAmber: { value: AMBER.dark.clone() },
        uLight: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aGlow; attribute float aTint; uniform float uPx;
        varying float vGlow; varying float vTint;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vGlow = aGlow; vTint = aTint;
          gl_PointSize = clamp((0.045 + aGlow * 0.11 + aTint * 0.02) * uPx / max(-mv.z, 0.5), 1.5, 22.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCyan, uAmber; uniform float uAlpha, uLight;
        varying float vGlow; varying float vTint;
        void main(){
          float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
          float core = smoothstep(0.5, 0.05, r);
          vec3 col = mix(mix(uCyan, uAmber, vTint * 0.8), uAmber, vGlow);
          float a = core * (0.55 + vGlow * 0.45 + uLight * 0.35) * uAlpha;
          gl_FragColor = vec4(col, a);
          ${COMMON_FRAG_TAIL}`,
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    // cursor-linked edges
    const MAXL = 160
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXL * 6), 3))
    lg.setDrawRange(0, 0)
    const lm = new THREE.LineBasicMaterial({ color: CYAN.dark.clone(), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
    const lines = new THREE.LineSegments(lg, lm)
    lines.frustumCulled = false
    return { cur, start, delay, theta, phi, rad, glow, geo, mat, pts, lines, lg, lm, MAXL }
  }, [])

  const t0 = useRef(-1)
  const lastReplay = useRef(0)
  const layout = useRef({ tw: 12, yOff: 1.5 })

  useEffect(() => {
    let alive = true
    const go = async () => {
      try {
        await document.fonts.load('700 120px "Space Grotesk"')
      } catch {
        /* fall back to system font */
      }
      if (!alive) return
      textPts.current = sampleText(profile.shortName, HERO_N)
    }
    go()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const aspect = size.width / size.height
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * CAM_Z0
    const visW = visH * aspect
    layout.current = { tw: Math.min(visW * (aspect < 1 ? 0.92 : 0.8), 15.5), yOff: visH * (aspect < 1 ? 0.2 : 0.17) }
  }, [size, camera])

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), d: new THREE.Vector3() }), [])
  const mouseW = useRef(new THREE.Vector3(999, 999, 0))

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const T = textPts.current
    const lf = live.layerFloat
    if (group.current) group.current.visible = lf < 1.3
    if (lf >= 1.3 || !T) return
    const now = st.clock.elapsedTime
    if (t0.current < 0 || live.replay !== lastReplay.current) {
      lastReplay.current = live.replay
      t0.current = now
      data.start.set(data.cur)
    }
    const age = now - t0.current
    const { tw, yOff } = layout.current
    const rel = Math.min(1, Math.max(0, (age - 6.5) / 3.5))
    const relax = rel * rel * (3 - 2 * rel)

    // mouse position on the z=0 plane
    tmp.v.set(live.mouse.x, live.mouse.y, 0.5).unproject(camera)
    tmp.d.copy(tmp.v).sub(camera.position)
    const k = -camera.position.z / tmp.d.z
    mouseW.current.set(camera.position.x + tmp.d.x * k, camera.position.y + tmp.d.y * k, 0)
    const mx = mouseW.current.x
    const my = mouseW.current.y
    const mouseOn = lf < 0.6 && Math.abs(live.mouse.x) <= 1

    const cur = data.cur
    const glowA = data.glow
    const cand: number[] = []
    const ang = now * 0.07
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    for (let i = 0; i < HERO_N; i++) {
      const tx = T[i * 2] * tw
      const ty = T[i * 2 + 1] * tw + yOff
      const R = data.rad[i]
      const sx = Math.sin(data.phi[i]) * Math.cos(data.theta[i]) * R
      const sy = Math.sin(data.phi[i]) * Math.sin(data.theta[i]) * R * 0.75 + yOff * 0.4
      const sz = Math.cos(data.phi[i]) * R - 1
      const rx = sx * ca + sz * sa
      const rz = -sx * sa + sz * ca
      const gx = tx + (rx - tx) * relax
      const gy = ty + (sy - ty) * relax
      const gz = 0 + (rz - 0) * relax + Math.sin(now * 0.8 + i) * 0.03 * (1 - relax)
      const a = Math.min(1, Math.max(0, (age - data.delay[i]) / 2.6))
      const e = 1 - Math.pow(1 - a, 3)
      let x: number, y: number, z: number
      if (a < 1) {
        x = data.start[i * 3] + (gx - data.start[i * 3]) * e
        y = data.start[i * 3 + 1] + (gy - data.start[i * 3 + 1]) * e
        z = data.start[i * 3 + 2] + (gz - data.start[i * 3 + 2]) * e
      } else {
        const f = 1 - Math.exp(-dt * 5)
        x = cur[i * 3] + (gx - cur[i * 3]) * f
        y = cur[i * 3 + 1] + (gy - cur[i * 3 + 1]) * f
        z = cur[i * 3 + 2] + (gz - cur[i * 3 + 2]) * f
      }
      let g = 0
      if (mouseOn) {
        const dx = x - mx
        const dy = y - my
        const d2 = dx * dx + dy * dy
        if (d2 < 2.4) {
          g = 1 - d2 / 2.4
          const push = g * 0.012
          x += dx * push
          y += dy * push
          if (g > 0.35 && cand.length < 46) cand.push(i)
        }
      }
      cur[i * 3] = x
      cur[i * 3 + 1] = y
      cur[i * 3 + 2] = z
      glowA[i] += (g - glowA[i]) * Math.min(1, dt * 9)
    }
    data.geo.attributes.position.needsUpdate = true
    data.geo.attributes.aGlow.needsUpdate = true

    // connect the lit neurons near the cursor
    let n = 0
    const lp = data.lg.attributes.position.array as Float32Array
    if (!LITE) {
      for (let a = 0; a < cand.length && n < data.MAXL; a++) {
        for (let b = a + 1; b < cand.length && n < data.MAXL; b++) {
          const i = cand[a]
          const j = cand[b]
          const dx = cur[i * 3] - cur[j * 3]
          const dy = cur[i * 3 + 1] - cur[j * 3 + 1]
          const dz = cur[i * 3 + 2] - cur[j * 3 + 2]
          if (dx * dx + dy * dy + dz * dz < 0.9) {
            lp.set(cur.subarray(i * 3, i * 3 + 3), n * 6)
            lp.set(cur.subarray(j * 3, j * 3 + 3), n * 6 + 3)
            n++
          }
        }
      }
    }
    data.lg.setDrawRange(0, n * 2)
    data.lg.attributes.position.needsUpdate = true

    const u = data.mat.uniforms
    u.uPx.value = gl.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360))
    u.uAlpha.value = 1 - Math.min(1, Math.max(0, (lf - 0.15) / 0.7))
    const theme = getState().theme
    u.uCyan.value.copy(CYAN[theme])
    u.uAmber.value.copy(AMBER[theme])
    u.uLight.value = theme === 'light' ? 1 : 0
    data.mat.blending = theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending
    data.lm.color.copy(AMBER[theme])
    data.lm.blending = data.mat.blending
    data.lm.opacity = 0.6 * u.uAlpha.value
  })

  return (
    <group ref={group}>
      <primitive object={data.pts} />
      <primitive object={data.lines} />
    </group>
  )
}

export default function Background() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      data-testid="bg-network"
    >
      <Canvas
        dpr={LITE ? [1, 1.25] : [1, 1.5]}
        camera={{ fov: 55, position: [0, 0, CAM_Z0], near: 0.1, far: 140 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      >
        <Network />
        <Hero />
      </Canvas>
    </div>
  )
}
