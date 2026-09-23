import React from 'react'
import { dayGroups, typeOf, ms } from '../data/trip'
import { TypeIcon } from './Icons'

export default function Timeline({ events, currentTime, currentId, selectedId, onSelect }) {
  const groups = dayGroups(events)
  return (
    <section className="panel timelinePanel">
      <div className="panelHead">
        <strong>일정</strong>
        <span>{groups.length}일 · {events.length}개</span>
      </div>
      <div className="timeline">
        {groups.map(([day, evs]) => (
          <div key={day} className="dayGroup">
            <div className="dayHead">
              <span className="dayDate">{fmtDay(day)}</span>
              <span className="dayCity">{cities(evs)}</span>
              <span className="dayCount">{evs.length}</span>
            </div>
            {evs.map(e => {
              const t = typeOf(e.type)
              const active = e.id === currentId
              const selected = e.id === selectedId
              const past = ms(e.start) < currentTime && !active
              return (
                <button key={e.id}
                  className={`event ${active ? 'active' : ''} ${selected ? 'selected' : ''} ${past ? 'past' : ''}`}
                  onClick={() => onSelect(e)}>
                  <span className="evTime">{e.start.slice(11, 16)}</span>
                  <span className="evType" style={{ color: t.color }}><TypeIcon type={e.type} /></span>
                  <span className="evBody">
                    <span className="evTitle">{e.title}</span>
                    <span className="evMeta">
                      {t.label}
                      {e.transport && <span className="evTransport">· {e.transport}</span>}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

const fmtDay = d => new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(d + 'T00:00:00+09:00'))
const cities = evs => [...new Set(evs.map(e => e.city).filter(c => c && c !== '이동'))].slice(0, 3).join(' · ')
