// 살아있는 씬 레이어 — 지도 3D 틸트(스프링 물리) + 커서 추적 광원
// 파티클/배경은 webgl-bg.js(three.js)가 담당
(function () {
  const stage = document.querySelector('.stage');
  const shell = document.querySelector('.map-shell');
  if (!stage || !shell) return;
  // (모션이 작품의 본질이므로 reduce 설정으로 비활성화하지 않는다)

  function spring(stiffness, damping) {
    return { v: 0, x: 0, k: stiffness, d: damping,
      step(target, dt) {
        const f = (target - this.x) * this.k - this.v * this.d;
        this.v += f * dt;
        this.x += this.v * dt;
        return this.x;
      } };
  }

  const px = { t: .5, c: .5 };
  const py = { t: .5, c: .5 };
  const sRotX = spring(46, 11);
  const sRotY = spring(46, 11);
  const sParX = spring(30, 9);
  const sParY = spring(30, 9);
  let pointerActive = false;
  let lightFade = 0;

  // v2: 마우스 미사용 확정 — 커서 추적 틸트/광원 비활성 (아이들 모션은 bob만 유지)
  const MOUSE_ENABLED = false;
  if (MOUSE_ENABLED) {
    window.addEventListener('pointermove', e => {
      px.t = e.clientX / window.innerWidth;
      py.t = e.clientY / window.innerHeight;
      pointerActive = true;
    });
    document.addEventListener('mouseleave', () => { pointerActive = false; });
  }

  const light = document.createElement('div');
  light.className = 'map-light';
  light.setAttribute('aria-hidden', 'true');
  shell.appendChild(light);

  /* ---------- 커스텀 커서 (v2: 마우스 미사용 — 비활성) ---------- */
  const fine = false;
  let dot = null, ring = null;
  const ringPos = { x: innerWidth / 2, y: innerHeight / 2 };
  if (fine) {
    document.body.classList.add('cursor-fx');
    dot = document.createElement('div');
    dot.className = 'cursor-dot';
    ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(ring, dot);
    document.addEventListener('pointerover', e => {
      const hit = e.target.closest('button, a, .district, [role="button"]');
      ring.classList.toggle('is-hover', !!hit);
    });
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;

    const cx = px.t - .5;
    const cy = py.t - .5;
    const rotY = sRotY.step(cx * 2.4, dt);
    const rotX = sRotX.step(-cy * 1.9, dt);
    const parX = sParX.step(cx * 14, dt);
    const parY = sParY.step(cy * 10, dt);
    px.c += (px.t - px.c) * Math.min(1, dt * 5);
    py.c += (py.t - py.c) * Math.min(1, dt * 5);

    const bob = Math.sin(now / 2300) * 3;
    shell.style.transform =
      `perspective(1400px) rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)` +
      ` translate3d(${parX.toFixed(2)}px, ${(parY + bob).toFixed(2)}px, 0)`;

    lightFade += ((pointerActive ? 1 : 0) - lightFade) * Math.min(1, dt * 3);
    const rect = shell.getBoundingClientRect();
    if (rect.width > 0) {
      // 광원 중심을 셸 내부로 클램프 — 가장자리에서 직사각형 절단면이 보이지 않게
      const lx = Math.max(4, Math.min(96, ((px.c * window.innerWidth - rect.left) / rect.width) * 100));
      const ly = Math.max(4, Math.min(96, ((py.c * window.innerHeight - rect.top) / rect.height) * 100));
      light.style.setProperty('--lx', `${lx.toFixed(1)}%`);
      light.style.setProperty('--ly', `${ly.toFixed(1)}%`);
      light.style.opacity = (lightFade * .85).toFixed(3);
    }

    /* 커서 업데이트 */
    if (dot) {
      const mx = px.t * window.innerWidth;
      const my = py.t * window.innerHeight;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ringPos.x += (mx - ringPos.x) * Math.min(1, dt * 14);
      ringPos.y += (my - ringPos.y) * Math.min(1, dt * 14);
      ring.style.transform = `translate3d(${ringPos.x.toFixed(1)}px, ${ringPos.y.toFixed(1)}px, 0)`;
    }
  }
  requestAnimationFrame(frame);
})();
