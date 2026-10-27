import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react'
import { CaretDown, Circle } from '@/components/slab'
import { aiStack, type StackNode } from '@/data/ai-stack'

/**
 * AIStack - the top-down tree of systems.
 *
 * Every string on screen comes from src/data/ai-stack.ts. Nothing about the
 * content is encoded here, including how many branches there are or whether
 * a branch has leaves, so the data file can be replaced wholesale.
 *
 * Three things are worth knowing before editing:
 *
 * 1. The DOM is a real nested <ul>/<li>. A screen reader gets an ordinary
 *    nested list; CSS is what turns it into a chart. The connectors are a
 *    separate aria-hidden <svg> layered behind it, so nothing structural
 *    depends on the drawing.
 *
 * 2. The connector paths are MEASURED, never authored. Fixed coordinates
 *    survive exactly one viewport width - the moment a name wraps to two
 *    lines the elbows detach from the boxes. Instead every card registers
 *    its element, and a layout effect reads getBoundingClientRect relative
 *    to the host and rebuilds every path `d` from those numbers. A
 *    ResizeObserver on the host re-runs it on any reflow.
 *
 * 3. Layout mode is a real branch, not a scaled-down copy. Above the
 *    breakpoint the root drops into a horizontal row of branches; below it,
 *    branches stack and hang off an indented rail. Leaves always use the
 *    rail, at both sizes - a horizontal fan of 25 leaf boxes never fits.
 *
 * 4. Compact turns every branch into a disclosure, closed by default. Fully
 *    expanded the outline runs past 2000px on a phone, which reads as a list
 *    to scroll past rather than a diagram to take in; closed, the five
 *    branches fit a screen and the visitor opens only what they came for.
 *    A closed branch keeps its leaf <ul> in the DOM under `hidden` so
 *    aria-controls always resolves to a real element - which is exactly why
 *    boxOf below has to reject a 0x0 rect, or a closed branch would still be
 *    wired to leaves stacked invisibly at the origin.
 */

/* Kept in sync by hand with the @media rule in ai-stack.css. Both need the
   same number or the wires would be drawn for the layout that is not on
   screen. */
const COMPACT_QUERY = '(max-width: 900px)'

/** Elbow corner radius, in px. Clamped per path so short runs stay clean. */
const CORNER = 12
/** Where the vertical rail sits inside the parent card, in px from its left
    edge. Pairs with the leaf indent in CSS - see --ai-stack-indent. */
const RAIL_INSET = 15

type Box = { x: number; y: number; w: number; h: number }
type Wire = { id: string; branchId: string; d: string; delay: number }

type Flat = {
  node: StackNode
  depth: number
  parentId: string | null
  /** The depth-1 ancestor. Highlighting is grouped by this. */
  branchId: string
  /** Index among its siblings, used to stagger the entrance. */
  index: number
}

const LEVEL = ['root', 'branch', 'leaf'] as const

