import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { SealCheck } from '@/components/slab'
import ThemeGlyph from './ThemeGlyph'
import {
  HomeIcon,
  FolderIcon,
  StackIcon,
  CupIcon,
  StarIcon,
  UserIcon,
  MessageIcon,
} from './RailIcons'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'
import { profile } from '@/data/profile'

/**
 * The profile rail: the fixed left column of the shell. It carries identity,
 * the theme switch and the section index, and it is the site's only navigation
 * surface from 1100px up - the floating NavBar pill hides there and takes over
 * again below it.
 *
 * The links are ROUTES, not anchors. Home is a fixed non-scrolling viewport, so
 * there is nothing for a scrollspy to spy on; the panel to the right swaps
 * instead. `NavLink` owns the active state, which is why there is no
 * IntersectionObserver here.
 */
export const RAIL_LINKS = [
  { label: 'Home', to: '/', Icon: HomeIcon },
  { label: 'Projects', to: '/projects', Icon: FolderIcon },
  { label: 'Services', to: '/services', Icon: StackIcon },
  { label: 'Showcase', to: '/showcase', Icon: CupIcon },
  { label: 'Testimonials', to: '/testimonials', Icon: StarIcon },
  { label: 'About', to: '/about', Icon: UserIcon },
  { label: 'FAQs / Contact', to: '/contact', Icon: MessageIcon },
] as const

export default function Rail() {
  const [theme, setThemeState] = useState<Theme>('light')

  // The pre-paint script owns the real value; read it once mounted so the
  // button shows the icon for the action, not for the current state.
  useEffect(() => setThemeState(getTheme()), [])

  return (
    <aside className="rail" aria-label="Profile and site navigation">
      <div className="rail__inner">
        <span className="rail__avatar">
          <img
            src={profile.avatarSrc}
            alt={profile.name}
            width={120}
            height={120}
          />
        </span>

        <h2 className="rail__name">
          {profile.name}
          <SealCheck size={19} weight="fill" aria-label={profile.verifiedLabel} />
        </h2>
        <p className="rail__handle">
          {profile.handle}
        </p>

        <div className="rail__actions">
          <ul className="rail__socials" role="list" aria-label="Social profiles">
          {profile.socials.map(({ label, href, iconPath }) => (
            <li key={label}>
              <a
                className="rail__social"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
              >
                {/* Single-colour silhouettes, tinted by currentColor through a
                    CSS mask - same technique as the hero's social row. */}
                <span
                  className="rail__social-icon"
                  style={{ ['--icon-url' as string]: `url('${iconPath}')` }}
                  aria-hidden="true"
                />
              </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="rail__theme"
            onClick={(e) => setThemeState(toggleTheme(e.currentTarget))}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <ThemeGlyph theme={theme} size={21} />
          </button>
        </div>

        <nav className="rail__nav" aria-label="Sections">
          <ul>
            {RAIL_LINKS.map(({ label, to, Icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'} className="rail__link">
                  <Icon size={21} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="rail__copy">
          &copy; {new Date().getFullYear()}
          <br />
          {profile.name}. All rights reserved.
        </p>
      </div>
    </aside>
  )
}
