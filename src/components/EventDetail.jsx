import React from 'react'
import { typeOf, hasPos, fmt } from '../data/trip'
import { IconGear, IconArrowRight, IconPen, IconWarning, IconMap } from './Icons'
import { packingItemCount } from '../data/packingChecklist'

export default function EventDetail({ event, currentId, onClear, packingChecked = {}, onOpenPacking }) {
  if (!event) {
    return (
      <section className="panel detailPanel">
        <div className="panelHead"><strong>상세</strong><span>일정을 선택하세요</span></div>
        <div className="empty">
          <div className="emptyIcon"><IconMap style={{ fontSize: 30 }} /></div>
          <p>왼쪽 일정 목록에서 항목을 선택하면<br />자세한 정보와 준비 사항이 여기에 표시됩니다.</p>
        </div>
      </section>
    )
  }
  const t = typeOf(event.type)
  const startShort = shortDateTime(event.start)
  const endShort = shortDateTime(event.end)
  return (
    <section className="panel detailPanel">
      <div className="panelHead">
        <strong>상세</strong>
        <button
          className={`clearBtn currentScheduleBtn ${event.id === currentId ? 'isCurrent' : ''}`}
          aria-pressed={event.id === currentId}
          onClick={onClear}>현재 일정</button>
      </div>
      <div className="detail">
        <div className="detailHead">
          <div className="detailType" style={{ background: t.color }}>{t.label}</div>
          <h2 className="detailTitle">{event.title}</h2>
        </div>
        <div className="detailTime">
          <span className="detailTimeFull">{fmt(new Date(event.start))} ~ {fmt(new Date(event.end))} · JST</span>
          <span className="detailTimeCompact">{startShort.day === endShort.day ? `${startShort.label}–${endShort.time}` : `${startShort.label}–${endShort.label}`} · JST</span>
        </div>
        <div className="chips">
          <span className="chip">{event.city}</span>
          {event.price && <span className="chip price">{event.price}</span>}
        </div>
        {event.note && <p className="detailNote">{event.note}</p>}
        {event.links?.length > 0 && <div className="detailLinks">
          {event.links.map(link => <a href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}
        </div>}

        <div className="detailRows">
          {event.id === 'trip-depart' && <button className="packingOpenBtn" onClick={onOpenPacking}>
            <span className="packingOpenTitle">준비물 확인</span>
            <span className="packingOpenMeta"><strong>{Object.values(packingChecked).filter(Boolean).length}/{packingItemCount} 체크</strong><i aria-hidden="true">›</i></span>
          </button>}
          {event.prep && <Row label="준비" value={event.prep + (event.prepMinutes ? ` · ${event.prepMinutes}분 전` : '')} icon={<IconGear />} />}
          {event.transport && <Row label="이동" value={event.transport} icon={<IconArrowRight />} />}
          {event.reservation && <Row label="예약" value={event.reservation} icon={<IconPen />} />}
        </div>

        {!hasPos(event) && (
          <div className="warning"><IconWarning /> 이 장소는 좌표가 미확정입니다. trip.js에 좌표를 넣으면 지도/동선에 자동 반영됩니다.</div>
        )}
      </div>
    </section>
  )
}

function shortDateTime(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = type => parts.find(part => part.type === type)?.value ?? ''
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    label: `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

function Row({ label, value, icon }) {
  return (
    <div className="dRow">
      <span className="dRowKey"><i>{icon}</i>{label}</span>
      <span className="dRowVal">{value}</span>
    </div>
  )
}
