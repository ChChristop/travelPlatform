import React, { useEffect } from 'react'
import { convenienceItems } from '../data/convenienceList'

export default function ConvenienceListModal({ checked, onToggle, onClose }) {
  const count = convenienceItems.filter(item => checked[item.id]).length
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="convenienceOverlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="convenienceModal" role="dialog" aria-modal="true" aria-labelledby="convenienceTitle">
        <header className="convenienceHead">
          <div><h2 id="convenienceTitle">편의점 목록</h2><p>먹어본 항목을 체크하세요</p></div>
          <button className="packingClose" onClick={onClose} aria-label="닫기">닫기</button>
        </header>
        <div className="convenienceProgress"><span>먹은 메뉴</span><strong>{count} / {convenienceItems.length}</strong><i><b style={{ width: `${count / convenienceItems.length * 100}%` }} /></i></div>
        <div className="convenienceList">
          {convenienceItems.map(item => (
            <label className={`convenienceItem ${checked[item.id] ? 'checked' : ''}`} key={item.id}>
              <input type="checkbox" checked={Boolean(checked[item.id])} onChange={() => onToggle(item.id)} />
              <span className="convenienceNumber">{item.number}</span>
              <span className="convenienceContent">
                <span className={`convenienceStore store-${item.store === '패밀리마트' ? 'family' : item.store === '세븐일레븐' ? 'seven' : item.store === '로손' ? 'lawson' : 'common'}`}>{item.store}</span>
                <strong>{item.name}</strong>
                <small>{item.timing}</small>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
