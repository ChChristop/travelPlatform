import React, { useEffect, useRef } from 'react'
import { dayGroups, typeOf, ms } from '../data/trip'
import { TypeIcon } from './Icons'

export default function Timeline({ events, currentTime, currentId, selectedId, onSelect, scrollTarget, follow }) {
  const groups = dayGroups(events)
  const eventRefs = useRef(new Map())
  const scrollFrame = useRef(0)

  const scrollEvent = (id, alignTop = false) => {
    const target = eventRefs.current.get(id)
    const scroller = target?.closest('.timeline')
    if (!target || !scroller) return

    if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current)
    const targetRect = target.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    let destination = scroller.scrollTop
    if (alignTop) destination += targetRect.top - scrollerRect.top
    else if (targetRect.top < scrollerRect.top) destination += targetRect.top - scrollerRect.top
    else if (targetRect.bottom > scrollerRect.bottom) destination += targetRect.bottom - scrollerRect.bottom
    destination = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, destination))

    const start = scroller.scrollTop
    const distance = destination - start
    const duration = 140
    let startedAt
    const animate = timestamp => {
      startedAt ??= timestamp
      const progress = Math.min(1, (timestamp - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      scroller.scrollTop = start + distance * eased
      if (progress < 1) scrollFrame.current = requestAnimationFrame(animate)
      else scrollFrame.current = 0
    }
    scrollFrame.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (!scrollTarget?.id) return
    scrollEvent(scrollTarget.id)
  }, [scrollTarget?.version])

  useEffect(() => {
    if (follow && currentId) scrollEvent(currentId, true)
  }, [currentId, follow])

  useEffect(() => () => {
    if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current)
  }, [])

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
                  ref={node => node ? eventRefs.current.set(e.id, node) : eventRefs.current.delete(e.id)}
                  className={`event ${active ? 'active' : ''} ${selected ? 'selected' : ''} ${past ? 'past' : ''}`}
                  onClick={() => onSelect(e)}>
                  <span className="evBody">
                    <span className="evLine">
                      <span className="evTime">{e.start.slice(11, 16)}</span>
                      <span className="evType" style={{ color: t.color }}><TypeIcon type={e.type} /></span>
                      <span className="evMeta">
                        {t.label}
                        {e.transport && <span className="evTransport"> · {e.transport}</span>}
                      </span>
                      {' '}
                      <span className="evTitle">{e.title}</span>
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

const fmtDay = d => {
  const [, month, day] = d.split('-').map(Number)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${d}T12:00:00+09:00`))
  return `${month}/${day} (${weekday})`
}
const cities = evs => [...new Set(evs.map(e => e.city).filter(c => c && c !== '이동'))].slice(0, 3).join(' · ')
