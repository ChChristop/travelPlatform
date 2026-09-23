import React from 'react';

/**
 * @param {{
 *   view: 'summary' | 'timeline' | 'map';
 *   onNavigate: (view: 'summary' | 'timeline' | 'map') => void;
 *   children: React.ReactNode;
 * }} props
 */
export function Shell({ view, onNavigate, children }) {
  const navItems = [
    { id: 'summary', label: '프로젝트' },
    { id: 'timeline', label: '일정' },
    { id: 'map', label: '지도' },
  ];

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <nav className="platform-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`platform-nav-btn ${view === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="platform-main">{children}</main>
    </div>
  );
}
