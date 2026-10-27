import { useEffect, useRef } from 'react'
import { getTheme } from '@/lib/theme'
import * as THREE from 'three'

/**
 * Full-page animated contour background, v2.
 * Technique inspired by the landonorris.com background (by OFF+BRAND):
 *  - Two-layer simplex noise feedback (a slow large-scale layer warps the
 *    UV of the fast contour layer). This is the single biggest reason their
 *    blobs look "smooth" instead of drifting in a uniform current.
 *  - Cursor effect scaled by mouse VELOCITY (uMousePace), not just position.
 *    Quiet on hover, ripples on flick.
 *  - Aspect-corrected UVs so contours stay circular at any window ratio.
 *
 * Everything else (throttle, visibility pause, dark-section scroll mix,
 * touch/reduced-motion skip) is identical to HeroCanvas.tsx so this is a
 * drop-in replacement at the App.tsx import site.
 */

// 3D simplex noise: Copyright (c) 2011 Ashima Arts / Ian McEwan. MIT License.
// https://github.com/ashima/webgl-noise - this block stays MIT, not PolyForm.
const noiseGLSL = `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`

const vert = `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`

const frag = `
  uniform float uTime;
  uniform vec2  uMouse;       // [-1, 1]
  uniform float uMousePace;   // [0, ~1] eased mouse velocity
  uniform float uAspect;      // viewport.width / viewport.height
  uniform float uDarkMix;     // 0 = light/cream, 1 = dark/navy
  varying vec2 vUv;
  ${noiseGLSL}

  // Tuning constants. Tune these to taste.
  // Tuned from full-HD screenshots of landonorris.com - the contours are
  // BIG sweeping curves (only 2-4 visible across a 1920px viewport), not
  // dense topographic detail. SCALE drives that.
  const float SCALE             = 0.72;  // base noise scale - LOWER = larger cells = fewer, sparser blobs across the viewport
  const float NOISE_DETAIL      = 3.0;   // number of contour bands per noise cell - LOWER = fewer parallel lines (less busy / fewer blobs)
  const float DISTORT_SCALE     = 0.55;  // size of the slow underlying blobs
  const float DISTORT_INTENSITY = 0.50;  // how much the slow blobs warp the contours
  const float HAIRLINE_PIXELS   = 1.5;   // contour line width in screen pixels (fwidth-driven)
  const float CURSOR_SCALE      = 1.5;   // falloff sharpness around the cursor
  const float CURSOR_INTENSITY  = 0.05;  // how much the cursor drags contour UVs

  // Near-isotropic noise sampling - contours form in all directions like a
  // real topographic map. NOT stretched into horizontal stripes.
  const vec2  ANISOTROPY        = vec2(1.0, 1.0);

  void main(){
    // Aspect-corrected UV so contours stay circular at any window ratio.
    vec2 uv = vUv;
    uv.x *= uAspect;

    // Mouse in the same UV space as the noise sample.
    vec2 mouse = uMouse * 0.5 + 0.5;
    mouse.x *= uAspect;
    float cursor = 1.0 - distance(mouse, uv) * CURSOR_SCALE;
    cursor *= uMousePace;
    cursor = clamp(cursor, 0.0, 1.0);

    // Layer 1: slow, large-scale noise.
    float noiseDistort = 0.5 + snoise(vec3(uv * DISTORT_SCALE, uTime * 0.1)) * 0.5;

    // Layer 2: low-frequency noise whose UV is warped by layer 1 + the cursor.
    vec2 warpedUv = (uv + cursor * CURSOR_INTENSITY + noiseDistort * DISTORT_INTENSITY) * SCALE * ANISOTROPY;
    float n = snoise(vec3(warpedUv, uTime));

    // Multiply by NOISE_DETAIL BEFORE fract() - this is the topographic-map
    // trick. With NOISE_DETAIL = 1, fract(n) wraps once per noise cell and
    // produces small closed loops around peaks/valleys. With NOISE_DETAIL = 4,
    // fract wraps four times per cell, producing FOUR PARALLEL contours that
    // flow along the noise gradient over long distances - exactly what makes
    // Lando's lines look like real elevation contours instead of pebbles.
    float bands = (n * 0.5 + 0.5) * NOISE_DETAIL;

    // Hairline contour lines using GLSL derivatives (fwidth) - resolution
    // independent. fwidth(bands) tracks per-pixel change in bands, so the
    // line stays HAIRLINE_PIXELS thick regardless of NOISE_DETAIL or SCALE.
    float contour = fract(bands);
    float dist    = abs(contour - 0.5);
    float w       = fwidth(bands) * HAIRLINE_PIXELS * 0.5;
    float line    = 1.0 - smoothstep(0.0, w, dist);

    // Theme colors (kept identical to v1 so the rest of the page does not shift).
    vec3 bgLight   = vec3(0.957, 0.957, 0.929); // #F4F4ED cream
    vec3 lineLight = vec3(0.46,  0.46,  0.46);  // soft neutral gray contour on cream
    vec3 bgDark    = vec3(0.024, 0.047, 0.102); // #060C1A navy ink
    vec3 lineDark  = vec3(1.0,   1.0,   1.0);   // solid white on navy (black would be invisible)

    vec3 bg      = mix(bgLight, bgDark, uDarkMix);
    vec3 lineCol = mix(lineLight, lineDark, uDarkMix);

    // Tiny cursor-velocity highlight so flicks leave a faint glow.
    lineCol += cursor * 0.04;

    // Line opacity: soft, tonal beige hairlines - lower alpha so
    // the contours read as a warm beige tint rather than stark black. The lower
    // contrast also hides most of the half-res upscale aliasing. Dark sections
    // use white lines on navy, kept legible at a similar low alpha.
    float lineAlpha = line * mix(0.55, 0.45, uDarkMix);
    vec3 color = mix(bg, lineCol, lineAlpha);

    gl_FragColor = vec4(color, 1.0);
  }
`

