import { useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import SceneCanvas from './SceneCanvas'
import { projects, skillCategories, skillProjects } from '../content'

export interface SkillNode {
  id: string
  name: string
  cat: string
  color: string
  pos: THREE.Vector3
  also?: string[]
}

const CENTERS: [number, number, number][] = [
  [-5, 1.2, 0.5],
  [0, 2.9, -1.5],
  [5, 1.2, 0.5],
  [-4.2, -2.1, 1.5],
  [4.2, -2.1, 1.0],
  [0, -3.6, -0.5],
]
const PROJECT_POS: Record<string, [number, number, number]> = {
  phishguard: [-0.9, 0.1, 0],
  'github-agent': [0.9, 0.5, 0.3],
  churn: [0, -0.8, -0.4],
}

export function buildSkillNodes(): SkillNode[] {
  const nodes: SkillNode[] = []
  const seen = new Map<string, SkillNode>()
  skillCategories.forEach((cat, ci) => {
    const c = new THREE.Vector3(...CENTERS[ci])
    const n = cat.skills.length
    cat.skills.forEach((s, i) => {
      const existing = seen.get(s)
      if (existing) {
        existing.also = [...(existing.also ?? []), cat.name]
        return
      }
      // fibonacci sphere keeps clusters tidy and deterministic
      const y = 1 - (i / Math.max(1, n - 1)) * 2
      const rr = Math.sqrt(Math.max(0, 1 - y * y))
      const th = i * 2.399963
      const R = 0.75 + Math.min(n, 9) * 0.09
      const p = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(R).add(c)
      const node: SkillNode = { id: s, name: s, cat: cat.id, color: cat.color, pos: p }
      seen.set(s, node)
      nodes.push(node)
    })
  })
  return nodes
}

function Graph({
  hovered,
  setHovered,
  focusCat,
}: {
  hovered: string | null
  setHovered: (s: string | null) => void
  focusCat: string | null
}) {
  const nodes = useMemo(buildSkillNodes, [])
  const group = useRef<THREE.Group>(null)

  const centerLines = useMemo(() => {
    const arr: number[] = []
    const col: number[] = []
    nodes.forEach((n) => {
      const ci = skillCategories.findIndex((c) => c.id === n.cat)
      arr.push(...CENTERS[ci], n.pos.x, n.pos.y, n.pos.z)
      const c = new THREE.Color(n.color)
      col.push(c.r, c.g, c.b, c.r, c.g, c.b)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    return g
  }, [nodes])

  const hoverLines = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 2 * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])

  useFrame((_, dt) => {
    const n = nodes.find((x) => x.id === hovered)
    const list = n ? (skillProjects[n.id] ?? []) : []
    const a = hoverLines.attributes.position.array as Float32Array
    list.forEach((slug, i) => {
      a.set([n!.pos.x, n!.pos.y, n!.pos.z, ...PROJECT_POS[slug]], i * 6)
    })
    hoverLines.setDrawRange(0, list.length * 2)
    hoverLines.attributes.position.needsUpdate = true
    void dt
  })

  return (
    <group ref={group}>
      <lineSegments geometry={centerLines}>
        <lineBasicMaterial vertexColors transparent opacity={0.18} />
      </lineSegments>
      <lineSegments geometry={hoverLines}>
        <lineBasicMaterial color="#FFB547" transparent opacity={0.9} />
      </lineSegments>

      {skillCategories.map((c, i) => (
        <group key={c.id} position={CENTERS[i]}>
          <mesh>
            <icosahedronGeometry args={[0.16, 0]} />
            <meshBasicMaterial color={c.color} wireframe />
          </mesh>
          <Html center distanceFactor={14} position={[0, 0.5, 0]} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
            <div className="node-label cat" style={{ color: c.color }}>
              {c.name}
            </div>
          </Html>
        </group>
      ))}

      {nodes.map((n) => {
        const on = hovered === n.id
        const dim = focusCat && focusCat !== n.cat
        return (
          <group key={n.id} position={n.pos}>
            <mesh
              scale={on ? 1.9 : 1}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHovered(n.id)
                document.body.style.cursor = 'none'
              }}
              onPointerOut={() => {
                setHovered(null)
                document.body.style.cursor = ''
              }}
            >
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshBasicMaterial color={on ? '#FFB547' : n.color} transparent opacity={dim ? 0.18 : 1} />
            </mesh>
            <mesh scale={on ? 3.4 : 2.1}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshBasicMaterial color={n.color} transparent opacity={dim ? 0.02 : on ? 0.22 : 0.08} depthWrite={false} />
            </mesh>
            <Html center distanceFactor={14} position={[0, -0.28, 0]} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
              <div className={`node-label ${on ? 'on' : ''}`} style={{ opacity: dim ? 0.12 : undefined }}>
                {n.name.replace(/ \(.*\)$/, '')}
              </div>
            </Html>
          </group>
        )
      })}

      {projects.map((p) => (
        <group key={p.slug} position={PROJECT_POS[p.slug]}>
          <mesh rotation={[0.6, 0.6, 0]}>
            <octahedronGeometry args={[0.2, 0]} />
            <meshBasicMaterial color={hovered && (skillProjects[hovered] ?? []).includes(p.slug) ? '#FFB547' : '#8B93A1'} wireframe />
          </mesh>
          <Html center distanceFactor={14} position={[0, 0.34, 0]} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`node-label ${hovered && (skillProjects[hovered] ?? []).includes(p.slug) ? 'on' : ''}`}>
              ◆ {p.name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

export default function SkillsGraph({
  onHover,
  focusCat,
}: {
  onHover: (s: string | null) => void
  focusCat: string | null
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const h = (s: string | null) => {
    setHovered(s)
    onHover(s)
  }
  return (
    <SceneCanvas camera={{ position: [0, 0.3, 15.5], fov: 48 }} label="Interactive 3D graph of skills clustered by category. Drag to rotate; hover a node to see the projects that used it.">
      <Graph hovered={hovered} setHovered={h} focusCat={focusCat} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={!hovered} autoRotateSpeed={0.7} rotateSpeed={0.7} dampingFactor={0.08} />
    </SceneCanvas>
  )
}
