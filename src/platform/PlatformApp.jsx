import React, { useState, useMemo, useCallback } from 'react';
import { Shell } from './Shell.jsx';
import { ProjectSummary } from './ProjectSummary.jsx';
import { getPlatformState, savePlatformState } from './dataSource.js';
import { TimelineView } from './features/timeline/TimelineView.jsx';
import { MapView } from './features/map/MapView.jsx';
import { BookingView } from './features/booking/BookingView.jsx';
import { CostView } from './features/cost/CostView.jsx';
import { TasksView } from './features/tasks/TasksView.jsx';
import { PlansView } from './features/plans/PlansView.jsx';
import { deriveActiveState, previewOptionChange, commitOptionChange, updateBookingStatus, updateTaskStatus, addCostRecord, createOptionGroup } from '../store/commands/index.ts';

export function PlatformApp() {
  const [view, setView] = useState('summary');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Lazy initialization to avoid side effects in useMemo and ensure hook order
  const [initialState] = useState(() => {
    const result = getPlatformState();
    if (result.error) {
      return { state: null, error: result.error };
    }
    return { state: result.state, error: null };
  });

  const [state, setState] = useState(initialState.state);
  const [error, setError] = useState(initialState.error);

  // Helper to update state and save (Save-First Strategy)
  const updateState = useCallback((newState) => {
    const saveResult = savePlatformState(newState);
    if (!saveResult.ok) {
      setSaveError(saveResult.error);
      return false;
    }
    setState(newState);
    setSaveError(null);
    return true;
  }, []);

  // Command handlers
  const handleUpdateBookingStatus = useCallback((bookingId, status) => {
    if (!state) return;
    const result = updateBookingStatus(state, bookingId, status);
    if (result.ok) {
      updateState(result.value);
    } else {
      setSaveError(result.error);
    }
  }, [state, updateState]);

  const handleUpdateTaskStatus = useCallback((taskId, status) => {
    if (!state) return;
    const result = updateTaskStatus(state, taskId, status);
    if (result.ok) {
      updateState(result.value);
    } else {
      setSaveError(result.error);
    }
  }, [state, updateState]);

  const handleAddCostRecord = useCallback((record) => {
    if (!state) {
      return { ok: false, error: 'State not loaded' };
    }
    const result = addCostRecord(state, record);
    if (!result.ok) {
      setSaveError(result.error);
      return { ok: false, error: result.error };
    }
    const success = updateState(result.value);
    if (!success) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true };
  }, [state, updateState]);

  const handleCreateGroup = useCallback((input) => {
    if (!state) return { ok: false, error: 'State not loaded' };
    const result = createOptionGroup(state, input);
    if (result.ok) {
      const success = updateState(result.value);
      if (!success) {
        return { ok: false, error: 'Save failed' };
      }
    }
    return result;
  }, [state, updateState]);

  const handlePreview = useCallback((groupId, optionId) => {
    if (!state) return;
    const result = previewOptionChange(state, groupId, optionId);
    if (result.ok) {
      setPreview(result.value);
    } else {
      setSaveError(result.error);
    }
  }, [state]);

  const handleCommit = useCallback((previewData) => {
    if (!state) return;
    const result = commitOptionChange(state, previewData);
    if (result.ok) {
      const success = updateState(result.value);
      if (success) {
        setPreview(null);
      } else {
        // Keep preview if save fails
      }
    } else {
      setSaveError(result.error);
      // Keep preview if commit fails
    }
  }, [state, updateState]);

  const handleCancel = useCallback(() => {
    setPreview(null);
  }, []);

  // Derive active state for Timeline, Map, Booking, Cost, Tasks
  // This must be before any early returns to maintain hook order
  const activeState = useMemo(() => {
    if (!state) return null;
    const derived = deriveActiveState(state);
    // Create a complete EntityState by spreading the original state and replacing active arrays
    return {
      ...state,
      planItems: derived.planItems,
      bookings: derived.bookings,
      tasks: derived.tasks,
      costRecords: derived.costRecords,
      routes: derived.routes,
      places: derived.places,
    };
  }, [state]);

  const handleSelectItem = (id) => {
    setSelectedItemId(id);
  };

  const handleNavigate = (nextView) => {
    setView(nextView);
  };

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
          state={activeState}
          timezone={timezone}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
        />
      );
    }

    if (view === 'map') {
      return (
        <MapView
          state={activeState}
          timezone={timezone}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
        />
      );
    }

    if (view === 'booking') {
      return (
        <BookingView
          state={activeState}
          onNavigate={handleNavigate}
          onUpdateBookingStatus={handleUpdateBookingStatus}
        />
      );
    }

    if (view === 'cost') {
      return (
        <CostView
          state={activeState}
          onAddCostRecord={handleAddCostRecord}
        />
      );
    }

    if (view === 'tasks') {
      return (
        <TasksView
          state={activeState}
          onUpdateTaskStatus={handleUpdateTaskStatus}
        />
      );
    }

    if (view === 'plans') {
      return (
        <PlansView
          state={state}
          onPreview={handlePreview}
          onCommit={handleCommit}
          onCancel={handleCancel}
          preview={preview}
          onCreateGroup={handleCreateGroup}
        />
      );
    }

    return null;
  };

  return (
    <Shell view={view} onNavigate={handleNavigate}>
      {saveError && (
        <div className="platform-save-error" role="alert">
          저장 실패: {saveError}
        </div>
      )}
      {renderContent()}
    </Shell>
  );
}