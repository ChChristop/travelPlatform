import React from 'react'
import { tripMeta } from '../data/trip'

export default function Header({ mode, setMode, openMenu, setOpenMenu }) {
  const [start, end] = [tripMeta.start.slice(0, 10), tripMeta.end.slice(0, 10)]
  const days = Math.round((new Date(end) - new Date(start)) / 864e5)
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brandMark">關</div>
        <strong>travelPlatform</strong>
        <span className="brandSub">{tripMeta.title} · {days}일</span>
      </div>
      <div className="headerActions">
        <div className="modeSwitch" role="tablist">
          <button className={mode === 'live' ? 'active' : ''} onClick={() => setMode('live')}>LIVE</button>
          <button className={mode === 'sim' ? 'active' : ''} onClick={() => setMode('sim')}>SIM</button>
        </div>
        <button className="menuBtn" onClick={() => setOpenMenu(v => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
          준비
        </button>
      </div>
    </header>
  )
}
