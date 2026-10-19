"""Headless interaction checks: every interactive element must react. Prints PASS/FAIL per check."""
from playwright.sync_api import sync_playwright

def run():
    res = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:5178/', wait_until='networkidle'); pg.add_style_tag(content='html{scroll-behavior:auto!important}'); pg.wait_for_timeout(2200)
        def top_el(sel):
            """What element really receives the pointer at the centre of sel (catches invisible overlays)."""
            return pg.evaluate(f"""(() => {{ const e = document.querySelector('{sel}'); const r = e.getBoundingClientRect();
                const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === e || e.contains(t); }})()""")
        # hero: Mr G click changes the bubble
        before = pg.inner_text('.mrg .bubble p'); pg.mouse.click(*pg.evaluate("(() => { const r = document.querySelector('.mrg-body').getBoundingClientRect(); return [r.left + r.width * .5, r.top + r.height * .55]; })()")); pg.wait_for_timeout(300)
        res.append(('hero: Mr G click cycles bubble', pg.inner_text('.mrg .bubble p') != before))
        res.append(('hero: Mr G head bobbles on click', abs(pg.evaluate(r"parseFloat((document.querySelector('.mrg-head').style.transform.match(/rotate\(([-\d.]+)deg/)||[0,0])[1])")) > .5))
        # parade: scroll to the convoy passing the statue, hover a star head -> tag shows
        pg.evaluate("(() => { const p = document.querySelector('#parade'); scrollTo(0, p.offsetTop + (p.offsetHeight - innerHeight) * .13); })()"); pg.wait_for_timeout(1500)
        sel = '#cars .car:first-child .rider:not(.crew) .head'
        res.append(('parade: star head is top-most under pointer', top_el(sel)))
        pg.mouse.move(*pg.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }})()")); pg.wait_for_timeout(400)
        res.append(('parade: hover star -> tag', pg.evaluate("document.querySelector('.tag').classList.contains('on')")))
        pg.mouse.move(5, 5); pg.wait_for_timeout(200)
        res.append(('parade: crew head is top-most', top_el('#cars .car:first-child .rider.crew .head')))
        # car click -> hop (rig moves)
        car = '#cars .car:first-child .car-img'
        box = pg.evaluate("(() => { const r = document.querySelector('#cars .car:first-child').getBoundingClientRect(); return [r.left + r.width * .5, r.top + r.height * .8]; })()")
        pg.mouse.click(*box); pg.wait_for_timeout(120)
        res.append(('parade: car click -> hydraulic hop', pg.evaluate("gsap.getProperty(document.querySelector('#cars .car:first-child .rig'), 'y') < -5")))
        # arrival: walkers hoverable
        pg.evaluate("(() => { const p = document.querySelector('#parade'); scrollTo(0, p.offsetTop + (p.offsetHeight - innerHeight) * .78); })()"); pg.wait_for_timeout(1500)
        vis = pg.evaluate("[...document.querySelectorAll('.walker')].filter(w => +getComputedStyle(w).opacity > .5).length")
        res.append((f'arrival: walkers visible ({vis})', vis > 0))
        res.append(('arrival: paparazzi head is top-most', top_el('.pap .head')))
        # deal: 'Подробнее' opens on click
        pg.evaluate("scrollTo(0, document.querySelector('.cards').offsetTop + document.querySelector('#deal').offsetTop - 100)"); pg.wait_for_timeout(1200)
        pg.click('.card summary'); pg.wait_for_timeout(200)
        res.append(('deal: details opens', pg.evaluate("document.querySelector('.card details').open")))
        # hero sun -> foot
        pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(1600)
        pt = pg.evaluate("""(() => { const s = document.querySelector('.disco'), r = s.getBoundingClientRect();
            const x = r.left + r.width / 2, y = r.top + r.height * .75; return document.elementFromPoint(x, y) === s ? [x, y] : null; })()""")
        res.append(('hero: disco ball is clickable', pt is not None))
        if pt: pg.mouse.click(*pt)
        pg.wait_for_timeout(300)
        res.append(('hero: disco click -> foot', pg.evaluate("getComputedStyle(document.querySelector('#foot')).visibility === 'visible'")))
        res.append(('no JS errors', not errs))
        b.close()
    for name, ok in res:
        print('PASS' if ok else 'FAIL', '-', name)
    if errs: print(errs)

run()
