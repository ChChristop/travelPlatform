import React from 'react';

/**
 * @param {{
 *   view: 'summary' | 'timeline' | 'map' | 'booking' | 'cost' | 'tasks' | 'plans' | 'simulation';
 *   onNavigate: (view: 'summary' | 'timeline' | 'map' | 'booking' | 'cost' | 'tasks' | 'plans' | 'simulation') => void;
 *   children: React.ReactNode;
 * }} props
 */
export function Shell({ view, onNavigate, children }) {
  const navItems = [
    { id: 'summary', label: '프로젝트' },
    { id: 'timeline', label: '일정' },
    { id: 'map', label: '지도' },
    { id: 'booking', label: '예약' },
    { id: 'cost', label: '비용' },
    { id: 'tasks', label: '태스크' },
    { id: 'plans', label: '대안' },
    { id: 'simulation', label: '시뮬레이션' },
  ];

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <nav className="platform-nav" aria-label="주요 내비게이션">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`platform-nav-btn nav-tab-${item.id} ${view === item.id ? 'active' : ''}`}
              data-tab-id={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
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