// ============================================================
// cues.js — 취임식 디지털 퍼포먼스 큐 엔진 (v2)
// 흐름: 대기 → [클릭] 오프닝 영상 → 지도 정착 →
//       [SPACE ×6] 분야(수렴형 타이포 → 구역 영상 확장 → 점등) →
//       [SPACE] 통합 수렴 + 마무리 영상 →
//       [SPACE] 시장 클라이맥스 → 화이트 플래시 → 세계지도 속 성남
// 조작: SPACE/ENTER 다음 큐 · 1~6 분야 점프 · B 블랙아웃 · R 리허설 배속 · ` HUD
// ============================================================
(function () {
  'use strict';

  /* ===== 미디어 슬롯 =====
     시댄스 영상이 준비되면 경로만 넣으면 됩니다. null = 데모 카드(1초). */
  const MEDIA = {
    opening: null,     // 오프닝 영상 (엔드프레임 = 우주 + 지도)
    senior: null,      // 어르신·복지
    baby: null,        // 영유아·엄마
    youth: null,       // 청년
    enterprise: null,  // 기업
    market: null,      // 소상공인
    redev: null,       // 재개발·재건축
    unify: null,       // 통합 마무리 영상 (30s)
  };
  const DEMO_MS = 1000; // 데모 카드 길이(ms)

  /* ===== 분야 정의 (확정 순서) ===== */
  const FIELDS = [
    { id: 'senior', name: '어르신·복지', kw: '신탁터성남',
      quote: '아프기 전에 챙기고, 마지막까지 내 집에서, 신탁터성남이 끝까지 함께하는 성남을 부탁드립니다.',
      anchor: [315, 368] },
    { id: 'baby', name: '영유아·엄마', kw: '신생아 종잣돈',
      quote: '성남이 직접 키워 18세에 돌려주는 신생아 종잣돈. 성남에서 낳고, 성남에서 키우겠습니다.',
      anchor: [620, 258] },
    { id: 'youth', name: '청년', kw: '청년펀드 공정 성남',
      quote: '출발선이 달라도 성남에서는 공정하게 경쟁할 수 있어야 합니다. 청년펀드로 흙수저도 금수저도 없는 성남, 만들어 주십시오.',
      anchor: [370, 505] },
    { id: 'enterprise', name: '기업', kw: '다이아몬드 산업벨트',
      quote: '판교테크노밸리에서 바이오헬스단지까지, 세계가 주목하는 대한민국 경제 심장으로 완성해 주십시오.',
      anchor: [560, 500] },
    { id: 'market', name: '소상공인', kw: '성남사랑상품권',
      quote: '성남사랑상품권이 골목에 돌 때 민생이 삽니다. 지역경제를 끝까지 지켜주십시오.',
      anchor: [425, 275] },
    { id: 'redev', name: '재개발·재건축', kw: '바르게 빠르게',
      quote: '부담은 낮추고 자산가치는 높이는 재개발·재건축, 바르게 빠르게 완성해 주십시오.',
      anchor: [590, 370] },
  ];
  const MAYOR = { id: 'mayor', kw: '지금 시작합니다',
    quote: '말이 아니라 성과로 증명하는 성남, 지금 시작합니다.' };

  /* 분야별 전문 등장 베리에이션 — 7번 반복되는 문구 연출에 변화를 준다 (v2.css 참조) */
  const TYPO_VARIANT = {
    senior: 'v-rise',      // 흩어진 채 떠오름 (기존)
    baby: 'v-fall',        // 위에서 사봇이 내려앉음
    youth: 'v-slide',      // 오른쪽에서 속도감 있게 슬라이드
    enterprise: 'v-focus', // 큰 블러에서 초점이 맞는 줌-인
    market: 'v-tilt',      // 아래서 위로 접힌 면이 펼쳐짐
    redev: 'v-build',      // 바닥에서 올라오며 드러남 (공사·건축 느낌)
    mayor: 'v-strike',     // 크게서 단숫에 내리꽂힌다 (클라이맥스)
  };

  /* ===== 폰트 후보 적용 (v1 유지) ===== */
  (function () {
    const families = {
      giants: null, paperlogy: "'Paperlogy'", gmarket: "'GmarketSans'",
      gonggothic: "'GongGothic'", sbaggro: "'SBAggro'",
      cafe24: "'Cafe24Ssurround'", suit: "'SUIT'"
    };
    const fam = families[localStorage.getItem('snfm-intro-font')];
    if (fam) document.documentElement.style.setProperty('--font-intro', fam + ", 'Paperlogy', sans-serif");
  })();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => document.documentElement.classList.add('fonts-ready'));
    setTimeout(() => document.documentElement.classList.add('fonts-ready'), 700);
  } else {
    document.documentElement.classList.add('fonts-ready');
  }

  /* ===== DOM ===== */
  const $ = s => document.querySelector(s);
  const stage = $('.stage');
  const introLoader = $('#introLoader');
  const introEnter = $('#introEnter');
  const introPercent = $('#introPercent');
  const introProgress = $('#introProgress');
  const mediaLayer = $('#mediaLayer');
  const videoLayer = $('#videoLayer');
  const typoLayer = $('#typoLayer');
  const completion = $('#completion');
  const worldFinale = $('#worldFinale');
  const worldLand = $('#worldLand');
  const snMarker = $('#snMarker');
  const cueFlash = $('#cueFlash');
  const blackout = $('#blackout');
  const fieldCounter = $('#fieldCounter');
  const opHud = $('#opHud');
  const hudNow = $('#hudNow');
  const hudNext = $('#hudNext');
  const hudJumps = $('#hudJumps');

  const TS = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tscale')) || 1;
  const TT = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ttypo')) || 1;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // rAF 기반 + 타임아웃 폴백 — 백그라운드 창/캐처 환경에서 rAF가 스로틀되어도 시퀀스가 멈추지 않게
  const raf = () => new Promise(r => {
    let settled = false;
    const fin = () => { if (!settled) { settled = true; r(); } };
    requestAnimationFrame(() => requestAnimationFrame(fin));
    setTimeout(fin, 90);
  });

  /* ===== 진행 상태 =====
     순서는 "아직 안 켜진 분야 우선" — 점프/클릭으로 순서가 바뀌어도
     SPACE는 항상 남은 분야를 확정 순서대로 복구한다. */
  let busy = false;
  let started = false;   // 지도 정착 후 true
  let finished = false;
  let unifyDone = false;
  let doneCount = 0;
  let introLoaded = false;
  let introEntering = false;
  let rehearsal = false;
  let rehearsalBase = 1;

  const isFieldDone = f => {
    const d = document.querySelector(`.district[data-id="${f.id}"]`);
    return !!(d && d.classList.contains('done'));
  };
  const nextUndoneField = () => FIELDS.find(f => !isFieldDone(f)) || null;

  /* ===== 미디어 재생 (데모 카드 or 실제 영상) ===== */
  function buildDemoCard(opts) {
    const card = document.createElement('div');
    card.className = 'demo-card';
    if (opts.color) card.style.setProperty('--color', opts.color);
    const chip = document.createElement('span');
    chip.className = 'demo-chip';
    chip.textContent = 'VIDEO SLOT';
    const title = document.createElement('strong');
    title.textContent = opts.title;
    const sub = document.createElement('em');
    sub.textContent = opts.sub;
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    const fill = document.createElement('span');
    fill.style.animationDuration = opts.ms + 'ms';
    bar.appendChild(fill);
    card.append(chip, title, sub, bar);
    return card;
  }

  function playMediaInto(host, src, demoOpts) {
    return new Promise(resolve => {
      host.innerHTML = '';
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      if (src) {
        const v = document.createElement('video');
        v.src = src;
        v.playsInline = true;
        v.preload = 'auto';
        v.addEventListener('ended', finish);
        v.addEventListener('error', () => setTimeout(finish, 300));
        host.appendChild(v);
        const p = v.play();
        if (p && p.catch) p.catch(() => setTimeout(finish, demoOpts.ms));
      } else {
        host.appendChild(buildDemoCard(demoOpts));
        setTimeout(finish, demoOpts.ms);
      }
    });
  }

  /* ===== 좌표: SVG 앵커 → 화면 좌표 ===== */
  function anchorScreen(f) {
    const svg = document.querySelector('.map-shell svg');
    const m = svg ? svg.getScreenCTM() : null;
    if (!m) return { x: innerWidth / 2, y: innerHeight / 2 };
    return new DOMPoint(f.anchor[0], f.anchor[1]).matrixTransform(m);
  }

  /* ===== ① 수렴형 타이포 (C안) ===== */
  async function typoSequence(item, opts = {}) {
    const colorVar = opts.color || `var(--${item.id})`;
    typoLayer.innerHTML = '';
    typoLayer.style.setProperty('--color', colorVar);
    typoLayer.classList.toggle('mayor', !!opts.mayor);
    typoLayer.classList.add('show');

    // 전문 워드 스트림 — 단어들이 흩어진 채 날아와 문장이 된다
    const quote = document.createElement('p');
    quote.className = 'typo-quote ' + (TYPO_VARIANT[item.id] || 'v-rise');
    const words = item.quote.split(' ');
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.textContent = w;
      s.style.setProperty('--wi', i);
      s.style.setProperty('--jx', (Math.random() * 2 - 1).toFixed(2));
      s.style.setProperty('--jy', (Math.random() * 2 - 1).toFixed(2));
      quote.appendChild(s);
    });
    typoLayer.appendChild(quote);
    // 동기 reflow로 시작 상태를 커밋 — rAF 타이밍과 무관하게 전환이 항상 재생된다 (즉시완료 버그 방지)
    void quote.getBoundingClientRect();
    quote.classList.add('in');
    await wait((words.length * 80 + 600) * TS() + 2000 * TS() * TT());

    // 응집 — 모든 단어가 화면 중심으로 빨려든다
    const cw = innerWidth / 2, ch = innerHeight / 2;
    [...quote.children].forEach(s => {
      const r = s.getBoundingClientRect();
      s.style.setProperty('--cx', (cw - (r.left + r.width / 2)).toFixed(1) + 'px');
      s.style.setProperty('--cy', (ch - (r.top + r.height / 2)).toFixed(1) + 'px');
    });
    quote.classList.add('converge');
    if (window.sceneFX) window.sceneFX.warp(1100 * TS());
    await wait(720 * TS());
    quote.remove();

    // 키워드 결정(結晶)
    const kw = document.createElement('div');
    kw.className = 'typo-kw';
    const kwText = document.createElement('span');
    kwText.className = 'kw-text';
    kwText.textContent = item.kw;
    const r1 = document.createElement('span'); r1.className = 'kw-ring';
    const r2 = document.createElement('span'); r2.className = 'kw-ring two';
    kw.append(r1, r2, kwText);
    typoLayer.appendChild(kw);
    void kw.getBoundingClientRect();
    kw.classList.add('in');
    await wait((1200 + 900 * TT()) * TS());
    return kw;
  }

  async function dismissKeyword(kw) {
    // v2.1: 비행 제거 — 키워드는 이동 없이 제자리에서 페이드아웃
    const t = kw.querySelector('.kw-text');
    // 주의: getComputedStyle은 라이브 객체 — animation 해제 "전에" 값을 스냅샷해야 한다
    const cs = getComputedStyle(t);
    const startOpacity = cs.opacity;
    const startTransform = cs.transform;
    const startFilter = cs.filter;
    t.style.animation = 'none';
    t.style.opacity = startOpacity;
    t.style.transform = startTransform;
    t.style.filter = startFilter;
    void t.getBoundingClientRect();
    const ts = TS();
    t.style.transition =
      `opacity ${(0.65 * ts).toFixed(2)}s ease, ` +
      `filter ${(0.65 * ts).toFixed(2)}s ease`;
    t.style.opacity = '0';
    t.style.filter = 'blur(6px)';
    await wait(720 * ts);
    typoLayer.classList.remove('show');
    typoLayer.innerHTML = '';
  }

  /* ===== ② 구역에서 영상 확장 ===== */
  async function videoSequence(f) {
    const p = anchorScreen(f);
    videoLayer.classList.add('on');
    const frame = document.createElement('article');
    frame.className = 'video-frame';
    frame.style.setProperty('--color', `var(--${f.id})`);
    const chip = document.createElement('span');
    chip.className = 'vf-chip';
    chip.textContent = f.name;
    const media = document.createElement('div');
    media.className = 'vf-media';
    frame.append(chip, media);
    videoLayer.appendChild(frame);

    const fr = frame.getBoundingClientRect(); // 측정 = 동기 reflow
    const dx = p.x - (fr.left + fr.width / 2);
    const dy = p.y - (fr.top + fr.height / 2);
    frame.style.transition = 'none';
    frame.style.transform = `translate(${dx}px, ${dy}px) scale(.04)`;
    frame.style.opacity = '0';
    frame.getBoundingClientRect();
    frame.style.transition = '';
    frame.classList.add('grow');
    frame.style.transform = '';
    frame.style.opacity = '';
    await wait(720 * TS());

    await playMediaInto(media, MEDIA[f.id], {
      title: f.name + ' 분야 영상', sub: '시댄스 10–15s · 데모 1s',
      ms: DEMO_MS, color: `var(--${f.id})`,
    });

    // 빛으로 수축 → 구역에 떨어진다
    frame.classList.remove('grow');
    frame.classList.add('shrink');
    frame.style.transform = `translate(${dx}px, ${dy}px) scale(.05)`;
    frame.style.opacity = '0';
    await wait(620 * TS());
    frame.remove();
    videoLayer.classList.remove('on');
  }

  /* ===== ③ 점등 ===== */
  function igniteDistrict(f) {
    const d = document.querySelector(`.district[data-id="${f.id}"]`);
    if (d && !d.classList.contains('done')) {
      d.classList.add('done');
      doneCount += 1;
    }
    stage.classList.add('alive'); // 점등 이후 지도가 숨쉴다 (시언 스윙 + 블롤 브리딩)
    fieldCounter.textContent = `${doneCount} / 6`;
    fieldCounter.classList.add('on');
  }

  /* ===== 통합 수렴 + 마무리 영상 ===== */
  async function unifySequence() {
    fieldCounter.classList.remove('on');
    stage.classList.add('complete');
    raf().then(() => completion.classList.add('show'));
    if (window.sceneFX) setTimeout(() => window.sceneFX.nova(3400), 4400 * TS());
    // 화이트아웃 정점(≈6.4s) 직후 통합 영상으로 컷 — 컷이 플래시에 가려진다
    await wait(6500 * TS());
    mediaLayer.classList.add('show');
    await raf();
    await playMediaInto(mediaLayer, MEDIA.unify, {
      title: '통합 마무리 영상', sub: '시댄스 30s · 데모 1s',
      ms: DEMO_MS, color: 'var(--cyan)',
    });
    completion.classList.remove('show'); // 영상이 가린 사이 정리
    mediaLayer.classList.remove('show');
    await wait(900 * TS()); // 하나된 지도 노출
    startAwaitMayor(); // v2.1 — 시장 선언 대기 앨비언트 (리플 + 카피)
    cueHistory.push({ t: 'unify' });
  }

  /* ===== 통합 완료 → 시장 선언 대기 앨비언트 (v2.1) =====
     지도에서 리플이 숨쉬고, 카피가 다음 순서(시장 선언)를 예고한다 */
  let awaitLayer = null;
  function startAwaitMayor() {
    stopAwaitMayor();
    const el = document.createElement('div');
    el.className = 'await-layer';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<span class="await-ring"></span><span class="await-ring r2"></span><span class="await-ring r3"></span>';
    document.body.appendChild(el);
    void el.getBoundingClientRect();
    el.classList.add('on');
    awaitLayer = el;
  }
  function stopAwaitMayor() {
    if (!awaitLayer) return;
    const el = awaitLayer;
    awaitLayer = null;
    el.classList.remove('on');
    setTimeout(() => el.remove(), 800);
  }

  /* ===== 시장 클라이맥스 → 화이트 플래시 → 세계지도 ===== */
  async function mayorSequence() {
    stopAwaitMayor();
    await typoSequence(MAYOR, { mayor: true, color: 'var(--cyan)' });
    cueFlash.classList.add('go');
    if (window.sceneFX) window.sceneFX.warp(2600 * TS());
    await wait(440 * TS()); // 플래시 정점에서 장면 교체
    typoLayer.classList.remove('show');
    typoLayer.innerHTML = '';
    document.body.classList.add('world-mode');
    startWorldDraw();
    await wait(1000 * TS());
    cueFlash.classList.remove('go');
    finished = true;
    cueHistory.push({ t: 'mayor' });
  }

  /* ===== 세계지도 (외곽선 라인 → 성남 중심 재구성) ===== */
  let worldReady = false;
  let worldProj = null;
  let worldLandFeature = null;
  let worldLandLow = null; // 저해상도(110m) — 수렴 애니메이션 전용 (프레임당 경로 재계산 비용 ↓)
  let snXY = [955, 235]; // 폴백 좌표 (대략 한국)
  const SN_LONLAT = [127.1265, 37.42];
  const WORLD_EXTENT = [[6, 6], [1194, 614]]; // 여백 최소화 — 세계지도 최대한 크게
  // 실제 축첩 마커 — 성남시 동서 폭 ≈13.5km를 투영 단위로 환산
  const SN_SHAPE_UNITS = 610 * 0.012; // sn-shape 로컬 폭 (scale 1 기준, 뷰박스 단위)
  function snTrueScale() {
    if (!worldProj) return 0.05;
    const a = worldProj([SN_LONLAT[0] - 0.1, SN_LONLAT[1]]);
    const b = worldProj([SN_LONLAT[0] + 0.1, SN_LONLAT[1]]);
    if (!a || !b) return 0.05;
    const kmSpan = 0.2 * 111.32 * Math.cos(SN_LONLAT[1] * Math.PI / 180);
    const unitsPerKm = Math.hypot(b[0] - a[0], b[1] - a[1]) / kmSpan;
    return Math.max(0.02, (13.5 * unitsPerKm) / SN_SHAPE_UNITS);
  }
  /* ===== 성남 마커 모프 — 멀리서는 빛나는 원, 중앙으로 오면서 성남 지도 형상으로 ===== */
  const snShapeEl = snMarker.querySelector('.sn-shape');
  const SN_LOCAL_CENTER = [467, 368]; // path transform의 역평행이동 중심 — 오라 원점과 일치
  let snShapeD0 = '', snMorphPts = null, snMorphCircle = null, snMorphLast = -1;
  function buildSnMorph() {
    if (snMorphPts || !snShapeEl) return;
    snShapeD0 = snShapeEl.getAttribute('d');
    const N = 160;
    const len = snShapeEl.getTotalLength();
    const pts = [];
    for (let i = 0; i < N; i++) {
      const p = snShapeEl.getPointAtLength(len * i / N);
      pts.push([p.x, p.y]);
    }
    const [cx, cy] = SN_LOCAL_CENTER;
    let r = 0;
    pts.forEach(p => { r += Math.hypot(p[0] - cx, p[1] - cy); });
    r /= N;
    snMorphPts = pts;
    // 각 경계점을 자기 방위각의 원주 점으로 매핑 — 방사형 이동만 일어나서 자연스럽게 피어난다
    snMorphCircle = pts.map(p => {
      const a = Math.atan2(p[1] - cy, p[0] - cx);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
  }
  function setSnMorph(m) {
    if (!snShapeEl) return;
    buildSnMorph();
    if (!snMorphPts) return;
    m = Math.min(1, Math.max(0, m));
    m = m >= 1 ? 1 : Math.round(m * 40) / 40; // 양자화 — 필터 글로우 재렌더 횟수를 줄인다 (렉 방지)
    if (m === snMorphLast) return;
    snMorphLast = m;
    if (m >= 1) { snShapeEl.setAttribute('d', snShapeD0); return; } // 완성형은 원본 경로 그대로
    const e = m * m * (3 - 2 * m); // smoothstep
    let d = '';
    for (let i = 0; i < snMorphPts.length; i++) {
      const x = snMorphCircle[i][0] + (snMorphPts[i][0] - snMorphCircle[i][0]) * e;
      const y = snMorphCircle[i][1] + (snMorphPts[i][1] - snMorphCircle[i][1]) * e;
      d += (i ? ' L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    snShapeEl.setAttribute('d', d + ' Z');
  }

  function applyMarker(px, py, k, s) {
    s = s || snTrueScale();
    snMarker.setAttribute('transform', `translate(${px.toFixed(1)}, ${py.toFixed(1)}) scale(${s.toFixed(4)})`);
    const aura = snMarker.querySelector('.sn-aura');
    if (aura) aura.setAttribute('r', String(Math.round(40 / (s * (k || 1)))));
  }
  async function loadWorld() {
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json'); // 50m 고해상도 — 한반도 해안선 정밀 (마커 위치 정확도)
      const topo = await res.json();
      worldLandFeature = topojson.feature(topo, topo.objects.land);
      // 애니메이션용 저해상도 — 실패해도 고해상도로 폴백
      try {
        const resLo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json');
        const topoLo = await resLo.json();
        worldLandLow = topojson.feature(topoLo, topoLo.objects.land);
      } catch (e2) { worldLandLow = null; }
      worldProj = d3.geoNaturalEarth1();
      worldProj.fitExtent(WORLD_EXTENT, worldLandFeature);
      worldLand.setAttribute('d', d3.geoPath(worldProj)(worldLandFeature));
      const pt = worldProj(SN_LONLAT);
      if (pt) snXY = pt;
      worldReady = true;
    } catch (e) {
      worldReady = false; // 오프라인 폴백 — 마커 + 카피만
    }
    snMarker.setAttribute('transform', `translate(${snXY[0].toFixed(1)}, ${snXY[1].toFixed(1)})`);
    applyMarker(snXY[0], snXY[1], 1, 1);
  }
  function startWorldDraw() {
    worldFinale.classList.add('show');
    // 멀리 있을 때는 빛나는 원 — 중앙 수렴 중 지도 형상으로 모프 (폴백시엔 바로 형상)
    setSnMorph(worldReady ? 0 : 1);
    if (worldReady) {
      const len = worldLand.getTotalLength();
      worldLand.style.strokeDasharray = String(len);
      worldLand.style.strokeDashoffset = String(len);
      worldLand.getBoundingClientRect();
      worldLand.style.transition = `stroke-dashoffset ${(3.2 * TS()).toFixed(2)}s cubic-bezier(.4, 0, .25, 1)`;
      worldLand.style.strokeDashoffset = '0';
    }
    setTimeout(() => worldFinale.classList.add('lit'), (worldReady ? 3000 : 700) * TS());
    // 반짝임을 잠시 감상한 뒤 — 대륙이 흐르며 성남이 세계의 중심으로 온다
    if (worldReady) setTimeout(recenterWorld, 6200 * TS());
  }

    // 성남 중심 재구성 — 투영 경도 회전(대륙 래핑) + 줄 + 마커가 화면 중앙으로 수렴
  function recenterWorld() {
    if (!worldReady || !worldProj) return;
    if (!document.body.classList.contains('world-mode')) return; // ←로 되돌아갔으면 취소
    const worldG = document.querySelector('#worldG');
    const path = d3.geoPath(worldProj);
    // 드로잉용 dash 제거 (d가 바뀌면 길이가 바뀌어 dash가 깨진다)
    worldLand.style.transition = 'none';
    worldLand.style.strokeDasharray = 'none';
    worldLand.style.strokeDashoffset = '0';
    worldFinale.classList.add('centering');
    const p0 = worldProj(SN_LONLAT);
    const target = { x: 600, y: 300 };
    // 화면 채움 배율 + 추가 1.3배 — 단, 성남 마커는 채움 배율 기준 크기를 유지 (대한민국 안에 들어 있는 느낌)
    const kFill = Math.min(1.5, Math.max(1.12,
      300 / Math.max(40, p0[1] - 6),
      320 / Math.max(40, 614 - p0[1])));
    const kEnd = kFill * 1.3;
    const dur = 4400 * TS();
    const t0 = performance.now();
    const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let finished2 = false;
    let lastSt = null; // 최종 프레임 상태 — 홈드 후 연속 회전의 기준
    function apply(tRaw) {
      const t = Math.min(1, tRaw);
      const e = ease(t);
      // 움직이는 동안은 110m 저해상도로 그리고, 마지막 프레임에서 50m로 복원 — 렉 해결 핵심
      const feat = (t >= 1 || !worldLandLow) ? worldLandFeature : worldLandLow;
      worldProj.rotate([-SN_LONLAT[0] * e, 0]);
      // 회전으로 세계가 틀 밖으로 나가지 않게 매 프레임 재피팅 (우측 잘림 방지)
      worldProj.fitExtent(WORLD_EXTENT, feat);
      worldLand.setAttribute('d', path(feat) || '');
      const p = worldProj(SN_LONLAT) || p0;
      const k = 1 + (kEnd - 1) * e;
      // 마커 카운터스케일 — 그룹이 k배 커져도 마커는 (kFill × 0.7) 크기로 수렴 (한반도 안에 쏙)
      const km = (1 + (kFill * 0.35 - 1) * e) / k; // 아까(0.7) 배율의 절반 크기로 수렴
      // 원 → 성남 지도 모프 — 아직 멀 동안(e<0.2)은 원, 중앙 도착 직전(e>0.85) 완성
      setSnMorph((e - 0.2) / 0.65);
      applyMarker(p[0], p[1], k, km);
      // 마커가 (초기위치 → 중앙)으로 수렴하도록 그룹 변환
      const mx = p0[0] + (target.x - p0[0]) * e;
      const my = p0[1] + (target.y - p0[1]) * e;
      worldG.setAttribute('transform', `translate(${(mx - k * p[0]).toFixed(1)}, ${(my - k * p[1]).toFixed(1)}) scale(${k.toFixed(4)})`);
      lastSt = { tx: (mx - k * p[0]).toFixed(1), ty: (my - k * p[1]).toFixed(1), k: k.toFixed(4), px: p[0].toFixed(1), py: p[1].toFixed(1), km: km.toFixed(4) };
      return t >= 1;
    }
    function settle() {
      setSnMorph(1);
      worldFinale.classList.add('centered');
      // 마지막 장면을 약 3초 유지한 뒤 — 성남을 축으로 천천히 우회전 시작
      worldSpinTimer = setTimeout(() => startWorldSpin(lastSt), 3000 * TS());
    }
    function frame(now) {
      if (finished2) return;
      if (apply((now - t0) / dur)) { finished2 = true; settle(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // rAF 스로틀 폴백 — 최종 상태 보장
    setTimeout(() => { if (!finished2) { finished2 = true; apply(1); settle(); } }, dur + 200);
  }

  /* ===== 홈드 후 연속 회전 — 성남(화면 중앙)을 축으로 세계가 천천히 시계방향 회전 ===== */
  let worldSpinTimer = 0, worldSpinRAF = 0;
  function stopWorldSpin() {
    clearTimeout(worldSpinTimer);
    if (worldSpinRAF) cancelAnimationFrame(worldSpinRAF);
    worldSpinTimer = 0; worldSpinRAF = 0;
    // CSS 합성 변환 잔재 제거 — 이후 어트리뷰트 변환이 다시 먹도록
    const worldG = document.querySelector('#worldG');
    if (worldG) { worldG.style.transform = ''; worldG.style.willChange = ''; }
    if (snMarker) { snMarker.style.transform = ''; snMarker.style.willChange = ''; }
  }
  function startWorldSpin(st) {
    if (!st || !document.body.classList.contains('world-mode')) return;
    const worldG = document.querySelector('#worldG');
    // 회전은 CSS 변환으로 — 어트리뷰트 변환은 매 프레임 거대 경로(50m) 전체 리페인트를 유발했다 (렉 원인)
    const k = parseFloat(st.k), tx = parseFloat(st.tx), ty = parseFloat(st.ty);
    const txc = tx - 600 + 600 * k, tyc = ty - 300 + 300 * k; // transform-origin(600,300) 보정
    worldG.removeAttribute('transform');
    worldG.style.transformBox = 'view-box';
    worldG.style.transformOrigin = '600px 300px';
    worldG.style.willChange = 'transform';
    worldG.style.transform = `rotate(0deg) translate(${txc.toFixed(1)}px, ${tyc.toFixed(1)}px) scale(${k})`;
    snMarker.removeAttribute('transform');
    snMarker.style.transformBox = 'view-box';
    snMarker.style.transformOrigin = '0 0';
    snMarker.style.willChange = 'transform';
    snMarker.style.transform = `translate(${st.px}px, ${st.py}px) rotate(0deg) scale(${st.km})`;
    const SPEED = 1.0; // deg/s — 천천히 (1바퀴 ≈ 6분)
    let prev = performance.now(), a = 0, lastApply = 0;
    const frame = now => {
      if (!document.body.classList.contains('world-mode')) { worldSpinRAF = 0; return; }
      a = (a + SPEED * Math.min(120, now - prev) / 1000) % 360;
      prev = now;
      if (now - lastApply > 40) { // ~24fps 갱신이면 충분 (1°/s 회전)
        lastApply = now;
        worldG.style.transform = `rotate(${a.toFixed(3)}deg) translate(${txc.toFixed(1)}px, ${tyc.toFixed(1)}px) scale(${k})`;
        // 성남 형상은 수평 유지 — 카운터 회전
        snMarker.style.transform = `translate(${st.px}px, ${st.py}px) rotate(${(-a).toFixed(3)}deg) scale(${st.km})`;
      }
      worldSpinRAF = requestAnimationFrame(frame);
    };
    worldSpinRAF = requestAnimationFrame(frame);
  }

  /* ===== 되돌리기 이력 (← 키) ===== */
  const cueHistory = [];

  function undoField(id) {
    const d = document.querySelector(`.district[data-id="${id}"]`);
    if (d) d.classList.remove('done');
    doneCount = Math.max(0, doneCount - 1);
    fieldCounter.textContent = `${doneCount} / 6`;
    if (doneCount > 0) fieldCounter.classList.add('on');
  }
  function undoUnify() {
    stopAwaitMayor();
    unifyDone = false;
    completion.classList.remove('show');
    stage.classList.remove('complete');
    mediaLayer.classList.remove('show');
    mediaLayer.innerHTML = '';
    fieldCounter.classList.add('on');
  }
  function resetWorldScene() {
    stopWorldSpin();
    document.body.classList.remove('world-mode');
    worldFinale.classList.remove('show', 'lit', 'centering', 'centered');
    const worldG = document.querySelector('#worldG');
    if (worldG) worldG.removeAttribute('transform');
    if (worldReady && worldProj && worldLandFeature) {
      worldProj.rotate([0, 0]);
      worldProj.fitExtent(WORLD_EXTENT, worldLandFeature);
      worldLand.style.transition = 'none';
      worldLand.style.strokeDasharray = 'none';
      worldLand.style.strokeDashoffset = '0';
      worldLand.setAttribute('d', d3.geoPath(worldProj)(worldLandFeature));
      const pt = worldProj(SN_LONLAT);
      if (pt) applyMarker(pt[0], pt[1], 1, 1);
    }
    setSnMorph(0); // 다시 들어올 때를 위해 원으로 복원
    if (unifyDone && !busy) startAwaitMayor(); // 월드에서 되돌아오면 대기 앨비언트 복원
    finished = false;
  }
  function goBack() {
    if (busy || !started) return;
    const last = cueHistory.pop();
    if (!last) return;
    if (last.t === 'mayor') resetWorldScene();
    else if (last.t === 'unify') undoUnify();
    else undoField(last.id);
    updateHud();
  }

  /* ===== 큐 실행 ===== */
  async function runFieldCue(f) {
    hudSet(`CUE · ${f.name}`, 'TYPO → VIDEO → 점등');
    const kw = await typoSequence(f);
    await dismissKeyword(kw);
    // 점등은 영상이 끝난 뒤에만 — 문구 → 영상 → 점등 순서 엄수 (중간 active 점등 제거)
    await wait(380 * TS());
    await videoSequence(f);
    igniteDistrict(f);
    cueHistory.push({ t: 'field', id: f.id });
  }


  async function advance() {
    if (!started || busy || finished) return;
    busy = true;
    try {
      const f = nextUndoneField();
      if (f) {
        updateHudRunning(f.name);
        await runFieldCue(f);
      } else if (!unifyDone) {
        updateHudRunning('통합 수렴 + 마무리 영상');
        await unifySequence();
        unifyDone = true;
      } else {
        updateHudRunning('시장 클라이맥스 + 글로벌');
        await mayorSequence();
      }
    } finally {
      busy = false;
      updateHud();
    }
  }

  async function jumpToField(n) { // n: 1~6 — 비상 점프. 끝나면 SPACE가 남은 분야를 순서대로 복구
    if (!started || busy || finished) return;
    const f = FIELDS[n - 1];
    if (!f || isFieldDone(f)) return;
    busy = true;
    try {
      updateHudRunning(f.name + ' (점프)');
      await runFieldCue(f);
    } finally {
      busy = false;
      updateHud();
    }
  }

  async function forceUnify() { // HUD 전용 — 시민 불참 등 비상시 남은 분야 건너뛰고 통합
    if (!started || busy || finished || unifyDone) return;
    busy = true;
    try {
      updateHudRunning('통합 (강제)');
      await unifySequence();
      unifyDone = true;
    } finally { busy = false; updateHud(); }
  }

  function forceComplete() { // 제작자 워드마크 전용 — 모든 분야 + 통합까지 완료된 상태로 점프
    if (!started || busy || finished) return;
    FIELDS.forEach(f => {
      const d = document.querySelector(`.district[data-id="${f.id}"]`);
      if (d && !d.classList.contains('done')) { d.classList.add('done'); doneCount += 1; }
    });
    fieldCounter.textContent = `${doneCount} / 6`;
    fieldCounter.classList.remove('on');
    stage.classList.add('alive', 'complete');
    unifyDone = true;
    startAwaitMayor(); // 완료 상태에서도 선언 대기 앨비언트 유지
    cueHistory.push({ t: 'unify' });
    updateHud(); // NEXT: 시장 클라이맥스 + 글로벌 (SPACE 한 번이면 세계지도)
  }

  async function forceMayor() { // HUD 전용
    if (!started || busy || finished) return;
    busy = true;
    try {
      updateHudRunning('시장 클라이맥스 (강제)');
      await mayorSequence();
    } finally { busy = false; updateHud(); }
  }

  /* ===== HUD ===== */
  function hudSet(now, next) {
    hudNow.textContent = now;
    hudNext.textContent = next || '';
  }
  function updateHudRunning(label) {
    hudSet(`▶ RUN — ${label}`, '');
    [...hudJumps.children].forEach(b => b.classList.remove('next'));
  }
  function updateHud() {
    const f = nextUndoneField();
    const nextLabel = finished ? '' : (f ? f.name : (!unifyDone ? '통합 수렴 + 마무리 영상' : '시장 클라이맥스 + 글로벌'));
    if (finished) hudSet('END — 글로벌 홀드', '행사 종료까지 유지');
    else if (!started) hudSet('STANDBY', '버튼 클릭 = 오프닝');
    else hudSet(`READY ${doneCount}/6`, `NEXT: ${nextLabel} (SPACE)`);
    [...hudJumps.children].forEach(b => {
      const n = Number(b.dataset.field || 0);
      const bf = FIELDS[n - 1];
      b.classList.toggle('next', !!(bf && f && bf.id === f.id));
      b.classList.toggle('is-done', !!(bf && isFieldDone(bf)));
    });
  }
  function buildHud() {
    FIELDS.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.field = i + 1;
      b.textContent = `${i + 1} ${f.name}`;
      b.addEventListener('click', () => jumpToField(i + 1));
      hudJumps.appendChild(b);
    });
    const u = document.createElement('button');
    u.type = 'button';
    u.textContent = '7 통합⚠';
    u.title = '남은 분야를 건너뛰고 통합 시퀀스 강제 실행';
    u.addEventListener('click', forceUnify);
    const m = document.createElement('button');
    m.type = 'button';
    m.textContent = '8 시장⚠';
    m.title = '시장 클라이맥스 강제 실행';
    m.addEventListener('click', forceMayor);
    hudJumps.append(u, m);
  }

  /* ===== 인트로 (로딩 → 버튼 → 오프닝 영상 → 핸드오프 돌리-인) ===== */
  function runIntro() {
    if (!introLoader || !introProgress || !introEnter) {
      stage.classList.remove('is-intro');
      started = true;
      return;
    }
    const duration = 2500;
    const startedAt = performance.now();
    function finishLoad() {
      if (introLoaded) return;
      introLoaded = true;
      if (introPercent) introPercent.textContent = '100%';
      introProgress.style.width = '100%';
      introEnter.disabled = false;
      introEnter.textContent = '미래지도 열기 — SPACE';
      introLoader.classList.add('is-loaded');
    }
    function tick(now) {
      if (introLoaded) return;
      const progress = Math.min(100, Math.round(((now - startedAt) / duration) * 100));
      if (introPercent) introPercent.textContent = `${progress}%`;
      introProgress.style.width = `${progress}%`;
      if (progress < 100) { requestAnimationFrame(tick); return; }
      finishLoad();
    }
    // rAF 스로틀 폴백 — 어떤 환경에서도 버튼은 반드시 열린다
    setTimeout(finishLoad, duration + 250);
    // v2: 마우스 미사용 — 시작도 키보드(SPACE/ENTER/→)로만
    requestAnimationFrame(tick);
  }

  async function enterFlow() {
    if (!introLoaded || introEntering) return;
    introEntering = true;
    introEnter.disabled = true;
    const ts = TS();
    const st = TS() * TT();
    // 0) v2.2 — 축포 팡파레 프롤로그 (기획서 클라이맥스 차용, 지도 드로잉 없음)
    if (window.IntroFanfare && window.IntroFanfare.start) {
      introLoader.classList.add('is-charging');
      window.IntroFanfare.start(3600 * st);
      await wait(3450 * st);
    }
    // 1) 타이포 줌-스루 (v1 확정 연출) — 오프닝 영상 컷인을 +1초 늦춰 여운을 준다 (워프도 함께 +1초)
    introLoader.classList.add('is-launching');
    if (window.sceneFX) setTimeout(() => window.sceneFX.warp(2600 * ts), 3000 * st);
    await wait(3600 * st);
    // 2) 오프닝 영상 (시댄스 슬롯) — 플래시 정점에서 컷인
    mediaLayer.classList.add('show');
    introLoader.classList.add('is-hiding');
    setTimeout(() => introLoader.remove(), 760);
    await raf();
    await playMediaInto(mediaLayer, MEDIA.opening, {
      title: '오프닝 영상', sub: '시댄스 · 엔드프레임 = 우주 + 지도 · 데모 1s',
      ms: DEMO_MS, color: 'var(--cyan)',
    });
    // 3) 핸드오프 — 영상 페이드아웃과 동시에 지도 돌리-인 시작
    stage.classList.remove('is-intro');
    stage.classList.add('intro-ready');
    mediaLayer.classList.remove('show');
    if (window.sceneFX) setTimeout(() => window.sceneFX.warp(1500 * ts), 3600 * ts);
    setTimeout(() => stage.classList.add('is-settled'), 6000 * ts);
    setTimeout(() => { started = true; updateHud(); }, 5200 * ts);
  }

  /* ===== 키보드 ===== */
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    switch (e.code) {
      case 'Space':
      case 'Enter':
      case 'ArrowRight':
        e.preventDefault();
        if (!started && introLoaded && !introEntering) enterFlow();
        else advance();
        break;
      case 'ArrowLeft': // 한 큐 되돌리기
        e.preventDefault();
        goBack();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3':
      case 'Digit4': case 'Digit5': case 'Digit6':
        if (opHud.classList.contains('open')) jumpToField(Number(e.code.slice(-1)));
        break;
      case 'Digit7': // HUD 열림 상태에서만 — 통합 강제
        if (opHud.classList.contains('open')) forceUnify();
        break;
      case 'Digit8': // HUD 열림 상태에서만 — 시장 강제
        if (opHud.classList.contains('open')) forceMayor();
        break;
      case 'KeyB': // 한글 IME 오타(ㅠ) 방지 — HUD 열림 상태에서만
        if (opHud.classList.contains('open')) blackout.classList.toggle('on');
        break;
      case 'Backquote':
        opHud.classList.toggle('open');
        updateHud();
        break;
      case 'KeyR': { // 한글 IME 오타(ㄱ) 방지 — HUD 열림 상태에서만
        if (!opHud.classList.contains('open')) break;
        const root = document.documentElement.style;
        if (!rehearsal) {
          rehearsalBase = TS();
          root.setProperty('--tscale', String(rehearsalBase / 2));
          rehearsal = true;
        } else {
          root.setProperty('--tscale', String(rehearsalBase));
          rehearsal = false;
        }
        opHud.classList.toggle('rehearsal', rehearsal);
        break;
      }
    }
  });

  /* v2: 마우스 미사용 확정 — 지도 클릭/포커스 점프 제거 (비상 점프는 HUD 열고 숫자키) */

  /* ===== 점등 구역 위 반짝이 스파크 (필터 없는 경량 요소) ===== */
  FIELDS.forEach(f => {
    const g = document.querySelector(`.district[data-id="${f.id}"]`);
    if (!g) return;
    [[-44, -28, 5], [36, -14, 3.4], [-6, 40, 4.2]].forEach((o, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'spark');
      c.setAttribute('cx', f.anchor[0] + o[0]);
      c.setAttribute('cy', f.anchor[1] + o[1]);
      c.setAttribute('r', o[2]);
      c.style.setProperty('--si', i);
      g.appendChild(c);
    });
  });

  /* 우하단 워드마크 클릭 = 모든 분야+통합 완료 상태로 점프 (유일하게 허용된 마우스 입력) — 이후 SPACE = 바로 세계지도 */
  const wordmark = $('#wordmark');
  if (wordmark) wordmark.addEventListener('click', () => forceComplete());

  buildHud();
  updateHud();
  runIntro();
  loadWorld();
  // 리허설/검증용 훅 (콘솔 전용 — 관객 동선에 영향 없음)
  window.__cueTest = { startWorldDraw, recenterWorld, forceComplete, forceUnify, forceMayor };
})();
