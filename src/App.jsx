import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { events, tripMeta, todos, dayKey, ms, hasPos } from './data/trip'
import Header from './components/Header'
import ClockPanel from './components/ClockPanel'
import MapPanel from './components/MapPanel'
import Timeline from './components/Timeline'
import EventDetail from './components/EventDetail'
import TodoList from './components/TodoList'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function findState(now) {
  const t = now.getTime()
  const current = events.find(e => t >= ms(e.start) && t < ms(e.end)) || null
  const next = events.find(e => ms(e.start) > t) || null
  const prev = [...events].reverse().find(e => ms(e.end) <= t) || null
  return { current, next, prev }
}

function plannedPosition(now) {
  const { current, next, prev } = findState(now)
  if (current?.type === 'flight' && hasPos(current) && next && hasPos(next)) {
    const start = ms(current.start), end = ms(current.end)
    const progress = clamp((now.getTime() - start) / (end - start || 1), 0, 1)
    return {
      lat: current.lat + (next.lat - current.lat) * progress,
      lng: current.lng + (next.lng - current.lng) * progress,
      label: `${current.title} → ${next.title}`,
    }
  }
  if (current && hasPos(current)) return { lat: current.lat, lng: current.lng, label: current.title }
  if (prev && next && hasPos(prev) && hasPos(next)) {
    const a = ms(prev.end), b = ms(next.start), p = clamp((now.getTime() - a) / (b - a || 1), 0, 1)
    return { lat: prev.lat + (next.lat - prev.lat) * p, lng: prev.lng + (next.lng - prev.lng) * p, label: `${prev.title} → ${next.title}` }
  }
  const one = [current, next, prev].find(hasPos)
  return one ? { lat: one.lat, lng: one.lng, label: one.title } : null
}

function useMap(selected, now, gps) {
  const el = useRef(null), mapRef = useRef(null), layerRef = useRef(null), focusRef = useRef(null)
  const [follow, setFollow] = useState(true)
  useEffect(() => {
    if (!el.current || mapRef.current) return
    const initialPosition = follow ? plannedPosition(now) : null
    const initialCenter = initialPosition ? [initialPosition.lat, initialPosition.lng] : [35.02, 135.55]
    const initialZoom = initialPosition ? 12 : 9
    const map = L.map(el.current, { zoomControl: true, zoomSnap: 0 }).setView(initialCenter, initialZoom)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map)
    map.on('dragstart', () => setFollow(false))
    map.on('zoomstart', e => { if (e.originalEvent) setFollow(false) })
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    setTimeout(() => map.invalidateSize(), 100)
    return () => { map.remove(); mapRef.current = null; layerRef.current = null }
  }, [])
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const today = dayKey(now)
    const dayEvents = events.filter(e => e.start.slice(0, 10) === today && hasPos(e))
    dayEvents.forEach((e, i) => L.circleMarker([e.lat, e.lng], {
      radius: e.id === selected?.id ? 9 : 6, weight: e.id === selected?.id ? 3 : 1, fillOpacity: .85
    }).bindTooltip(`${i + 1}. ${e.title}`).addTo(layer))
    if (dayEvents.length > 1) L.polyline(dayEvents.map(e => [e.lat, e.lng]), { weight: 3, dashArray: '7 7', opacity: .55 }).addTo(layer)
    const pp = plannedPosition(now)
    if (pp) {
      // Keep the moving estimate visually distinct from the blue itinerary points.
      L.circleMarker([pp.lat, pp.lng], {
        radius: 17, color: '#e11d48', weight: 1, fillColor: '#fb7185', fillOpacity: .24,
        interactive: false,
      }).addTo(layer)
      L.circleMarker([pp.lat, pp.lng], {
        radius: 8, color: '#fff', weight: 3, fillColor: '#e11d48', fillOpacity: 1,
      }).bindTooltip(`예정 위치: ${pp.label}`).addTo(layer).bringToFront()
    }
    if (gps) L.circleMarker([gps.lat, gps.lng], { radius: 8, weight: 3, fillOpacity: .8 }).bindTooltip('실제 GPS 위치').addTo(layer)
    const focus = pp ? [pp.lat, pp.lng] : null
    const key = focus ? focus.join(',') : null
    if (follow && key && key !== focusRef.current) { focusRef.current = key; map.panTo(focus, { animate: true }) }
  }, [selected, now, gps, follow])
  useEffect(() => { focusRef.current = null }, [follow])
  return { el, follow, setFollow }
}

