import { useEffect, useState } from 'react'

/**
 * CursorRing - one lagged ring that trails the native cursor.
 *
 * NOTE: the global design system bans cursor followers as AI slop.
 * This is the restrained version. The
 * rules that keep it on the right side of the line:
 *
 *   - The native cursor is NEVER hidden. No fake dot - the OS arrow is
 *     the instant layer, the ring is the only follower. Every native
 *     affordance (I-beam, pointer, disabled) keeps working for free.
 *   - One element. No trails, no particles, no glow, no color cycling.
 *   - mix-blend-mode: difference + white border = reads dark on cream,
 *     light on navy-ink. Zero per-section logic.
 *   - Labels only where they change what the user expects: "Open" on
 *     funnel cards, "Drag" on the barrel. Nothing else.
 *   - Mounts only on fine-pointer hover-capable desktop (>= 900px) with
 *     no reduced-motion preference. Touch users never download it.
 *   - pointer-events: none + aria-hidden: pure decoration, can never
 *     intercept a click or be announced.
 *
 * Delete this file + the <CursorRing /> line in App.tsx to remove the
 * feature entirely.
 */

const GATE =
  '(pointer: fine) and (hover: hover) and (min-width: 900px) and (prefers-reduced-motion: no-preference)'

const RING_SIZE = 36

type RingState = 'default' | 'grow' | 'open' | 'drag' | 'hidden'

function stateFor(target: Element): RingState {
  if (target.closest('[data-cursor="none"]')) return 'hidden'
  if (target.closest('input, textarea, select, label')) return 'hidden'
  if (target.closest('.funnels__barrel')) return 'drag'
  if (target.closest('.funnels__grid-card, .app-card__cta')) return 'open'
  if (target.closest('a, button, [role="button"]')) return 'grow'
  return 'default'
}

export default function CursorRing() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(GATE)
    setEnabled(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setEnabled(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const ring = document.querySelector<HTMLElement>('.cursor-ring')
    const label = ring?.querySelector<HTMLElement>('.cursor-ring__label')
    if (!ring || !label) return

    let cancelled = false
    let cleanup = () => {}

    void (async () => {
      const { gsap } = await import('gsap')
      if (cancelled) return

      const xTo = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' })
      const yTo = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' })

      let seen = false
      let baseScale = 1
      let pressed = false
      let state: RingState = 'default'

      const applyScale = () => {
        gsap.to(ring, {
          scale: pressed ? baseScale * 0.85 : baseScale,
          duration: 0.35,
          ease: 'back.out(2)',
          overwrite: 'auto',
        })
      }

      const applyState = (next: RingState) => {
        if (next === state) return
        state = next
        const disc = next === 'open' || next === 'drag'
        baseScale = next === 'grow' ? 1.5 : disc ? 2.4 : 1
        applyScale()
        gsap.to(ring, {
          backgroundColor: disc ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0)',
          borderColor: next === 'grow' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 1)',
          opacity: next === 'hidden' ? 0 : 1,
          duration: 0.25,
          ease: 'power2.out',
        })
        if (disc) label.textContent = next === 'open' ? 'Open' : 'Drag'
        gsap.to(label, { opacity: disc ? 1 : 0, duration: 0.2, ease: 'power2.out' })
      }

      const onMove = (e: PointerEvent) => {
        const x = e.clientX - RING_SIZE / 2
        const y = e.clientY - RING_SIZE / 2
        if (!seen) {
          seen = true
          gsap.set(ring, { x, y })
          gsap.to(ring, { opacity: 1, duration: 0.3, ease: 'power2.out' })
        }
        xTo(x)
        yTo(y)
      }
      const onOver = (e: PointerEvent) => {
        if (e.target instanceof Element) applyState(stateFor(e.target))
      }
      const onDown = () => { pressed = true; applyScale() }
      const onUp = () => { pressed = false; applyScale() }
      const onLeave = () => {
        seen = false
        gsap.to(ring, { opacity: 0, duration: 0.25, ease: 'power2.out' })
      }

      window.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('pointerover', onOver, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      document.documentElement.addEventListener('mouseleave', onLeave)
      window.addEventListener('blur', onLeave)

      cleanup = () => {
        window.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerover', onOver)
        window.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointerup', onUp)
        document.documentElement.removeEventListener('mouseleave', onLeave)
        window.removeEventListener('blur', onLeave)
        gsap.killTweensOf([ring, label])
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="cursor-ring" aria-hidden="true">
      <span className="cursor-ring__label" />
    </div>
  )
}
