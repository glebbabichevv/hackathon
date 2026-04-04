import { useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'

// Almaty: 43.2220°N, 76.8512°E
// phi  = longitude in radians → 76.8512 × π/180 ≈ 1.3416
// theta = latitude-based tilt → tuned for 43°N
const TARGET_PHI   = 76.8512 * (Math.PI / 180)   // 1.3416 rad
const TARGET_THETA = 0.40

// Exact canvas position of Almaty when globe is locked:
//   lat_rad = 43.2220 × π/180 = 0.7545
//   y_3d    = sin(0.7545) = 0.6845,  z_3d = cos(0.7545) = 0.7291
//   y_rotated = y_3d×cos(0.40) − z_3d×sin(0.40) = 0.3466
//   canvas_x = 50%,  canvas_y = 50% − 0.3466×50% = 32.67%
const PIN_LEFT = '50%'
const PIN_TOP  = '32.7%'

// One full spin ends exactly on Almaty
const START_PHI   = TARGET_PHI - 2 * Math.PI     // ≡ same face, one rotation behind
const START_THETA = 0.08

const SPIN_MS = 1600   // duration of the globe rotation

// ease-in-out cubic: slow → fast → slow
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Hub city markers + arcs from Almaty
const MARKERS = [
  { location: [43.22, 76.85] as [number,number], size: 0.09 }, // Almaty
  { location: [55.75, 37.62] as [number,number], size: 0.05 }, // Moscow
  { location: [39.91,116.39] as [number,number], size: 0.05 }, // Beijing
  { location: [25.20, 55.27] as [number,number], size: 0.04 }, // Dubai
  { location: [51.51, -0.13] as [number,number], size: 0.04 }, // London
]
const ARCS = [
  { from: [43.22, 76.85] as [number,number], to: [55.75,  37.62] as [number,number] },
  { from: [43.22, 76.85] as [number,number], to: [39.91, 116.39] as [number,number] },
  { from: [43.22, 76.85] as [number,number], to: [25.20,  55.27] as [number,number] },
  { from: [43.22, 76.85] as [number,number], to: [51.51,  -0.13] as [number,number] },
]

// Pre-computed stars
const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 137.508) % 100,
  y: (i * 97.300)  % 100,
  s: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.6 : 1,
  d: (i * 0.37) % 5,
  t: 2 + (i % 6) * 0.5,
  b: i % 7 === 0,
}))

type Phase = 'spinning' | 'locked' | 'zooming'

interface Props { onComplete: () => void }

