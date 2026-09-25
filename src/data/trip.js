export const tripMeta = {
  title: '오사카 · 나라 · 교토 · 고베',
  start: '2026-09-26T12:10:00+09:00',
  end: '2026-10-01T18:30:00+09:00',
  timezone: 'Asia/Tokyo',
}

const JST = 'Asia/Tokyo'
export const fmt = (d, opt = {}) => { const t = new Date(d).getTime(); if (!Number.isFinite(t)) return '—'; return new Intl.DateTimeFormat('ko-KR', { timeZone: JST, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, ...opt }).format(d) }
export const dayKey = d => { const t = new Date(d).getTime(); if (!Number.isFinite(t)) return ''; return new Intl.DateTimeFormat('sv-SE', { timeZone: JST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) }
export const ms = s => new Date(s).getTime()
export const hasPos = e => Number.isFinite(e?.lat) && Number.isFinite(e?.lng)

export const dayGroups = evs => {
  const m = {}
  for (const e of evs) { const k = e.start.slice(0, 10); (m[k] = m[k] || []).push(e) }
  return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]))
}

export const TYPE = {
  flight:  { label: '항공', type: 'flight', color: '#2563eb' },
  arrival: { label: '도착', type: 'arrival', color: '#0d9488' },
  transit: { label: '이동', type: 'transit', color: '#7c3aed' },
  food:    { label: '음식', type: 'food', color: '#f59e0b' },
  sight:   { label: '관광', type: 'sight', color: '#16a34a' },
  hotel:   { label: '숙박', type: 'hotel', color: '#0ea5e9' },
  event:   { label: '이벤트', type: 'event', color: '#e11d48' },
  task:    { label: '업무', type: 'task', color: '#64748b' },
  flex:    { label: '유연', type: 'flex', color: '#94a3b8' },
}
export const typeOf = t => TYPE[t] || { label: t || '기타', type: 'flex', color: '#64748b' }

const E = (id, start, end, title, city, type, options = {}) => ({
  id, start, end, title, city, type,
  status: options.status ?? 'planned',
  note: options.note ?? '',
  prep: options.prep ?? '',
  prepMinutes: options.prepMinutes ?? 0,
  lat: options.lat,
  lng: options.lng,
  query: options.query,
  price: options.price,
  reservation: options.reservation,
  transport: options.transport,
})

