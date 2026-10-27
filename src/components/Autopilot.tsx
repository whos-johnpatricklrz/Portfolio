import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import {
  Lightning,
  EnvelopeSimple,
  CalendarCheck,
  Clock,
  BellRinging,
  VideoCamera,
  FileText,
  Trophy,
  XCircle,
  Hourglass,
  Heart,
  Plug,
  Sparkle,
} from '@/components/slab'
import type { Icon } from '@/components/slab'

/**
 * Autopilot
 *
 * A live example automation in a faux macOS window: node cards (play-shaped
 * trigger, orange-ringed decision gate), curved SVG bezier "cables" between them, and
 * glowing orange "signal" dots that travel ALONG each cable via GSAP
 * MotionPathPlugin - so the flow visibly runs on a loop.
 *
 * Nodes are absolutely positioned on a fixed 900x520 design canvas (matching
 * the hand-drawn flowchart); cables are measured from the live node rects on
 * mount + resize, so the wiring is always correct. Reduced-motion drops the
 * signals; offscreen pauses the tweens.
 */

gsap.registerPlugin(MotionPathPlugin)

const DESIGN_W = 1000
const DESIGN_H = 388

type FlowNode = {
  id: string
  Icon: Icon
  title: string
  subtitle: string
  x: number
  y: number
  variant?: 'trigger' | 'gate' | 'win' | 'lost'
}

// x,y = top-left of the node box on the 1000x372 canvas (mirrors the flowchart).
// Two tiers: the chain across the top, the outcomes fanning out just below.
const NODES: FlowNode[] = [
  // top chain
  { id: 'n-form',     Icon: Lightning,     title: 'Trigger',        subtitle: 'Form submitted',    x: 6,   y: 36,  variant: 'trigger' },
  { id: 'n-email',    Icon: EnvelopeSimple, title: 'Send Email',    subtitle: 'Action',            x: 176, y: 36 },
  { id: 'n-booked',   Icon: CalendarCheck, title: 'Update CRM',     subtitle: 'Action',            x: 346, y: 36 },
  { id: 'n-24hr',     Icon: Clock,         title: 'Wait',           subtitle: 'Delay step',        x: 516, y: 36 },
  { id: 'n-1hr',      Icon: BellRinging,   title: 'Reminder',       subtitle: 'Email & SMS',       x: 686, y: 36 },
  { id: 'n-call',     Icon: VideoCamera,   title: 'Decision',       subtitle: 'Condition gate',    x: 866, y: 36, variant: 'gate' },
  // outcomes (one tier, fanning out of the decision gate)
  { id: 'n-proposal', Icon: FileText,      title: 'Outcome A',      subtitle: 'Next action',       x: 56,  y: 268 },
  { id: 'n-won',      Icon: Trophy,        title: 'Won',            subtitle: 'Goal reached',      x: 240, y: 268, variant: 'win' },
  { id: 'n-maybe',    Icon: Hourglass,     title: 'Outcome B',      subtitle: 'Not ready yet',     x: 468, y: 268 },
  { id: 'n-nurture',  Icon: Heart,         title: 'AI Step',        subtitle: 'Follow-up drip',    x: 652, y: 268 },
  { id: 'n-lost',     Icon: XCircle,       title: 'Lost',           subtitle: 'Closed out',        x: 866, y: 268, variant: 'lost' },
]

type LinkKind = 'solid' | 'dash' | 'loop'
type Link = { from: string; to: string; kind?: LinkKind; label?: string }

const LINKS: Link[] = [
  // happy path (solid)
  { from: 'n-form',   to: 'n-email' },
  { from: 'n-email',  to: 'n-booked' },
  { from: 'n-booked', to: 'n-24hr' },
  { from: 'n-24hr',   to: 'n-1hr' },
  { from: 'n-1hr',    to: 'n-call' },
  // a loop back to an earlier step
  { from: 'n-1hr',    to: 'n-booked', kind: 'loop', label: 'Loop Back' },
  // decision outcomes (dashed dispatch)
  { from: 'n-call',   to: 'n-proposal', kind: 'dash' },
  { from: 'n-call',   to: 'n-maybe',    kind: 'dash' },
  { from: 'n-call',   to: 'n-lost',     kind: 'dash' },
  // outcome follow-ons (solid)
  { from: 'n-proposal', to: 'n-won' },
  { from: 'n-maybe',    to: 'n-nurture' },
]

