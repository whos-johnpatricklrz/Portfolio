// Generates the placeholder funnel pages and website samples under public/.
// Each page is self-contained HTML (no external requests) so the Projects
// modal can iframe it. Run: node scripts/make-placeholder-sites.mjs
// Then run: node scripts/make-thumbs.mjs  (renders the barrel/bento thumbnails)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PALETTES = [
  { name: 'Slate', bg: '#0F172A', surface: '#1E293B', ink: '#F8FAFC', muted: '#94A3B8', accent: '#38BDF8' },
  { name: 'Sand', bg: '#F5F0E8', surface: '#FFFFFF', ink: '#1C1917', muted: '#78716C', accent: '#C2410C' },
  { name: 'Forest', bg: '#0B1F17', surface: '#12301F', ink: '#ECFDF5', muted: '#86B59C', accent: '#4ADE80' },
  { name: 'Paper', bg: '#FAFAF9', surface: '#F1F1EF', ink: '#111827', muted: '#6B7280', accent: '#2563EB' },
  { name: 'Plum', bg: '#1A1023', surface: '#2A1A38', ink: '#FAF5FF', muted: '#B8A3C9', accent: '#F472B6' },
  { name: 'Clay', bg: '#FFF7ED', surface: '#FFFFFF', ink: '#27150A', muted: '#8A6A55', accent: '#EA580C' },
]

const css = (p) => `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:${p.bg};color:${p.ink};line-height:1.5}
a{color:inherit;text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 32px}
nav{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.logo{font-weight:800;letter-spacing:-.02em;font-size:18px}
.logo b{color:${p.accent}}
.links{display:flex;gap:28px;font-size:14px;color:${p.muted}}
.btn{display:inline-block;background:${p.accent};color:${p.bg};font-weight:700;font-size:15px;padding:14px 26px;border-radius:999px}
.btn--ghost{background:transparent;color:${p.ink};border:1px solid ${p.muted}66}
.tag{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${p.accent};margin-bottom:18px}
h1{font-size:clamp(40px,6vw,72px);line-height:1.02;letter-spacing:-.035em;font-weight:800;max-width:14ch}
h2{font-size:clamp(28px,3.4vw,40px);letter-spacing:-.02em;line-height:1.1;margin-bottom:14px}
p.lede{font-size:18px;color:${p.muted};max-width:46ch;margin:22px 0 32px}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:56px 0 80px}
.shot{aspect-ratio:4/5;border-radius:24px;background:
  repeating-linear-gradient(135deg,${p.surface} 0 14px,${p.bg} 14px 28px);
  border:1px solid ${p.muted}33;display:grid;place-items:center;text-align:center;padding:24px;color:${p.muted};font-size:14px}
.shot strong{display:block;color:${p.ink};font-size:16px;margin-bottom:6px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:24px 0 80px}
.card{background:${p.surface};border:1px solid ${p.muted}22;border-radius:20px;padding:28px}
.card .n{font-size:13px;font-weight:700;color:${p.accent};margin-bottom:26px}
.card h3{font-size:20px;margin-bottom:8px}
.card p{color:${p.muted};font-size:15px}
.band{background:${p.surface};border-radius:28px;padding:56px;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center;margin-bottom:80px}
.quote{font-size:24px;line-height:1.35;max-width:40ch}
.who{margin-top:16px;color:${p.muted};font-size:14px}
.form{background:${p.surface};border-radius:24px;padding:32px;display:grid;gap:12px}
.field{height:48px;border-radius:12px;border:1px solid ${p.muted}44;padding:0 16px;display:flex;align-items:center;color:${p.muted};font-size:14px}
footer{border-top:1px solid ${p.muted}33;padding:28px 0 40px;color:${p.muted};font-size:13px;display:flex;justify-content:space-between}
@media (max-width:760px){.hero,.band{grid-template-columns:1fr}.row{grid-template-columns:1fr}.links{display:none}}
`

const page = ({ title, kind, n, p, body }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${css(p)}</style></head>
<body><div class="wrap">
<nav><span class="logo">Placeholder<b>.</b></span>
<span class="links"><a href="#">PLACEHOLDER</a><a href="#">PLACEHOLDER</a><a href="#">PLACEHOLDER</a></span>
<a class="btn" href="#">PLACEHOLDER</a></nav>
${body}
<footer><span>&copy; PLACEHOLDER ${kind} ${n}</span><span>Replace this file: public/${kind === 'Website' ? 'samples' : 'funnels'}/</span></footer>
</div></body></html>`

const hero = (kind, n, p, extra = '') => `
<section class="hero"><div>
<span class="tag">PLACEHOLDER ${kind} ${n}</span>
<h1>Tell me what to put here.</h1>
<p class="lede">PLACEHOLDER - swap this page for a ${kind.toLowerCase()} you built. One line on who it was for and what it does.</p>
<a class="btn" href="#">PLACEHOLDER CTA</a> <a class="btn btn--ghost" href="#">Secondary</a>
</div>${extra || `<div class="shot"><div><strong>PLACEHOLDER IMAGE</strong>Your hero photo or product shot</div></div>`}</section>`

const cards = () => `<div class="row">${[1, 2, 3]
  .map((i) => `<div class="card"><div class="n">0${i}</div><h3>PLACEHOLDER</h3><p>Tell me what to put here - a benefit, a step, or a feature.</p></div>`)
  .join('')}</div>`

const band = () => `<div class="band"><div><p class="quote">"PLACEHOLDER - a short testimonial from the client this page was built for."</p>
<p class="who">PLACEHOLDER NAME, PLACEHOLDER COMPANY</p></div><a class="btn" href="#">PLACEHOLDER</a></div>`

const form = () => `<div class="form"><strong>PLACEHOLDER FORM</strong>
<div class="field">Name</div><div class="field">Email</div><div class="field">Phone</div><a class="btn" href="#">Submit</a></div>`

const root = join(process.cwd(), 'public')
const FUNNELS = 6
const SITES = 6
mkdirSync(join(root, 'funnels', 'thumbs'), { recursive: true })
mkdirSync(join(root, 'samples', 'thumbs'), { recursive: true })

for (let i = 1; i <= FUNNELS; i++) {
  const n = String(i).padStart(2, '0')
  const p = PALETTES[(i - 1) % PALETTES.length]
  const body = hero('Funnel', n, p, i % 2 ? form() : '') + cards()
  writeFileSync(join(root, 'funnels', `placeholder-funnel-${n}.html`), page({ title: `Placeholder Funnel ${n}`, kind: 'Funnel', n, p, body }))
}
for (let i = 1; i <= SITES; i++) {
  const n = String(i).padStart(2, '0')
  const p = PALETTES[(i + 2) % PALETTES.length]
  const body = hero('Website', n, p) + cards() + band()
  writeFileSync(join(root, 'samples', `placeholder-site-${n}.html`), page({ title: `Placeholder Website ${n}`, kind: 'Website', n, p, body }))
}
console.log(`wrote ${FUNNELS} funnels + ${SITES} websites`)
