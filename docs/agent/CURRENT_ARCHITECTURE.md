# Current Architecture — Phase 0 Repository Audit

감사일: 2026-09-23. 기준 HEAD: d0ca7f5baea901501f8cd343f93fa02653b6be80.
Local Qwen 초안/교정안의 반복 오류와 누락은 Codex가 실제 소스와 대조하여 최종 수정했다. 제안 사항은 구현하지 않았다.

## 1. 기준과 보존 범위

README.md와 루트의 travel-platform-domain-design.md, IMPLEMENTATION_ROADMAP.md, AGENT_WORKFLOW.md를 기준으로 한다. 뒤의 세 문서는 요청된 docs 경로에 없으며 원본 이동/복제는 하지 않았다. Domain 의미는 설계 문서, 실행 Phase 순서는 IMPLEMENTATION_ROADMAP을 따른다(설계 문서 말미의 간략 단계 순서와 다름).
초기 working tree는 clean. 작업 중 사용자가 수정한 AGENT_WORKFLOW.md를 보존했다. 앱 코드/CSS/설정/lockfile은 Git상 내용 변경 없음. 브라우저 시각/GPS/배포 검증은 하지 않았다.

## 2. Package / 기술 스택

package.json: kansai-trip-navigator 0.1.0, private, ESM. 실제 소스는 JS/JSX.

| 패키지 | 선언 | 설치 버전 |
|---|---|---|
| react / react-dom | 18.3.1 | 18.3.1 |
| leaflet | 1.9.4 | 1.9.4 |
| vite | latest | 8.3.0 |
| @vitejs/plugin-react | latest | 6.1.1 |
| typescript | latest | 7.0.2 |

모두 dependencies에 있으며 devDependencies는 비어 있다. Node 22.17.0 / npm 11.5.2. TypeScript는 의존성만 있고 TS 소스/tsconfig/typecheck 명령은 없다. Tailwind는 README와 달리 미사용; src/styles.css의 일반 CSS/변수를 사용한다. Router, 외부 store, backend/DB/auth, 테스트 framework 없음.

## 3. Route / Page / Component 관계

단일 SPA 화면으로 별도 URL Route나 pages 디렉터리가 없다. LIVE/SIM은 App.mode 전환이고 준비 체크는 조건부 drawer다. 선택/날짜는 URL에 반영되지 않는다.

index.html → src/main.jsx(StrictMode, Leaflet CSS + styles.css) → App
- Header: tripMeta 직접 import, 준비 버튼 → App.menuOpen
- ClockPanel: fmt 직접 import, mode/simTime/playing/speed 제어
- main.grid → stack(Timeline + EventDetail) 및 MapPanel
- Timeline: events props와 dayGroups/typeOf/ms; 선택 → App.selected
- EventDetail: 선택 또는 현재/예정 이벤트, typeOf/hasPos/fmt 사용
- MapPanel: 지도 DOM ref/버튼/범례; 실제 Leaflet 로직은 App.useMap
- menuOverlay/menuDrawer → TodoList(bare): done/onToggle props
- Icons.jsx: Timeline/ClockPanel/EventDetail/MapPanel의 SVG
- footer: 지도/동선 안내

App.jsx:67부터 mode, simTime, now, playing, speed, selected(이벤트 객체), gps, gpsError, done, menuOpen을 소유한다. useMap은 map/layer/focus ref와 follow 상태를 소유한다. App은 trip.js의 정적 데이터/유틸을 직접 import한다. trip.js:20에는 미사용 TypeIcon import가 있어 데이터→JSX 의존도 남아 있다. 독립 Domain API 경계는 없다.

## 4. 여행 데이터 위치 / schema

원본은 src/data/trip.js 단일 정적 파일이다. 여행 데이터 편집/서버 로딩/저장 기능은 없다.

| 구조 | 현재 필드 |
|---|---|
| tripMeta (1행) | title:string, start/end:ISO(+09:00), timezone:'Asia/Tokyo' |
| events (49행) | E() 팩토리로 만든 평탄한 배열, 현재 시작시간 순서 |
| event 기본 | id/title/city/type:string, start/end:ISO string |
| 기본값 | status='planned', note='', prep='', prepMinutes=0 |
| optional | lat/lng:number 또는 undefined; query/price/reservation/transport:string 또는 undefined |
| todos (103행) | {id:string,label:string,date:YYYY-MM-DD,priority:number}[] |