export function IntroScreen({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef  = useRef<Phase>('spinning')

  const [phase,         setPhase        ] = useState<Phase>('spinning')
  const [showCity,      setShowCity     ] = useState(false)
  const [pulse,         setPulse        ] = useState(0)
  const [globeScale,    setGlobeScale   ] = useState(1)
  const [screenOpacity, setScreenOpacity] = useState(1)
  const [flash,         setFlash        ] = useState(false)

  // ── Globe: time-based single rotation ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let stopped    = false
    let rafId      = 0
    let startTime  = 0
    let globeDestroy: (() => void) | undefined

    const initId = requestAnimationFrame(() => {
      if (stopped) return

      const size = canvas.parentElement?.clientWidth || 660
      canvas.width  = size * Math.min(window.devicePixelRatio || 1, 2)
      canvas.height = size * Math.min(window.devicePixelRatio || 1, 2)

      const globe = createGlobe(canvas, {
        devicePixelRatio: 1,
        width:  canvas.width,
        height: canvas.height,
        phi:    START_PHI,
        theta:  START_THETA,
        dark:        1,
        diffuse:     1.8,
        mapSamples:  24000,
        mapBrightness: 10,
        baseColor:   [0.02, 0.10, 0.30],
        markerColor: [0.00, 0.90, 1.00],
        glowColor:   [0.00, 0.45, 1.00],
        markers: MARKERS,
        arcs:    ARCS,
        arcColor:  [0.00, 0.75, 1.00],
        arcWidth:  0.8,
        arcHeight: 0.35,
        opacity:   0.85,
      })

      globeDestroy = () => globe.destroy()

      function tick(ts: number) {
        if (stopped) return

        if (startTime === 0) startTime = ts
        const elapsed = ts - startTime

        if (phaseRef.current === 'spinning') {
          const t      = Math.min(elapsed / SPIN_MS, 1)
          const eased  = easeInOutCubic(t)
          const phi    = START_PHI   + eased * 2 * Math.PI
          const theta  = START_THETA + eased * (TARGET_THETA - START_THETA)
          globe.update({ phi, theta })

          if (t >= 1) {
            phaseRef.current = 'locked'
            setPhase('locked')
          }
        } else {
          // hold exact position
          globe.update({ phi: TARGET_PHI, theta: TARGET_THETA })
        }

        rafId = requestAnimationFrame(tick)
      }

      rafId = requestAnimationFrame(tick)
    })

    return () => {
      stopped = true
      cancelAnimationFrame(initId)
      cancelAnimationFrame(rafId)
      globeDestroy?.()
    }
  }, [])

  // ── Locked sequence (runs once, fully automatic) ─────────────────────────
  useEffect(() => {
    if (phase !== 'locked') return

    // pin + rings staggered
    setShowCity(true)
    const t1 = setTimeout(() => setPulse(1),  80)
    const t2 = setTimeout(() => setPulse(2), 200)
    const t3 = setTimeout(() => setPulse(3), 320)

    // zoom → white flash → fade background → hand off to dashboard
    const t4 = setTimeout(() => {
      phaseRef.current = 'zooming'
      setPhase('zooming')
      setGlobeScale(14)          // zoom deep into Almaty
      setTimeout(() => setFlash(true),       180)   // flash at peak zoom
      setTimeout(() => setScreenOpacity(0),  260)   // fade dark bg away
      setTimeout(onComplete,                 500)   // unmount intro
    }, 480)

    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [phase, onComplete])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#020b1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: screenOpacity,
      transition: 'opacity 0.3s ease',
      overflow: 'hidden',
    }}>

      {/* Skip button */}
      <button
        onClick={onComplete}
        style={{
          position: 'absolute', bottom: 24, right: 28, zIndex: 20,
          background: 'transparent', border: '1px solid #1e3a5f',
          color: '#334155', fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase', padding: '5px 12px',
          borderRadius: 6, cursor: 'pointer',
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color='#64748b'; e.currentTarget.style.borderColor='#334155' }}
        onMouseLeave={e => { e.currentTarget.style.color='#334155'; e.currentTarget.style.borderColor='#1e3a5f' }}
      >
        пропустить →
      </button>

      {/* Flash */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.7) 0%, rgba(2,11,26,0.9) 100%)',
          animation: 'flashOut 0.4s ease forwards',
        }} />
      )}

      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
            width: s.s, height: s.s, borderRadius: '50%',
            background: s.b ? '#7dd3fc' : '#fff',
            boxShadow: s.b ? '0 0 4px #7dd3fc' : 'none',
            animation: `twinkle ${s.t}s ${s.d}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: '7%', textAlign: 'center', zIndex: 2,
        animation: 'fadeUp 0.8s ease forwards',
      }}>
        <p style={{
          fontSize: 10, letterSpacing: '0.55em', textTransform: 'uppercase',
          color: '#38bdf8', margin: '0 0 8px',
          textShadow: '0 0 20px rgba(56,189,248,0.6)',
        }}>
          ◈ RiseOS · Алматы ◈
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#fff',
          letterSpacing: '0.08em', margin: 0,
          textShadow: '0 0 40px rgba(56,189,248,0.25)',
        }}>
          ПАНЕЛЬ УПРАВЛЕНИЯ ГОРОДОМ
        </h1>
      </div>

      {/* Globe */}
      <div style={{
        width: 660, height: 660, flexShrink: 0, position: 'relative',
        transform: `scale(${globeScale})`,
        transition: phase === 'zooming'
          ? 'transform 0.5s cubic-bezier(0.4,0,1,1)'   // accelerate into city
          : 'none',
      }}>
        {/* Glow halo */}
        <div style={{
          position: 'absolute', inset: -24, borderRadius: '50%',
          background: 'radial-gradient(ellipse, transparent 44%, rgba(0,100,255,0.13) 65%, transparent 76%)',
          animation: 'halo 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        <canvas ref={canvasRef} style={{
          width: '100%', height: '100%',
          borderRadius: '50%', display: 'block',
          animation: 'fadeIn 0.6s ease forwards',
        }} />

        {/* Pulse rings on Almaty */}
        {pulse >= 1 && <Ring delay={0}   color="#38bdf8" />}
        {pulse >= 2 && <Ring delay={150} color="#22d3ee" />}
        {pulse >= 3 && <Ring delay={300} color="#67e8f9" />}

        {/* Almaty pin */}
        {showCity && (
          <div style={{
            position: 'absolute',
            left: PIN_LEFT, top: PIN_TOP,
            transform: 'translate(-50%, -100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            pointerEvents: 'none', zIndex: 5,
            animation: 'pinDrop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <div style={{
              background: 'rgba(2,11,26,0.92)',
              border: '1px solid #38bdf8',
              borderRadius: 8, padding: '5px 14px',
              color: '#38bdf8', fontSize: 13, fontWeight: 800,
              letterSpacing: '0.12em', whiteSpace: 'nowrap',
              boxShadow: '0 0 20px rgba(56,189,248,0.5)',
            }}>
              АЛМАТЫ
            </div>
            <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginTop: 2 }}>
              43.22°N · 76.85°E
            </div>
            <div style={{ width: 1, height: 14, background: 'linear-gradient(to bottom,#38bdf8,transparent)' }} />
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: '#38bdf8',
              boxShadow: '0 0 0 3px rgba(56,189,248,0.25), 0 0 14px #38bdf8',
              animation: 'dotPulse 1s ease-in-out infinite',
            }} />
          </div>
        )}
      </div>

      {/* Status */}
      <div style={{
        position: 'absolute', bottom: '8%', textAlign: 'center', zIndex: 2,
        animation: 'fadeUp 1s ease 0.3s both',
      }}>
        <p style={{
          fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0,
          color: phase === 'locked' ? '#34d399' : '#38bdf8',
          textShadow: phase === 'locked' ? '0 0 12px rgba(52,211,153,0.5)' : '0 0 12px rgba(56,189,248,0.4)',
          transition: 'color 0.5s ease',
        }}>
          {phase === 'spinning' && '⟳  Обзор мира...'}
          {phase === 'locked'   && '✓  Алматы, Казахстан'}
          {phase === 'zooming'  && '↗  Подключение...'}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes twinkle   { 0%,100%{opacity:.15} 50%{opacity:.8} }
        @keyframes halo      { 0%,100%{opacity:.6}  50%{opacity:1}  }
        @keyframes dotPulse  { 0%,100%{box-shadow:0 0 0 3px rgba(56,189,248,.25),0 0 14px #38bdf8} 50%{box-shadow:0 0 0 7px rgba(56,189,248,.08),0 0 22px #38bdf8} }
        @keyframes pinDrop   { from{opacity:0;transform:translate(-50%,calc(-100% - 16px))} to{opacity:1;transform:translate(-50%,-100%)} }
        @keyframes flashOut  { 0%{opacity:1} 100%{opacity:0} }
        @keyframes ringOut   { 0%{transform:translate(-50%,-50%) scale(.1);opacity:.9} 100%{transform:translate(-50%,-50%) scale(2.8);opacity:0} }
      `}</style>
    </div>
  )
}

function Ring({ delay, color }: { delay: number; color: string }) {
  return (
    <div style={{
      position: 'absolute', left: PIN_LEFT, top: PIN_TOP,
      width: 36, height: 36,
      borderRadius: '50%',
      border: `2px solid ${color}`,
      animation: `ringOut 1.2s ${delay}ms ease-out infinite`,
      pointerEvents: 'none', zIndex: 4,
    }} />
  )
}
