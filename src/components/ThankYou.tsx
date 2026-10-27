import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@/components/slab'

const CONFETTI_COLORS = [
  '#FF7A1A', '#FFA155', '#0B1E3F', '#3b82f6',
  '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#f43f5e',
]
const REDIRECT_DELAY = 5

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 140,
      w: 7 + Math.random() * 7,
      h: 3 + Math.random() * 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2.5 + Math.random() * 3,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.18,
      opacity: 1,
    }))

    let raf: number
    const start = Date.now()

    const draw = () => {
      const elapsed = Date.now() - start
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.angle += p.spin
        p.vy += 0.055
        if (elapsed > 1800) p.opacity = Math.max(0, p.opacity - 0.013)
        if (p.y < canvas.height + 20 && p.opacity > 0) alive = true

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (alive && elapsed < 5000) {
        raf = requestAnimationFrame(draw)
      }
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999,
      }}
      aria-hidden="true"
    />
  )
}

export default function ThankYou() {
  const navigate = useNavigate()
  const [count, setCount] = useState(REDIRECT_DELAY)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(interval)
          navigate('/')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [navigate])

  return (
    <>
      <ConfettiCanvas />
      <main className="thankyou" aria-label="Thank you page">
        <div className="thankyou__card">
          <span className="thankyou__eyebrow">Message received</span>
          <h1 className="thankyou__heading">Got it. Talk soon.</h1>
          <p className="thankyou__body">
            I'll review your message and follow up within 24 hours with next steps and a booking link.
            Check your inbox - and your spam folder just in case.
          </p>

          <div className="thankyou__countdown" aria-live="polite" aria-atomic="true">
            <div className="thankyou__bar" aria-hidden="true">
              <div className="thankyou__bar-fill" />
            </div>
            <p className="thankyou__timer">
              Redirecting you home in <strong>{count}</strong> second{count !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            className="thankyou__back"
            onClick={() => navigate('/')}
            aria-label="Go back to home now"
          >
            <ArrowLeft weight="bold" size={15} aria-hidden="true" />
            Go home now
          </button>
        </div>
      </main>
    </>
  )
}
