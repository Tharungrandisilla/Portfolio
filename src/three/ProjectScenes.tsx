import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import SceneCanvas, { getDotTexture } from './SceneCanvas'
import type { ProjectSlug } from '../content'

const C = {
  cyan: new THREE.Color('#3EE6D4'),
  amber: new THREE.Color('#FFB547'),
  red: new THREE.Color('#FF5C6C'),
  neutral: new THREE.Color('#9AA7B8'),
  dim: new THREE.Color('#7A889C'),
}

function LookAt({ target }: { target: [number, number, number] }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.lookAt(...target)
  }, [camera, target])
  return null
}

/* ======================= 1 · PhishGuard ======================= */

const SHIELD_X = 0.6
const MESSAGES = [
  'Flagged: look-alike sender domain, urgent wording.',
  'Flagged: link text does not match its destination.',
  'Flagged: asks for credentials, unusual structure.',
]

function Phish() {
  const N = 30
  const body = useRef<THREE.InstancedMesh>(null)
  const flap = useRef<THREE.InstancedMesh>(null)
  const shieldMat = useRef<THREE.MeshBasicMaterial>(null)
  const flash = useRef(0)
  const [msg, setMsg] = useState(0)
  const [showMsg, setShowMsg] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const s = useMemo(() => {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    return {
      x: Float32Array.from({ length: N }, (_, i) => -6 + (i / N) * 13),
      y: Float32Array.from({ length: N }, () => rnd(-1.7, 1.7)),
      z: Float32Array.from({ length: N }, () => rnd(-0.8, 0.8)),
      sp: Float32Array.from({ length: N }, () => rnd(1.3, 2.0)),
      rot: Float32Array.from({ length: N }, () => rnd(-0.4, 0.4)),
      bad: Uint8Array.from({ length: N }, () => (Math.random() < 0.38 ? 1 : 0)),
      caught: new Float32Array(N), // seconds since caught, 0 = free
      scale: new Float32Array(N).fill(1),
    }
  }, [])

  const shieldGeo = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(0, 1.55)
    sh.lineTo(1.05, 1.2)
    sh.lineTo(1.05, 0.15)
    sh.quadraticCurveTo(1.0, -1.0, 0, -1.6)
    sh.quadraticCurveTo(-1.0, -1.0, -1.05, 0.15)
    sh.lineTo(-1.05, 1.2)
    sh.closePath()
    return new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false })
  }, [])
  const shieldEdges = useMemo(() => new THREE.EdgesGeometry(shieldGeo), [shieldGeo])
  const flapGeo = useMemo(() => {
    const t = new THREE.Shape()
    t.moveTo(-0.26, 0.17)
    t.lineTo(0.26, 0.17)
    t.lineTo(0, -0.03)
    t.closePath()
    return new THREE.ShapeGeometry(t)
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const b = body.current
    const f = flap.current
    if (!b || !f) return
    for (let i = 0; i < N; i++) {
      let sc = 1
      if (s.caught[i] > 0) {
        s.caught[i] += dt
        const k = s.caught[i] / 0.9
        sc = Math.max(0, 1 - k * k)
        if (s.caught[i] > 0.9) {
          s.caught[i] = 0
          s.x[i] = -5.6 - Math.random() * 1.5
          s.y[i] = (Math.random() - 0.5) * 3.4
          s.bad[i] = Math.random() < 0.38 ? 1 : 0
        }
      } else {
        s.x[i] += s.sp[i] * dt
        if (s.bad[i] && s.x[i] > SHIELD_X - 0.5) {
          s.caught[i] = 0.001
          flash.current = 1
          setMsg((m) => (m + 1) % MESSAGES.length)
          setShowMsg(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setShowMsg(false), 2600)
        } else if (s.x[i] > 6.5) {
          s.x[i] = -5.6 - Math.random() * 1.5
          s.y[i] = (Math.random() - 0.5) * 3.4
          s.bad[i] = Math.random() < 0.38 ? 1 : 0
        }
      }
      const jitter = s.caught[i] > 0 ? Math.sin(st.clock.elapsedTime * 60 + i) * 0.04 : 0
      const wob = Math.sin(st.clock.elapsedTime * 1.5 + i) * 0.15
      dummy.position.set(s.x[i] + jitter, s.y[i] + wob * 0.2, s.z[i])
      dummy.rotation.set(0, 0, s.rot[i] + wob * 0.2)
      dummy.scale.setScalar(sc)
      dummy.updateMatrix()
      b.setMatrixAt(i, dummy.matrix)
      // flap sits on the front face of the envelope
      dummy.translateZ(0.03)
      dummy.translateY(0.0)
      dummy.updateMatrix()
      f.setMatrixAt(i, dummy.matrix)

      const past = s.x[i] > SHIELD_X - 0.55
      col.copy(!past ? C.neutral : s.bad[i] ? C.red : C.cyan)
      b.setColorAt(i, col)
      col.multiplyScalar(0.55)
      f.setColorAt(i, col)
    }
    b.instanceMatrix.needsUpdate = f.instanceMatrix.needsUpdate = true
    if (b.instanceColor) b.instanceColor.needsUpdate = true
    if (f.instanceColor) f.instanceColor.needsUpdate = true
    flash.current *= Math.exp(-dt * 4)
    if (shieldMat.current) shieldMat.current.opacity = 0.14 + flash.current * 0.35 + Math.sin(st.clock.elapsedTime * 2) * 0.03
  })

  return (
    <>
      <LookAt target={[0.5, 0, 0]} />
      <instancedMesh ref={body} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[0.52, 0.34, 0.04]} />
        <meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={flap} args={[flapGeo, undefined, N]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
      <group position={[SHIELD_X, 0, -0.05]} rotation={[0, Math.PI / 2 - 0.6, 0]}>
        <mesh geometry={shieldGeo}>
          <meshBasicMaterial ref={shieldMat} color="#3EE6D4" transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={shieldEdges}>
          <lineBasicMaterial color="#3EE6D4" />
        </lineSegments>
      </group>
      <Html position={[2.4, 1.75, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none', transition: 'opacity .4s', opacity: showMsg ? 1 : 0.0 }}>
        <div className="bubble">
          <small>phi-2 · on-device explanation</small>
          {MESSAGES[msg]}
        </div>
      </Html>
    </>
  )
}

/* ======================= 2 · GitHub Agent pipeline ======================= */

const STEPS = ['Discover', 'Scan', 'Prepare', 'Commit', 'Push', 'Verify']
const SP = 1.75

function Pipeline() {
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([])
  const lit = useRef(new Float32Array(STEPS.length))
  const packet = useRef<THREE.Group>(null)
  const packetMat = useRef<THREE.MeshBasicMaterial>(null)
  const ring = useRef<THREE.Mesh>(null)
  const burst = useRef<THREE.Points>(null)
  const [alert, setAlert] = useState(false)
  const [dotMap, setDotMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    getDotTexture().then(setDotMap)
  }, [])
  const sim = useRef({ kind: 'ok' as 'ok' | 'secret', s: -0.8, phase: 'run' as 'run' | 'hold' | 'burst', t: 0 })
  const vel = useMemo(() => Float32Array.from({ length: 28 * 3 }, () => (Math.random() - 0.5) * 2.4), [])
  const burstGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(28 * 3), 3))
    return g
  }, [])
  const x0 = -((STEPS.length - 1) * SP) / 2

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const m = sim.current
    const time = st.clock.elapsedTime
    m.t += dt
    if (m.phase === 'run') {
      m.s += dt * 1.7
      if (m.kind === 'secret' && m.s >= 1) {
        m.s = 1
        m.phase = 'hold'
        m.t = 0
        setAlert(true)
      } else if (m.s > STEPS.length + 0.2) {
        m.kind = m.kind === 'ok' ? 'secret' : 'ok'
        m.s = -0.8
      }
    } else if (m.phase === 'hold') {
      if (m.t > 1) {
        m.phase = 'burst'
        m.t = 0
        burstGeo.attributes.position.array.fill(0)
        const a = burstGeo.attributes.position.array as Float32Array
        for (let i = 0; i < 28; i++) a[i * 3] = x0 + SP
      }
    } else if (m.t > 1.1) {
      setAlert(false)
      m.phase = 'run'
      m.kind = 'ok'
      m.s = -0.8
    }

    const pk = packet.current
    if (pk) {
      pk.visible = m.phase !== 'burst'
      const px = x0 + m.s * SP
      const shake = m.phase === 'hold' ? Math.sin(time * 70) * 0.05 : 0
      pk.position.set(px + shake, 0.0, 0)
      pk.rotation.x = time * 2
      pk.rotation.y = time * 1.4
      pk.scale.setScalar(m.phase === 'hold' ? 1 + m.t * 0.3 : 1)
    }
    if (packetMat.current) packetMat.current.color.copy(m.kind === 'secret' ? C.red : C.cyan)

    for (let i = 0; i < STEPS.length; i++) {
      const near = m.phase !== 'burst' && Math.abs(m.s - (i)) < 0.35 ? 1 : 0
      lit.current[i] += (near - lit.current[i]) * Math.min(1, dt * (near ? 12 : 2.2))
      const mesh = nodeRefs.current[i]
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial
        const target = i === 1 && (m.phase === 'hold' || m.phase === 'burst') ? C.red : i === 1 && m.kind === 'secret' ? C.cyan : C.cyan
        mat.color.copy(C.dim).lerp(target, lit.current[i])
        mesh.scale.setScalar(1 + lit.current[i] * 0.35)
        mesh.rotation.y = time * 0.6
      }
    }
    if (ring.current) {
      ring.current.rotation.z = time * 1.2
      ring.current.rotation.x = time * 0.7
      ;(ring.current.material as THREE.MeshBasicMaterial).color.copy(m.phase === 'hold' ? C.red : C.amber)
    }
    if (burst.current) {
      burst.current.visible = m.phase === 'burst'
      if (m.phase === 'burst') {
        const a = burstGeo.attributes.position.array as Float32Array
        for (let i = 0; i < 28; i++) {
          a[i * 3] += vel[i * 3] * dt
          a[i * 3 + 1] += vel[i * 3 + 1] * dt
          a[i * 3 + 2] += vel[i * 3 + 2] * dt
        }
        burstGeo.attributes.position.needsUpdate = true
        ;(burst.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - m.t / 1)
      }
    }
  })

  return (
    <>
      <LookAt target={[0, 0, 0]} />
      {STEPS.slice(0, -1).map((_, i) => (
        <mesh key={i} position={[x0 + i * SP + SP / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, SP - 0.4, 8]} />
          <meshBasicMaterial color="#5B6779" transparent opacity={0.8} />
        </mesh>
      ))}
      {STEPS.map((name, i) => (
        <group key={name} position={[x0 + i * SP, 0, 0]}>
          <mesh ref={(el) => { nodeRefs.current[i] = el }}>
            <icosahedronGeometry args={[0.3, 0]} />
            <meshBasicMaterial color="#5B6779" wireframe={false} />
          </mesh>
          <mesh>
            <icosahedronGeometry args={[0.36, 0]} />
            <meshBasicMaterial color="#9AA7B8" wireframe transparent opacity={0.35} />
          </mesh>
          <Html center position={[0, -0.72, 0]} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`pipe-label ${i === 1 && alert ? 'alert' : ''}`}>{name}</div>
          </Html>
        </group>
      ))}
      <mesh ref={ring} position={[x0 + SP, 0, 0]}>
        <torusGeometry args={[0.62, 0.015, 8, 48]} />
        <meshBasicMaterial color="#FFB547" />
      </mesh>
      <Html center position={[x0 + SP, 1.15, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none', opacity: alert ? 1 : 0, transition: 'opacity .25s' }}>
        <div className="out-label rd" style={{ color: '#FF5C6C' }}>
          secret detected · push blocked
        </div>
      </Html>
      <group ref={packet}>
        <mesh>
          <boxGeometry args={[0.26, 0.26, 0.26]} />
          <meshBasicMaterial ref={packetMat} color="#3EE6D4" />
        </mesh>
        <mesh scale={1.7}>
          <boxGeometry args={[0.26, 0.26, 0.26]} />
          <meshBasicMaterial color="#9AA7B8" wireframe transparent opacity={0.4} />
        </mesh>
      </group>
      <points ref={burst} geometry={burstGeo} visible={false}>
        <pointsMaterial key={dotMap ? "m" : "n"} map={dotMap} color="#FF5C6C" size={0.16} transparent depthWrite={false} />
      </points>
    </>
  )
}