/** Depth-first walk. Everything downstream reads this instead of recursing. */
function flatten(root: StackNode): Flat[] {
  const out: Flat[] = []
  const walk = (
    node: StackNode,
    depth: number,
    parentId: string | null,
    branchId: string,
    index: number,
  ) => {
    out.push({ node, depth, parentId, branchId, index })
    const kids = node.children ?? []
    kids.forEach((kid, i) => {
      // A depth-1 node is its own branch; deeper nodes inherit it.
      walk(kid, depth + 1, node.id, depth === 0 ? kid.id : branchId, i)
    })
  }
  walk(root, 0, null, root.id, 0)
  return out
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Parent bottom-centre down to child top-centre, via a mid-height rail. */
function dropPath(p: Box, c: Box): string {
  const sx = p.x + p.w / 2
  const sy = p.y + p.h
  const ex = c.x + c.w / 2
  const ey = c.y
  const dy = ey - sy
  const dx = ex - sx
  if (dy <= 1 || Math.abs(dx) < 1) {
    return `M ${r2(sx)} ${r2(sy)} L ${r2(ex)} ${r2(ey)}`
  }
  const my = sy + dy / 2
  const r = Math.min(CORNER, Math.abs(dx) / 2, dy / 2)
  const s = dx > 0 ? 1 : -1
  return [
    `M ${r2(sx)} ${r2(sy)}`,
    `L ${r2(sx)} ${r2(my - r)}`,
    `Q ${r2(sx)} ${r2(my)} ${r2(sx + s * r)} ${r2(my)}`,
    `L ${r2(ex - s * r)} ${r2(my)}`,
    `Q ${r2(ex)} ${r2(my)} ${r2(ex)} ${r2(my + r)}`,
    `L ${r2(ex)} ${r2(ey)}`,
  ].join(' ')
}

/** L-shaped rail: down the parent's left gutter, then right into the child. */
function railPath(p: Box, c: Box): string {
  const sx = p.x + RAIL_INSET
  const sy = p.y + p.h
  const ex = c.x
  const ey = c.y + c.h / 2
  const dy = ey - sy
  const dx = ex - sx
  if (dy <= 1 || dx <= 1) {
    return `M ${r2(sx)} ${r2(sy)} L ${r2(ex)} ${r2(ey)}`
  }
  const r = Math.min(CORNER, dx, dy)
  return [
    `M ${r2(sx)} ${r2(sy)}`,
    `L ${r2(sx)} ${r2(ey - r)}`,
    `Q ${r2(sx)} ${r2(ey)} ${r2(sx + r)} ${r2(ey)}`,
    `L ${r2(ex)} ${r2(ey)}`,
  ].join(' ')
}

export default function AIStack({ root = aiStack }: { root?: StackNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef(new Map<string, HTMLElement>())
  const frame = useRef(0)
  /** Serialised last render of the wire layer, so re-measuring a tree that
      has not moved does not spin the render loop through ResizeObserver. */
  const signature = useRef('')

  const [geom, setGeom] = useState<{ w: number; h: number; wires: Wire[] }>({
    w: 0,
    h: 0,
    wires: [],
  })
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches,
  )
  const [drawn, setDrawn] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  /** Ids of the branches opened in compact. A set, not a single id, because
      closing the branch you already read to open the next one is busywork -
      the visitor is comparing them. */
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const flat = useMemo(() => flatten(root), [root])

  const toggleBranch = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const registerNode = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) nodeRefs.current.set(id, el)
      else nodeRefs.current.delete(id)
    }
  }, [])

  const measure = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    const hb = host.getBoundingClientRect()
    if (hb.width === 0) return

    const boxOf = (id: string): Box | null => {
      const el = nodeRefs.current.get(id)
      if (!el) return null
      const r = el.getBoundingClientRect()
      // A closed disclosure keeps its cards mounted, so they are still
      // registered here and still hand back a rect - a 0x0 one at the top of
      // the host. Treating that as "no box" is what drops their wires instead
      // of drawing every closed branch's leaves into the same dead corner.
      if (r.width === 0 && r.height === 0) return null
      return { x: r.left - hb.left, y: r.top - hb.top, w: r.width, h: r.height }
    }

    const wires: Wire[] = []
    for (const f of flat) {
      if (!f.parentId) continue
      const p = boxOf(f.parentId)
      const c = boxOf(f.node.id)
      if (!p || !c) continue
      // Only the root's own children fan out horizontally, and only on the
      // wide layout. Everything else hangs off a rail.
      const wide = f.depth === 1 && !compact
      wires.push({
        id: f.node.id,
        branchId: f.branchId,
        d: wide ? dropPath(p, c) : railPath(p, c),
        delay: f.depth === 1 ? 90 : 400 + f.index * 70,
      })
    }

    const next = { w: hb.width, h: hb.height, wires }
    const sig = JSON.stringify(next)
    if (sig === signature.current) return
    signature.current = sig
    setGeom(next)
  }, [flat, compact])

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(measure)
  }, [measure])

  // The ResizeObserver cannot be trusted to cover a toggle. It fires on the
  // host's own box, and a branch can open into space the section already had
  // (or the observer can coalesce the change into a frame that was measured
  // before the list unhid), which would leave the wires drawn for the shape
  // that was on screen a moment ago. Re-measuring off the open set is cheap:
  // the signature guard drops it when nothing actually moved.
  useLayoutEffect(() => {
    schedule()
  }, [open, schedule])

  useLayoutEffect(() => {
    measure()
    const host = hostRef.current
    if (!host) return
    const ro = new ResizeObserver(schedule)
    ro.observe(host)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [measure, schedule])

  // Poppins swapping in reflows every card, and the swap lands after the
  // first paint. Without this the wires point at the fallback-font layout.
  useEffect(() => {
    if (!document.fonts) return
    let alive = true
    document.fonts.ready.then(() => {
      if (alive) schedule()
    })
    return () => {
      alive = false
    }
  }, [schedule])

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY)
    // Compact drops the hover handlers, so a card lit at 950px would never get
    // its mouseleave once the window crosses into the outline and would strand
    // the other four branches dimmed with no way to clear them.
    const onChange = () => {
      setCompact(mq.matches)
      setActive(null)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Draw once, on first entry. Re-drawing on every scroll pass would make
  // the section feel like it is loading rather than finished.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setDrawn(true)
        io.disconnect()
      },
      { threshold: 0.15 },
    )
    io.observe(host)
    return () => io.disconnect()
  }, [])

  const renderNode = (node: StackNode, depth: number, branchId: string, index: number) => {
    const level = LEVEL[Math.min(depth, 2)]
    const kids = node.children ?? []
    // The root is the trunk of every subtree, so it never dims.
    const state = active === null || depth === 0 ? '' : branchId === active ? ' is-lit' : ' is-dim'
    // Pointing at a leaf lights the whole branch it belongs to, not just itself.
    const target = depth === 0 ? null : branchId
    const NodeIcon = node.Icon

    const listId = `ai-stack-${node.id}-children`
    // Collapsing the root would hide the tree, and a node with no children has
    // nothing to disclose - it stays a plain card with no control and no
    // pointer, which is the only honest way to say "this one does not open".
    const collapsible = compact && depth > 0 && kids.length > 0
    const isOpen = !collapsible || open.has(node.id)

    // Below the breakpoint there is no hover to light a subtree with, so a
    // focusable card would only be a tab stop that does nothing. Compact puts
    // every keyboard affordance on the disclosure instead.
    const interaction: HTMLAttributes<HTMLDivElement> = compact
      ? {}
      : {
          tabIndex: 0,
          onMouseEnter: () => setActive(target),
          onMouseLeave: () => setActive(null),
          onFocus: () => setActive(target),
          onBlur: () => setActive(null),
        }

    // A leaf list revealed by a tap is a reveal the visitor asked for, not part
    // of the section's entrance, so it must not sit behind the trunk-first
    // delay that staggers the first paint.
    const enter = compact && depth > 1 ? index * 45 : depth * 150 + index * 60

    return (
      <li
        key={node.id}
        className={`ai-stack__item ai-stack__item--${level}`}
        style={{ ['--enter' as string]: `${enter}ms` }}
      >
        <div
          ref={registerNode(node.id)}
          className={`ai-stack__node ai-stack__node--${level}${state}${
            collapsible ? ' is-collapsible' : ''
          }`}
          {...interaction}
        >
          <span className="ai-stack__head">
            {/* Every node carries its own glyph, so a client scanning the tree
                gets a shape to anchor on before reading a word. Decorative:
                the name right beside it already says what this is. */}
            <span className="ai-stack__mark" aria-hidden="true">
              <NodeIcon weight={depth === 0 ? 'fill' : 'bold'} size={depth === 0 ? 15 : 13} />
            </span>
            <span className="ai-stack__name">{node.name}</span>
            {node.status && (
              <span
                className={`ai-stack__status ai-stack__status--${node.status.toLowerCase()}`}
              >
                <Circle weight="fill" size={6} aria-hidden="true" />
                {node.status}
              </span>
            )}
          </span>
          <p className="ai-stack__what">{node.what}</p>
          {(node.stack || node.logos) && (
            <span className="ai-stack__meta">
              {node.logos?.map((logo) => (
                /* Masked, not an <img>, so every vendor mark takes the same
                   ink instead of dragging its own brand palette into a
                   one-accent page. The name rides along as the a11y label. */
                <span
                  key={logo.src}
                  className="ai-stack__logo"
                  style={{ ['--logo-mask' as string]: `url('${logo.src}')` }}
                  role="img"
                  aria-label={logo.name}
                />
              ))}
              {node.stack}
            </span>
          )}

          {/* Stretched over the whole card rather than wrapped around it: a
              <button> may only hold phrasing content and the card carries a
              <p>, and at thumb size the tile itself has to be the target.
              The caret is the only visible part. */}
          {collapsible && (
            <button
              type="button"
              className="ai-stack__toggle"
              aria-expanded={isOpen}
              aria-controls={listId}
              aria-label={`${kids.length} sub-systems under ${node.name}`}
              onClick={() => toggleBranch(node.id)}
            >
              <span className="ai-stack__caret" aria-hidden="true">
                <CaretDown weight="bold" size={13} />
              </span>
            </button>
          )}
        </div>

        {kids.length > 0 && (
          <ul
            id={listId}
            hidden={!isOpen}
            className={`ai-stack__level ai-stack__level--${LEVEL[Math.min(depth + 1, 2)]}`}
            style={depth === 0 ? { ['--cols' as string]: kids.length } : undefined}
          >
            {kids.map((kid, i) =>
              renderNode(kid, depth + 1, depth === 0 ? kid.id : branchId, i),
            )}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div ref={hostRef} className={`ai-stack${drawn ? ' is-drawn' : ''}`}>
      {geom.w > 0 && (
        <svg
          className="ai-stack__wires"
          viewBox={`0 0 ${r2(geom.w)} ${r2(geom.h)}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {geom.wires.map((wire) => (
            <path
              key={wire.id}
              className={`ai-stack__wire${
                active === null ? '' : wire.branchId === active ? ' is-lit' : ' is-dim'
              }`}
              d={wire.d}
              pathLength={1}
              vectorEffect="non-scaling-stroke"
              style={{ ['--wire-delay' as string]: `${wire.delay}ms` }}
            />
          ))}
        </svg>
      )}

      <ul className="ai-stack__level ai-stack__level--trunk">
        {renderNode(root, 0, root.id, 0)}
      </ul>
    </div>
  )
}
