import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import SceneCanvas, { getDotTexture } from './SceneCanvas'
import { live } from '../store'

const N = 520

function Orb() {
  const core = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const pts = useRef<THREE.Points>(null)
  const heat = useRef(0)
  const [map, setMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    getDotTexture().then(setMap)
  }, [])

  const st = useMemo(() => {
    const a = new Float32Array(N)
    const r = new Float32Array(N)
    const h = new Float32Array(N)
    const sp = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      a[i] = Math.random() * Math.PI * 2
      r[i] = 1 + Math.random() * 6
      h[i] = (Math.random() - 0.5) * 5
      sp[i] = 0.35 + Math.random() * 0.6
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return { a, r, h, sp, g }
  }, [])

  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const t = s.clock.elapsedTime
    heat.current += ((live.hot ? 1 : 0) - heat.current) * Math.min(1, dt * 5)
    const k = heat.current
    const arr = st.g.attributes.position.array as Float32Array
    for (let i = 0; i < N; i++) {
      // inward spiral: the whole network converges on one neuron
      st.r[i] -= dt * st.sp[i] * (1.4 + k * 2.2)
      st.a[i] += dt * (1.1 / Math.max(0.4, st.r[i]))
      st.h[i] *= 1 - dt * 0.9
      if (st.r[i] < 0.28) {
        st.r[i] = 5 + Math.random() * 3
        st.h[i] = (Math.random() - 0.5) * 5
      }
      arr[i * 3] = Math.cos(st.a[i]) * st.r[i] * 1.25
      arr[i * 3 + 1] = st.h[i] * Math.min(1, st.r[i] / 3)
      arr[i * 3 + 2] = Math.sin(st.a[i]) * st.r[i]
    }
    st.g.attributes.position.needsUpdate = true
    if (pts.current) pts.current.rotation.z = Math.sin(t * 0.2) * 0.12

    const pulse = 1 + Math.sin(t * 2.4) * 0.06 + k * 0.25
    core.current?.scale.setScalar(pulse)
    halo.current?.scale.setScalar(2.2 + k * 1.2 + Math.sin(t * 2.4) * 0.15)
    if (ring.current) {
      ring.current.rotation.x = t * 0.8
      ring.current.rotation.y = t * 0.5
      ring.current.scale.setScalar(1 + k * 0.4)
    }
  })

  return (
    <>
      <points ref={pts} geometry={st.g}>
        <pointsMaterial key={map ? "m" : "n"} map={map} color="#3EE6D4" size={0.12} sizeAttenuation transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh ref={halo}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color="#3EE6D4" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={core}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#FFB547" />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[0.62, 0.012, 8, 64]} />
        <meshBasicMaterial color="#3EE6D4" />
      </mesh>
    </>
  )
}

export default function ContactOrb() {
  return (
    <SceneCanvas
      camera={{ position: [0, 0, 7.5], fov: 50 }}
      label="A network of particles converging into a single glowing output neuron."
    >
      <Orb />
    </SceneCanvas>
  )
}
