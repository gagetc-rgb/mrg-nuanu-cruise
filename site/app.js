/* Mr. G — The Nuanu Cruise. Vanilla JS + GSAP ScrollTrigger. */
(() => {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });   // tablet address bar must not re-layout the scenes
  // smooth wheel scrolling (mouse wheel jumps 100px per notch otherwise); touch keeps native scrolling
  if (window.Lenis) {
    const lenis = new Lenis({ duration: .9, smoothWheel: true, syncTouch: false });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); lenis.scrollTo(a.getAttribute('href')); }));
  }

  // which sections are on screen: animations elsewhere sleep
  const onScreen = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? onScreen.add(e.target.id) : onScreen.delete(e.target.id)));
  document.querySelectorAll('section').forEach(s => io.observe(s));
  const secOf = el => (el.closest('section') || {}).id;
  let touchMode = false;
  addEventListener('pointerdown', e => { touchMode = e.pointerType !== 'mouse'; }, { capture: true, passive: true });
  const $ = (s, el = document) => el.querySelector(s);
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' млн' : n >= 1e3 ? Math.round(n / 1e3) + ' тыс.' : String(n);
  const jerky = 'steps(5)';              // cut-out animation feel
  $('#year').textContent = new Date().getFullYear();

  /* ---------------- sound (synthesised, off by default) ---------------- */
  let ctx = null, soundOn = false;
  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', soundOn);
    soundBtn.querySelector('span').textContent = soundOn ? 'вкл' : 'выкл';
    if (soundOn && !ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (soundOn) sfx.boing();
  });
  const tone = (type, f0, f1, dur, vol = .15, delay = 0) => {
    if (!soundOn || !ctx) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
  };
  const sfx = {
    honk: () => { tone('square', 420, 400, .22, .08); tone('square', 520, 500, .22, .06); tone('square', 420, 400, .3, .08, .28); tone('square', 520, 500, .3, .06, .28); },
    boing: () => tone('sine', 180, 720, .28, .2),
    pop: () => tone('triangle', 900, 300, .12, .12),
    shutter: () => { tone('square', 2400, 1800, .03, .05); tone('square', 1600, 1200, .04, .05, .05); },
    crank: () => { for (let i = 0; i < 5; i++) tone('square', 1400, 900, .03, .05, i * .07); },
    stomp: () => { tone('sawtooth', 90, 30, .5, .3); tone('square', 60, 25, .45, .2); },
  };

  /* ---------------- bobble-head spring physics ---------------- */
  const springs = [];
  const addSpring = (el, k = 90, damp = 5) => { const s = { el, a: 0, v: 0, k, damp, lift: 0, drawn: '' }; springs.push(s); return s; };
  const kick = (s, amount) => { s.v += amount; };
  let lastT = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now(), dt = Math.min(.033, (now - lastT) / 1000); lastT = now;
    for (const s of springs) {
      if (!s.sec) s.sec = secOf(s.el);
      if (!onScreen.has(s.sec)) continue;
      if (Math.abs(s.a) < .05 && Math.abs(s.v) < .05) { s.a = 0; s.v = 0; } else {
        s.v += (-s.k * s.a - s.damp * s.v) * dt;
        s.a += s.v * dt;
      }
      const sx = s.el.dataset.mirror ? -(1 + s.lift) : 1 + s.lift;   // mirrored cameras keep facing the stars
      const tf = `rotate(${s.a.toFixed(1)}deg) scale(${sx}, ${1 + s.lift})`;
      if (tf !== s.drawn) { s.el.style.transform = tf; s.drawn = tf; }   // write only when something changed
    }
  });
  // scroll velocity shakes every head a little
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const d = scrollY - lastY; lastY = scrollY;
    if (Math.abs(d) > 2) springs.forEach((s, i) => onScreen.has(s.sec) && kick(s, Math.max(-40, Math.min(40, d * .6)) * (i % 2 ? 1 : -.8)));
  }, { passive: true });

  /* ---------------- talent tag ---------------- */
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.innerHTML = '<img class="tape" src="assets/paper_2.webp" alt=""><b></b><div class="big"></div><small></small>';
  const em = n => `<em>${fmt(n)}</em>`;
  document.body.appendChild(tag);
  const showTag = (t, e) => {
    tag.querySelector('b').textContent = t.name;
    tag.querySelector('.big').innerHTML = t.crew ? 'Снимает всё' : t.host ? 'Ваш хост' : fmt(t.ig_f + t.tt_f) + '<i>подписчиков</i>';
    tag.querySelector('small').innerHTML = t.crew ? 'Готовые ролики для блогеров — наша работа.' : t.host ? 'Единственный, кому вы платите' :
      `Instagram ${em(t.ig_f)}<br>TikTok ${em(t.tt_f)}`;
    moveTag(e); tag.classList.add('on');
  };
  const moveTag = e => {
    const x = Math.min(innerWidth - 230, e.clientX + 18), y = Math.max(10, e.clientY - 150);
    tag.style.left = x + 'px'; tag.style.top = y + 'px';
  };
  let tagOwner = null;
  const hideTag = () => { tag.classList.remove('on'); tagOwner = null; };
  addEventListener('scroll', () => touchMode && tag.classList.contains('on') && hideTag(), { passive: true });

  /* ---------------- 1. HERO ---------------- */
  // the foreground is one 1600x900 composition: scale it to fit the window, never let pieces drift into each other
  const fitHero = () => {
    const stacked = innerWidth < 760 || innerHeight > innerWidth * 1.05;
    $('#hero').classList.toggle('stacked', stacked);
    $('#heroStage').style.setProperty('--hs', stacked ? 1 : Math.min(innerWidth / 1600, innerHeight / 900));
  };
  fitHero(); addEventListener('resize', fitHero);
  const A = window.ANCHORS;
  const mrgEl = $('#mrg'), mrgHead = $('.mrg-head'), mrgA = A.mrg.mrg_welcome;
  mrgEl.style.setProperty('--mrg-ar', mrgA.ar);
  // photo head ~2.3x the placeholder width, chin sitting on the placeholder's neck
  const HEAD_W = .4, headH = HEAD_W * mrgA.ar;              // head image is ~square
  const chinY = mrgA.top + (mrgA.chin - mrgA.top) * .75;     // placeholder chin, fraction of body height
  Object.assign(mrgHead.style, {
    width: HEAD_W * 100 + '%', left: (mrgA.cx - HEAD_W / 2) * 100 + '%', top: (chinY - .86 * headH) * 100 + '%',
  });
  const mrgSpring = addSpring(mrgHead, 70, 4);
  const lines = ['Цель — 100 млн органических просмотров за 6 месяцев.', 'Первый месяц — бесплатно.', 'Я звоню друзьям — они приезжают.'];
  let li = 0;
  mrgEl.addEventListener('click', () => {
    kick(mrgSpring, 260); sfx.boing();
    li = (li + 1) % lines.length;
    const p = $('.bubble p', mrgEl);
    gsap.fromTo('.mrg .bubble', { scale: .6, rotate: -14 }, { scale: 1, rotate: -4, duration: .3, ease: jerky });
    p.textContent = lines[li];
  });
  mrgEl.addEventListener('mouseenter', () => kick(mrgSpring, 120));

  const intro = gsap.timeline({ delay: .2, paused: true });
  window.__startIntro = () => intro.play();
  // after the warm-up pass: rewind the one-shot reveal animations so they play for the viewer
  window.__resetReveals = () => ScrollTrigger.getAll().forEach(st => { if (!st.vars.scrub && st.animation) st.animation.progress(0).pause(); });
  // curtains: start closed in the middle of the stage, part to the sides, keep ~15vw of fabric visible
  const curtainPos = () => {
    const w = $('.curtain.cl').offsetWidth || 380, keep = innerWidth * .15;
    return { open: Math.min(0, keep - w), shut: innerWidth * .5 - w };
  };
  const cp = curtainPos();
  gsap.set('.curtain.cr', { scaleX: -1 });
  gsap.set('.curtain.cl', { x: cp.open }); gsap.set('.curtain.cr', { x: -cp.open });
  addEventListener('resize', () => { const c = curtainPos(); gsap.set('.curtain.cl', { x: c.open }); gsap.set('.curtain.cr', { x: -c.open }); });
  intro.from('.curtain.cl', { x: cp.shut, duration: 1.2, ease: 'steps(8)' }, 0)
       .from('.curtain.cr', { x: -cp.shut, duration: 1.2, ease: 'steps(8)' }, 0)
       .from('.hero-sky .sun', { yPercent: 60, duration: 1.4, ease: 'steps(7)' }, .2)
       .from('.mrg', { xPercent: 120, rotate: 12, duration: .9, ease: 'steps(6)' }, .6)
       .from('.meme', { y: -260, rotate: -20, duration: .5, ease: 'steps(5)' }, .7)
       .from('.hero-copy > *', { y: -60, opacity: 0, stagger: .18, duration: .5, ease: jerky }, 1)
       .from('.mrg .bubble', { scale: 0, duration: .3, ease: jerky }, 1.6);
  gsap.to('.disco', { rotate: 6, duration: 1.2, ease: 'steps(4)', yoyo: true, repeat: -1, transformOrigin: '50% 0' });
  gsap.fromTo('.flyer.f1', { x: 0 }, { x: () => innerWidth * 1.3, y: -40, duration: 16, ease: 'steps(80)', repeat: -1, delay: 2 });
  gsap.fromTo('.flyer.f2', { x: 0 }, { x: () => innerWidth * 1.3, y: 60, duration: 22, ease: 'steps(90)', repeat: -1, delay: 9 });
  gsap.to('.hero-sky .cloud', { x: '+=40', duration: 4, ease: 'steps(8)', yoyo: true, repeat: -1, stagger: 1.3 });
  // mouse parallax
  $('#hero').addEventListener('mousemove', e => {
    const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
    gsap.to('.hero-sky .sun', { x: dx * 30, y: dy * 20, duration: .4 });
    gsap.to('.hero-sky .cloud', { xPercent: dx * -12, duration: .5 });
    gsap.to('.mrg', { x: dx * -18, duration: .5 });
  });
  // the sun is a button: the foot of fate
  const sun = $('.hero-sky .sun');
  sun.style.pointerEvents = 'auto'; sun.style.cursor = 'pointer'; sun.title = 'Не нажимайте на солнце';
  $('.hero-sky').style.pointerEvents = 'none';
  sun.addEventListener('click', () => stomp());
  const disco = $('.disco');
  disco.style.cursor = 'pointer'; disco.title = 'Не трогайте диско-шар';
  disco.addEventListener('click', () => stomp());
  function stomp(target) {
    if (window.__warming) return;
    if (target && target.getBoundingClientRect) {
      const t = target.getBoundingClientRect();
      if (t.bottom < 40 || t.top > innerHeight - 40) return;   // only land on something the viewer can see
    }
    sfx.stomp();
    // aim the foot at an element when given one (it lands on it), otherwise at the page centre
    const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    const foot = $('#foot'), fw = foot.offsetWidth || 400, fh = foot.offsetHeight || 600;
    gsap.set(foot, { left: r ? r.left + r.width / 2 : innerWidth / 2, top: r ? Math.max(0, r.top + r.height * .55 - fh) : 0 });
    gsap.timeline()
      .set('#foot', { xPercent: -50, yPercent: -110, visibility: 'visible' })
      .to('#foot', { yPercent: 0, duration: .25, ease: 'steps(3)' })
      .add(() => { document.body.classList.add('shake'); springs.forEach(s => kick(s, 300 * (Math.random() - .5))); })
      .to('#foot', { yPercent: -110, duration: .5, ease: 'steps(4)', delay: .35 })
      .add(() => document.body.classList.remove('shake'))
      .set('#foot', { visibility: 'hidden' });
  }

  /* ---------------- 2. PARADE: drive past Nuanu, arrive at Luna, red carpet ---------------- */
  const T = window.TALENTS;
  const HOST = { name: 'Mr. G', host: true, heads: ['mrg'] };
  const CREW_TAG = { name: 'Съёмочная группа', crew: true };
  const PAP_TAG = { name: 'Съёмочная группа', crew: true };
  const NECK_FIX = { bodyB_2: { x: .5, y: .27 } };
  const neckOf = b => ({ ...A.bodies[b], ...(NECK_FIX[b] || {}) });
  const KITS = {
    dslr: { prop: 'cam_0', fire: 'cam_1', mirror: true },   // lens drawn pointing left: mirror to aim right
    slr: { prop: 'cam_5', mirror: true },
    compact: { prop: 'cam_4' },
    phone: { prop: 'cam_7' },
    phoneBack: { prop: 'cam_6' },
    leica: { prop: 'cam_2' },
  };
  Object.values(KITS).forEach(k => k.fire && (new Image().src = `assets/${k.fire}.webp`));

  /* a cut-out person: body sprite + photo head(s) + optional camera held beside the face */
  const puppets = [];
  function person({ body, heads = [], kit = null, side = 1, badge = false, mirror = false, cls, headW = .8, tag }) {
    const nk = neckOf(body), el = document.createElement('div');
    el.className = cls; el.style.aspectRatio = nk.ar;
    el.innerHTML = `<img class="body" src="assets/${body}.webp" alt=""${mirror ? ' style="scale:-1 1"' : ''}>` + (badge ? '<span class="crew-badge">Crew</span>' : '');
    puppets.push({ el: el.firstElementChild, amp: kit ? 1.8 : 1 });
    const neckX = mirror ? 1 - nk.x : nk.x, n = heads.length, hs = [];
    heads.forEach((h, i) => {
      const img = document.createElement('img');
      img.className = 'head'; img.src = `assets/heads/${h}.webp`; img.alt = tag ? tag.name : '';
      Object.assign(img.style, { width: headW * 100 + '%', left: (neckX - headW / 2 + (i - (n - 1) / 2) * .5) * 100 + '%', bottom: `calc(${(1 - nk.y) * 100}% - ${headW * 12}%)` });
      el.appendChild(img); hs.push(img);
      const s = addSpring(img, 60 + Math.random() * 40, 3 + Math.random() * 2);
      if (tag) {
        img.addEventListener('mouseenter', e => { kick(s, 180); s.lift = .28; el.style.zIndex = 9; showTag(tag, e); sfx.pop(); });
        img.addEventListener('mousemove', moveTag);
        img.addEventListener('mouseleave', () => { s.lift = 0; el.style.zIndex = ''; hideTag(); });
        img.addEventListener('click', e => {
          e.stopPropagation();
          if (touchMode && tagOwner !== img) { tagOwner = img; kick(s, 180); showTag(tag, e); sfx.pop(); return; }
          if (tag.tt) open(`https://www.tiktok.com/@${tag.tt}`, '_blank', 'noopener');
        });
      }
    });
    let cam = null;
    if (kit) {
      const k = KITS[kit], cw = .44;
      cam = document.createElement('img');
      cam.className = 'cam'; cam.src = `assets/${k.prop}.webp`; cam.alt = '';
      Object.assign(cam.style, { width: cw * 100 + '%', left: (neckX + side * .46 - cw / 2) * 100 + '%', bottom: `calc(${(1 - nk.y) * 100}% + ${headW * 22}%)` });
      if (k.mirror === (side > 0)) cam.style.scale = '-1 1';
      el.appendChild(cam);
      puppets.push({ el: cam, amp: 3, cam: true });
      cam._kit = k;
    }
    return { el, heads: hs, cam };
  }

  // South Park style: every few frames each cut-out snaps to a slightly different pose; cameras go up and down
  setInterval(() => {
    if (!onScreen.has('parade')) return;
    for (const p of puppets) {
      if (p.cam && Math.random() < .3) p.up = !p.up;
      const r = (Math.random() - .5) * 2.4 * p.amp, dx = (Math.random() - .5) * 2;
      p.el.style.rotate = r.toFixed(1) + 'deg';
      p.el.style.translate = p.cam ? `${dx.toFixed(1)}px ${p.up ? -14 : 0}%` : `${dx.toFixed(1)}px 0`;
    }
  }, 160);

  const flash = (cam, car) => {
    if (!cam) return;
    const k = cam._kit;
    if (!cam._burst) {
      const b = document.createElement('div'); b.className = 'burst';
      const host = cam.parentElement; host.appendChild(b);
      Object.assign(b.style, { left: parseFloat(cam.style.left) + (cam.style.scale ? 10 : 34) + '%', bottom: cam.style.bottom });
      cam._burst = b;
    }
    cam._burst.classList.add('on');
    if (k.fire) cam.src = `assets/${k.fire}.webp`;
    car && car.classList.add('flash');
    sfx.shutter();
    setTimeout(() => { cam._burst.classList.remove('on'); if (k.fire) cam.src = `assets/${k.prop}.webp`; car && car.classList.remove('flash'); }, 150);
  };

  /* world layout, in stage units (stage = 1600 x 900) */
  const E = 5600, ENT_W = 600 * 1000 / 822, DOOR_X = E + ENT_W * .3, CAR_H = 200, GROUND = 830;
  const CARS = [
    { img: 'car_gold', crew: { x: .17, face: 'crew_4', kit: 'dslr' }, seats: [{ x: .61, body: 'bodyA_0', host: true }, { x: .53 }, { x: .45 }, { x: .37 }, { x: .29 }] },
    { img: 'car_pink', crew: { x: .175, face: 'crew_1', kit: 'phone' }, seats: [{ x: .61, body: 'bodyA_0' }, { x: .545 }, { x: .48 }, { x: .415 }, { x: .35 }, { x: .285 }] },
    { img: 'car_white', crew: { x: .12, face: 'crew_5', kit: 'leica' }, seats: [{ x: .57, body: 'bodyA_0' }, { x: .49 }, { x: .41 }, { x: .33 }, { x: .25 }] },
  ];
  const BODIES = ['bodyA_1', 'bodyB_0', 'bodyA_3', 'bodyB_2', 'bodyA_2', 'bodyB_1', 'bodyB_3'];
  const RIDER_W = .17;
  const carsEl = $('#cars'), walkersEl = $('#walkers');
  let ti = 0, bi = 0;
  const cars = CARS.map((c, ci) => {
    const w = CAR_H * A.cars[c.img];
    const car = document.createElement('div');
    car.className = 'car';
    car.style.setProperty('--car-ar', A.cars[c.img]);
    car.innerHTML = `<div class="rig"><div class="riders"></div><img class="car-img" src="assets/${c.img}.webp" alt="Cadillac convertible"></div>`;
    const riders = $('.riders', car), seated = [];
    if (c.crew) {
      const p = person({ body: 'bodyB_1', heads: [c.crew.face], kit: c.crew.kit, badge: true, cls: 'rider crew', headW: .74, tag: CREW_TAG });
      Object.assign(p.el.style, { left: (c.crew.x - RIDER_W / 2) * 100 + '%', width: RIDER_W * 100 + '%', bottom: '70%' });
      riders.appendChild(p.el);
      c.crewCam = p.cam;
    }
    [...c.seats].reverse().forEach((seat, si) => {
      const t = seat.host ? HOST : T[ti++];
      if (!t) return;
      const body = seat.body || BODIES[bi++ % BODIES.length], mirror = !seat.body && si % 2 === 1;
      const p = person({ body, heads: t.heads, mirror, cls: 'rider', headW: t.host ? .9 : .8, tag: t });
      Object.assign(p.el.style, { left: (seat.x - RIDER_W / 2) * 100 + '%', width: RIDER_W * 100 + '%', bottom: '60%' });
      riders.appendChild(p.el);
      seated.push({ seat, t, body, mirror, el: p.el });
    });
    const rig = $('.rig', car);
    const hop = big => gsap.timeline()
      .to(rig, { y: big ? -60 : -12, rotate: big ? -3 : 0, duration: big ? .18 : .12, ease: 'steps(3)' })
      .to(rig, { y: 0, rotate: 0, duration: big ? .3 : .16, ease: 'steps(4)' })
      .add(() => springs.forEach(s => riders.contains(s.el) && kick(s, (big ? 260 : 90) * (Math.random() - .3))), big ? .2 : .1);
    gsap.delayedCall(1 + ci * .9, function loop() { hop(false); gsap.delayedCall(2.4 + Math.random() * 2, loop); });
    car.addEventListener('click', () => { hop(true); sfx.honk(); });
    carsEl.appendChild(car);
    return { ...c, el: car, w, seated };
  });

  // parking spots: the gold car stops just before the club, the others queue behind it
  cars[0].stop = DOOR_X - 230 - cars[0].w;
  cars[1].stop = cars[0].stop - 70 - cars[1].w;
  cars[2].stop = cars[1].stop - 70 - cars[2].w;
  // start positions: off-screen left, far apart, so they roll in one after another
  cars[0].start = -cars[0].w - 60;
  cars[1].start = cars[0].start - cars[1].w - 140;
  cars[2].start = cars[1].start - cars[2].w - 140;

  // walkers: copies of the gold car's riders that get out and walk the carpet
  const lead = cars[0];
  const walkers = lead.seated.slice().reverse().map(({ seat, t, body, mirror }) => {
    const p = person({ body, heads: t.heads, mirror, cls: 'walker', headW: t.host ? .9 : .8, tag: t });
    const w = RIDER_W * lead.w;
    Object.assign(p.el.style, { width: w + 'px', left: '0px', top: '0px' });
    walkersEl.appendChild(p.el);
    return { el: p.el, x0: lead.stop + seat.x * lead.w - w / 2, w };
  });

  // velvet ropes along the carpet, paparazzi in front of them
  const ropes = $('#ropes');
  for (let i = 0; i < 6; i++) { const r = document.createElement('img'); r.src = 'assets/props_4.webp'; r.alt = ''; ropes.appendChild(r); }
  ropes.style.left = lead.stop + lead.w - 40 + 'px';
  const carpet = $('#carpet');
  carpet.style.left = lead.stop + lead.w * .45 + 'px';
  carpet.style.width = DOOR_X - (lead.stop + lead.w * .45) + 40 + 'px';
  const roll = $('#carpetRoll');
  roll.style.left = lead.stop + lead.w * .45 - 40 + 'px';
  const PAPS = [
    { face: 'crew_0', kit: 'dslr', body: 'bodyA_1', x: lead.stop + lead.w * .55, side: 1 },
    { face: 'crew_7', kit: 'slr', body: 'bodyB_3', x: lead.stop + lead.w * .85, side: 1 },
    { face: 'crew_2', kit: 'phoneBack', body: 'bodyA_3', x: DOOR_X - 140, side: 1 },
    { face: 'crew_6', kit: 'compact', body: 'bodyB_0', x: DOOR_X + 150, side: -1 },
    { face: 'crew_3', kit: 'dslr', body: 'bodyA_2', x: DOOR_X + 330, side: -1 },
  ];
  const paps = PAPS.map(pp => {
    const p = person({ body: pp.body, heads: [pp.face], kit: pp.kit, side: pp.side, badge: true, cls: 'pap', headW: .78, tag: PAP_TAG });
    Object.assign(p.el.style, { width: '135px', left: pp.x - 68 + 'px', bottom: '6px' });
    $('#paparazzi').appendChild(p.el);
    return p;
  });

  /* stage scaling + scroll timeline */
  const stage = $('#stage'), planes = { far: $('#plFar'), mid: $('#plMid'), near: $('#plNear'), front: $('#plFront') };
  $('#statue').style.left = '1050px';
  $('#entrance').style.left = E + 'px';
  const cam = { x: 0 };
  const applyCam = () => {
    gsap.set(planes.far, { x: -cam.x * .3 });
    gsap.set(planes.mid, { x: -cam.x * .62 });
    gsap.set(planes.near, { x: -cam.x * .85 });
    gsap.set(planes.front, { x: -cam.x });
  };
  const total = T.reduce((s, t) => s + t.ig_f + t.tt_f, 0);
  const followers = $('#followers');
  let paradeTl = null, sceneLive = false;

  function buildParade() {
    // fit the 1600x900 stage by height, but on portrait screens keep at least ~1000 units of road in view
    const sc = Math.min(innerHeight / 900, innerWidth / 1000), viewW = innerWidth / sc;
    stage.style.transform = `scale(${sc})`;
    stage.style.top = innerHeight - 900 * sc + 'px';
    const camEnd = Math.max(cars[0].stop - 30, DOOR_X + 260 - viewW);   // gold car on the left, club door in frame
    // Luna statue: big, glowing, framed between the gold car and the club at the end of the drive
    $('#wire').style.left = camEnd * .85 + viewW * .02 + 'px';
    const prog = paradeTl ? paradeTl.scrollTrigger.progress : 0;
    if (paradeTl) { paradeTl.scrollTrigger.kill(); paradeTl.kill(); }
    cars.forEach(c => gsap.set(c.el, { x: c.start }));
    const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: applyCam });
    // 0-2.6: the camera holds, the convoy rolls past the Nuanu head one car after another
    const pass = viewW + 300;
    cars.forEach(c => tl.to(c.el, { x: c.start + pass, duration: 2.6 }, 0));
    // 2.6-6.5: the camera catches up and follows the convoy to Luna Beach Club
    tl.to(cam, { x: camEnd, duration: 3.9, ease: 'power1.inOut' }, 2.6);
    cars.forEach((c, i) => tl.to(c.el, { x: c.stop, duration: 3.9, ease: 'power2.out' }, 2.6));
    tl.to('#paradeCopy', { opacity: 0, y: -40, duration: .6, ease: 'steps(4)' }, 5.6);
    tl.to('#parade .night', { opacity: .62, duration: 1.4 }, 5);
    tl.to('#wire', { opacity: 1, duration: 1.2, ease: 'steps(6)' }, 5.4);
    // 6.6-7.4: red carpet, ropes and the paparazzi pop up
    tl.to(carpet, { scaleX: 1, duration: .8, ease: 'steps(8)' }, 6.6);
    tl.set(roll, { opacity: 1, x: 0 }, 6.6);
    tl.to(roll, { x: parseFloat(carpet.style.width) - 20, rotate: 720, duration: .8, ease: 'steps(8)' }, 6.6);
    tl.to(roll, { opacity: 0, duration: .1 }, 7.4);
    tl.from('#ropes img', { y: 170, stagger: .08, duration: .3, ease: 'steps(3)' }, 6.7);
    tl.from(paps.map(p => p.el), { y: 320, stagger: .12, duration: .4, ease: 'steps(4)' }, 6.8);
    // 7.6: the gold car's riders get out and walk the carpet into the club, one by one
    tl.set(lead.seated.map(s => s.el), { opacity: 0 }, 7.6);
    walkers.forEach((wk, i) => {
      const start = 7.6 + i * .55;
      tl.set(wk.el, { opacity: 1, x: wk.x0, y: GROUND - CAR_H * .6 }, 7.6);
      tl.to(wk.el, { x: DOOR_X - wk.w / 2 + (i % 2 ? 12 : -12), y: 772, duration: 1.3, ease: 'steps(9)' }, start);
      tl.to(wk.el, { scale: .5, y: 700, opacity: 0, duration: .35, ease: 'steps(3)' }, start + 1.3);
    });
    // 10.4: the point of it all
    tl.fromTo('#caption', { opacity: 0, scale: .6, rotate: -8 }, { opacity: 1, scale: 1, rotate: -2, duration: .4, ease: 'steps(4)' }, 10.4);
    tl.to({}, { duration: .8 }, 11);
    // walker transforms are relative to their bottom-left: convert the y targets into "bottom" space
    walkers.forEach(wk => gsap.set(wk.el, { yPercent: -100 }));
    tl.eventCallback('onUpdate', () => {
      applyCam();
      const t = tl.time();
      followers.textContent = fmt(Math.round(total * Math.min(1, t / 6)));
      sceneLive = t > 6.9 && t < 11;
    });
    paradeTl = tl;
    ScrollTrigger.create({ trigger: '#parade', start: 'top top', end: 'bottom bottom', scrub: .25, animation: tl });
    if (prog) tl.progress(prog);
  }
  buildParade();
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { buildParade(); ScrollTrigger.refresh(); }, 200); });

  // shutters: the in-car crew shoot while driving, the paparazzi go wild on the carpet
  gsap.delayedCall(2, function shutterLoop() {
    if (sceneLive) flash(paps[Math.floor(Math.random() * paps.length)].cam, null);
    else { const c = cars[Math.floor(Math.random() * cars.length)]; flash(c.crewCam, c.el); }
    gsap.delayedCall(sceneLive ? .25 + Math.random() * .5 : 1.6 + Math.random() * 2.4, shutterLoop);
  });

  /* ---------------- 3. DEAL ---------------- */
  gsap.to('.wire-ball', { rotate: 360, duration: 4, ease: 'steps(16)', repeat: -1 });
  gsap.from('.vip-pass', { y: -220, rotate: -25, ease: 'steps(6)', duration: .6, scrollTrigger: { trigger: '#deal', start: 'top 75%' } });
  // the foot of fate: slams the free-month pass when it arrives, and on demand
  let passHit = false;
  ScrollTrigger.create({ trigger: '.vip-pass', start: 'top 55%', onEnter: () => { if (window.__warming || passHit) return; passHit = true; setTimeout(() => stomp($('.vip-pass')), 650); } });
  $('.vip-pass').addEventListener('click', () => stomp($('.vip-pass')));
  gsap.from('.card', { y: 80, rotate: 6, opacity: 0, stagger: .15, duration: .45, ease: jerky, scrollTrigger: { trigger: '.cards', start: 'top 80%' } });
  gsap.from('.m', { scale: .6, opacity: 0, stagger: .2, duration: .4, ease: jerky, scrollTrigger: { trigger: '.months', start: 'top 80%' } });
  gsap.from('.zone', { scaleX: 0, transformOrigin: '0 50%', stagger: .25, duration: .4, ease: 'steps(5)', scrollTrigger: { trigger: '.ruler', start: 'top 85%' } });
  gsap.from('.card.wide', { y: 60, rotate: -5, opacity: 0, duration: .45, ease: jerky, scrollTrigger: { trigger: '.card.wide', start: 'top 85%' } });
  gsap.from('.road-signs li', { y: -60, opacity: 0, stagger: .15, duration: .35, ease: jerky, scrollTrigger: { trigger: '.plan', start: 'top 80%' } });

  /* ---------------- 4. THE BILL ---------------- */
  gsap.from('.giant-hand', { yPercent: -100, ease: 'steps(10)', scrollTrigger: { trigger: '#bill', start: 'top 80%', end: 'top 20%', scrub: true } });
  gsap.from('.receipt li, .receipt .total', {
    opacity: 0, x: -20, stagger: .12, duration: .2, ease: 'steps(2)',
    scrollTrigger: { trigger: '.receipt', start: 'top 65%' },
  });
  let stampHit = false;
  ScrollTrigger.create({ trigger: '.receipt .total', start: 'top 75%', onEnter: () => { if (window.__warming || stampHit) return; stampHit = true; stomp($('.stamp')); setTimeout(() => $('.stamp').classList.add('on'), 300); } });
  $('.stamp').addEventListener('click', () => stomp($('.stamp')));

  /* ---------------- 5. GATE ---------------- */
  const gateTl = gsap.timeline({ scrollTrigger: { trigger: '.gate-scene', start: 'top 60%', end: 'center center', scrub: .5 } });
  gateTl.to('.gate-half.left', { xPercent: -62, ease: 'steps(8)' }, 0)
        .to('.gate-half.right', { xPercent: 62, ease: 'steps(8)' }, 0)
        .from('.vip', { scale: .5, opacity: 0, ease: 'steps(8)' }, 0);
})();