export default function HeroCanvasV2() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch =
      'ontouchstart' in window ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      navigator.maxTouchPoints > 0
    if (reduced || isTouch) return

    const scene = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
    cam.position.z = 1

    // antialias off: this is a single fullscreen quad - the only "edges" are
    // the contour lines, which the shader already smooths with fwidth(), so
    // MSAA buys nothing and just costs a multisample buffer.
    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    // Render ABOVE 1:1 so higher-DPI displays get crisp contour lines. The
    // 0.5 default looked pixelated; 1.0 fixed the cream theme. 1.5 was tried
    // for crisper hairlines on scaled displays and it DID cost scroll
    // smoothness on weak machines: a HiDPI laptop was shading 2.25x the
    // fragments of a 1:1 render, every frame, under a viewport-sized
    // backdrop-filter. Stepped back to 1.0 per the note below. If crispness
    // on retina ever needs revisiting, gate it on lib/perf.ts's tier, do not
    // raise this constant for everyone. The shader still animates
    // continuously and must NEVER pause/freeze during scroll - if this ever
    // costs scroll smoothness on a weak machine, step it DOWN, do not raise it.
    const RENDER_SCALE = 1.0
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER_SCALE))
    el.appendChild(renderer.domElement)

    const mouse = new THREE.Vector2(0, 0)
    // The page is dark or light, never both, and it never inverts on scroll.
    // uDarkMix is a theme reading now: 1 in dark, 0 in light, eased only when
    // the visitor actually flips the switch.
    const darkMix = { value: getTheme() === 'dark' ? 1 : 0 }
    let targetDark = darkMix.value
    renderer.setClearColor(darkMix.value ? 0x070b14 : 0xf4f4ed, 1)

    const onThemeChange = () => {
      const dark = getTheme() === 'dark'
      targetDark = dark ? 1 : 0
      renderer.setClearColor(dark ? 0x070b14 : 0xf4f4ed, 1)
    }
    window.addEventListener('themechange', onThemeChange)

    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      // fwidth() is part of GLSL ES 3.0 / WebGL2 (Three.js' default since
      // r150), no extension hint needed. The OES_standard_derivatives key
      // was removed from the ShaderMaterial type in Three.js 0.180+.
      uniforms: {
        uTime:      { value: 0 },
        uMouse:     { value: mouse },
        uMousePace: { value: 0 },
        uAspect:    { value: window.innerWidth / window.innerHeight },
        uDarkMix:   darkMix,
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    let tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 }
    const onMove = (e: MouseEvent) => {
      tgt.x = (e.clientX / window.innerWidth) * 2 - 1
      tgt.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMove)

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      mat.uniforms.uAspect.value = window.innerWidth / window.innerHeight
    }
    window.addEventListener('resize', onResize)

    let visible = document.visibilityState !== 'hidden'
    const onVisibility = () => {
      const next = document.visibilityState !== 'hidden'
      if (next && !visible) {
        visible = true
        raf = requestAnimationFrame(loop)
      } else {
        visible = next
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    let raf: number
    let time = 0
    let lastTs = performance.now()
    // Throttle the shader to ~30fps. The contour only drifts at 0.09/sec, so
    // 30fps is visually identical to 60 but halves the GPU/main-thread cost,
    // leaving headroom for smooth scrolling. Delta-time keeps the pace correct.
    const FRAME_INTERVAL = 1000 / 30

    // Delta-time animation. Speeds are expressed PER SECOND, so the visual
    // pace stays the same on a 60Hz, 120Hz, or 144Hz display. The previous
    // version ran at a hard 20fps cap which felt laggy compared to Lando's
    // uncapped 60fps. The shader is cheap (~one fullscreen plane, two
    // simplex samples) so there is no need to throttle on desktop.
    const DRIFT_PER_SECOND  = 0.09  // shader uTime advance per second (lower = slower, calmer drift)
    const FOLLOW_PER_SECOND = 4.0   // cursor lerp rate (higher = snappier)
    const PACE_PER_SECOND   = 8.0   // velocity smoothing rate
    const DARK_PER_SECOND   = 7.0   // light/dark theme blend rate

    let lastCurX = 0, lastCurY = 0
    let pace = 0

    function loop(now: number = performance.now()) {
      if (!visible) return
      raf = requestAnimationFrame(loop)

      // 30fps throttle: bail out of frames that arrive too soon.
      if (now - lastTs < FRAME_INTERVAL - 1) return

      // dt clamped so a tab returning from backgroound doesn't produce a
      // huge jump (rAF can pause when the tab is hidden).
      const dt = Math.min(0.05, (now - lastTs) / 1000)
      lastTs = now

      time += DRIFT_PER_SECOND * dt

      const followK = 1 - Math.exp(-FOLLOW_PER_SECOND * dt)
      cur.x += (tgt.x - cur.x) * followK
      cur.y += (tgt.y - cur.y) * followK
      mouse.set(cur.x, cur.y)

      // Velocity in normalized-units / second, smoothed.
      const dx = (cur.x - lastCurX) / Math.max(dt, 0.001)
      const dy = (cur.y - lastCurY) / Math.max(dt, 0.001)
      const velRaw = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 0.4)
      const paceK = 1 - Math.exp(-PACE_PER_SECOND * dt)
      pace += (velRaw - pace) * paceK
      lastCurX = cur.x; lastCurY = cur.y

      const darkK = 1 - Math.exp(-DARK_PER_SECOND * dt)
      darkMix.value += (targetDark - darkMix.value) * darkK

      mat.uniforms.uTime.value      = time
      mat.uniforms.uMousePace.value = pace
      renderer.render(scene, cam)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('themechange', onThemeChange)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
      geo.dispose()
      mat.dispose()
    }
  }, [])

  return <div ref={ref} className="hero-canvas" aria-hidden="true" />
}