export const TOOLS: { Icon: Icon; label: string }[] = [
  { Icon: Plug,           label: 'Your CRM' },
  { Icon: EnvelopeSimple, label: 'Email & SMS' },
  { Icon: Sparkle,        label: 'AI Assistant' },
]

const SVGNS = 'http://www.w3.org/2000/svg'
type Rect = { x: number; y: number; w: number; h: number }

// curved cable between two card rects (cubic bezier, control handles on the
// dominant axis). Ported from the workflow page's dStraight.
function dStraight(a: Rect, b: Rect) {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2
  const bx = b.x + b.w / 2, by = b.y + b.h / 2
  let p1, p2, c1, c2
  if (Math.abs(bx - ax) >= Math.abs(by - ay)) {
    const dir = bx > ax ? 1 : -1, off = Math.max(34, Math.abs(bx - ax) * 0.45)
    p1 = { x: a.x + (dir > 0 ? a.w : 0), y: ay }
    p2 = { x: b.x + (dir > 0 ? 0 : b.w), y: by }
    c1 = { x: p1.x + dir * off, y: p1.y }
    c2 = { x: p2.x - dir * off, y: p2.y }
  } else {
    const dir = by > ay ? 1 : -1, off = Math.max(40, Math.abs(by - ay) * 0.5)
    p1 = { x: ax, y: a.y + (dir > 0 ? a.h : 0) }
    p2 = { x: bx, y: b.y + (dir > 0 ? 0 : b.h) }
    c1 = { x: p1.x, y: p1.y + dir * off }
    c2 = { x: p2.x, y: p2.y - dir * off }
  }
  return { d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`, p1, p2 }
}

// dispatch cable that always exits the BOTTOM of the source and arrives at the
// top of the target, then fans toward it - so every branch leaves the gate the
// same way (down), regardless of how far left/right the target sits.
function dBranch(a: Rect, b: Rect) {
  const p1 = { x: a.x + a.w / 2, y: a.y + a.h }
  const p2 = { x: b.x + b.w / 2, y: b.y }
  const dy = Math.max(48, (p2.y - p1.y) * 0.55)
  const c1 = { x: p1.x, y: p1.y + dy }
  const c2 = { x: p2.x, y: p2.y - dy }
  return { d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`, p1, p2 }
}

// loop-back cable that dips just under both nodes. A tight, shallow arc that
// hugs right beneath the chain captions so it stays clear of - and never runs
// parallel to - the decision gate's dispatch fan below it.
function dLoop(a: Rect, b: Rect) {
  const p1 = { x: a.x + a.w / 2, y: a.y + a.h }
  const p2 = { x: b.x + b.w / 2, y: b.y + b.h }
  const dip = Math.max(p1.y, p2.y) + 10
  return { d: `M${p1.x},${p1.y} C${p1.x},${dip} ${p2.x},${dip} ${p2.x},${p2.y}`, p1, p2 }
}

function Node({ node }: { node: FlowNode }) {
  const NodeIcon = node.Icon
  const v = node.variant ? ` autopilot__node--${node.variant}` : ''
  return (
    <div id={node.id} className={`autopilot__node${v}`} style={{ left: node.x, top: node.y }}>
      <span className="autopilot__node-card">
        <NodeIcon size={24} weight="regular" />
      </span>
      <span className="autopilot__node-cap">
        <strong>{node.title}</strong>
        <span>{node.subtitle}</span>
      </span>
    </div>
  )
}

type AutopilotProps = {
  /**
   * Home renders this inside a fixed viewport panel, so there is no room for
   * the section header and no scrollbar to push the canvas into. Compact drops
   * the header and scales the fixed design canvas down to whatever box it is
   * given instead of letting it scroll horizontally.
   */
  compact?: boolean
  /** Compact only: how far past the 1000x388 design size the canvas may grow. */
  maxScale?: number
}

