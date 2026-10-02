import React from 'react';
import './BookingView.css';

const STATUS_LABELS = {
  draft: '초안',
  requested: '요청됨',
  confirmed: '확정됨',
  cancelled: '취소됨',
  completed: '완료됨',
  failed: '실패',
};

const TYPE_LABELS = {
  hotel: '숙박',
  restaurant: '식당',
  flight: '항공',
  ticket: '티켓',
  transport: '교통',
  tour: '투어',
  other: '기타',
};

const COST_TYPE_LABELS = {
  estimate: '예상',
  committed: '확정',
  actual: '실결제',
  refund: '환불',
};

const COST_CATEGORY_LABELS = {
  lodging: '숙박',
  food: '식비',
  transport: '교통',
  attraction: '관광',
  shopping: '쇼핑',
  other: '기타',
};

const POLICY_AVAILABILITY_LABELS = {
  available: '가용',
  notAvailable: '미가용',
  unknown: '미상',
};

const POLICY_REQUIREMENT_LABELS = {
  required: '필수',
  recommended: '권장',
  optional: '선택',
  walkInOnly: '워크인 전용',
};

/**
 * Format an ISO datetime (e.g. 2026-09-26T15:00:00+09:00) to a compact,
 * human-readable "YYYY-MM-DD HH:mm" form. Falls back to the raw string.
 * @param {string} iso
 * @returns {string}
 */
