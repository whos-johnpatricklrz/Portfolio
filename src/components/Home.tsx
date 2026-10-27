import { Link } from 'react-router-dom'
import { ArrowUpRight } from '@/components/slab'
import { profile } from '@/data/profile'
import ToolsMarquee from './ToolsMarquee'
import HomeBento from './HomeBento'
import { HomeProfile, HomeStats, HomeExplore } from './HomeMobile'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useIsPhone } from '@/hooks/useMediaQuery'

/**
 * Home. One viewport, three bands, no scroll:
 *
 *   head       the display line the intro writes, then the lede
 *   tools      "Tools I work with" beside the marquee, on its own plate
 *   showcase   the bento - one card per view, see HomeBento - on its own
 *
 * The grid is `auto auto 1fr` so the showcase absorbs the slack instead of
 * pushing the panel into a scrollbar. Every other view scrolls; this one is
 * laid out to the box.
 *
 * On a phone the page becomes an app screen: a profile header where the rail
 * used to be, the proof stats under the lede, and the bento replaced by a
 * snap row of tiles (HomeMobile). The CTA leaves the head - the tab bar's
 * Contact action carries it on every screen.
 *
 * `.home__title` is also the intro's landing target: IntroOverlay measures it
 * and flies its copy into this exact rect, so the line the visitor watched
 * being written is the line that stays on the page.
 */
export default function Home() {
  useScrollReveal()
  const phone = useIsPhone()
  const { displayName, hero } = profile

  return (
    <section className="home" aria-labelledby="home-title">
      {phone && <HomeProfile />}

      <div className="home__head">
        <div className="home__headline">
          <h1 className="home__title" id="home-title">
            <span className="home__line">
              {displayName.line1} {displayName.line2}
            </span>
          </h1>

          {!phone && (
            <Link className="home__cta" to="/contact">
              Get in touch
              <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          )}
        </div>

        <p className="home__lede">{hero.body}</p>
        {phone && <HomeStats />}
      </div>

      {/* Two plates, not one. The tools band and the bento are different
          objects - a strip you read across and a grid you pick from - and one
          shared sheet made the strip look like the bento's header. */}
      <div className="home__glass home__glass--tools">
        <div className="home__tools">
          <div className="home__tools-head">
            <span className="home__tools-eyebrow">Daily drivers</span>
            <h2 className="home__tools-label">Tools I work with</h2>
          </div>
          <ToolsMarquee />
        </div>
      </div>

      {phone ? (
        <HomeExplore />
      ) : (
        <div className="home__glass home__glass--showcase">
          <div className="home__showcase">
            <HomeBento />
          </div>
        </div>
      )}
    </section>
  )
}
