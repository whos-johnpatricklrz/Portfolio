import type { CSSProperties } from 'react'
import { MagnetStraight, Timer, Trophy, CheckCircle } from '@/components/slab'
import type { Icon } from '@/components/slab'
import Autopilot, { TOOLS } from '@/components/Autopilot'

/**
 * ServicesGrid - the Services view on one glass sheet.
 *
 * Three bands, top to bottom: your three-step method (on a dark plate so it
 * is the first thing the eye lands on), the five services as cards that carry
 * the marks of what each one is built with, and the live automation demo
 * scaled into whatever height is left. Same object language as Home and
 * Projects: the glass, the bento card, plated marks, orange for the index
 * and the accent.
 *
 * Every string below is a PLACEHOLDER. Replace it, or hand this file to your
 * AI assistant and tell it what to put in each spot.
 */

/* ---------- The method ---------- */

type Stage = {
  index: string
  label: string
  body: string
  Icon: Icon
  chips: string[]
}

const STAGES: Stage[] = [
  {
    index: '01',
    label: 'Step 1',
    body: 'PLACEHOLDER - one line on what happens in this step.',
    Icon: MagnetStraight,
    chips: ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4'],
  },
  {
    index: '02',
    label: 'Step 2',
    body: 'PLACEHOLDER - one line on what happens in this step.',
    Icon: Timer,
    chips: ['Tag 1', 'Tag 2', 'Tag 3'],
  },
  {
    index: '03',
    label: 'Step 3',
    body: 'PLACEHOLDER - one line on the result the client gets.',
    Icon: Trophy,
    chips: ['Tag 1', 'Tag 2', 'Tag 3'],
  },
]

/* ---------- The services ---------- */

// Example tool marks from /public/icons. Swap for the tools you actually use.
const GHL = '/icons/gohighlevel.png'
const REACT = '/icons/ai/react.svg'
const TAILWIND = '/icons/ai/tailwindcss.svg'
const VITE = '/icons/ai/vite.svg'
const CLOUDFLARE = '/icons/ai/cloudflare.svg'
const N8N = '/icons/ai/n8n.svg'
const OPENAI = '/icons/openai.svg'
const GWS = '/icons/googleworkspace.svg'
const SLACK = '/icons/slack.svg'
const CLAUDE_CODE = '/icons/claude-code-logo.png'
const EXPO = '/icons/ai/expo.svg'
const CHROME = '/icons/ai/googlechrome.svg'

type Service = {
  index: string
  title: string
  description: string
  chip: string
  logos: string[]
  bullets: string[]
}

const BULLETS = ['PLACEHOLDER benefit 1', 'PLACEHOLDER benefit 2', 'PLACEHOLDER benefit 3']
const SERVICE_DESC = 'PLACEHOLDER - one line on this service.'

const SERVICES: Service[] = [
  {
    index: '01',
    title: 'Service One',
    description: SERVICE_DESC,
    chip: 'PLACEHOLDER',
    logos: [GHL, REACT, TAILWIND],
    bullets: BULLETS,
  },
  {
    index: '02',
    title: 'Service Two',
    description: SERVICE_DESC,
    chip: 'PLACEHOLDER',
    logos: [GHL, N8N, OPENAI],
    bullets: BULLETS,
  },
  {
    index: '03',
    title: 'Service Three',
    description: SERVICE_DESC,
    chip: 'PLACEHOLDER',
    logos: [GHL, GWS, SLACK],
    bullets: BULLETS,
  },
  {
    index: '04',
    title: 'Service Four',
    description: SERVICE_DESC,
    chip: 'PLACEHOLDER',
    logos: [REACT, VITE, CLOUDFLARE],
    bullets: BULLETS,
  },
  {
    index: '05',
    title: 'Service Five',
    description: SERVICE_DESC,
    chip: 'PLACEHOLDER',
    logos: [CLAUDE_CODE, EXPO, CHROME],
    bullets: BULLETS,
  },
]

