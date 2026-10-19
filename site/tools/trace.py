"""Trace a parade scroll and sum main-thread time per event type (what really costs: paint, raster, script...)."""
import json, sys, collections
from playwright.sync_api import sync_playwright

W, H = 1138, 712
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H})
    pg.goto('http://localhost:5178/', wait_until='networkidle')
    pg.wait_for_function("!document.getElementById('loader')", timeout=30000)
    pg.wait_for_timeout(2500)
    if len(sys.argv) > 1: pg.add_style_tag(content=sys.argv[1])
    pg.evaluate("scrollTo(0, document.querySelector('#parade').offsetTop)")
    pg.wait_for_timeout(800)
    b.start_tracing(page=pg, categories=['devtools.timeline', 'disabled-by-default-devtools.timeline'])
    pg.mouse.move(W / 2, H / 2)
    for _ in range(60):
        pg.mouse.wheel(0, 100); pg.wait_for_timeout(16)
    pg.wait_for_timeout(500)
    data = json.loads(b.stop_tracing())
    b.close()

ev = data['traceEvents'] if isinstance(data, dict) else data
tot = collections.Counter(); cnt = collections.Counter(); paint_px = 0
for e in ev:
    if e.get('ph') == 'X' and e.get('dur'):
        tot[e['name']] += e['dur'] / 1000; cnt[e['name']] += 1
    if e.get('name') == 'Paint' and e.get('args', {}).get('data', {}).get('clip'):
        c = e['args']['data']['clip']; xs, ys = c[0::2], c[1::2]; paint_px += (max(xs) - min(xs)) * (max(ys) - min(ys))
for k, v in tot.most_common(14):
    print(f'{k:34s} {v:8.1f} ms  x{cnt[k]}')
print('painted area (Mpx):', round(paint_px / 1e6, 1))
