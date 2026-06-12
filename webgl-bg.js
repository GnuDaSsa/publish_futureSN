// WebGL 배경 — three.js: 도메인 워프 노이즈 오로라 셰이더 + 3D 파티클 필드
(function () {
  if (!window.THREE) return;
  const stage = document.querySelector('.stage');
  if (!stage) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.autoClear = false;
  renderer.domElement.className = 'webgl-bg';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.insertBefore(renderer.domElement, stage.firstChild);
  stage.classList.add('has-webgl');

  let W = window.innerWidth, H = window.innerHeight;

  /* ---------- 배경: 풀스크린 셰이더 (도메인 워프 fbm 오로라 + 그레인) ---------- */
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgUniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(W, H) },
    uPointer: { value: new THREE.Vector2(.5, .45) },
    uFlash: { value: 0 }
  };
  const bgMat = new THREE.ShaderMaterial({
    uniforms: bgUniforms,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uRes;
      uniform vec2 uPointer;
      uniform float uFlash;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1, 0)), f.x),
          mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.55; }
        return v;
      }
      void main() {
        vec2 uv = vUv;
        vec2 st = uv * vec2(uRes.x / uRes.y, 1.0);
        float t = uTime * 0.022;

        /* 도메인 워프 — 노이즈로 노이즈를 비틀어 유체처럼 흐르는 패턴 */
        vec2 q = vec2(fbm(st * 1.35 + t), fbm(st * 1.35 - t * 0.85));
        vec2 r = vec2(
          fbm(st * 1.8 + q * 1.7 + vec2(1.7, 9.2) + t * 1.25),
          fbm(st * 1.8 + q * 1.7 + vec2(8.3, 2.8) - t * 0.9));
        float f = fbm(st * 1.6 + r * 1.9);

        vec3 deep    = vec3(0.006, 0.013, 0.035);
        vec3 cyan    = vec3(0.07, 0.42, 0.62);
        vec3 violet  = vec3(0.22, 0.09, 0.46);
        vec3 magenta = vec3(0.50, 0.07, 0.28);

        vec3 col = deep;
        col = mix(col, violet,  smoothstep(0.28, 0.9, f) * 0.5);
        col = mix(col, cyan,    smoothstep(0.42, 0.95, q.y) * 0.42);
        col = mix(col, magenta, smoothstep(0.58, 1.0, r.x) * 0.34);

        /* 포인터 주변 은은한 빛 반응 */
        float d = distance(vec2(uv.x * uRes.x / uRes.y, uv.y), vec2(uPointer.x * uRes.x / uRes.y, uPointer.y));
        col += cyan * 0.10 * smoothstep(0.5, 0.0, d);

        /* 비네트 — 중앙(지도)을 띄우고 가장자리는 가라앉힘 */
        col *= 1.0 - 0.6 * smoothstep(0.38, 1.05, distance(uv, vec2(0.5, 0.45)));

        /* 필름 그레인 */
        col += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * 0.045;

        /* 플래시 (워프/노바 하이라이트) */
        col += vec3(0.85, 0.92, 1.0) * uFlash;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

  /* ---------- 3D 파티클 필드 ---------- */
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(58, W / H, .1, 300);
  cam.position.z = 46;

  const COUNT = 1800;
  const pos = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  const colors = new Float32Array(COUNT * 3);
  const PALETTE = [
    [0.55, 0.86, 1.0], [1.0, 1.0, 1.0], [0.74, 0.59, 1.0], [1.0, 0.67, 0.86]
  ];
  for (let i = 0; i < COUNT; i += 1) {
    pos[i * 3] = (Math.random() - .5) * 130;
    pos[i * 3 + 1] = (Math.random() - .5) * 80;
    pos[i * 3 + 2] = (Math.random() - .5) * 90;
    sizes[i] = .4 + Math.pow(Math.random(), 2.2) * 2.4;
    phases[i] = Math.random() * Math.PI * 2;
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const ptUniforms = { uTime: { value: 0 }, uWarp: { value: 0 }, uNova: { value: 0 } };
  const ptMat = new THREE.ShaderMaterial({
    uniforms: ptUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uWarp;
      uniform float uNova;
      varying float vA;
      varying vec3 vC;
      varying vec2 vDir;
      varying float vW;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.11 + aPhase) * 2.2;
        p.y += cos(uTime * 0.08 + aPhase * 1.7) * 1.8;

        /* 노바: 중심으로 수렴 → 폭발 */
        float pull = smoothstep(0.0, 0.55, uNova);
        float burst = smoothstep(0.58, 1.0, uNova);
        if (uNova > 0.001) {
          vec3 dirN = normalize(position + vec3(0.001, 0.001, 0.001));
          p = mix(p, p * 0.04, pull * (1.0 - burst));
          p += dirN * burst * (46.0 + aSize * 24.0);
        }

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (140.0 / -mv.z) * (1.0 + uWarp * 2.2 + pull * 1.6);
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.5 + fract(aPhase) * 1.3) + aPhase * 7.0));
        vA *= 1.0 + uWarp * 0.45 + pull * 1.2;
        vA *= 1.0 - smoothstep(0.78, 1.0, uNova);
        vC = aColor;
        vW = uWarp;
        vec4 clip = projectionMatrix * mv;
        vec2 ndc = clip.xy / max(clip.w, 0.001);
        vDir = normalize(ndc + vec2(0.0001, 0.0001));
        gl_Position = clip;
      }
    `,
    fragmentShader: `
      varying float vA;
      varying vec3 vC;
      varying vec2 vDir;
      varying float vW;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float core = smoothstep(0.5, 0.04, length(c));
        /* 워프: 화면 중심에서 방사형으로 늘어나는 광선 */
        float ax = dot(c, vDir);
        float ay = dot(c, vec2(-vDir.y, vDir.x));
        float streak = smoothstep(0.12, 0.0, abs(ay)) * smoothstep(0.5, 0.04, abs(ax));
        float shape = mix(core, streak, clamp(vW * 0.55, 0.0, 0.6));
        float a = shape * vA * 0.55;
        gl_FragColor = vec4(vC, a);
      }
    `
  });
  const points = new THREE.Points(geo, ptMat);
  scene.add(points);

  /* ---------- 렌즈 보케 (카메라 앞 근접 아웃포커스 빛망울) ---------- */
  const BOKEH = 22;
  const bkPos = new Float32Array(BOKEH * 3);
  const bkSize = new Float32Array(BOKEH);
  const bkPhase = new Float32Array(BOKEH);
  const bkColor = new Float32Array(BOKEH * 3);
  const BK_PAL = [[.62, .82, 1.0], [1.0, .92, .8], [.78, .68, 1.0], [1.0, 1.0, 1.0]];
  for (let i = 0; i < BOKEH; i += 1) {
    bkPos[i * 3] = (Math.random() - .5) * 110;
    bkPos[i * 3 + 1] = (Math.random() - .5) * 62;
    bkPos[i * 3 + 2] = 14 + Math.random() * 22;   /* 카메라 가까이 → 크고 흐릿하게 */
    bkSize[i] = 3 + Math.random() * 9;
    bkPhase[i] = Math.random() * Math.PI * 2;
    const c = BK_PAL[Math.floor(Math.random() * BK_PAL.length)];
    bkColor[i * 3] = c[0]; bkColor[i * 3 + 1] = c[1]; bkColor[i * 3 + 2] = c[2];
  }
  const bkGeo = new THREE.BufferGeometry();
  bkGeo.setAttribute('position', new THREE.BufferAttribute(bkPos, 3));
  bkGeo.setAttribute('aSize', new THREE.BufferAttribute(bkSize, 1));
  bkGeo.setAttribute('aPhase', new THREE.BufferAttribute(bkPhase, 1));
  bkGeo.setAttribute('aColor', new THREE.BufferAttribute(bkColor, 3));
  const bkMat = new THREE.ShaderMaterial({
    uniforms: ptUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      varying float vA;
      varying vec3 vC;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.05 + aPhase) * 5.0;
        p.y += cos(uTime * 0.04 + aPhase * 1.6) * 3.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (240.0 / max(4.0, -mv.z));
        vA = 0.5 + 0.5 * sin(uTime * (0.18 + fract(aPhase) * 0.3) + aPhase * 5.0);
        vC = aColor;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vA;
      varying vec3 vC;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        /* 밝은 림(테두리) + 은은한 속 — 실제 렌즈 보케 형태 */
        float disc = smoothstep(0.5, 0.47, d);
        float rim = smoothstep(0.5, 0.43, d) - smoothstep(0.40, 0.18, d) * 0.62;
        float a = (disc * 0.30 + rim * 0.70) * (0.028 + vA * 0.030);
        gl_FragColor = vec4(vC, a);
      }
    `
  });
  scene.add(new THREE.Points(bkGeo, bkMat));

  /* ---------- 루프 (마우스 반응 없이 은은한 자동 회전) ---------- */

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H);
    bgUniforms.uRes.value.set(W, H);
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  let elapsed = Math.random() * 100;

  /* ---------- 시네마틱 FX 타임라인 (워프 / 노바) ---------- */
  let fx = null;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOutQ = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  window.sceneFX = {
    warp(dur = 1900) { fx = { type: 'warp', start: performance.now(), dur }; },
    nova(dur = 3400) { fx = { type: 'nova', start: performance.now(), dur }; }
  };

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;

    /* FX 진행도 → 유니폼/카메라 */
    let warpV = 0, novaV = 0, flashV = 0, boost = 1, fov = 58, camPush = 0;
    if (fx) {
      const t = (now - fx.start) / fx.dur;
      if (t >= 1) { fx = null; }
      else if (fx.type === 'warp') {
        warpV = t < .22 ? easeOutCubic(t / .22) : t < .6 ? 1 : 1 - easeInOutQ((t - .6) / .4);
        flashV = Math.sin(Math.PI * clamp01((t - .5) / .42)) * .36;
        boost = 1 + warpV * 7;
        fov = 58 + warpV * 15;
        camPush = warpV * 26;
      } else {
        novaV = easeInOutQ(clamp01(t / .8));
        flashV = Math.sin(Math.PI * clamp01((t - .42) / .34)) * .9;
        boost = 1 + Math.sin(Math.PI * clamp01(t / .8)) * 4;
        fov = 58 - Math.sin(Math.PI * clamp01(t / .8)) * 5;
      }
    }
    elapsed += dt * boost; // 작품 본질이 모션 — OS 모션 최소화 설정과 무관하게 은은한 회전 유지

    bgUniforms.uTime.value = elapsed;
    bgUniforms.uFlash.value = flashV;
    ptUniforms.uTime.value = elapsed;
    ptUniforms.uWarp.value = warpV;
    ptUniforms.uNova.value = novaV;

    if (Math.abs(cam.fov - fov) > .01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    /* 카메라 — 아주 느린 궤도 드리프트로 씬이 은은히 회전하는 느낌 */
    cam.position.x = Math.sin(elapsed * .055) * 3.4;
    cam.position.y = Math.cos(elapsed * .042) * 2.2;
    cam.position.z = 46 - camPush;
    cam.lookAt(0, 0, 0);
    points.rotation.y = elapsed * 0.016;

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
})();
