// Renders every placeholder image the site uses, with the local Playwright:
//   - barrel + grid thumbnails of the placeholder funnels/websites
//   - small copies for the Home bento
//   - generic "your screenshot goes here" images for projects, apps,
//     extensions and testimonial posters
// Run after make-placeholder-sites.mjs: node scripts/make-thumbs.mjs
// When you add your own funnel or site, drop its HTML in public/funnels or
// public/samples, list it in src/data/funnels.ts, and re-run this script.
import { readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const pub = join(process.cwd(), 'public')
mkdirSync(join(pub, 'home'), { recursive: true })
mkdirSync(join(pub, 'placeholders'), { recursive: true })

const browser = await chromium.launch()

// Funnels are shown 16:9, websites 3:4 - same as the thumbnails they replace.
const SETS = [
  { dir: 'funnels', w: 1280, h: 720 },
  { dir: 'samples', w: 1080, h: 1440 },
]
for (const { dir, w, h } of SETS) {
  const files = readdirSync(join(pub, dir)).filter((f) => f.endsWith('.html'))
  for (const f of files) {
    const url = pathToFileURL(join(pub, dir, f)).href
    const base = f.replace('.html', '')
    for (const [out, scale] of [
      [join(pub, dir, 'thumbs', `${base}.jpeg`), 1],
      [join(pub, 'home', `${dir}-${base}.jpeg`), 400 / w],
    ]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale })
      await page.goto(url)
      await page.screenshot({ path: out, type: 'jpeg', quality: 82 })
      await page.close()
    }
  }
}

// Generic placeholder images: a labelled card at the size of the image it replaces.
const CARDS = [
  ['project-1.jpg', 1200, 820, 'Project screenshot 1'],
  ['project-2.jpg', 1200, 820, 'Project screenshot 2'],
  ['project-3.jpg', 1200, 820, 'Project screenshot 3'],
  ['project-4.jpg', 1200, 820, 'Project screenshot 4'],
  ['app-1.jpg', 960, 514, 'App screenshot 1'],
  ['app-2.jpg', 960, 514, 'App screenshot 2'],
  ['app-3.jpg', 960, 514, 'App screenshot 3'],
  ['extension-1.jpg', 806, 612, 'Extension screenshot 1'],
  ['extension-2.jpg', 806, 612, 'Extension screenshot 2'],
  ['testimonial-1.jpg', 720, 1080, 'Testimonial video poster 1'],
  ['testimonial-2.jpg', 720, 1080, 'Testimonial video poster 2'],
  ['flagship.jpg', 1600, 1000, 'Your flagship product screenshot'],
]
const card = (label, w, h) => `<!doctype html><html><body style="margin:0">
<div style="width:${w}px;height:${h}px;display:grid;place-items:center;font-family:system-ui,sans-serif;
background:repeating-linear-gradient(135deg,#E8ECF2 0 18px,#DDE3EB 18px 36px);color:#475569;text-align:center">
<div style="background:#F8FAFC;border:2px dashed #94A3B8;border-radius:${Math.round(w / 40)}px;padding:${Math.round(w / 30)}px ${Math.round(w / 20)}px">
<div style="font-weight:800;letter-spacing:.14em;font-size:${Math.round(w / 34)}px;color:#FF7A1A">PLACEHOLDER</div>
<div style="font-weight:700;font-size:${Math.round(w / 28)}px;margin-top:8px;color:#0F172A">${label}</div>
<div style="font-size:${Math.round(w / 48)}px;margin-top:8px">Tell me what to put here</div>
</div></div></body></html>`
for (const [name, w, h, label] of CARDS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.setContent(card(label, w, h))
  await page.screenshot({ path: join(pub, 'placeholders', name), type: 'jpeg', quality: 80 })
  await page.close()
}

await browser.close()
console.log('thumbnails + placeholder images written')