E 팩토리는 35행. price는 대략값/범위 텍스트이며 Money가 아니다. reservation은 추천/예정/필요 설명으로 실제 예약 증거와 구분되지 않는다. query는 저장만 하며 UI/geocoder에서 사용하지 않는다. transport는 설명 문자열이다.
TYPE(22행)는 flight/arrival/transit/food/sight/hotel/event/task/flex의 label/type/color를 정의한다. typeOf는 메타데이터/fallback을 반환하며 SVG 선택은 Icons.TypeIcon이 별도로 담당한다.
fmt/dayKey/ms/hasPos/dayGroups도 같은 파일에 있다. hasPos는 lat/lng 모두 유한수인지 검사한다.

실제 집계: 6일, 이벤트 46개(고유 ID 46), 좌표 보유 이벤트 40개, todo 8개. 마커 수는 고유 장소 수가 아니다.

| 날짜 | 이벤트 | 좌표 보유 |
|---|---:|---:|
| 2026-09-26 | 6 | 6 |
| 2026-09-27 | 9 | 9 |
| 2026-09-28 | 8 | 6 |
| 2026-09-29 | 7 | 5 |
| 2026-09-30 | 10 | 9 |
| 2026-10-01 | 6 | 5 |

좌표 누락 ID: seizen, bajitofu, kyorinsen, kanei, rakukanki, quattro. 추측 좌표를 채우지 않는다.

## 5. LIVE / 날짜 계산

App.jsx:13 findState:
- current: start <= t < end인 배열 첫 항목
- next: start > t인 배열 첫 항목
- prev: 역순에서 end <= t인 첫 항목

함수는 정렬하지 않아 순서/겹침에 민감하다. App.jsx:84가 1초마다 now를 갱신한다. activeTime은 LIVE에서 now, SIM에서 simTime. Timeline/지도/상세가 이를 공유한다.
App.jsx:96의 upcoming은 첫 end > t 항목이므로 진행 중 일정도 포함한다. ClockPanel.next에는 state.next 대신 upcoming을 전달한다. 따라서 진행 중 항목이 '다음 일정'으로 표시되고 음수 카운트다운이 생길 수 있으며 current 표시 분기가 가려진다. 수정하지 않고 위험으로 기록한다.
준비 안내는 EventDetail의 prep/prepMinutes 정적 텍스트다. README와 달리 시간 기반 알림/trigger 실행은 없다. TripRun/ItemExecution, 실제 도착/완료 기록, 지연 계산도 없다.

fmt/dayKey(trip.js:9/10)는 Asia/Tokyo 상수를 쓰고 tripMeta.timezone을 동적으로 읽지 않는다. dayGroups(14행)와 지도 필터는 start.slice(0,10)를 사용한다. 이는 UTC 변환이 아닌 문자 자르기다. 현재 +09:00 fixture에서는 일치하지만 Z/다른 offset 및 여러 날 숙박 도입 시 project timezone 기준 투영이 필요하다. Timeline.jsx:49 fmtDay는 timezone을 명시하지 않아 브라우저 timezone에 따라 날짜가 달라질 수 있다.
ClockPanel은 별도 time 변수를 계산하나 직접 렌더링하지 않는다. date의 fmt 기본 옵션에는 시/분이 남을 수 있어 '시간이 전혀 안 보임'으로 단정할 수 없다. Header는 날짜 차이 5일, Timeline은 포함 날짜 6일을 표시한다.

## 6. SIM

App.jsx:69/71/72/85/86, components/ClockPanel.jsx에 구현되어 있다.
초기 simTime은 tripMeta.start, speed=300. mode=sim이고 playing일 때 매 1초 speed*1000ms 증가. 60/300/900/3600배, 재생/일시정지, datetime-local 직접 입력 지원. end에서 상한 제한/정지한다. 수동 입력은 여행 기간으로 제한하지 않으며 invalid time은 다음 재생 tick에서 시작시각 기준으로 복구한다.
입력 표시값은 브라우저 로컬 wall time으로 만들지만 변경값은 +09:00을 붙여 해석한다. JST와 다른 timezone에서 표시/입력이 비대칭이다.
interval 기반이므로 실제 경과시간 보정/deterministic engine은 아니다. Scenario/Constraint/Option/Preview는 미구현이다. now/simTime은 시계이지 실제 실행 증거가 아니므로 TripRun/ItemExecution으로 기계적으로 변환하면 안 된다.

## 7. Leaflet / 지도 / GPS

