import React, { useEffect } from 'react'
import { packingGroups, packingItemCount } from '../data/packingChecklist'

export default function PackingChecklistModal({ checked, onToggle, onClose }) {
  const checkedCount = Object.values(checked).filter(Boolean).length

  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="packingOverlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="packingModal" role="dialog" aria-modal="true" aria-labelledby="packingTitle">
        <header className="packingHead">
          <div>
            <h2 id="packingTitle">출발 전 준비물 최종 체크</h2>
            <p>확인한 항목을 눌러 체크하세요</p>
          </div>
          <button className="packingClose" onClick={onClose} aria-label="닫기">닫기</button>
        </header>
        <div className="packingProgress" aria-live="polite">
          <span>준비물 확인</span><strong>{checkedCount} / {packingItemCount}</strong>
          <i><b style={{ width: `${Math.min(100, checkedCount / packingItemCount * 100)}%` }} /></i>
        </div>
        <div className="packingGroups">
          {packingGroups.map(group => (
            <section className="packingGroup" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map(item => (
                <label className={`packingItem ${checked[item.id] ? 'checked' : ''}`} key={item.id}>
                  <input type="checkbox" checked={Boolean(checked[item.id])} onChange={() => onToggle(item.id)} />
                  <span className="packingCheck" aria-hidden="true">{checked[item.id] ? '✓' : ''}</span>
                  <span className="packingText">
                    <strong className={item.important ? 'important' : ''}>{item.label}</strong>
                    <small>{item.note}</small>
                  </span>
                </label>
              ))}
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
