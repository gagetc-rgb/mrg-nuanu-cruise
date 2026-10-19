"""Overlap audit: for common screen sizes, report which key blocks intersect (hero + parade HUD) and save screenshots."""
import os, sys
from playwright.sync_api import sync_playwright

SIZES = [(1920, 1080), (1536, 864), (1440, 900), (1366, 768), (1280, 720), (1280, 800), (800, 1280), (1024, 768), (390, 844)]
HERO = ['.meme-pic', '.meme-cap', '.ribbon', '.hero-copy h1', '.mrg-head', '.mrg .bubble', '.scroll-cue', '#sound']
HUD = ['.parade-copy h2', '.parade-copy .lede', '.pimp-line', '.counter', '.roster-btn', '.hint', '#sound']
# pairs that are allowed to touch (part of the same composition)
ALLOWED = {('.meme-pic', '.meme-cap'), ('.mrg-head', '.mrg .bubble')}

JS = """(sels) => {
  const out = [], box = s => { const e = document.querySelector(s); if (!e) return null;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    const r = e.getBoundingClientRect(); return r.width && r.height ? r : null; };
  const curtains = [...document.querySelectorAll('.curtain')].map(c => c.getBoundingClientRect());
  for (let i = 0; i < sels.length; i++) {
    const a = box(sels[i]); if (!a) continue;
    if (a.right > innerWidth + 1 || a.left < -1 || a.bottom > innerHeight + 1 || a.top < -1) out.push(`${sels[i]} leaves the screen`);
    for (let j = i + 1; j < sels.length; j++) {
      const b = box(sels[j]); if (!b) continue;
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 4 && iy > 4) out.push(`${sels[i]} x ${sels[j]} (${Math.round(ix)}x${Math.round(iy)})`);
    }
  }
  return out;
}"""

out_dir = sys.argv[1]
os.makedirs(out_dir, exist_ok=True)
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in SIZES:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto('http://localhost:5178/', wait_until='networkidle')
        pg.add_style_tag(content='html{scroll-behavior:auto!important}')
        pg.wait_for_timeout(2600)
        hero = [x for x in pg.evaluate(JS, HERO) if not any(f'{a} x {c}' in x for a, c in ALLOWED)]
        pg.screenshot(path=os.path.join(out_dir, f'hero_{w}x{h}.jpg'), type='jpeg', quality=60)
        pg.evaluate("(() => { const p = document.querySelector('#parade'); scrollTo(0, p.offsetTop + (p.offsetHeight - innerHeight) * .1); })()")
        pg.wait_for_timeout(1200)
        hud = pg.evaluate(JS, HUD)
        pg.screenshot(path=os.path.join(out_dir, f'parade_{w}x{h}.jpg'), type='jpeg', quality=60)
        issues = hero + hud
        bad += len(issues)
        print(f'{w}x{h}:', 'OK' if not issues else '; '.join(issues))
        pg.close()
    b.close()
print('TOTAL ISSUES', bad)
