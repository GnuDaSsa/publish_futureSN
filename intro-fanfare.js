// intro-fanfare.js — 인트로 축포(팡파레) v4 — 시네마틱 카메라
// 내러티브: 걷던 시민이 고개를 돌린다(카메라 팬) → 멀리서 불꽃 → 하늘로 빨려들 듯
//           돌리-인(줌) → 머리 위 대폭발이 화면을 가득 → 타이포 줌-스루로 핸드오프
// 깊이 파랄랙스: 가까운 것(도시)일수록 카메라에 크게 반응
// window.IntroFanfare.start(duration) / #introCanvas
(function () {
  const canvas = document.querySelector('#introCanvas');
  const TAU = Math.PI * 2;
  const PALETTE = [
    [194, 100, 60], [350, 90, 62], [42, 100, 62], [152, 75, 58], [272, 85, 66],
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = t => Math.max(0, Math.min(1, t));

  function resize(ctx) {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { w, h };
  }

  function makeCity(w, h) {
    const buildings = [];
    let x = -w * 0.3; // 팬을 위해 좌우 여유
    while (x < w * 1.3) {
      const bw = w * rnd(0.03, 0.085);
      const bh = h * rnd(0.025, 0.085);
      const win = [];
      const cols = Math.max(1, bw / 14 | 0), rows = Math.max(1, bh / 16 | 0);
      for (let c = 0; c < cols; c += 1) for (let r = 0; r < rows; r += 1) {
        if (Math.random() < 0.18) win.push([(c + 0.5) / cols, (r + 0.55) / rows]);
      }
      buildings.push({ x, w: bw, h: bh, win });
      x += bw + w * rnd(0.001, 0.012);
    }
    const folks = [];
    for (let i = 0; i < 9; i += 1) {
      const b = buildings[(Math.random() * buildings.length) | 0];
      folks.push({ x: b.x + b.w * rnd(0.2, 0.8), base: b.h, s: rnd(0.8, 1.15), tilt: rnd(-0.18, 0.18) });
    }
    return { buildings, folks };
  }

  function start(duration = 3600) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let { w, h } = resize(ctx);
    let city = makeCity(w, h);

    const rockets = [];
    const sparks = [];
    let glowEnergy = 0, glowHue = 42;
    const t0 = performance.now();
    let prev = t0;

    // ── 카메라 ──────────────────────────────────────────────
    // p<0.2 : 고개 돌림(팬) + 걷는 보브 / 0.5~0.95 : 돌리-인(줌) 하늘로
    const FOCUS = { x: 0.5, y: 0.26 }; // 줌 타깃 (마지막 대폭발 지점)
    function camera(p) {
      const pan = (1 - easeOut(clamp01(p / 0.2))) * -w * 0.24; // 왼쪽에서 시선이 돌아온다
      const bob = Math.sin(p * 46) * h * 0.006 * (1 - clamp01(p / 0.24)); // 걸음 보브
      const z = 1 + easeInOut(clamp01((p - 0.52) / 0.42)) * 1.5;          // 줌 1→2.5
      return { pan, bob, z };
    }
    // 깊이별 파랄랙스 투영 (zoom은 FOCUS 중심)
    function proj(x, y, depth, cam) {
      const par = 0.25 + depth * 0.75;
      const zEff = 1 + (cam.z - 1) * (0.45 + depth * 0.55);
      const fx = FOCUS.x * w, fy = FOCUS.y * h;
      return {
        x: (x + cam.pan * par - fx) * zEff + fx,
        y: (y + cam.bob * par - fy) * zEff + fy,
        s: zEff,
      };
    }

    function launch(o) {
      const depth = o.depth != null ? o.depth : rnd(0.35, 0.75);
      const x = (o.x != null ? o.x : rnd(0.08, 0.92)) * w;
      const ty = (o.ty != null ? o.ty : rnd(0.2, 0.42)) * h;
      const y0 = h - h * rnd(0.01, 0.05);
      const g = h * 0.0003;
      const vy = -Math.sqrt(2 * g * Math.max(40, y0 - ty));
      const frames = -vy / g;
      const tx = (o.tx != null ? o.tx : (o.x != null ? o.x : 0.5) + rnd(-0.15, 0.15)) * w;
      rockets.push({
        x, y: y0, vx: (tx - x) / frames, vy,
        hsl: o.hsl || PALETTE[(Math.random() * PALETTE.length) | 0],
        depth, big: !!o.big,
      });
    }
    function burstAt(o) {
      explode({
        x: (o.x != null ? o.x : rnd(0.1, 0.9)) * w,
        y: (o.ty != null ? o.ty : rnd(0.12, 0.3)) * h,
        hsl: o.hsl || PALETTE[(Math.random() * PALETTE.length) | 0],
        depth: o.depth != null ? o.depth : rnd(0.06, 0.18),
        big: !!o.big,
      });
    }
    function explode(r) {
      const sc = 0.32 + r.depth * 0.85;
      const n = ((r.big ? 150 : 64) * (0.45 + r.depth * 0.8)) | 0;
      const base = Math.min(w, h) * (r.big ? 0.017 : 0.0105) * sc;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * TAU + rnd(-0.07, 0.07);
        const spd = base * Math.pow(Math.random(), 0.42) * rnd(0.55, 1);
        sparks.push({
          x: r.x, y: r.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          hsl: r.hsl, life: 1, decay: rnd(0.008, 0.018) / (0.6 + r.depth * 0.55),
          size: (1.1 + r.depth * 2.1) * (r.big ? 1.25 : 1),
          alpha: 0.5 + r.depth * 0.5, depth: r.depth,
          flicker: Math.random() < 0.45,
          crackle: r.depth > 0.5 && Math.random() < 0.1,
        });
      }
      glowEnergy = Math.min(2, glowEnergy + 0.25 + r.depth * 0.6);
      glowHue = r.hsl[0];
    }
    function crackle(p0) {
      for (let i = 0; i < 4; i += 1) {
        const a = Math.random() * TAU, spd = rnd(0.4, 1.4);
        sparks.push({
          x: p0.x, y: p0.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          hsl: [48, 100, 80], life: 0.6, decay: rnd(0.02, 0.04),
          size: 1.3, alpha: 1, depth: p0.depth, flicker: true, crackle: false,
        });
      }
    }

    // ── 콘티 (ms 기준, duration=3600 기준 스케일) ──
    // 팬이 끝나는 0.2 시점부터 원경 → 줌 시작(0.52) 이후엔 타깃 근처 근경 대폭발
    const D = duration / 3600;
    const cues = [
      [320,  () => { burstAt({ x: 0.74, ty: 0.18 }); burstAt({ x: 0.84, ty: 0.27 }); }], // 고개 돌리자 보이는 원경
      [520,  () => burstAt({ x: 0.63, ty: 0.13 })],
      [700,  () => launch({ depth: 0.45, x: 0.06, tx: 0.32, ty: 0.32 })], // 좌→우 사선
      [880,  () => { burstAt({ x: 0.2, ty: 0.16 }); burstAt({ x: 0.31, ty: 0.25 }); }],
      [1050, () => launch({ depth: 0.55, x: 0.93, tx: 0.66, ty: 0.36 })], // 우→좌 사선
      [1500, () => launch({ depth: 0.85, x: 0.44, tx: FOCUS.x, ty: FOCUS.y + 0.04, big: true })], // 줌 타깃으로
      [1900, () => burstAt({ x: FOCUS.x - 0.07, ty: FOCUS.y - 0.04, depth: 1.0, big: true, hsl: [48, 100, 72] })], // 초근경 골드
      [2250, () => burstAt({ x: FOCUS.x + 0.06, ty: FOCUS.y + 0.05, depth: 1.0, big: true })], // 초근경 — 화면 가득
    ];
    let cueIdx = 0;

    function frame(now) {
      const elapsed = now - t0;
      const p = elapsed / duration;
      const dt = Math.min(2.5, (now - prev) / 16.7);
      prev = now;
      if (canvas.width !== window.innerWidth) { ({ w, h } = resize(ctx)); city = makeCity(w, h); }
      const cam = camera(p);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      while (cueIdx < cues.length && elapsed >= cues[cueIdx][0] * D) { cues[cueIdx][1](); cueIdx += 1; }

      const g = h * 0.0003;
      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const r = rockets[i];
        r.x += r.vx * dt; r.y += r.vy * dt;
        r.vy += g * dt;
        sparks.push({
          x: r.x + rnd(-1, 1), y: r.y + rnd(0, 3),
          vx: rnd(-0.3, 0.3) - r.vx * 0.18, vy: rnd(0.2, 0.9),
          hsl: [40, 100, 78], life: 0.5, decay: rnd(0.04, 0.08),
          size: 0.8 + r.depth, alpha: 0.4 + r.depth * 0.5, depth: r.depth, flicker: false, crackle: false,
        });
        const pr = proj(r.x, r.y, r.depth, cam);
        ctx.fillStyle = `rgba(255,255,255,${0.5 + r.depth * 0.45})`;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, (1 + r.depth * 1.6) * pr.s, 0, TAU); ctx.fill();
        if (r.vy > -g * 3) { explode(r); rockets.splice(i, 1); }
      }

      const endFade = p > 0.9 ? Math.max(0, 1 - (p - 0.9) / 0.1) : 1;
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.vx *= Math.pow(0.985, dt); s.vy *= Math.pow(0.985, dt);
        s.vy += 0.045 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.life -= s.decay * dt;
        if (s.life <= 0) { if (s.crackle) crackle(s); sparks.splice(i, 1); continue; }
        let a = Math.min(1, s.life * 1.6) * endFade * s.alpha;
        if (s.flicker) a *= 0.45 + 0.55 * Math.abs(Math.sin((s.life * 24) + i));
        const L = s.hsl[2] + (96 - s.hsl[2]) * Math.max(0, s.life - 0.55) * 2;
        ctx.fillStyle = `hsla(${s.hsl[0]},${s.hsl[1]}%,${L}%,${a})`;
        const pr = proj(s.x, s.y, s.depth, cam);
        const sz = s.size * (0.5 + s.life * 0.7) * pr.s;
        if (sz > 3.2) { // 근접 입자는 원형 + 부드러운 가장자리
          ctx.beginPath(); ctx.arc(pr.x, pr.y, sz * 0.62, 0, TAU); ctx.fill();
        } else {
          ctx.fillRect(pr.x - sz / 2, pr.y - sz / 2, sz, sz);
        }
      }

      // ── 도시(최근경, 파랄랙스 최대) — 줌-인 시 아래로 빠져나간다
      ctx.globalCompositeOperation = 'source-over';
      glowEnergy *= Math.pow(0.95, dt);
      const cityDrop = (cam.z - 1) * h * 0.55;      // 줌이 깊어질수록 도시가 프레임 밖으로
      const cityPan = cam.pan * 1.12;               // 가장 가까워서 팬에 제일 크게 반응
      const cityFade = Math.max(0, 1 - (cam.z - 1) / 1.1);
      if (cityFade > 0.01) {
        ctx.save();
        ctx.globalAlpha = cityFade * endFade;
        ctx.translate(cityPan, cityDrop);
        if (glowEnergy > 0.02) {
          const gr = ctx.createLinearGradient(0, h - h * 0.22, 0, h);
          gr.addColorStop(0, 'rgba(0,0,0,0)');
          gr.addColorStop(1, `hsla(${glowHue},90%,62%,${Math.min(0.2, glowEnergy * 0.16)})`);
          ctx.fillStyle = gr;
          ctx.fillRect(-w * 0.3, h - h * 0.22, w * 1.6, h * 0.22);
        }
        ctx.fillStyle = 'rgba(3,6,12,0.92)';
        for (const b of city.buildings) ctx.fillRect(b.x, h - b.h, b.w, b.h + 2);
        ctx.fillStyle = 'rgba(255,196,110,0.34)';
        for (const b of city.buildings) for (const [u, v] of b.win) ctx.fillRect(b.x + u * b.w - 1, h - b.h + v * b.h - 1.5, 2, 3);
        ctx.fillStyle = 'rgba(2,4,9,0.95)';
        for (const f of city.folks) {
          const fx = f.x, fy = h - f.base, s = f.s;
          ctx.fillRect(fx - 2.4 * s, fy - 13 * s, 4.8 * s, 13 * s);
          ctx.beginPath(); ctx.arc(fx + f.tilt * 14 * s, fy - 15.5 * s, 3.1 * s, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }

      if (elapsed < duration + 900 && (p < 1 || sparks.length || rockets.length)) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    }
    requestAnimationFrame(frame);
  }

  window.IntroFanfare = { start };
})();
