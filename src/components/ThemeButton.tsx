import { useEffect, useState } from 'react'
import ThemeGlyph from './ThemeGlyph'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'

/**
 * The theme switch for phones. The rail carries it from 1100px; below that
 * it sits in Home's profile header and floats top-right on every other page.
 */
export default function ThemeButton({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => setTheme(getTheme()), [])
  return (
    <button
      type="button"
      className={`theme-btn ${className}`.trim()}
      onClick={(e) => setTheme(toggleTheme(e.currentTarget))}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <ThemeGlyph theme={theme} size={20} />
    </button>
  )
}
