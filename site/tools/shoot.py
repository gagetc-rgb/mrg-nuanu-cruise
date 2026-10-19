"""Headless screenshots of the local site at given scroll positions.
usage: python shoot.py OUT_DIR name=scrollY[:hover_selector] ...   (scrollY may be 'parade:0.4' = progress inside #parade)"""
import sys, os
from playwright.sync_api import sync_playwright

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
W, H = int(os.environ.get('W', 1440)), int(os.environ.get('H', 900))
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': W, 'height': H})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://localhost:5178/', wait_until='networkidle')
    page.add_style_tag(content='html{scroll-behavior:auto!important}')
    page.wait_for_timeout(2500)
    for spec in sys.argv[2:]:
        name, pos = spec.split('=', 1)
        pos, _, hover = pos.partition('@')
        if pos.startswith('parade:'):
            frac = float(pos.split(':')[1])
            y = page.evaluate(f"(() => {{ const p = document.querySelector('#parade'); return p.offsetTop + (p.offsetHeight - innerHeight) * {frac}; }})()")
        elif pos.startswith('#'):
            sel, _, off = pos.partition('+')
            y = page.evaluate(f"document.querySelector('{sel}').offsetTop") + float(off or 0)
        else:
            y = float(pos)
        page.evaluate(f'scrollTo(0, {y})')
        page.wait_for_timeout(1400)
        if hover:
            page.hover(hover, force=True)
            page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(out, name + '.jpg'), type='jpeg', quality=85)
    print('errors:', errors or 'none')
    b.close()
