import { useEffect } from 'react'

/**
 * Observes all [data-reveal] elements. When an element enters the viewport
 * it gets the `is-revealed` class and is never hidden again.
 *
 * Settings:
 *   threshold: 0        → fire as soon as 1 pixel is visible
 *   rootMargin bottom   → -80px so elements trigger just as they enter,
 *                         not before they're actually visible to the user
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]'),
    )

    // Reduced-motion: reveal everything immediately, skip observer
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-revealed'))
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' },
    )

    els.forEach((el) => obs.observe(el))

    // Views mount their sections after this hook's effect in some paths (a
    // lazy child, an image-driven reflow that inserts a card). Anything that
    // appears later would never be observed, so it would stay at opacity 0
    // forever. Watch for new [data-reveal] nodes and pick them up.
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          const fresh = node.matches('[data-reveal]')
            ? [node]
            : Array.from(node.querySelectorAll<HTMLElement>('[data-reveal]'))
          fresh.forEach((el) => {
            if (!el.classList.contains('is-revealed')) obs.observe(el)
          })
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      obs.disconnect()
    }
  }, [])
}
