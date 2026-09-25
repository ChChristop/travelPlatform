import React from 'react'
import { fmt } from '../data/trip'
import { IconPlay, IconPause } from './Icons'

export default function ClockPanel({ mode, setMode, activeTime, playing, setPlaying, speed, setSpeed, simTime, setSimTime,
  current, next, minsToNext }) {
  const date = fmt(activeTime, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  const time = fmt(activeTime, { hour: '2-digit', minute: '2-digit' })
  const d = minsToNext !== null ? Math.floor(minsToNext / 1440) : 0
  const h = minsToNext !== null ? Math.floor(minsToNext % 1440 / 60) : 0
  const m = minsToNext !== null ? minsToNext % 60 : 0

  return (
    <section className="clockPanel">
      <div className="clockMain">
        <div className="clockTop">
          <span className="modeTag">{mode === 'live' ? 'LIVE' : 'SIM'}</span>
          <span className="clockDate">{date}</span>
        </div>
        <div className="clockSub">
          {minsToNext !== null && next ? (
            <span className="nextInline">다음 일정 <b>{next.title}</b> · {d}일 {h}시간 {m}분 후</span>
          ) : current ? (
            <span className="nextInline nowNow">{current.title} · 진행 중</span>
          ) : null}
        </div>
      </div>

      {mode === 'sim' && (
        <div className="simControls">
          <button className={playing ? 'isPlaying' : ''} onClick={() => setPlaying(v => !v)}>
            {playing ? <><IconPause /> 일시정지</> : <><IconPlay /> 재생</>}
          </button>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
            <option value="60">60×</option><option value="300">300×</option>
            <option value="900">900×</option><option value="3600">3600×</option>
          </select>
          <input type="datetime-local"
            value={Number.isFinite(simTime.getTime()) ? new Date(simTime.getTime() - simTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
            onChange={e => setSimTime(new Date(e.target.value + '+09:00'))} />
        </div>
      )}
    </section>
  )
}