/* ======================= 3 · Churn random forest ======================= */

const TREES = 6
const LEVELS = 3
const NODES_PER = 2 ** (LEVELS + 1) - 1

interface TNode {
  p: THREE.Vector3
  parent: number
  level: number
}

function buildForest() {
  const trees: { base: THREE.Vector3; nodes: TNode[] }[] = []
  for (let t = 0; t < TREES; t++) {
    const a = (t / TREES) * Math.PI * 2
    const base = new THREE.Vector3(Math.cos(a) * 2.4, -1.6, Math.sin(a) * 2.4)
    const nodes: TNode[] = [{ p: new THREE.Vector3(), parent: -1, level: 0 }]
    for (let i = 0; nodes.length < NODES_PER; i++) {
      const n = nodes[i]
      if (n.level >= LEVELS) continue
      for (const sgn of [-1, 1]) {
        const k = n.level
        const f = Math.pow(0.58, k)
        nodes.push({
          p: n.p.clone().add(new THREE.Vector3(sgn * 0.75 * f * Math.cos(a), 0.7, sgn * 0.75 * f * Math.sin(a) + (k % 2 ? sgn : -sgn) * 0.25 * f)),
          parent: i,
          level: k + 1,
        })
      }
    }
    trees.push({ base, nodes })
  }
  return trees
}

