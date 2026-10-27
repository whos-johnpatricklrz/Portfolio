import { useEffect, useState } from 'react'

/** Live boolean for a media query. SSR-safe: false until mounted. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Below the shell breakpoint: the rail is gone and the app chrome takes over. */
export const PHONE_QUERY = '(max-width: 1099px)'
export const useIsPhone = () => useMediaQuery(PHONE_QUERY)
