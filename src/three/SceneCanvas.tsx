import { Canvas } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { useInView } from '../components/ui'

/** A Canvas that only runs its render loop while on screen (and caps DPR). */
export default function SceneCanvas({
  children,
  camera,
  className = '',
  label,
}: {
  children: ReactNode
  camera: { position: [number, number, number]; fov?: number }
  className?: string
  label?: string
}) {
  const { ref, visible } = useInView<HTMLDivElement>('120px')
  return (
    <div ref={ref} className={`absolute inset-0 ${className}`} role="img" aria-label={label} aria-hidden={label ? undefined : true}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ fov: 45, ...camera }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {children}
      </Canvas>
    </div>
  )
}

let dot: import('three').CanvasTexture | null = null
/** Soft round sprite so THREE.Points render as glowing dots instead of squares. */
export async function getDotTexture() {
  if (dot) return dot
  const { CanvasTexture } = await import('three')
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,.7)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  dot = new CanvasTexture(c)
  return dot
}