실제 구현은 App.jsx:32 useMap. MapPanel은 ref/버튼/범례/오류 렌더링, main.jsx는 Leaflet CSS import.
- 초기 [35.02,135.55], zoom 9. OSM 표준 타일, maxZoom 19, attribution.
- activeTime 날짜의 좌표 보유 일정만 circleMarker로 표시. 순서대로 점선 polyline 연결. 도로/철도 routing API나 offline cache는 없다.
- App.jsx:21 plannedPosition은 좌표 있는 current 우선; 없으면 prev/next 모두 좌표일 때 prev.end~next.start 사이 선형 보간; 나머지는 current/next/prev 중 첫 좌표로 fallback.
- selected/current/next가 hook에 전달되어 focus 우선순위를 정한다. 마커 날짜는 selected의 날짜가 아니다. 다른 날을 선택하면 focus와 마커 날짜가 다를 수 있다.
- dragstart에서 follow 해제, zoomstart는 originalEvent 있는 경우만 해제. follow는 이벤트/예정 위치를 향하며 GPS 추적이 아니다.
- activeTime/selected/gps/follow 변경마다 layer를 비우고 다시 그림. cleanup에서 map.remove(). DOM ref와 CSS 높이 보존 필요.
- App.jsx:89 askGps는 버튼으로 getCurrentPosition 1회 호출. highAccuracy=true, timeout=10000ms, maximumAge=30000ms.
- {lat,lng,accuracy}, gpsError는 메모리 state. watchPosition/이력/자동 지연 감지 없음. GPS는 SIM에서도 표시 가능.

## 8. 체크리스트 / localStorage

유일한 key: trip.todo.done. App.jsx:76에서 JSON.parse로 읽고 87행 effect에서 JSON.stringify로 쓴다. schema는 {[legacyTodoId]:boolean}. project/schema version namespace, backup, migration, 형식 검증, 예외 처리 없음. 손상 JSON/접근 거부/용량 오류에 취약하다.
TodoList는 App drawer에서 bare로 렌더링되어 완료 수/진행 바는 숨긴다. 원본 순서이고 priority는 정렬에 쓰지 않는다. 완료 수는 done의 모든 truthy 값이므로 미래 삭제 ID가 남으면 집계 위험이 있다. 체크 완료는 reservation/event.status를 갱신하지 않는다. PlanItem과 명시적 연결도 없다.
done 외 선택/모드/시계/GPS/여행 데이터는 persist하지 않는다.

## 9. GitHub Pages / build / 테스트 환경

vite.config.js: React plugin, base:'./', 기본 dist 출력. 상대 asset 경로는 정적 호스팅에 적합하지만 .github/workflows는 없다. README의 main push 자동 배포는 현재 checkout으로 확인되지 않는다. 실제 Pages 설정/배포는 미확인.

| 명령 | 결과 |
|---|---|
| npm install | PASS, added 44 / audited 69 / 0 vulnerabilities |
| npm run build | PASS, 첫 sandbox spawn EPERM 후 승인된 동일 명령 성공 |
| npm run lint | 스크립트 미설정, 미실행 |
| npm test | 스크립트 미설정, 미실행 |

Vite 8.3.0, 25 modules, 1.54s. dist/index.html 0.45kB, CSS 27.56kB, JS 318.28kB.
스크립트는 dev/build/preview만 있다. ESLint/unit/E2E/typecheck 설정 없음. build는 기능/시각 검증을 대체하지 않는다. .gitignore는 node_modules/dist 제외. package-lock.json은 Git상 내용 변경 없음. 실제 브라우저/GPS 권한/타일 네트워크/배포는 미검증.

## 10. 디자인 결합 위험

사용자별 UI 수정 이력은 추정하지 않고 현재 UI 전체를 기준선으로 삼는다.

| 위험 | 영역 | 이유 |
|---|---|---|
| 매우 높음 | App + styles.css | grid/stack/drawer, 100vh/내부 스크롤, 상태와 지도 생명주기 결합 |
| 매우 높음 | MapPanel/useMap/.map | DOM ref와 flex/min-height 변화로 Leaflet 크기/표시 영향 |
| 높음 | Timeline/Icons/TYPE | active/selected/past 조합, 타입 색/아이콘/그룹/시간 형식 |
| 높음 | ClockPanel | LIVE/SIM 컨트롤 배치와 분기, 모바일 clockSub 숨김 |
| 높음 | EventDetail | 색/칩/행 및 가격/예약/준비 문자열과 레이아웃 결합 |
| 높음 | Header/TodoList/drawer | Kansai 브랜드 하드코딩, bare 체크리스트, overlay/animation |