export const events = [
  E('trip-depart','2026-09-26T12:10:00+09:00','2026-09-26T16:10:00+09:00','출발','이동','transit',{lat:37.4602,lng:126.4407}),
  E('icn-depart','2026-09-26T16:10:00+09:00','2026-09-26T18:05:00+09:00','인천 T2 → 간사이공항 T1','이동','flight',{lat:37.4602,lng:126.4407,prep:'탑승권·여권 확인',prepMinutes:120,transport:'LJ239'}),
  E('kix-arrive','2026-09-26T18:05:00+09:00','2026-09-26T19:20:00+09:00','입국심사 · 수하물','오사카','arrival',{lat:34.4347,lng:135.2441,prep:'ICOCA/현금·데이터 연결 점검'}),
  E('kamu-kix','2026-09-26T19:20:00+09:00','2026-09-26T20:00:00+09:00','도톤보리 카무쿠라 KIX점','오사카','food',{lat:34.4347,lng:135.2441,price:'약 ¥890',note:'첫 일본 음식은 라멘'}),
  E('to-osaka','2026-09-26T20:00:00+09:00','2026-09-26T21:15:00+09:00','KIX → 신사이바시','오사카','transit',{lat:34.6751,lng:135.5004,transport:'철도',prep:'호텔 주소 준비'}),
  E('sarasa-checkin','2026-09-26T21:15:00+09:00','2026-09-26T21:40:00+09:00','SARASA HOTEL Shinsaibashi 체크인','오사카','hotel',{lat:34.6751,lng:135.5004,query:'SARASA HOTEL Shinsaibashi Osaka'}),
  E('late-snack','2026-09-26T21:40:00+09:00','2026-09-26T23:00:00+09:00','야식 선택 슬롯','오사카','flex',{lat:34.6751,lng:135.5004,note:'푸딩/슈크림 · 타코야키 · 가벼운 이자카야'}),

  E('breakfast-27','2026-09-27T08:30:00+09:00','2026-09-27T09:00:00+09:00','편의점 가벼운 조식','오사카','food',{lat:34.6751,lng:135.5004,note:'오니기리 또는 계란샌드 + 커피'}),
  E('to-umeda','2026-09-27T11:00:00+09:00','2026-09-27T11:35:00+09:00','신사이바시 → 우메다','오사카','transit',{lat:34.7025,lng:135.4959,transport:'지하철',prep:'예약 화면 준비',prepMinutes:20}),
  E('aburiya','2026-09-27T12:00:00+09:00','2026-09-27T14:00:00+09:00','아부리야 우메다점(あぶりや 梅田店)','오사카','food',{lat:34.7044,lng:135.4989,query:'あぶりや 梅田店',price:'¥5,368',reservation:'예약 예정',note:'카이노미 첫 주문 · 우설/흑모와규 상위코스 제외 · 이후 일정 중 가장 우선순위 높음'}),
  E('to-umeda-sky','2026-09-27T14:00:00+09:00','2026-09-27T14:15:00+09:00','아부리야 → 우메다 스카이빌딩','오사카','transit',{lat:34.7053,lng:135.4900,transport:'도보 약 15분'}),
  E('umeda-sky','2026-09-27T14:15:00+09:00','2026-09-27T15:10:00+09:00','우메다 스카이빌딩 공중정원','오사카','sight',{lat:34.7053,lng:135.4900,query:'우메다 스카이빌딩 공중정원',note:'14:20 전후 입장 목표 · 오사카 주유패스 1일권(¥3,500) 무료 적용 시작 · 아부리야 다음 최우선 일정'}),
  E('to-osaka-castle','2026-09-27T15:10:00+09:00','2026-09-27T15:45:00+09:00','우메다 → 오사카성','오사카','transit',{lat:34.6873,lng:135.5262,transport:'지하철'}),
  E('osaka-castle','2026-09-27T15:45:00+09:00','2026-09-27T17:20:00+09:00','오사카성 천수각','오사카','sight',{lat:34.6873,lng:135.5262,query:'오사카성 천수각',note:'17:30 최종입장 전 여유 확보 · 주유패스 적용'}),
  E('to-shinsekai','2026-09-27T17:20:00+09:00','2026-09-27T18:00:00+09:00','오사카성 → 신세카이','오사카','transit',{lat:34.6521,lng:135.5062,transport:'지하철'}),
  E('shinsekai','2026-09-27T18:00:00+09:00','2026-09-27T19:30:00+09:00','신세카이(新世界) · 츠텐카쿠(通天閣)','오사카','sight',{lat:34.6521,lng:135.5062,query:'통천각 신세카이',note:'츠텐카쿠 전망대까지 입장 · 주유패스 적용'}),
  E('kushikatsu-snack','2026-09-27T19:30:00+09:00','2026-09-27T19:50:00+09:00','쿠시카츠 간식','오사카','food',{lat:34.6521,lng:135.5062,note:'정식 저녁 대신 가볍게 몇 개만'}),
  E('to-dotonbori','2026-09-27T19:50:00+09:00','2026-09-27T20:15:00+09:00','신세카이 → 도톤보리','오사카','transit',{lat:34.6687,lng:135.5030,transport:'지하철'}),
  E('dotonbori','2026-09-27T20:15:00+09:00','2026-09-27T22:00:00+09:00','도톤보리(道頓堀) · 호젠지요코초(法善寺横丁) · 신사이바시','오사카','sight',{lat:34.6687,lng:135.5030,note:'호젠지요코초 → 신사이바시 순으로 이동 · 이후 호텔 복귀'}),

  E('checkout-osaka','2026-09-28T08:00:00+09:00','2026-09-28T09:30:00+09:00','체크아웃 · 오사카 → 나라','나라','transit',{lat:34.6842,lng:135.8274,transport:'긴테쓰',prep:'캐리어·호텔 체크아웃',prepMinutes:30}),
  E('nara-station','2026-09-28T09:30:00+09:00','2026-09-28T09:45:00+09:00','긴테쓰나라역 · 캐리어 보관','나라','task',{lat:34.6842,lng:135.8274,prep:'코인락커 위치 확인'}),
  E('nara-walk','2026-09-28T09:45:00+09:00','2026-09-28T11:45:00+09:00','고후쿠지 · 나라공원 · 우키미도','나라','sight',{lat:34.6851,lng:135.8430,note:'도다이지는 혼잡 낮으면 추가'}),
  E('seizen','2026-09-28T12:00:00+09:00','2026-09-28T13:10:00+09:00','돈카츠 세이젠(とんかつ清善)','나라','food',{query:'とんかつ清善 奈良',price:'약 ¥3,200',reservation:'예약 추천',note:'숙성 로스 150g + 특제 멘치 · 백업: 사쿠라버거',prep:'예약 여부 확인',prepMinutes:30}),
  E('naramachi','2026-09-28T13:15:00+09:00','2026-09-28T15:10:00+09:00','나라마치 산책','나라','sight',{lat:34.6770,lng:135.8300}),
  E('to-kyoto','2026-09-28T15:10:00+09:00','2026-09-28T16:30:00+09:00','나라 → 교토 · 체크인','교토','transit',{lat:35.0031,lng:135.7550,transport:'긴테쓰/JR'}),
  E('smile-checkin','2026-09-28T16:30:00+09:00','2026-09-28T17:00:00+09:00','Smile Hotel Kyoto Shijo 체크인','교토','hotel',{lat:35.0031,lng:135.7550,query:'Smile Hotel Kyoto Shijo'}),
  E('bajitofu','2026-09-28T18:30:00+09:00','2026-09-28T20:00:00+09:00','바지토후(馬耳東風)','교토','food',{query:'馬耳東風 京都',price:'¥2,500~3,500',reservation:'미예약 · 전화예약 필요',note:'모모·세세리·네기마·츠쿠네·닭날개 / 내장 제외',prep:'전화 예약 075-255-1311 (온라인 예약 불가)',prepMinutes:0}),

  E('breakfast-29','2026-09-29T06:30:00+09:00','2026-09-29T06:50:00+09:00','편의점 조식','교토','food',{lat:35.0031,lng:135.7550}),
  E('to-arashiyama','2026-09-29T07:00:00+09:00','2026-09-29T07:45:00+09:00','호텔 → 아라시야마','교토','transit',{lat:35.0146,lng:135.6778,transport:'카라스마 → 가쓰라 → 아라시야마'}),
  E('arashiyama','2026-09-29T07:45:00+09:00','2026-09-29T10:30:00+09:00','도게츠교 · 죽림 · 사가토리이모토','교토','sight',{lat:35.0170,lng:135.6713,note:'혼잡 구역 장시간 체류 피함'}),
  E('kyorinsen','2026-09-29T11:30:00+09:00','2026-09-29T12:45:00+09:00','텐푸라처 쿄린센(天婦羅処 京林泉)','교토','food',{query:'天婦羅処 京林泉 京都',price:'¥3,500',reservation:'예약 추천',note:'평일 쿄고젠 · 예약 가능 시간(11:30/13:30) 중 11:30 선택'}),
  E('kyoto-afternoon','2026-09-29T13:30:00+09:00','2026-09-29T17:00:00+09:00','오후 자유 선택','교토','flex',{lat:35.0254,lng:135.7621,note:'니시진 또는 교토교엔/고쇼 · 식당 동선 우선'}),
  E('kanei','2026-09-29T18:00:00+09:00','2026-09-29T19:15:00+09:00','테우치소바 카네이(手打ち蕎麦 かね井)','교토','food',{query:'手打ち蕎麦 かね井 京都',price:'약 ¥1,900',reservation:'미예약 · 전화예약 필요',note:'매운무 오로시소바 + 소바두부',prep:'전화 예약 075-441-8283 (온라인 예약 불가) · 이동 확인',prepMinutes:45}),
  E('dessert-29','2026-09-29T21:00:00+09:00','2026-09-29T22:00:00+09:00','편의점 디저트 / 작은 이자카야','교토','flex',{lat:35.0031,lng:135.7550}),

  E('checkout-kyoto','2026-09-30T06:45:00+09:00','2026-09-30T07:15:00+09:00','체크아웃 · 캐리어 보관','교토','task',{lat:35.0031,lng:135.7550,prep:'짐 분리·귀중품 확인'}),
  E('fushimi','2026-09-30T07:30:00+09:00','2026-09-30T08:50:00+09:00','후시미이나리(伏見稲荷)','교토','sight',{lat:34.9671,lng:135.7727,note:'센본도리이 중심 · 정상 등산 제외'}),
  E('tofukuji','2026-09-30T09:00:00+09:00','2026-09-30T10:30:00+09:00','도후쿠지(東福寺)','교토','sight',{lat:34.9768,lng:135.7730}),
  E('spice','2026-09-30T11:20:00+09:00','2026-09-30T12:30:00+09:00','SPICE CHAMBER','교토','food',{lat:35.0010,lng:135.7593,query:'SPICE CHAMBER Kyoto',price:'¥1,400~1,600',note:'11:30 오픈 전 도착 · 치킨 키마카레',prep:'오픈런 이동 시작',prepMinutes:25}),
  E('pickup-bag','2026-09-30T13:00:00+09:00','2026-09-30T13:30:00+09:00','호텔 복귀 · 캐리어 회수','교토','task',{lat:35.0031,lng:135.7550}),
  E('to-kobe','2026-09-30T14:00:00+09:00','2026-09-30T15:30:00+09:00','카라스마 → 고베산노미야 → 호텔','고베','transit',{lat:34.6869,lng:135.1899,transport:'한큐'}),
  E('kobe-checkin','2026-09-30T15:30:00+09:00','2026-09-30T16:00:00+09:00','Kobe Port Tower Hotel 체크인','고베','hotel',{lat:34.6858,lng:135.1850,query:'Kobe Port Tower Hotel'}),
  E('kobe-waterfront','2026-09-30T16:00:00+09:00','2026-09-30T17:20:00+09:00','난킨마치 · 구거류지','고베','sight',{lat:34.6826,lng:135.1867}),
  E('rakukanki','2026-09-30T17:30:00+09:00','2026-09-30T19:00:00+09:00','라쿠칸키(楽関記)','고베','food',{query:'楽関記 神戸',price:'약 ¥2,880',reservation:'예약 확정',note:'샤오룽바·찐 닭·가리비·새우 / パクチー抜き'}),
  E('kobe-night','2026-09-30T19:00:00+09:00','2026-09-30T21:30:00+09:00','메리켄파크 · 포트타워 · 하버랜드 · MOSAIC (야경)','고베','sight',{lat:34.6796,lng:135.1817,note:'식사 후 야경 위주 산책으로 재배치'}),

  E('kobe-morning','2026-10-01T09:00:00+09:00','2026-10-01T11:00:00+09:00','고베 워터프런트 산책','고베','sight',{lat:34.6805,lng:135.1866}),
  E('checkout-kobe','2026-10-01T11:00:00+09:00','2026-10-01T11:10:00+09:00','호텔 체크아웃','고베','task',{lat:34.6858,lng:135.1850}),
  E('quattro','2026-10-01T11:10:00+09:00','2026-10-01T12:30:00+09:00','요쇼쿠 콰트로(洋食クアトロ)','고베','food',{query:'洋食クアトロ 神戸',price:'약 ¥1,850',note:'B세트 · 대기 30분↑이면 고베 스테이크 메리켄',prep:'11:05~11:10 대기 확인',prepMinutes:10}),
  E('souvenir','2026-10-01T12:30:00+09:00','2026-10-01T13:30:00+09:00','오미아게 구매 · 짐 회수','고베','task',{lat:34.6896,lng:135.1956}),
  E('to-ukb','2026-10-01T13:30:00+09:00','2026-10-01T14:30:00+09:00','모토마치 → 산노미야 → 고베공항','고베','transit',{lat:34.6328,lng:135.2239,transport:'포트라이너',prep:'여권·탑승권·수하물 점검',prepMinutes:30}),
  E('ukb-depart','2026-10-01T16:30:00+09:00','2026-10-01T18:30:00+09:00','고베공항 T2 → 인천 T2','이동','flight',{lat:34.6328,lng:135.2239,prep:'출국수속 완료 목표',prepMinutes:120}),
]

export const todos = [
  { id:'r3', label:'바지토후 전화 예약 (075-255-1311)', date:'2026-09-28', priority:3 },
  { id:'r5', label:'카네이 전화 예약 (075-441-8283)', date:'2026-09-29', priority:5 },
]
