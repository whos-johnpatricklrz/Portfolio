import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Funnel } from '@/data/funnels'

/**
 * FunnelBarrel - the "dialect barrel gallery" technique.
 *
 * A WebGL drum of page-thumbnail cards (a spiral-template
 * port). A wide/fat/short cylinder (COLS 16, RAD 11, camera z31)
 * inside a two-group tilt stack: the inner group spins, the outer tilt frames
 * the drum. A contained fade band crops it to ~2-3 rows so it never eats the
 * page, and a cone taper widens the top ring (the tornado/funnel look).
 *
 * Adapted for the portfolio: contained in a section (not fullscreen), idle
 * auto-spin + slow vertical drift + pointer parallax + drag to explore, and
 * clicking a card opens the funnel in the existing modal via onOpen. A
 * visually-hidden button list keeps every page keyboard/SR accessible.
 */

type Props = {
  funnels: Funnel[]
  onOpen: (funnel: Funnel, trigger?: HTMLElement | null) => void
}

function thumbSrc(f: Funnel) {
  const dir = f.dir ?? 'funnels'
  return `/${dir}/thumbs/${f.file.replace('.html', '.jpeg')}`
}

export default function FunnelBarrel({ funnels, onOpen }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  // Keep the latest onOpen without re-running the heavy effect on every render.
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current || !labelRef.current) return
    if (funnels.length === 0) return
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const labelEl = labelRef.current

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    } catch {
      wrap.dataset.failed = 'true'
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 4.2, 31) // back + above: wide drum sits low-centre, rim reads as an ellipse
    camera.lookAt(0, 0.5, 0)

    // ---- barrel geometry: wide, fat, short drum ----
    const COLS = 16
    const ROWS = Math.max(6, Math.ceil(funnels.length / COLS))
    const RAD = 11
    const anglePer = (Math.PI * 2) / COLS
    const thetaLen = anglePer * 0.9
    const arcW = thetaLen * RAD
    const cardH = arcW * (4 / 3) // 3:4 portrait
    const rowGap = cardH * 1.04
    const TOWER_H = ROWS * rowGap

    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    const maxAniso = renderer.capabilities.getMaxAnisotropy()
    const texCache = new Map<string, THREE.Texture>()
    const mats: THREE.MeshBasicMaterial[] = []
    function loadTex(url: string, matIndex: number) {
      const cached = texCache.get(url)
      if (cached) return cached
      const t = loader.load(url, undefined, undefined, () => {
        // On failure, drop to a dark flat panel instead of a broken texture.
        const m = mats[matIndex]
        if (m) {
          if (m.map) {
            m.map.dispose()
            m.map = null
          }
          m.userData.base = 0.22
          m.needsUpdate = true
        }
      })
      t.colorSpace = THREE.SRGBColorSpace
      t.minFilter = THREE.LinearFilter // NPOT thumbnails -> no mipmaps
      t.anisotropy = maxAniso
      texCache.set(url, t)
      return t
    }

    // Rounded-corner alpha mask so each card reads as a floating tile, not a
    // hard rectangle (premium polish). MeshBasicMaterial reads alpha from the
    // green channel; white rounded-rect on black -> rounded card.
    function makeRoundedAlpha() {
      const w = 300
      const h = 400
      const r = 30
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.arcTo(w, 0, w, h, r)
      ctx.arcTo(w, h, 0, h, r)
      ctx.arcTo(0, h, 0, 0, r)
      ctx.arcTo(0, 0, w, 0, r)
      ctx.closePath()
      ctx.fill()
      const t = new THREE.CanvasTexture(c)
      t.minFilter = THREE.LinearFilter
      return t
    }
    const roundTex = makeRoundedAlpha()

    // one shared geometry centered on +X; each card just gets a rotation.y
    const sharedGeo = new THREE.CylinderGeometry(
      RAD,
      RAD,
      cardH,
      24,
      1,
      true,
      -thetaLen / 2,
      thetaLen,
    )
    // STACK: inner `group` spins on its own Y axis; outer `tilt` frames the drum.
    const group = new THREE.Group()
    const tilt = new THREE.Group()
    tilt.add(group)
    tilt.rotation.z = -0.04 // barely-there lean
    tilt.rotation.x = 0.16 // tip down so we see the top-rim ellipse
    tilt.position.set(0, -1, 0)
    scene.add(tilt)

    type CardData = {
      funnel: Funnel
      baseY: number
      baseAngle: number
      cur: number
      dim: number
    }
    const cards: THREE.Mesh[] = []
    const SLOTS = ROWS * COLS
    const N = funnels.length
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
    let stride = Math.max(1, Math.round(N / 3))
    while (N > 1 && gcd(stride, N) !== 1) stride++
    const order: number[] = []
    for (let k = 0; k < SLOTS; k++) order.push(k < N ? k : (k * stride) % N)

    let counter = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const funnel = funnels[order[counter]]
        const material = new THREE.MeshBasicMaterial({
          side: THREE.FrontSide,
          transparent: true,
          alphaMap: roundTex,
        })
        material.userData.base = 1
        mats[counter] = material
        material.map = loadTex(thumbSrc(funnel), counter)
        const mesh = new THREE.Mesh(sharedGeo, material)
        const baseAngle = c * anglePer + (r % 2 ? anglePer * 0.5 : 0) // brick offset
        mesh.rotation.y = baseAngle
        mesh.position.y = r * rowGap - TOWER_H / 2 + rowGap / 2
        mesh.userData = {
          funnel,
          baseY: mesh.position.y,
          baseAngle,
          cur: 0,
          dim: 1,
        } satisfies CardData
        group.add(mesh)
        cards.push(mesh)
        counter++
      }
    }

    // ---- interaction ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2(-2, -2)
    let hovered: THREE.Mesh | null = null
    let scrollTarget = 0
    let scrollCurrent = 0
    let spinTarget = 0
    let spinAngle = 0
    let dragSpin = 0
    let pointerInside = false

    const labCat = labelEl.querySelector('.funnels__barrel-label-cat') as HTMLElement
    const labTitle = labelEl.querySelector('.funnels__barrel-label-title') as HTMLElement

    function setPointerFromEvent(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      labelEl.style.left = e.clientX - rect.left + 'px'
      labelEl.style.top = e.clientY - rect.top + 'px'
    }

    // drag-to-explore
    let dragging = false
    let downX = 0
    let downY = 0
    let lastX = 0
    let lastY = 0
    let moved = 0

    const onPointerMove = (e: PointerEvent) => {
      setPointerFromEvent(e)
      spinTarget = pointer.x * 0.22
      if (dragging) {
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        dragSpin += dx * 0.006
        scrollTarget += dy * 0.01
        moved += Math.abs(dx) + Math.abs(dy)
        lastX = e.clientX
        lastY = e.clientY
      }
    }
    const onPointerEnter = () => {
      pointerInside = true
    }
    const onPointerLeave = () => {
      pointerInside = false
      pointer.set(-2, -2)
      hovered = null
      labelEl.classList.remove('is-on')
    }
    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      downX = lastX = e.clientX
      downY = lastY = e.clientY
      moved = 0
      setPointerFromEvent(e)
      canvas.setPointerCapture?.(e.pointerId)
    }
    const onPointerUp = (e: PointerEvent) => {
      const wasTap = moved < 6 && Math.abs(e.clientX - downX) < 6 && Math.abs(e.clientY - downY) < 6
      dragging = false
      canvas.releasePointerCapture?.(e.pointerId)
      if (wasTap) {
        setPointerFromEvent(e)
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(cards, false).find((h) => {
          const mat = (h.object as THREE.Mesh).material as THREE.MeshBasicMaterial
          return mat.opacity > 0.08
        })
        const data = hit?.object.userData as CardData | undefined
        if (data?.funnel) onOpenRef.current(data.funnel, canvas)
      }
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerenter', onPointerEnter)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)

    function resize() {
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    // pause when the section is offscreen or the tab is hidden - the loop
    // fully stops (stops scheduling) and is re-kicked when it returns.
    let onScreen = true
    let running = false
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true
        if (onScreen) kick()
      },
      { threshold: 0.01 },
    )
    io.observe(wrap)
    const onVis = () => {
      if (!document.hidden && onScreen) kick()
    }
    document.addEventListener('visibilitychange', onVis)

    const clock = new THREE.Clock()
    let raf = 0
    function kick() {
      if (running) return
      running = true
      raf = requestAnimationFrame(animate)
    }
    function animate() {
      if (document.hidden || !onScreen) {
        running = false // sleep: stop scheduling until kicked
        return
      }
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)

      // horizontal: idle spin (slows while the pointer is inside) + parallax + drag
      const idleSpeed = reduce ? 0 : pointerInside ? 0.04 : 0.16
      spinAngle += idleSpeed * dt
      group.rotation.y = spinAngle + dragSpin + spinTarget * 0.4

      // vertical: slow auto-drift (paused while pointing) + drag scrub, infinite wrap
      if (!reduce && !pointerInside) scrollTarget += 0.35 * dt
      scrollCurrent += (scrollTarget - scrollCurrent) * Math.min(1, dt * 5)
      for (const m of cards) {
        let y = (m.userData as CardData).baseY + scrollCurrent
        y = (((y + TOWER_H / 2) % TOWER_H) + TOWER_H) % TOWER_H - TOWER_H / 2
        if (m === hovered && Math.abs(y - m.position.y) > rowGap * 1.5) {
          hovered = null
          labelEl.classList.remove('is-on')
        }
        m.position.y = y
      }

      // hover pick
      if (pointerInside && !dragging) {
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(cards, false).find((h) => {
          const mat = (h.object as THREE.Mesh).material as THREE.MeshBasicMaterial
          return mat.opacity > 0.08
        })
        const top = (hit?.object as THREE.Mesh) ?? null
        if (top !== hovered) {
          hovered = top
          if (hovered) {
            const data = hovered.userData as CardData
            labCat.textContent = data.funnel.tag
            labTitle.textContent = data.funnel.label
            labelEl.classList.add('is-on')
            canvas.style.cursor = 'pointer'
          } else {
            labelEl.classList.remove('is-on')
            canvas.style.cursor = 'grab'
          }
        }
      }

      const anyHover = !!hovered
      const VIS = rowGap * 0.7
      const FADE = rowGap * 0.85
      for (const m of cards) {
        const data = m.userData as CardData
        const isHot = m === hovered
        data.cur += ((isHot ? 1 : 0) - data.cur) * Math.min(1, dt * 10)
        const dimTarget = !anyHover || isHot ? 1 : 0.4
        data.dim += (dimTarget - data.dim) * Math.min(1, dt * 8)
        const pop = 1 + data.cur * 0.06
        const worldY = tilt.position.y + m.position.y
        // SPIRAL: twist each card's angle by its height so the drum reads as a
        // helix. Computed from worldY (not the row index) so it stays consistent
        // as cards scroll-wrap through the band.
        m.rotation.y = data.baseAngle + worldY * 0.05
        // cone taper: top ring widest, lower rows narrower
        const coneN = Math.min(1, Math.max(0, (worldY + VIS + FADE) / (2 * (VIS + FADE))))
        const funnel = 0.6 + 0.5 * coneN
        m.scale.set(funnel * pop, pop, funnel * pop)
        const op = Math.min(1, Math.max(0, (VIS + FADE - Math.abs(worldY)) / FADE))
        const mat = m.material as THREE.MeshBasicMaterial
        mat.opacity = op
        m.visible = op > 0.01
        mat.color.setScalar(mat.userData.base * data.dim)
      }

      renderer.render(scene, camera)
    }
    canvas.style.cursor = 'grab'
    kick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerenter', onPointerEnter)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      sharedGeo.dispose()
      roundTex.dispose()
      mats.forEach((m) => m.dispose())
      texCache.forEach((t) => t.dispose())
      renderer.dispose()
    }
  }, [funnels])

  return (
    <div className="funnels__barrel" ref={wrapRef}>
      <canvas className="funnels__barrel-gl" ref={canvasRef} aria-hidden="true" />
      <div className="funnels__barrel-label" ref={labelRef} aria-hidden="true">
        <span className="funnels__barrel-label-cat" />
        <span className="funnels__barrel-label-title" />
      </div>
      <span className="funnels__barrel-hint" aria-hidden="true">
        Drag to spin &middot; click a page to open
      </span>

      {/* Accessible fallback: every page reachable by keyboard / screen reader. */}
      <ul className="funnels__barrel-a11y sr-only">
        {funnels.map((f) => (
          <li key={f.file}>
            <button type="button" onClick={(e) => onOpen(f, e.currentTarget)}>
              Open {f.label} ({f.tag})
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