styles.css:201의 1024px 이하에서는 위 일정/상세와 아래 지도 배치, 208의 760px 이하에서는 stack 세로 정렬 등 비율이 달라진다. Domain 때문에 markup/class/CSS를 재작성하지 말고 기존 props 형태 ViewModel을 우선한다. 향후 UI 연결 시 desktop/mobile screenshot 기준선 추가 필요.

## 11. Legacy 충돌 / Migration Adapter

| 충돌 | 향후 경계 및 주의점 |
|---|---|
| 전역 events/tripMeta, selected 객체 | Project/PlanVersion ID 경계, legacy ID 매핑, 기존 UI projection |
| hotel은 체크인 순간 이벤트 | 전체 숙박과 동일시하지 않기. 기간 근거 확인 후 의미 단위 lodging 연결; 날짜별 Entity 복제 금지 |
| food/transit/sight/hotel/flex/arrival | meal/transport/attraction/lodging/freeTime 등 명시적 매핑; arrival/task 의미 판단. 기존 아이콘/색 presentation 보존 |
| 이벤트 좌표/query | Place/PlaceReference 분리; 좌표만으로 동일 장소 병합 금지. 좌표는 optional 유지. target Place에 query가 없으므로 migration metadata 또는 합의된 확장으로 보존 |
| price 대략값/범위 | 원문/출처 보존. 확실한 값만 Money로 변환; 범위를 확정 금액으로 강제하지 않기. CostRecord/Breakdown 구분 |
| reservation 추천/예정 | BookingPolicy와 실제 Booking 증거 분리. 추천을 confirmed Booking으로 생성하지 않기 |
| prep/prepMinutes와 todos | legacyTodoId→TaskId 대응, 준비 Trigger 분리. 연결을 임의 추정하지 않기 |
| 전역 저장 key | 읽기/backup/검증 후 version/project namespace로 이행. 손상 원문 보존, 기본값으로 덮어쓰지 않기 |
| 날짜 substring/JST 상수 | project.timezone Selector. 기존 timestamp/경계 동작 fixture 보존; 알려진 버그 수정은 별도 scope |
| 점선과 transport 문자열 | Map ViewModel/Route Adapter 분리. origin/destination/legs/geometry 근거 없이 생성 금지 |
| LIVE/SIM 시계뿐 | clock/예정 위치 Selector와 실제 실행 lifecycle 분리. TripRun은 명시적 시작, SIM은 독립 Preview |
| note에 백업/선택 문구 | 원문 보존 후 OptionGroup/Fragment와 Scenario 구분. 변경은 Preview 후 Commit |

가장 위험한 지점은 의미 손실(체크인/가격/예약), 날짜/시계 기준 변경, todo 저장 유실과 UI/지도 결합이다.
권장 경계: Legacy→Domain Adapter→Selector→Legacy-compatible ViewModel→기존 UI. 원본 일괄 교체나 View별 중복 저장을 피한다.

## 12. Local Qwen / OpenCode / 다음 단계

/v1/models의 실제 ID로 chat/completions 문서 생성 응답을 받았다. helper는 모델을 매번 조회하며 복수 모델이면 중단한다. endpoint는 실행 인자로 전달한다.
OpenCode desktop 설치/실행은 확인했지만 CLI는 PATH와 점검한 일반 설치 위치에서 찾지 못했다. OpenCode provider/agent runner 연결은 미검증. 이번에는 직접 API 분석 위임 + Codex 검증 명령 실행이었다. Qwen 교정 응답에도 오류가 반복되어 Codex가 문서를 직접 교정했다.

Phase 1 제안만: 기존 UI/legacy를 유지하고 src/domain에 ID/Money 및 핵심 Entity Type/관계를 정의하며 격리된 TypeScript static check를 구성한다. 빠진 관계/타입 변형은 설계와 대조해 결정한다. Store/Adapter 실제 migration은 후속 Phase다.
사용자 병렬 정책: 가벼운 독립 작업 최대 4, 중간 2~3, Store/Migration/Simulation/LIVE 같은 무거운 작업 최대 2 Qwen 세션. CURRENT_TASK에 담당 세션/허용·금지 파일/의존성/완료 조건 명시, 동일 파일 동시 수정 금지. 사용자 검토 전 Phase 1을 시작하지 않는다.