function Forest({ onVote }: { onVote: (v: 'Churn' | 'Stay') => void }) {
  const trees = useMemo(buildForest, [])
  const group = useRef<THREE.Group>(null)
  const inst = useRef<THREE.InstancedMesh>(null)
  const out = useRef<THREE.Mesh>(null)
  const outPos = useMemo(() => new THREE.Vector3(0, 2.2, 0), [])
  const cyc = useRef({ start: 0, leaf: new Array(TREES).fill(0), vote: 'Stay' as 'Churn' | 'Stay', init: false })
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  const edgeGeo = useMemo(() => {
    const pos: number[] = []
    trees.forEach((t) =>
      t.nodes.forEach((n) => {
        if (n.parent < 0) return
        const a = t.base.clone().add(t.nodes[n.parent].p)
        const b = t.base.clone().add(n.p)
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }),
    )
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3))
    return g
  }, [trees])
  const outGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TREES * 6), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TREES * 6), 3))
    return g
  }, [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const t = st.clock.elapsedTime
    const c = cyc.current
    if (group.current) group.current.rotation.y += dt * 0.28
    if (!c.init || t - c.start > 5.2) {
      c.init = true
      c.start = t
      let churn = 0
      for (let i = 0; i < TREES; i++) {
        c.leaf[i] = (Math.random() * 2 ** LEVELS) | 0
        if (c.leaf[i] % 2 === 0) churn++
      }
      c.vote = churn * 2 >= TREES ? 'Churn' : 'Stay'
      for (let i = 0; i < TREES; i++) {
        const leafIdx = NODES_PER - 2 ** LEVELS + c.leaf[i]
        const lp = trees[i].base.clone().add(trees[i].nodes[leafIdx].p)
        outGeo.attributes.position.array.set([lp.x, lp.y, lp.z, outPos.x, outPos.y, outPos.z], i * 6)
      }
      outGeo.attributes.position.needsUpdate = true
    }
    const ph = t - c.start
    const ec = edgeGeo.attributes.color.array as Float32Array
    const m = inst.current
    if (!m) return
    let e = 0
    for (let ti = 0; ti < TREES; ti++) {
      const tree = trees[ti]
      const leafIdx = NODES_PER - 2 ** LEVELS + c.leaf[ti]
      const onPath = new Set<number>()
      for (let n = leafIdx; n >= 0; n = tree.nodes[n].parent) onPath.add(n)
      const leafColor = c.leaf[ti] % 2 === 0 ? C.amber : C.cyan
      tree.nodes.forEach((n, ni) => {
        const lit = onPath.has(ni) && ph > 0.3 + n.level * 0.5
        const scale = ni >= NODES_PER - 2 ** LEVELS ? 0.75 : 1
        dummy.position.copy(tree.base).add(n.p)
        dummy.scale.setScalar(lit ? scale * 1.5 : scale)
        dummy.rotation.set(0, t * 0.5 + ni, 0)
        dummy.updateMatrix()
        m.setMatrixAt(ti * NODES_PER + ni, dummy.matrix)
        tmp.copy(C.dim)
        if (lit) tmp.copy(ni === leafIdx ? leafColor : C.cyan)
        m.setColorAt(ti * NODES_PER + ni, tmp)
        if (n.parent >= 0) {
          const litEdge = onPath.has(ni) && ph > 0.3 + n.level * 0.5
          tmp.copy(C.dim).multiplyScalar(0.7)
          if (litEdge) tmp.copy(ni === leafIdx ? leafColor : C.cyan)
          ec[e * 6] = ec[e * 6 + 3] = tmp.r
          ec[e * 6 + 1] = ec[e * 6 + 4] = tmp.g
          ec[e * 6 + 2] = ec[e * 6 + 5] = tmp.b
          e++
        }
      })
      const oc = outGeo.attributes.color.array as Float32Array
      const on = ph > 2.1
      tmp.copy(on ? leafColor : C.dim).multiplyScalar(on ? 1 : 0.35)
      oc.set([tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b], ti * 6)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    edgeGeo.attributes.color.needsUpdate = true
    outGeo.attributes.color.needsUpdate = true

    if (out.current) {
      const decided = ph > 2.5
      const col = decided ? (c.vote === 'Churn' ? C.amber : C.cyan) : C.dim
      ;(out.current.material as THREE.MeshBasicMaterial).color.lerp(col, 0.15)
      out.current.scale.setScalar(decided ? 1.15 + Math.sin(t * 6) * 0.05 : 0.9)
      out.current.rotation.y = t
      out.current.rotation.x = 0.4
      onVote(decided ? c.vote : 'Stay')
    }
  })

  return (
    <>
      <LookAt target={[0, 0.7, 0]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <group ref={group}>
        {trees.map((t, i) => (
          <mesh key={i} position={[t.base.x, t.base.y - 0.28, t.base.z]}>
            <cylinderGeometry args={[0.05, 0.1, 0.56, 5]} />
            <meshStandardMaterial color="#6B7A8E" flatShading />
          </mesh>
        ))}
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial vertexColors />
        </lineSegments>
        <lineSegments geometry={outGeo}>
          <lineBasicMaterial vertexColors transparent opacity={0.9} />
        </lineSegments>
        <instancedMesh ref={inst} args={[undefined, undefined, TREES * NODES_PER]} frustumCulled={false}>
          <icosahedronGeometry args={[0.11, 0]} />
          <meshBasicMaterial />
        </instancedMesh>
        <mesh ref={out} position={outPos}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshBasicMaterial color="#5B6779" />
        </mesh>
      </group>
    </>
  )
}

