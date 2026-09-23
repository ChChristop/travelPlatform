import React from 'react';

/**
 * @param {{
 *   project: import('../domain/project.ts').TravelProject;
 *   onNavigate: (view: 'summary' | 'timeline' | 'map') => void;
 * }} props
 */
export function ProjectSummary({ project, onNavigate }) {
  return (
    <div className="project-summary">
      <div className="project-card">
        <h2 className="project-title">{project.title}</h2>
        <div className="project-meta">
          <div className="meta-row">
            <span className="meta-label">기간</span>
            <span className="meta-value">
              {project.startDate || '—'} ~ {project.endDate || '—'}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">타임존</span>
            <span className="meta-value">{project.timezone}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">상태</span>
            <span className="meta-value">{project.status}</span>
          </div>
        </div>
        <div className="project-actions">
          <button className="btn-primary" onClick={() => onNavigate('timeline')}>
            일정 보기
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('map')}>
            지도 보기
          </button>
        </div>
      </div>
    </div>
  );
}