/** The tool marks, stacked horizontally on white tiles (same as Projects). */
function Marks({ logos }: { logos: string[] }) {
  return (
    <span className="bento__logos" aria-hidden="true">
      {logos.map((src) => (
        <span key={src} className="bento__logo">
          <img src={src} alt="" width={22} height={22} decoding="async" />
        </span>
      ))}
    </span>
  )
}

/* ---------- The page ---------- */

export default function ServicesGrid() {
  return (
    <section className="pgrid sgrid" aria-labelledby="services-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">Services</span>
        <h1 className="pgrid__title" id="services-title">
          Your services headline, in one short line.
        </h1>
        <p className="pgrid__lede">
          PLACEHOLDER - tell me what to put here: one line on what you offer.
        </p>
      </header>

      <div className="home__glass sgrid__glass">
        {/* One dark plate, the headline on the left, the three stages wired
            in order on the right with a signal running them. */}
        <div className="sgrid__method" aria-labelledby="method-title">
          <div className="sgrid__method-copy">
            <span className="sgrid__method-eyebrow">Your Method</span>
            <h2 className="sgrid__method-title" id="method-title">
              One. Two. Three.
              <br />
              <span>Your method, in three steps.</span>
            </h2>
            <p className="sgrid__method-sub">
              PLACEHOLDER - one sentence on why your method works.
            </p>
          </div>

          <ol className="sgrid__stages" role="list">
            {STAGES.map((s, i) => {
              const StageIcon = s.Icon
              return (
                <li key={s.index} className="sgrid__stage" style={{ '--i': i } as CSSProperties}>
                  <span className="sgrid__stage-ghost" aria-hidden="true">{s.index}</span>
                  <span className="sgrid__stage-icon" aria-hidden="true">
                    <StageIcon size={22} weight="duotone" />
                  </span>
                  <h3 className="sgrid__stage-label">{s.label}.</h3>
                  <p className="sgrid__stage-body">{s.body}</p>
                  <ul className="sgrid__stage-chips" role="list" aria-label={`${s.label} touches`}>
                    {s.chips.map((c) => (
                      <li key={c} className="sgrid__stage-chip">{c}</li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Five cards, each carrying the marks of what it is built with. */}
        <div className="sgrid__offers">
          <div className="sgrid__offers-head">
            <h2 className="sgrid__offers-title">Your services, listed.</h2>
            <p className="sgrid__offers-sub">PLACEHOLDER - one short nudge.</p>
          </div>
          <ul className="bento sgrid__services" role="list">
            {SERVICES.map((s) => (
              <li key={s.title} className="bento__card sgrid__service">
                <span className="bento__head">
                  <span className="sgrid__service-top">
                    <Marks logos={s.logos} />
                    <span className="sgrid__service-index" aria-hidden="true">{s.index} / 05</span>
                  </span>
                  <span className="bento__title">{s.title}</span>
                  <span className="bento__desc">{s.description}</span>
                </span>
                <span className="sgrid__chip" aria-hidden="true">{s.chip}</span>
                <ul className="sgrid__bullets" role="list">
                  {s.bullets.map((b) => (
                    <li key={b} className="sgrid__bullet">
                      <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {/* The live workflow. Its caption and the tool chips sit in a header
            above the window, so the canvas gets the whole glass width. */}
        <div className="sgrid__flow">
          <header className="sgrid__flow-head">
            <div className="sgrid__flow-copy">
              <span className="sgrid__flow-eyebrow">Live automation</span>
              <h2 className="sgrid__flow-title">Your automation headline.</h2>
              <p className="sgrid__flow-sub">
                PLACEHOLDER - tell me what to put here: one sentence on what this example automation does for a client.
              </p>
            </div>
            <ul className="sgrid__flow-tools" role="list" aria-label="Tools that power this flow">
              {TOOLS.map(({ Icon: ToolIcon, label }) => (
                <li key={label} className="sgrid__flow-tool">
                  <ToolIcon size={14} weight="duotone" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </header>
          <div className="sgrid__flow-main">
            <Autopilot compact maxScale={1.08} />
          </div>
        </div>
      </div>
    </section>
  )
}
