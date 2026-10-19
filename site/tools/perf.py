"""Scroll smoothness benchmark: wheel-scrolls the whole page with a throttled CPU (tablet-like) and reports
frame stats per section (avg fps, % of frames slower than 50 ms)."""
import json, sys
from playwright.sync_api import sync_playwright

W, H = (int(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '1138x712').split('x'))
THROTTLE = float(sys.argv[2]) if len(sys.argv) > 2 else 4
INJECT = sys.argv[3] if len(sys.argv) > 3 else ''   # extra CSS for A/B experiments

with sync_playwright() as p:
    import os
    headed = os.environ.get('HEADED') == '1'
    b = p.chromium.launch(headless=not headed, args=['--enable-gpu-rasterization', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H})
    cdp = pg.context.new_cdp_session(pg)
    pg.goto('http://localhost:5178/', wait_until='networkidle')
    pg.wait_for_function("!document.getElementById('loader')", timeout=30000)
    if INJECT: pg.add_style_tag(content=INJECT)
    pg.wait_for_timeout(3000)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': THROTTLE})
    cdp.send('Performance.enable')
    m0 = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    pg.evaluate("""() => { window.__f = []; let last = performance.now();
      const tick = t => { window.__f.push([t - last, scrollY]); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }""")
    total = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
    pg.mouse.move(W / 2, H / 2)
    y = 0
    while y < total:
        pg.mouse.wheel(0, 120)
        y += 120
        pg.wait_for_timeout(16)
    pg.wait_for_timeout(800)
    m1 = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    frames = pg.evaluate('window.__f')
    secs = pg.evaluate("""() => ['hero','parade','deal','bill','gate'].map(id => { const e = document.getElementById(id); return [id, e.offsetTop, e.offsetTop + e.offsetHeight]; })""")
    b.close()

frames = frames[5:]
print(f'{W}x{H}, CPU x{THROTTLE}, frames: {len(frames)}')
for name, top, bottom in secs:
    fr = [d for d, sy in frames if top - H / 2 <= sy < bottom - H / 2]
    if not fr:
        continue
    avg = sum(fr) / len(fr)
    slow = sum(1 for d in fr if d > 50) / len(fr) * 100
    print(f'  {name:7s} avg {1000 / avg:5.1f} fps   frame {avg:5.1f} ms   >50ms: {slow:4.1f}%   worst {max(fr):6.1f} ms')

for k in ['TaskDuration', 'ScriptDuration', 'RecalcStyleDuration', 'LayoutDuration', 'LayoutCount', 'RecalcStyleCount']:
    print(f'  {k:20s} {m1[k] - m0[k]:8.2f}')