export default function Autopilot({ compact = false, maxScale = 1 }: AutopilotProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const cablesRef = useRef<SVGSVGElement>(null)
  const signalsRef = useRef<SVGSVGElement>(null)
  const tweensRef = useRef<gsap.core.Tween[]>([])

  useEffect(() => {
    const flow = flowRef.current
    const cablesSvg = cablesRef.current
    const sigSvg = signalsRef.current
    if (!flow || !cablesSvg || !sigSvg) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let lastKey = ''

    // `whole` measures the entire node box (card + caption) instead of just the
    // card - used for the loop so it attaches BELOW the text and never crosses it.
    // getBoundingClientRect reports SCREEN pixels, so in compact mode - where
    // the whole canvas is transform-scaled to fit - every measurement comes
    // back multiplied. The SVG viewBox is in design units, so divide the scale
    // back out or the cables detach from the nodes.
    const rectOf = (id: string, flowRect: DOMRect, scale: number, whole = false): Rect | null => {
      const el = flow.querySelector<HTMLElement>(
        whole ? `#${CSS.escape(id)}` : `#${CSS.escape(id)} .autopilot__node-card`,
      )
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: (r.left - flowRect.left) / scale,
        y: (r.top - flowRect.top) / scale,
        w: r.width / scale,
        h: r.height / scale,
      }
    }

    const build = () => {
      const w = flow.scrollWidth
      const h = flow.scrollHeight
      const key = `${w}x${h}`
      if (key === lastKey) return
      lastKey = key

      tweensRef.current.forEach((t) => t.kill())
      tweensRef.current = []
      cablesSvg.replaceChildren()
      sigSvg.replaceChildren()
      for (const svg of [cablesSvg, sigSvg]) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
        svg.style.width = `${w}px`
        svg.style.height = `${h}px`
      }

      const flowRect = flow.getBoundingClientRect()
      const scale = flow.offsetWidth ? flowRect.width / flow.offsetWidth : 1

      LINKS.forEach((link, i) => {
        const kind = link.kind ?? 'solid'
        // loop attaches under the full node (below caption); others at the card.
        const a = rectOf(link.from, flowRect, scale, kind === 'loop')
        const b = rectOf(link.to, flowRect, scale, kind === 'loop')
        if (!a || !b) return
        const geo =
          kind === 'loop' ? dLoop(a, b) : kind === 'dash' ? dBranch(a, b) : dStraight(a, b)
        const dashed = kind !== 'solid'

        const path = document.createElementNS(SVGNS, 'path')
        path.setAttribute('d', geo.d)
        path.setAttribute('fill', 'none')
        path.style.stroke = kind === 'loop' ? 'var(--ap-loop)' : dashed ? 'var(--ap-cable-dash)' : 'var(--ap-cable)'
        path.setAttribute('stroke-width', kind === 'loop' ? '2' : '2.3')
        path.setAttribute('stroke-linecap', 'round')
        if (dashed) path.setAttribute('stroke-dasharray', kind === 'loop' ? '7 8' : '1 7')
        cablesSvg.appendChild(path)

        for (const p of [geo.p1, geo.p2]) {
          const dot = document.createElementNS(SVGNS, 'circle')
          dot.setAttribute('cx', String(p.x))
          dot.setAttribute('cy', String(p.y))
          dot.setAttribute('r', '3.2')
          dot.style.fill = kind === 'loop' ? 'var(--ap-loop)' : 'var(--ap-port)'
          cablesSvg.appendChild(dot)
        }

        if (link.label) {
          const t = document.createElementNS(SVGNS, 'text')
          const lx = (geo.p1.x + geo.p2.x) / 2
          const ly = kind === 'loop' ? Math.max(geo.p1.y, geo.p2.y) + 25 : (geo.p1.y + geo.p2.y) / 2 - 10
          t.setAttribute('x', String(lx))
          t.setAttribute('y', String(ly))
          t.setAttribute('text-anchor', 'middle')
          t.style.fill = 'var(--ap-loop)'
          t.setAttribute('font-size', '10.5')
          t.setAttribute('font-weight', '600')
          t.setAttribute('font-family', 'Poppins, sans-serif')
          t.textContent = link.label
          cablesSvg.appendChild(t)
        }

        if (reduce) return
        const sig = document.createElementNS(SVGNS, 'circle')
        sig.setAttribute('r', dashed ? '3.2' : '4.4')
        sig.style.fill = 'var(--ap-loop)'
        sig.setAttribute('filter', 'drop-shadow(0 0 5px rgba(255,122,26,.9))')
        sigSvg.appendChild(sig)
        const len = path.getTotalLength ? path.getTotalLength() : 360
        const dur = Math.min(7, Math.max(2.4, len / 95))
        tweensRef.current.push(
          gsap.to(sig, {
            duration: dur,
            repeat: -1,
            ease: 'none',
            delay: -(i % 6) * 0.42,
            motionPath: { path: geo.d, autoRotate: false, alignOrigin: [0.5, 0.5] },
          }),
        )
      })
    }

    let raf = requestAnimationFrame(build)
    if (document.fonts?.ready) document.fonts.ready.then(() => window.setTimeout(build, 60))
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(build)
    })
    ro.observe(flow)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      tweensRef.current.forEach((t) => t.kill())
      tweensRef.current = []
    }
  }, [])

  // Compact only: fit the 1000x388 design canvas into the box Home gives it.
  // The scale is written as a custom property so the transform stays in CSS.
  useEffect(() => {
    if (!compact) return
    const box = fitRef.current
    if (!box) return
    const apply = () => {
      const w = box.clientWidth
      const h = box.clientHeight
      if (!w || !h) return
      const s = Math.min(w / DESIGN_W, h / DESIGN_H, maxScale)
      box.style.setProperty('--flow-scale', String(s > 0 ? s : 1))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(box)
    return () => ro.disconnect()
  }, [compact, maxScale])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        for (const t of tweensRef.current) entry.isIntersecting ? t.play() : t.pause()
      },
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={compact ? 'autopilot autopilot--compact' : 'autopilot'}
      id="autopilot"
      aria-label={compact ? 'Example automation flow, end to end' : undefined}
      aria-labelledby={compact ? undefined : 'autopilot-heading'}
      data-reveal
    >
      {!compact && (
      <header className="autopilot__head">
        <span className="autopilot__eyebrow">Live automation</span>
        <h2 id="autopilot-heading" className="autopilot__headline">
          Your workflow, end to end.
        </h2>
        <p className="autopilot__intro">
          PLACEHOLDER - tell me what to put here: two or three sentences walking
          through this example automation, from the trigger to each outcome.
        </p>
      </header>
      )}

      <div className="autopilot__window">
        <div className="autopilot__titlebar" aria-hidden="true">
          <span className="autopilot__dots">
            <span className="autopilot__dot autopilot__dot--r" />
            <span className="autopilot__dot autopilot__dot--y" />
            <span className="autopilot__dot autopilot__dot--g" />
          </span>
          <span className="autopilot__titlebar-label">Automation Workflow</span>
        </div>

        <div className="autopilot__canvas">
          <p className="autopilot__caption">
            Your flow caption, in one short line.
          </p>

          <div className="autopilot__board" aria-hidden="true">
            <div className="autopilot__fit" ref={fitRef}>
            <div
              className="autopilot__flow"
              ref={flowRef}
              style={{ width: DESIGN_W, height: DESIGN_H }}
            >
              <svg className="autopilot__cables" ref={cablesRef} aria-hidden="true" />
              <svg className="autopilot__signals" ref={signalsRef} aria-hidden="true" />
              {NODES.map((node) => (
                <Node key={node.id} node={node} />
              ))}
            </div>
            </div>
          </div>

          <ul className="autopilot__tools" role="list" aria-label="Tools that power this flow">
            {TOOLS.map(({ Icon: ToolIcon, label }) => (
              <li key={label} className="autopilot__tool">
                <ToolIcon size={14} weight="duotone" aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