function ForestScene() {
  const [vote, setVote] = useState<'Churn' | 'Stay'>('Stay')
  const last = useRef<'Churn' | 'Stay'>('Stay')
  const onVote = (v: 'Churn' | 'Stay') => {
    if (v !== last.current) {
      last.current = v
      setVote(v)
    }
  }
  return (
    <>
      <Forest onVote={onVote} />
      <Html position={[0, 3.0, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="out-label" style={{ color: vote === 'Churn' ? '#FFB547' : '#3EE6D4' }}>
          ŷ = {vote}
        </div>
      </Html>
    </>
  )
}

/* ======================= entry ======================= */

const LABELS: Record<ProjectSlug, string> = {
  phishguard: '3D scene: envelope particles stream toward a glowing shield. Safe mail passes in cyan, phishing is caught and turns red.',
  'github-agent': '3D scene: a pipeline of nodes Discover, Scan, Prepare, Commit, Push, Verify with a data packet; a packet carrying a secret is stopped at Scan.',
  churn: '3D scene: a rotating forest of low-poly decision trees whose branches light up a decision path ending in a Churn or Stay output node.',
}

export default function ProjectScene({ slug }: { slug: ProjectSlug }) {
  const cam: Record<ProjectSlug, { position: [number, number, number]; fov?: number }> = {
    phishguard: { position: [0, 0.8, 8.5], fov: 48 },
    'github-agent': { position: [0, 0.4, 10.4], fov: 48 },
    churn: { position: [0, 0.9, 7.6], fov: 48 },
  }
  return (
    <SceneCanvas camera={cam[slug]} label={LABELS[slug]}>
      {slug === 'phishguard' && <Phish />}
      {slug === 'github-agent' && <Pipeline />}
      {slug === 'churn' && <ForestScene />}
    </SceneCanvas>
  )
}
