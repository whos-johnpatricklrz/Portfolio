/**
 * Runtime performance gate.
 *
 * The shell pairs a full-screen WebGL contour shader with a `.home__glass`
 * plate that carries `backdrop-filter: blur(18px)`. On a strong GPU that is
 * free. On a weak one it is not: the plate is bigger than the viewport on
 * some routes, and the shader repainting behind it forces Chrome to re-blur
 * that whole rect 30 times a second. Measured on a software-GL profile the
 * pair drops the page from 60fps to 17-25fps - the "it's lagging" report.
 *
 * Rather than guess at the visitor's hardware from a user-agent string, this
 * measures the page as it actually runs and steps the design down until it
 * holds frame:
 *
 *   high  everything on - the design as drawn
 *   mid   backdrop-filter off, the plates go opaque (see styles/perf.css)
 *   low   the shader unmounts too; the page keeps the flat cream/ink ground
 *
 * The verdict lands on `<html data-perf>` and is remembered for the tab in
 * sessionStorage, so a route change never re-measures and a new tab on a
 * different machine is never stuck with an old verdict.
 */

export type PerfTier = 'high' | 'mid' | 'low'

const KEY = 'perf-tier'
export const PERF_TIER_EVENT = 'perftierchange'

/** Sustained frame time above this means the device cannot hold ~45fps. */
const BAD_FRAME_MS = 22
/** How long each measurement window runs. */
const SAMPLE_MS = 1500
/** Frames slower than this are a tab switch or a route change, not jank. */
const OUTLIER_MS = 100
/** Below this many usable samples the window is inconclusive - do not judge. */
const MIN_SAMPLES = 20
/** A janky device produces few frames per second, so the window has to be
    allowed to run long enough to collect MIN_SAMPLES of them. Without this the
    exact case the gate exists to catch - ~18fps, ~27 frames in 1.5s - fell
    under the sample floor and was dismissed as inconclusive. */
const MAX_SAMPLE_MS = 5000
/** How many windows to watch before leaving the page alone. */
const MAX_CHECKS = 6

function read(): PerfTier | null {
  try {
    const v = sessionStorage.getItem(KEY)
    return v === 'mid' || v === 'low' ? v : null
  } catch {
    return null
  }
}

export function getPerfTier(): PerfTier {
  const v = document.documentElement.dataset.perf
  return v === 'mid' || v === 'low' ? v : 'high'
}

function setPerfTier(tier: PerfTier) {
  if (tier === getPerfTier()) return
  document.documentElement.dataset.perf = tier
  try {
    sessionStorage.setItem(KEY, tier)
  } catch {
    /* private mode - the tier still applies for this page */
  }
  window.dispatchEvent(new CustomEvent<PerfTier>(PERF_TIER_EVENT, { detail: tier }))
}

/**
 * Re-apply the tab's verdict before React renders, so a downgraded visitor
 * never sees the expensive version flash back on a route change or reload.
 */
export function restorePerfTier() {
  const saved = read()
  if (saved) document.documentElement.dataset.perf = saved
}

/** Median frame time over one window, or null if the window was inconclusive. */
function measure(): Promise<number | null> {
  return new Promise((resolve) => {
    const deltas: number[] = []
    let last = performance.now()
    const end = last + SAMPLE_MS
    const hardEnd = last + MAX_SAMPLE_MS

    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (document.visibilityState === 'hidden') return resolve(null)
      if (dt < OUTLIER_MS) deltas.push(dt)
      const enough = now >= end && deltas.length >= MIN_SAMPLES
      if (!enough && now < hardEnd) return void requestAnimationFrame(tick)
      if (deltas.length < MIN_SAMPLES) return resolve(null)
      deltas.sort((a, b) => a - b)
      resolve(deltas[deltas.length >> 1])
    }
    requestAnimationFrame(tick)
  })
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Resolve once the page is actually running the expensive version of itself:
 * the intro overlay has released, and the shader canvas has mounted.
 *
 * The canvas wait is not optional. Three.js is a lazy 125KB chunk, so on a
 * real connection the shader starts painting SECONDS after first render - a
 * gate that measured before then saw a quiet page, called it healthy and left
 * a 20fps visitor on the full design. Locally the chunk was instant and the
 * bug was invisible.
 */
function settled(): Promise<void> {
  return new Promise((resolve) => {
    const ready = () =>
      !document.documentElement.classList.contains('is-intro') &&
      (!!document.querySelector('.hero-canvas canvas') || getPerfTier() === 'low')

    const done = () => {
      window.clearInterval(id)
      window.clearTimeout(bail)
      setTimeout(resolve, 800)
    }
    const id = window.setInterval(() => {
      if (ready()) done()
    }, 200)
    // A page with no shader at all (reduced motion, touch, a failed chunk)
    // still deserves to be measured - just later.
    const bail = window.setTimeout(done, 10000)
    if (ready()) done()
  })
}

/**
 * Watch the page for a while and step the tier down whenever a window comes
 * back janky. It keeps looking rather than judging once, because the costly
 * layers arrive at different times - the shader chunk lands late, a heavy
 * route mounts later still - and one early verdict misses them.
 *
 * A median over a full window (with tab-switch outliers dropped) is what gets
 * judged, so a single hitch cannot downgrade anyone.
 */
export async function watchFrameHealth() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (read() === 'low') return

  await settled()

  for (let check = 0; check < MAX_CHECKS; check++) {
    if (getPerfTier() === 'low') return
    const median = await measure()
    if (median === null) {
      await wait(1200)
      continue
    }
    if (median <= BAD_FRAME_MS) {
      await wait(2500)
      continue
    }
    setPerfTier(getPerfTier() === 'high' ? 'mid' : 'low')
    // Let the compositor drop the old layers before judging the new state.
    await wait(600)
  }
}
