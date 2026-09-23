import { useMemo } from 'react';
import { selectByDay } from '../../../store/selectors/timeline.ts';
import './TimelineView.css';

/**
 * @typedef {import('../../types.js').PlatformViewProps} PlatformViewProps
 */

/**
 * Format an ISO datetime string to HH:MM in the given timezone.
 * @param {string} iso
 * @param {string} timezone
 * @returns {string}
 */
function formatTime(iso, timezone) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '—';
  }
}

/**
 * Format a day key (YYYY-MM-DD) to a readable label.
 * @param {string} dayKey
 * @param {string} timezone
 * @returns {string}
 */
function formatDayLabel(dayKey, timezone) {
  if (dayKey === 'unscheduled') return '미정';
  const date = new Date(dayKey + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dayKey;
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(date);
  } catch {
    return dayKey;
  }
}

/**
 * Get the primary place for a plan item.
 * @param {import('../../../domain/plan.ts').PlanItem} item
 * @param {import('../../../store/entities/state.ts').EntityState} state
 * @returns {import('../../../domain/place.ts').Place | null}
 */
function getPrimaryPlace(item, state) {
  if (!item.places || item.places.length === 0) return null;
  const primaryRef = item.places.find((r) => r.role === 'primary') || item.places[0];
  if (!primaryRef) return null;
  return state.places.find((p) => p.id === primaryRef.placeId) || null;
}

/**
 * Check if a plan item has a confirmed location (coordinates).
 * @param {import('../../../domain/plan.ts').PlanItem} item
 * @param {import('../../../store/entities/state.ts').EntityState} state
 * @returns {boolean}
 */
function hasLocation(item, state) {
  const place = getPrimaryPlace(item, state);
  if (!place) return false;
  return place.coordinates !== undefined &&
    Number.isFinite(place.coordinates.lat) &&
    Number.isFinite(place.coordinates.lng);
}

/**
 * Get a display label for the item's type.
 * @param {import('../../../domain/plan.ts').PlanItem} item
 * @returns {string}
 */
function getTypeLabel(item) {
  const typeMap = {
    lodging: '숙박',
    meal: '음식',
    transport: '이동',
    attraction: '관광',
    shopping: '쇼핑',
    flight: '항공',
    event: '이벤트',
    freeTime: '유연',
    task: '업무',
    custom: '기타',
  };
  return typeMap[item.type] || item.type;
}

/**
 * @param {PlatformViewProps} props
 */
export function TimelineView({ state, timezone, selectedItemId, onSelectItem }) {
  const dayBuckets = useMemo(() => {
    return selectByDay(state, timezone);
  }, [state, timezone]);

  return (
    <div className="timeline-view">
      {dayBuckets.length === 0 && (
        <div className="timeline-empty">일정 항목이 없습니다.</div>
      )}
      {dayBuckets.map((bucket) => (
        <section key={bucket.day} className="timeline-day">
          <h3 className="timeline-day-label">{formatDayLabel(bucket.day, timezone)}</h3>
          <ul className="timeline-items">
            {bucket.items.map((item) => {
              const isSelected = selectedItemId === item.id;
              const place = getPrimaryPlace(item, state);
              const hasLoc = hasLocation(item, state);
              const startTime = item.schedule.start ? formatTime(item.schedule.start, timezone) : '';
              const endTime = item.schedule.end ? formatTime(item.schedule.end, timezone) : '';

              return (
                <li
                  key={item.id}
                  className={`timeline-item ${isSelected ? 'selected' : ''} ${!hasLoc ? 'no-location' : ''}`}
                  onClick={() => onSelectItem(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectItem(item.id);
                    }
                  }}
                >
                  <div className="timeline-item-time">
                    <span className="time-start">{startTime}</span>
                    {endTime && <span className="time-end">{endTime}</span>}
                  </div>
                  <div className="timeline-item-body">
                    <div className="timeline-item-title-row">
                      <span className="timeline-item-type">{getTypeLabel(item)}</span>
                      <span className="timeline-item-title">{item.title}</span>
                    </div>
                    <div className="timeline-item-meta">
                      {place ? (
                        <span className="timeline-item-place">{place.name}</span>
                      ) : (
                        <span className="timeline-item-place">위치 미확정</span>
                      )}
                      {!hasLoc && <span className="timeline-item-no-loc">위치 미확정</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
