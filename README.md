# 성남 미래지도 — 취임식 디지털 퍼포먼스

성남시장 취임식에서 운영하는 키보드 큐 기반 라이브 퍼포먼스 웹앱.
**이 저장소 루트가 완성된 정적 사이트입니다** — 빌드 없이 그대로 서빙하면 동작합니다.

## 배포 (GitHub Pages)

```bash
git init && git add -A && git commit -m "성남 미래지도 취임식 퍼포먼스 v2"
gh repo create seongnam-future-map --public --source . --push
gh api "repos/{owner}/seongnam-future-map/pages" -X POST -f "source[branch]=main" -f "source[path]=/"
```

배포 주소: `https://<아이디>.github.io/seongnam-future-map/`

- **빌드/번들링 금지** — 파일 그대로 서빙. 경로는 전부 상대경로라 서브디렉터리 배포 무방.
- 로컬 확인: `npx serve .` (`file://`로 직접 열면 CDN/폰트가 막힐 수 있음)
- 외부 CDN 필요(온라인): three, d3, topojson, world-atlas, react/babel(트윅 패널용)

## 배포 후 점검

1. 로딩 → **SPACE**: 불꽃 팡파레 → 타이포 줌-스루 → 오프닝 영상(데모 카드) → 지도 돌리-인
2. **SPACE ×6**: 분야별 큐 (문구 → 키워드 → 영상 → 구역 점등) — 분야마다 문구 등장 연출이 다름
3. **SPACE**: 통합 수렴 + 마무리 영상 → 시장 선언 대기
4. **SPACE**: 시장 클라이맥스 → 세계지도 → 성남 마커가 중앙 수렴하며 지도 형상으로 모프 → 리플 파동 → 천천히 회전 (회전은 GPU 합성 — 60fps 유지되어야 정상)
5. 콘솔 에러 없음 (Babel 개발모드 경고 1건은 정상)

## 운영 키

| 키 | 동작 |
|---|---|
| SPACE / ENTER / → | 다음 큐 진행 |
| ← | 한 큐 되돌리기 |
| ` (백쿼트) | 오퍼레이터 HUD 토글 (관객 화면에 안 보임) |
| 1~6 (HUD 열림 시) | 분야 점프 |
| 7 / 8 (HUD 열림 시) | 통합 강제 / 시장 강제 |
| B | 블랙아웃 |
| R | 리허설 배속 토글 |

## 영상 슬롯 교체 (시댄스 영상 입수 시)

`cues.js` 상단 `MEDIA` 객체에 경로만 넣으면 됩니다. `null`이면 1초 데모 카드로 대체.

```js
const MEDIA = {
  opening: 'media/opening.mp4',  // 오프닝 (엔드프레임 = 우주 + 지도)
  senior: ..., baby: ..., youth: ..., enterprise: ..., market: ..., redev: ...,
  unify: 'media/unify.mp4',      // 통합 마무리 (30s)
};
```

## 파일 구조

```
index.html            # 진입점 — 전체 DOM (지도 SVG, 레이어, 세계지도 피날레, HUD)
cues.js               # 큐 엔진 — 키보드 진행, 타이포/영상/점등, 세계지도 피날레
scene.js              # 지도 씬 FX (워프, 노바 등)
webgl-bg.js           # three.js 우주 배경
intro-fanfare.js      # 인트로 불꽃 팡파레 (시네마틱 카메라)
intro-launch.js       # 인트로 파티클 런치
styles.css            # 기본 스타일 (v1 계승)
v2.css                # v2 스타일 — 타이포 베리에이션, 세계지도 피날레, 리플
font-candidates.css   # 폰트 후보 정의
Paperlogy-*.woff2     # 디스플레이 폰트
seongnam-logo.png     # 성남시 엠블럼
tweaks-panel.jsx      # (선택) 디자인 검토용 트윅 패널 — 본행사에선 무해, 제거 가능
tweaks-app.jsx        # (선택) 위와 동일
```

## 수정 시 주의 (Claude Code / Codex용 메모)

- 시퀀스 타이밍은 CSS 변수 `--tscale`(전체 배속) × `--ttypo`(타이포 머무름)에 곱해짐 — index.html `<script>` 블록.
- 문구 등장 베리에이션: `cues.js`의 `TYPO_VARIANT` ↔ `v2.css`의 `.typo-quote.v-*` 쌍.
- 세계지도 성능 규칙 (되돌리지 말 것):
  - 수렴 애니메이션은 110m 저해상도로 그리다 마지막 프레임에 50m 복원
  - 정착 후 회전은 어트리뷰트가 아닌 **CSS 합성 변환**(`#worldG`/`#snMarker`의 style.transform) — 어트리뷰트 변환은 매 프레임 1MB 경로 리페인트를 유발함
- 성남 마커: 멀리선 원형 글로우 → 수렴 중 `setSnMorph()`로 성남 경계 형상 모프.
- 오프라인 행사장 대비: 트윅 패널 스크립트 4줄 제거 + world-atlas json 2개 로컬화(`cues.js` fetch URL 교체) + CDN 스크립트 로컬화 필요.
- 이 HTML은 디자인 시안이 아니라 **운영용 최종 결과물** — 프레임워크 포팅 불필요.
