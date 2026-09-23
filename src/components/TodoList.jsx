import React from 'react'

export default function TodoList({ todos, done, onToggle, bare }) {
  const count = Object.values(done).filter(Boolean).length
  return (
    <section className={`panel todoPanel ${bare ? 'todoBare' : ''}`}>
      {!bare && (
        <>
          <div className="panelHead">
            <strong>준비 체크</strong>
            <span className="todoCount">{count}/{todos.length}</span>
          </div>
          <div className="todoBar"><i style={{ width: `${(count / todos.length) * 100}%` }} /></div>
        </>
      )}
      <div className="todos">
        {todos.map(t => (
          <label key={t.id} className={`todo ${done[t.id] ? 'checked' : ''}`}>
            <input type="checkbox" checked={!!done[t.id]} onChange={() => onToggle(t.id)} />
            <span className="todoCheck">{done[t.id] ? '✓' : ''}</span>
            <span className="todoLabel">{t.label}<small>{t.date}</small></span>
          </label>
        ))}
      </div>
    </section>
  )
}