export default function App() {
  const [mode, setMode] = useState('live')
  const [simTime, setSimTime] = useState(new Date(tripMeta.start))
  const [now, setNow] = useState(new Date())
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(300)
  const [selected, setSelected] = useState(null)
  const [timelineFocus, setTimelineFocus] = useState({ id: null, version: 0 })
  const [gps, setGps] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [done, setDone] = useState(() => JSON.parse(localStorage.getItem('trip.todo.done') || '{}'))
  const [menuOpen, setMenuOpen] = useState(false)

  const activeTime = mode === 'live' ? now : simTime
  const activeTs = activeTime.getTime()
  const state = useMemo(() => findState(activeTime), [activeTs])
  const { el: mapEl, follow, setFollow } = useMap(selected || state.current || state.next, activeTime, gps)

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { if (mode !== 'sim' || !playing) return; const id = setInterval(() => setSimTime(t => { const base = Number.isFinite(t.getTime()) ? t.getTime() : ms(tripMeta.start); return new Date(Math.min(ms(tripMeta.end), base + speed * 1000)) }), 1000); return () => clearInterval(id) }, [mode, playing, speed])
  useEffect(() => { if (simTime.getTime() >= ms(tripMeta.end)) setPlaying(false) }, [simTime])
  useEffect(() => localStorage.setItem('trip.todo.done', JSON.stringify(done)), [done])

  const askGps = () => {
    if (!navigator.geolocation) { setGpsError('이 브라우저는 GPS를 지원하지 않습니다.'); return }
    navigator.geolocation.getCurrentPosition(
      p => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setGpsError('') },
      e => setGpsError(e.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 })
  }
  const upcoming = state.next
  const minsToUpcoming = upcoming ? Math.round((ms(upcoming.start) - activeTime.getTime()) / 60000) : null
  const detailEvent = follow
    ? (state.current || upcoming)
    : (selected || state.current || upcoming)
  const showCurrentSchedule = () => {
    const target = state.current || upcoming
    setSelected(null)
    setTimelineFocus(focus => ({ id: target?.id ?? null, version: focus.version + 1 }))
  }

  return (
    <div className="app">
      <Header mode={mode} setMode={setMode} openMenu={menuOpen} setOpenMenu={setMenuOpen} />

      <ClockPanel
        mode={mode} setMode={setMode} activeTime={activeTime} playing={playing} setPlaying={setPlaying}
        speed={speed} setSpeed={setSpeed} simTime={simTime} setSimTime={setSimTime}
        current={state.current} next={upcoming} minsToNext={minsToUpcoming} />

      <main className="grid">
        <div className="stack">
          <Timeline events={events} currentTime={activeTime.getTime()}
            currentId={state.current?.id} selectedId={selected?.id} onSelect={setSelected} scrollTarget={timelineFocus} follow={follow} />
          <EventDetail event={detailEvent} currentId={state.current?.id} onClear={showCurrentSchedule} />
        </div>
        <MapPanel mapEl={mapEl} follow={follow} setFollow={setFollow} gps={gps} gpsError={gpsError} askGps={askGps} />
      </main>

      {menuOpen && (
        <div className="menuOverlay" onClick={() => setMenuOpen(false)}>
          <div className="menuDrawer" onClick={e => e.stopPropagation()}>
            <div className="menuHead">
              <strong>준비 체크</strong>
              <button className="clearBtn" onClick={() => setMenuOpen(false)}>닫기</button>
            </div>
            <TodoList todos={todos} done={done} onToggle={id => setDone(d => ({ ...d, [id]: !d[id] }))} bare />
          </div>
        </div>
      )}

      <footer>지도: OpenStreetMap · 경로는 계획 순서 점선 · 실제 철도/버스 시간은 출발 전 재확인</footer>
    </div>
  )
}
