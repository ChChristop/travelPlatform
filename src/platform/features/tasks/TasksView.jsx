import React from 'react';
import './TasksView.css';

const STATUS_LABELS = {
  todo: '대기',
  done: '완료',
  skipped: '건너뜀',
};

const TRIGGER_TYPE_LABELS = {
  absoluteTime: '절대 시간',
  beforePlanItem: '항목 전',
  afterPlanItem: '항목 후',
  enterPlace: '장소 진입',
};

/**
 * @param {{
 *   state: import('../../types.js').EntityState;
 *   onUpdateTaskStatus: (taskId: string, status: string) => void;
 * }} props
 */
export function TasksView({ state, onUpdateTaskStatus }) {
  const tasks = state.tasks;
  const planItems = state.planItems;

  const getPlanItemTitle = (itemId) => {
    if (!itemId) return null;
    const item = planItems.find((i) => i.id === itemId);
    return item ? item.title : itemId;
  };

  const getTriggerDescription = (trigger) => {
    if (!trigger) return null;
    switch (trigger.type) {
      case 'absoluteTime':
        return `시간: ${trigger.at}`;
      case 'beforePlanItem': {
        const item = planItems.find((i) => i.id === trigger.planItemId);
        return `${item ? item.title : trigger.planItemId} 전 ${trigger.minutes}분`;
      }
      case 'afterPlanItem': {
        const item = planItems.find((i) => i.id === trigger.planItemId);
        return `${item ? item.title : trigger.planItemId} 후`;
      }
      case 'enterPlace':
        return `장소 진입 (반경 ${trigger.radiusMeters}m)`;
      default:
        return null;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="tasks-view">
        <div className="tasks-empty">
          <h3>태스크 없음</h3>
          <p>현재 등록된 태스크가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-view">
      <div className="tasks-header">
        <h2>태스크 관리</h2>
        <p className="tasks-subtitle">태스크 상태를 업데이트하세요.</p>
      </div>

      <div className="tasks-list" aria-label="태스크 목록">
        {tasks.map((task) => {
          const linkedTitle = getPlanItemTitle(task.linkedPlanItemId);
          const triggerDesc = getTriggerDescription(task.trigger);
          return (
            <article key={task.id} className="task-card" aria-label={`태스크: ${task.title}`}>
              <div className="task-card-header">
                <span className={`task-status-badge task-status-${task.status}`}>
                  {STATUS_LABELS[task.status] || task.status}
                </span>
                <h3 className="task-title">{task.title}</h3>
              </div>

              <div className="task-card-body">
                {linkedTitle && (
                  <div className="task-detail-row">
                    <span className="task-detail-label">연결 항목</span>
                    <span className="task-detail-value">{linkedTitle}</span>
                  </div>
                )}
                {triggerDesc && (
                  <div className="task-detail-row">
                    <span className="task-detail-label">트리거</span>
                    <span className="task-detail-value">{triggerDesc}</span>
                  </div>
                )}

                <div className="task-actions" role="group" aria-label="태스크 상태 변경">
                  <button
                    className={`task-btn task-btn-todo ${task.status === 'todo' ? 'active' : ''}`}
                    onClick={() => onUpdateTaskStatus(task.id, 'todo')}
                    aria-pressed={task.status === 'todo'}
                  >
                    대기
                  </button>
                  <button
                    className={`task-btn task-btn-done ${task.status === 'done' ? 'active' : ''}`}
                    onClick={() => onUpdateTaskStatus(task.id, 'done')}
                    aria-pressed={task.status === 'done'}
                  >
                    완료
                  </button>
                  <button
                    className={`task-btn task-btn-skipped ${task.status === 'skipped' ? 'active' : ''}`}
                    onClick={() => onUpdateTaskStatus(task.id, 'skipped')}
                    aria-pressed={task.status === 'skipped'}
                  >
                    건너뜀
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
