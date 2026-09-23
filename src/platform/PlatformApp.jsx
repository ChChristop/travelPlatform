import React, { useState, useMemo } from 'react';
import { Shell } from './Shell.jsx';
import { ProjectSummary } from './ProjectSummary.jsx';
import { getPlatformState } from './dataSource.js';
import { TimelineView } from './features/timeline/TimelineView.jsx';
import { MapView } from './features/map/MapView.jsx';

export function PlatformApp() {
  const [view, setView] = useState('summary');
  const [selectedItemId, setSelectedItemId] = useState(null);

  const { state, error } = useMemo(() => getPlatformState(), []);

  if (error) {
    return (
      <div className="platform-error">
        <h2>데이터 로드 실패</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="platform-error">
        <h2>데이터 없음</h2>
        <p>플랫폼 상태를 초기화할 수 없습니다.</p>
      </div>
    );
  }

  const project = state.projects[0];
  const timezone = project ? project.timezone : 'Asia/Tokyo';

  const handleSelectItem = (id) => {
    setSelectedItemId(id);
  };

  const handleNavigate = (nextView) => {
    setView(nextView);
  };

  const renderContent = () => {
    if (view === 'summary') {
      if (!project) {
        return <div className="platform-empty">프로젝트가 없습니다.</div>;
      }
      return <ProjectSummary project={project} onNavigate={handleNavigate} />;
    }

    if (view === 'timeline') {
      return (
        <TimelineView
          state={state}
          timezone={timezone}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
        />
      );
    }

    if (view === 'map') {
      return (
        <MapView
          state={state}
          timezone={timezone}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
        />
      );
    }

    return null;
  };

  return (
    <Shell view={view} onNavigate={handleNavigate}>
      {renderContent()}
    </Shell>
  );
}
