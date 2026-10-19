  /* ---------------- 2. PARADE: drive past Nuanu, arrive at Luna, red carpet ---------------- */
  const T = window.TALENTS;
  const HOST = { name: 'Mr. G', host: true, heads: ['mrg'] };
  const CREW_TAG = { name: 'Film crew', crew: true };
  const PAP_TAG = { name: 'Paparazzi', crew: true };
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
        if (tag.tt) img.addEventListener('click', e => { e.stopPropagation(); open(`https://www.tiktok.com/@${tag.tt}`, '_blank', 'noopener'); });
      }
    });
    let cam = null;
    if (kit) {
      const k = KITS[kit], cw = .44;
      cam = document.createElement('img');
      cam.className = 'cam'; cam.src = `assets/${k.prop}.webp`; cam.alt = '';
      Object.assign(cam.style, { width: cw * 100 + '%', left: (neckX + side * .3 - cw / 2) * 100 + '%', bottom: `calc(${(1 - nk.y) * 100}% + ${headW * 22}%)` });
      if (k.mirror === (side > 0)) cam.style.scale = '-1 1';
      el.appendChild(cam);
      puppets.push({ el: cam, amp: 3, cam: true });
      cam._kit = k;
    }
    return { el, heads: hs, cam };
  }

  // South Park style: every few frames each cut-out snaps to a slightly different pose; cameras go up and down
  setInterval(() => {
    for (const p of puppets) {
      if (p.cam && Math.random() < .3) p.up = !p.up;
      const r = (Math.random() - .5) * 2.4 * p.amp, dx = (Math.random() - .5) * 2;
      p.el.style.rotate = r.toFixed(1) + 'deg';
      p.el.style.translate = p.cam ? `${dx.toFixed(1)}px ${p.up ? -14 : 0}%` : `${dx.toFixed(1)}px 0`;
    }
  }, 160);

  const flash = (cam, car) => {
    if (!cam) return;
    const k = cam._kit, burst = document.createElement('div');
    burst.className = 'burst on';
    const r = cam.getBoundingClientRect(), host = cam.offsetParent.getBoundingClientRect(), sc = r.width / cam.offsetWidth || 1;
    burst.style.left = (r.left - host.left + r.width * (cam.style.scale ? .25 : .75)) / sc + 'px';
    burst.style.top = (r.top - host.top + r.height * .3) / sc + 'px';
    cam.offsetParent.appendChild(burst);
    if (k.fire) cam.src = `assets/${k.fire}.webp`;
    car && car.classList.add('flash');
    sfx.shutter();
    setTimeout(() => { burst.remove(); if (k.fire) cam.src = `assets/${k.prop}.webp`; car && car.classList.remove('flash'); }, 150);
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
  cars[0].stop = DOOR_X - 330 - cars[0].w;
  cars[1].stop = cars[0].stop - 70 - cars[1].w;
  cars[2].stop = cars[1].stop - 70 - cars[2].w;
  // start positions: off-screen left, far apart, so they roll in one after another
  cars[0].start = -cars[0].w - 60;
  cars[1].start = cars[0].start - cars[1].w - 520;
  cars[2].start = cars[1].start - cars[2].w - 520;

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
  const PAPS = [
    { face: 'crew_0', kit: 'dslr', body: 'bodyA_1', x: lead.stop + lead.w * .55, side: 1 },
    { face: 'crew_7', kit: 'slr', body: 'bodyB_3', x: lead.stop + lead.w * .85, side: 1 },
    { face: 'crew_2', kit: 'phoneBack', body: 'bodyA_3', x: DOOR_X - 140, side: 1 },
    { face: 'crew_6', kit: 'compact', body: 'bodyB_0', x: DOOR_X + 150, side: -1 },
    { face: 'crew_3', kit: 'dslr', body: 'bodyA_2', x: DOOR_X + 330, side: -1 },
  ];
  const paps = PAPS.map(pp => {
    const p = person({ body: pp.body, heads: [pp.face], kit: pp.kit, side: pp.side, badge: true, cls: 'pap', headW: .78, tag: PAP_TAG });
    Object.assign(p.el.style, { width: '150px', left: pp.x - 75 + 'px', bottom: '-70px' });
    $('#paparazzi').appendChild(p.el);
    return p;
  });

  /* stage scaling + scroll timeline */
  const stage = $('#stage'), planes = { far: $('#plFar'), mid: $('#plMid'), near: $('#plNear'), front: $('#plFront') };
  $('#statue').style.left = '2300px';
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
    const sc = innerHeight / 900, viewW = innerWidth / sc;
    stage.style.transform = `scale(${sc})`;
    const camEnd = DOOR_X + 120 - viewW * .62;
    $('#wire').style.left = camEnd * .3 + viewW * .05 + 'px';
    const prog = paradeTl ? paradeTl.scrollTrigger.progress : 0;
    if (paradeTl) { paradeTl.scrollTrigger.kill(); paradeTl.kill(); }
    cars.forEach(c => gsap.set(c.el, { x: c.start }));
    const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: applyCam });
    // 0-2: cars roll in one after another; 2-6.5: the camera follows the convoy past the Nuanu head to Luna
    cars.forEach((c, i) => tl.to(c.el, { x: Math.min(c.stop, 380 - i * (c.w + 70)), duration: 2, ease: 'power1.out' }, i * .35));
    tl.to(cam, { x: camEnd, duration: 4.5, ease: 'power1.inOut' }, 2);
    cars.forEach((c, i) => tl.to(c.el, { x: c.stop, duration: 4.5 + i * .3, ease: 'power2.inOut' }, 2));
    tl.to('#paradeCopy', { opacity: 0, y: -40, duration: .6, ease: 'steps(4)' }, 5.6);
    tl.to('#parade .night', { opacity: .62, duration: 1.4 }, 5);
    tl.to('#wire', { opacity: 1, duration: 1.2, ease: 'steps(6)' }, 5.4);
    // 6.6-7.4: red carpet, ropes and the paparazzi pop up
    tl.to(carpet, { scaleX: 1, duration: .8, ease: 'steps(8)' }, 6.6);
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
    ScrollTrigger.create({ trigger: '#parade', start: 'top top', end: 'bottom bottom', scrub: .5, animation: tl });
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