function formatDateTime(iso) {
  if (!iso) return '—';
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[1]} ${m[2]}` : iso;
}

/**
 * Format a date-only string (YYYY-MM-DD) for display.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateOnly(dateStr) {
  if (!dateStr) return '—';
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(dateStr);
  return m ? m[1] : dateStr;
}

/**
 * @param {{
 *   state: import('../../types.js').EntityState;
 *   onNavigate: (view: string) => void;
 *   onUpdateBookingStatus: (bookingId: string, status: string) => void;
 * }} props
 */
export function BookingView({ state, onNavigate, onUpdateBookingStatus }) {
  const bookings = state.bookings;
  const planItems = state.planItems;
  const costRecords = state.costRecords || [];

  const getPlanItemTitle = (itemId) => {
    const item = planItems.find((i) => i.id === itemId);
    return item ? item.title : itemId;
  };

  const getPlanItemScheduleRange = (itemId) => {
    const item = planItems.find((i) => i.id === itemId);
    if (!item || !item.schedule) return null;

    const startStr = item.schedule.start ? formatDateOnly(item.schedule.start) : '—';
    const endStr = item.schedule.end ? formatDateOnly(item.schedule.end) : '—';

    return `${startStr} ~ ${endStr}`;
  };

  const getBookingTitle = (booking) => {
    const linkedItem = booking.planItemIds
      .map((itemId) => planItems.find((item) => item.id === itemId))
      .find(Boolean);
    return linkedItem?.title || booking.provider || `${TYPE_LABELS[booking.type] || '예약'} 예약`;
  };

  const getCostsForBooking = (booking) => {
    const planItemIds = new Set(booking.planItemIds);
    return costRecords.filter((record) => (
      (record.subject?.type === 'booking' && record.subject.id === booking.id)
      || (record.subject?.type === 'planItem' && planItemIds.has(record.subject.id))
    ));
  };

  const getPolicyForBooking = (booking) => {
    for (const itemId of booking.planItemIds) {
      const item = planItems.find((i) => i.id === itemId);
      if (item && item.bookingPolicy) {
        return item.bookingPolicy;
      }
    }
    return null;
  };

  const getPolicyForItem = (itemId) => {
    const item = planItems.find((i) => i.id === itemId);
    return item && item.bookingPolicy ? item.bookingPolicy : null;
  };

  const renderPolicySection = (policy, title) => {
    return (
      <div className="booking-section">
        <h4 className="booking-section-title">{title}</h4>
        {policy ? (
          <dl className="booking-policy-details">
            <div className="booking-detail-row">
              <dt>가용성</dt>
              <dd>{POLICY_AVAILABILITY_LABELS[policy.availability] || policy.availability}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>요구사항</dt>
              <dd>{POLICY_REQUIREMENT_LABELS[policy.requirement] || policy.requirement}</dd>
            </div>
            {policy.note && (
              <div className="booking-detail-row">
                <dt>메모</dt>
                <dd>{policy.note}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="booking-muted">정책 정보 없음</p>
        )}
      </div>
    );
  };

  const renderStatusControls = (booking) => {
    return (
      <div className="booking-status-controls" role="group" aria-label={`예약 ${booking.id} 상태 변경`}>
        {Object.keys(STATUS_LABELS).map((status) => (
          <button
            key={status}
            className={`booking-status-btn booking-status-btn-${status} ${booking.status === status ? 'active' : ''}`}
            onClick={() => onUpdateBookingStatus(booking.id, status)}
            aria-pressed={booking.status === status}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    );
  };

  // Collect all plan items that have a booking policy but no corresponding booking
  const itemsWithPolicyNoBooking = planItems.filter((item) => {
    if (!item.bookingPolicy) return false;
    const hasBooking = bookings.some((b) => b.planItemIds.includes(item.id));
    return !hasBooking;
  });

  if (bookings.length === 0 && itemsWithPolicyNoBooking.length === 0) {
    return (
      <div className="booking-view">
        <div className="booking-empty">
          <h3>예약 없음</h3>
          <p>현재 등록된 예약이 없습니다.</p>
          <button className="booking-btn-secondary" onClick={() => onNavigate('plans')}>
            일정으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-view">
      <div className="booking-header">
        <h2>예약 관리</h2>
        <p className="booking-subtitle">BookingPolicy(정책)와 Booking(실제 예약)을 구분하여 표시합니다.</p>
      </div>

      {bookings.length > 0 && (
        <div className="booking-list">
          {bookings.map((booking) => {
            const policy = getPolicyForBooking(booking);
            const bookingCosts = getCostsForBooking(booking);
            return (
              <article key={booking.id} className="booking-card" aria-label={`예약: ${getBookingTitle(booking)}`}>
                <div className="booking-card-header">
                  <div className="booking-card-heading">
                    <h3 className="booking-card-title">{getBookingTitle(booking)}</h3>
                    <span className={`booking-type-badge booking-type-${booking.type}`}>
                      {TYPE_LABELS[booking.type] || booking.type}
                    </span>
                  </div>
                  <span className={`booking-status-badge booking-status-${booking.status}`}>
                    {STATUS_LABELS[booking.status] || booking.status}
                  </span>
                </div>

                <div className="booking-card-body">
                  <div className="booking-section">
                    <h4 className="booking-section-title">실제 예약 (Booking)</h4>
                    <dl className="booking-details">
                      <div className="booking-detail-row">
                        <dt>예약 ID</dt>
                        <dd>{booking.id}</dd>
                      </div>
                      {booking.provider && (
                        <div className="booking-detail-row">
                          <dt>프로바이더</dt>
                          <dd>{booking.provider}</dd>
                        </div>
                      )}
                      {booking.datetime && (
                        <div className="booking-detail-row">
                          <dt>일시</dt>
                          <dd>{formatDateTime(booking.datetime)}</dd>
                        </div>
                      )}
                      {booking.partySize !== undefined && (
                        <div className="booking-detail-row">
                          <dt>인원</dt>
                          <dd>{booking.partySize}명</dd>
                        </div>
                      )}
                      {booking.confirmationCode && (
                        <div className="booking-detail-row">
                          <dt>확정 코드</dt>
                          <dd>{booking.confirmationCode}</dd>
                        </div>
                      )}
                      {booking.bookingUrl && (
                        <div className="booking-detail-row">
                          <dt>예약 URL</dt>
                          <dd>
                            <a href={booking.bookingUrl} target="_blank" rel="noopener noreferrer">
                              링크 열기
                            </a>
                          </dd>
                        </div>
                      )}
                      {booking.bookedAt && (
                        <div className="booking-detail-row">
                          <dt>예약 완료일</dt>
                          <dd>{formatDateTime(booking.bookedAt)}</dd>
                        </div>
                      )}
                      {booking.cancellationDeadline && (
                        <div className="booking-detail-row">
                          <dt>취소 마감</dt>
                          <dd>{formatDateTime(booking.cancellationDeadline)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="booking-section">
                    <h4 className="booking-section-title">연결된 Plan Items</h4>
                    {booking.planItemIds.length > 0 ? (
                      <ul className="booking-plan-items">
                        {booking.planItemIds.map((itemId) => {
                          const scheduleRange = getPlanItemScheduleRange(itemId);
                          return (
                            <li key={itemId}>
                              <span>{getPlanItemTitle(itemId)}</span>
                              {scheduleRange && (
                                <span className="booking-plan-item-schedule">{scheduleRange}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="booking-muted">연결된 항목 없음</p>
                    )}
                  </div>

                  <div className="booking-section booking-cost-section">
                    <h4 className="booking-section-title">비용 기록</h4>
                    {bookingCosts.length > 0 ? (
                      <ul className="booking-cost-list">
                        {bookingCosts.map((record) => (
                          <li key={record.id} className="booking-cost-item">
                            <div className="booking-cost-description">
                              <span className={`booking-cost-type booking-cost-type-${record.type}`}>
                                {COST_TYPE_LABELS[record.type] || record.type}
                              </span>
                              <span className="booking-cost-category">
                                {COST_CATEGORY_LABELS[record.category] || record.category}
                              </span>
                            </div>
                            <strong className="booking-cost-amount">
                              {record.total.amount.toLocaleString()} {record.total.currency}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="booking-muted">이 예약에 연결된 비용 기록이 없습니다.</p>
                    )}
                  </div>

                  {renderPolicySection(policy, '예약 정책 (BookingPolicy)')}

                  <div className="booking-section">
                    <h4 className="booking-section-title">상태 변경</h4>
                    {renderStatusControls(booking)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {itemsWithPolicyNoBooking.length > 0 && (
        <div className="booking-policy-only-section">
          <h3 className="booking-policy-only-title">예약 정책만 존재하는 항목 (Booking 없음)</h3>
          <div className="booking-policy-only-list">
            {itemsWithPolicyNoBooking.map((item) => (
              <article key={item.id} className="booking-policy-card" aria-label={`정책: ${item.title}`}>
                <div className="booking-policy-card-header">
                  <span className="booking-policy-item-title">{item.title}</span>
                  <span className="booking-policy-item-id">{item.id}</span>
                </div>
                {renderPolicySection(item.bookingPolicy, '예약 정책 (BookingPolicy)')}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
