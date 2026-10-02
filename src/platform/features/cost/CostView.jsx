import React, { useState, useMemo } from 'react';
import './CostView.css';

const TYPE_LABELS = {
  estimate: '예상',
  committed: '확정',
  actual: '지불',
  refund: '환불',
};

const CATEGORY_LABELS = {
  lodging: '숙박',
  food: '식비',
  transport: '교통',
  attraction: '관광',
  shopping: '쇼핑',
  other: '기타',
};

const SUBJECT_TYPE_LABELS = {
  planItem: '일정 항목',
  booking: '예약',
  route: '경로',
  project: '프로젝트',
};

const BREAKDOWN_TYPE_LABELS = {
  night: '박',
  person: '인원',
  fee: '수수료',
  tax: '세금',
  discount: '할인',
  custom: '기타',
};

// Fixed ECB reference-rate snapshot dated 2026-10-01.
// Units of each currency per 1 EUR.
const ECB_RATE_DATE = '2026-10-01';
const UNITS_PER_EUR = {
  EUR: 1,
  USD: 1.1298,
  JPY: 178.49,
  CZK: 24.459,
  DKK: 7.4758,
  GBP: 0.85373,
  HUF: 367.18,
  PLN: 4.3735,
  RON: 5.2830,
  SEK: 11.3310,
  CHF: 0.9437,
  ISK: 137.00,
  NOK: 10.8750,
  TRY: 55.3993,
  AUD: 1.6255,
  BRL: 5.8620,
  CAD: 1.6095,
  CNY: 7.5748,
  HKD: 8.8658,
  IDR: 20274.71,
  ILS: 3.4755,
  INR: 108.8320,
  KRW: 1537.96,
  MXN: 20.5251,
  MYR: 4.6147,
  NZD: 2.0121,
  PHP: 70.950,
  SGD: 1.4460,
  THB: 38.023,
  ZAR: 18.6934,
};

const JPY_PER_EUR = UNITS_PER_EUR.JPY;

function formatMoney(amount, currency) {
  if (currency === 'JPY') {
    return `${Math.round(amount).toLocaleString()} JPY`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

function formatRange(min, max, currency) {
  if (currency === 'JPY') {
    return `${Math.round(min).toLocaleString()}~${Math.round(max).toLocaleString()} JPY`;
  }
  return `${min.toLocaleString()}~${max.toLocaleString()} ${currency}`;
}

function getScheduleDate(record, planItems, bookings, projects) {
  // 1. Try PlanItem schedule
  if (record.subject.type === 'planItem') {
    const item = planItems.find((i) => i.id === record.subject.id);
    if (item && item.schedule && item.schedule.start) {
      return item.schedule.start;
    }
  }

  // 2. Try Booking linked PlanItem
  if (record.subject.type === 'booking') {
    const booking = bookings.find((b) => b.id === record.subject.id);
    if (booking) {
      // Check if booking has a linked planItem
      if (booking.planItemIds && Array.isArray(booking.planItemIds) && booking.planItemIds.length > 0) {
        const item = planItems.find((i) => i.id === booking.planItemIds[0]);
        if (item && item.schedule && item.schedule.start) {
          return item.schedule.start;
        }
      }
      // Fallback to booking's own schedule if available
      if (booking.schedule && booking.schedule.start) {
        return booking.schedule.start;
      }
    }
  }

  // 3. Fallback to servicePeriod
  if (record.servicePeriod && record.servicePeriod.start) {
    return record.servicePeriod.start;
  }

  return null;
}

function formatDateTime(isoString, timezone) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return formatter.format(date);
  } catch (e) {
    return null;
  }
}

function getGroupKey(record, planItems, bookings, projects, timezone) {
  const dateStr = getScheduleDate(record, planItems, bookings, projects);
  if (dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'undated';
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    } catch (e) {
      return 'undated';
    }
  }
  return 'undated';
}

function getGroupLabel(key, timezone) {
  if (key === 'undated') {
    return '날짜 없음';
  }
  try {
    const date = new Date(key + 'T00:00:00');
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    return formatter.format(date);
  } catch (e) {
    return key;
  }
}

/**
 * @param {{
 *   state: import('../../types.js').EntityState;
 *   onAddCostRecord: (record: import('../../../domain/cost.ts').CostRecord) => Promise<{ok: boolean, error?: string}> | {ok: boolean, error?: string};
 * }} props
 */
export function CostView({ state, onAddCostRecord }) {
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState(null);

  const [subjectType, setSubjectType] = useState('planItem');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('actual');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('JPY');

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  // View Mode
  const [viewMode, setViewMode] = useState('date'); // 'date' | 'category'

  const costRecords = state.costRecords;
  const planItems = state.planItems;
  const bookings = state.bookings;
  const projects = state.projects;

  const project = projects[0];
  const timezone = project?.timezone || 'Asia/Tokyo';

  const getSubjectLabel = (subject) => {
    if (subject.type === 'planItem') {
      const item = planItems.find((i) => i.id === subject.id);
      return item ? item.title : subject.id;
    }
    if (subject.type === 'booking') {
      const booking = bookings.find((b) => b.id === subject.id);
      return booking ? `예약 ${booking.id}` : subject.id;
    }
    return subject.id;
  };

  // Get unique dates for filter
  const uniqueDates = useMemo(() => {
    const dates = new Set();
    for (const record of costRecords) {
      const dateStr = getScheduleDate(record, planItems, bookings, projects);
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const formatter = new Intl.DateTimeFormat('sv-SE', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
            dates.add(formatter.format(date));
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return Array.from(dates).sort();
  }, [costRecords, planItems, bookings, projects, timezone]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return costRecords.filter((record) => {
      // Category filter
      if (filterCategory !== 'all' && record.category !== filterCategory) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && record.type !== filterType) {
        return false;
      }

      // Date filter
      if (filterDate !== 'all') {
        const recordDate = getScheduleDate(record, planItems, bookings, projects);
        if (!recordDate) {
          return false;
        }
        try {
          const date = new Date(recordDate);
          if (isNaN(date.getTime())) return false;
          const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const recordDateStr = formatter.format(date);
          if (recordDateStr !== filterDate) {
            return false;
          }
        } catch (e) {
          return false;
        }
      }

      return true;
    });
  }, [costRecords, filterCategory, filterType, filterDate, planItems, bookings, projects, timezone]);

  // Grouped records
  const groupedRecords = useMemo(() => {
    const groups = {};

    for (const record of filteredRecords) {
      let key;
      if (viewMode === 'date') {
        key = getGroupKey(record, planItems, bookings, projects, timezone);
      } else {
        key = record.category;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    }

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (viewMode === 'date') {
        if (a === 'undated') return 1;
        if (b === 'undated') return -1;
        return a.localeCompare(b);
      } else {
        return a.localeCompare(b);
      }
    });

    return sortedKeys.map((key) => ({
      key,
      label: viewMode === 'date' ? getGroupLabel(key, timezone) : (CATEGORY_LABELS[key] || key),
      records: groups[key].sort((a, b) => {
        // Sort by date within group
        const dateA = getScheduleDate(a, planItems, bookings, projects);
        const dateB = getScheduleDate(b, planItems, bookings, projects);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      })
    }));
  }, [filteredRecords, viewMode, planItems, bookings, projects, timezone]);

  // Aggregate costs in JPY (for filtered records)
  const aggregation = useMemo(() => {
    const totals = { estimate: 0, committed: 0, actual: 0, refund: 0 };
    let netActual = 0;
    let estimateMinSum = 0;
    let estimateMaxSum = 0;
    const unsupportedCurrencies = new Set();

    for (const record of filteredRecords) {
      const cur = record.total.currency;
      const unitsPerEur = UNITS_PER_EUR[cur];

      if (!unitsPerEur) {
        unsupportedCurrencies.add(cur);
        continue;
      }

      const toJpy = (amt) => (amt * JPY_PER_EUR) / unitsPerEur;

      totals[record.type] += toJpy(record.total.amount);

      if (record.type === 'actual') netActual += toJpy(record.total.amount);
      else if (record.type === 'refund') netActual -= toJpy(record.total.amount);

      // Track estimate ranges
      if (record.type === 'estimate') {
        if (record.estimateRange) {
          estimateMinSum += toJpy(record.estimateRange.min.amount);
          estimateMaxSum += toJpy(record.estimateRange.max.amount);
        } else {
          estimateMinSum += toJpy(record.total.amount);
          estimateMaxSum += toJpy(record.total.amount);
        }
      }
    }

    return {
      totals,
      netActual,
      estimateMinSum,
      estimateMaxSum,
      hasEstimateRange: estimateMinSum > 0 || estimateMaxSum > 0,
      unsupportedCurrencies: Array.from(unsupportedCurrencies).sort(),
    };
  }, [filteredRecords]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setFormError('유효한 금액을 입력하세요.');
      return;
    }
    if (!subjectId.trim()) {
      setFormError('대상 ID를 입력하세요.');
      return;
    }

    const record = {
      id: `cost_${Date.now()}`,
      projectId: state.projects[0]?.id || 'unknown',
      subject: { type: subjectType, id: subjectId.trim() },
      type: type,
      category: category,
      total: { amount: parsedAmount, currency: currency.trim() || 'JPY' },
    };

    const result = await onAddCostRecord(record);

    if (result && result.ok) {
      setShowForm(false);
      setSubjectId('');
      setAmount('');
    } else {
      setFormError(result?.error || '기록 추가에 실패했습니다.');
    }
  };

  const renderRecordCard = (record) => {
    const scheduleDate = getScheduleDate(record, planItems, bookings, projects);
    const formattedDateTime = scheduleDate ? formatDateTime(scheduleDate, timezone) : null;

    // Determine display amount
    let displayAmount = formatMoney(record.total.amount, record.total.currency);
    let sourceText = null;

    if (record.type === 'estimate') {
      if (record.estimateRange) {
        displayAmount = formatRange(record.estimateRange.min.amount, record.estimateRange.max.amount, record.total.currency);
      }
    }

    if (record.sourcePriceText) {
      sourceText = record.sourcePriceText;
    }

    return (
      <article key={record.id} className="cost-card" aria-label={`비용: ${record.id}`}>
        <div className="cost-card-header">
          <span className={`cost-type-badge cost-type-${record.type}`}>
            {TYPE_LABELS[record.type] || record.type}
          </span>
          <span className="cost-category-badge">
            {CATEGORY_LABELS[record.category] || record.category}
          </span>
          <span className="cost-amount">
            {displayAmount}
          </span>
        </div>
        <div className="cost-card-body">
          <div className="cost-detail-row">
            <span className="cost-detail-label">대상</span>
            <span className="cost-detail-value">
              {SUBJECT_TYPE_LABELS[record.subject.type]}: {getSubjectLabel(record.subject)}
            </span>
          </div>

          {formattedDateTime && (
            <div className="cost-detail-row">
              <span className="cost-detail-label">일정</span>
              <span className="cost-detail-value">{formattedDateTime}</span>
            </div>
          )}

          {sourceText && (
            <div className="cost-detail-row">
              <span className="cost-detail-label">원본 가격</span>
              <span className="cost-detail-value cost-source-text">{sourceText}</span>
            </div>
          )}

          {record.servicePeriod && (
            <div className="cost-detail-row">
              <span className="cost-detail-label">서비스 기간</span>
              <span className="cost-detail-value">
                {record.servicePeriod.start}
                {record.servicePeriod.end ? ` ~ ${record.servicePeriod.end}` : ''}
              </span>
            </div>
          )}

          {record.pricingNote && (
            <div className="cost-detail-row">
              <span className="cost-detail-label">환산 기준</span>
              <span className="cost-detail-value cost-pricing-note">{record.pricingNote}</span>
            </div>
          )}

          {record.payment && (
            <div className="cost-detail-row">
              <span className="cost-detail-label">결제 상태</span>
              <span className="cost-detail-value">{record.payment.status}</span>
            </div>
          )}

          {record.breakdown && record.breakdown.length > 0 && (
            <div className="cost-breakdown">
              <h4>세부 내역</h4>
              <ul className="cost-breakdown-list">
                {record.breakdown.map((item, idx) => (
                  <li key={idx} className="cost-breakdown-item">
                    <span className="cost-breakdown-type">
                      {item.type === 'custom' && item.label ? item.label : (BREAKDOWN_TYPE_LABELS[item.type] || item.type)}
                    </span>
                    {item.date && <span className="cost-breakdown-date">{item.date}</span>}
                    <span className="cost-breakdown-amount">
                      {formatMoney(item.amount.amount, item.amount.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="cost-view">
      <div className="cost-header">
        <h2>비용 관리</h2>
        <button
          className="cost-btn-primary"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
        >
          {showForm ? '닫기' : '새 비용 기록'}
        </button>
      </div>

      {showForm && (
        <form className="cost-form" onSubmit={handleFormSubmit} aria-label="새 비용 기록 추가">
          <div className="cost-form-grid">
            <div className="cost-form-field">
              <label htmlFor="cost-subject-type">대상 유형</label>
              <select
                id="cost-subject-type"
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value)}
              >
                <option value="planItem">일정 항목</option>
                <option value="booking">예약</option>
                <option value="route">경로</option>
                <option value="project">프로젝트</option>
              </select>
            </div>
            <div className="cost-form-field">
              <label htmlFor="cost-subject-id">대상 ID</label>
              <input
                id="cost-subject-id"
                type="text"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="ID 입력"
                required
              />
            </div>
            <div className="cost-form-field">
              <label htmlFor="cost-type">유형</label>
              <select
                id="cost-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="estimate">예상</option>
                <option value="committed">확정</option>
                <option value="actual">지불</option>
                <option value="refund">환불</option>
              </select>
            </div>
            <div className="cost-form-field">
              <label htmlFor="cost-category">카테고리</label>
              <select
                id="cost-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="lodging">숙박</option>
                <option value="food">식비</option>
                <option value="transport">교통</option>
                <option value="attraction">관광</option>
                <option value="shopping">쇼핑</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div className="cost-form-field">
              <label htmlFor="cost-amount">금액</label>
              <input
                id="cost-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="cost-form-field">
              <label htmlFor="cost-currency">통화</label>
              <input
                id="cost-currency"
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="JPY"
                maxLength={3}
                required
              />
            </div>
          </div>
          {formError && <p className="cost-form-error" role="alert">{formError}</p>}
          <div className="cost-form-actions">
            <button type="submit" className="cost-btn-primary">추가</button>
            <button type="button" className="cost-btn-secondary" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="cost-filters" aria-label="비용 필터">
        <div className="cost-filter-group">
          <label htmlFor="filter-category">카테고리</label>
          <select
            id="filter-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">전체</option>
            <option value="lodging">숙박</option>
            <option value="food">식비</option>
            <option value="transport">교통</option>
            <option value="attraction">관광</option>
            <option value="shopping">쇼핑</option>
            <option value="other">기타</option>
          </select>
        </div>
        <div className="cost-filter-group">
          <label htmlFor="filter-type">유형</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">전체</option>
            <option value="estimate">예상</option>
            <option value="committed">확정</option>
            <option value="actual">지불</option>
            <option value="refund">환불</option>
          </select>
        </div>
        <div className="cost-filter-group">
          <label htmlFor="filter-date">날짜</label>
          <select
            id="filter-date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          >
            <option value="all">전체</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>
        <div className="cost-filter-group">
          <label htmlFor="view-mode">그룹화</label>
          <select
            id="view-mode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="date">날짜별</option>
            <option value="category">카테고리별</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      {(aggregation.totals.estimate !== 0 || aggregation.totals.committed !== 0 || aggregation.totals.actual !== 0 || aggregation.totals.refund !== 0 || aggregation.unsupportedCurrencies.length > 0) && (
        <div className="cost-summary" aria-label="비용 요약">
          <h3>JPY 합계 (환율 기준: {ECB_RATE_DATE})</h3>
          <div className="cost-summary-grid">
            <div className="cost-summary-card">
              <h4>JPY</h4>
              <div className="cost-summary-rows">
                <div className="cost-summary-row">
                  <span>예상</span>
                  <span>
                    {aggregation.hasEstimateRange
                      ? formatRange(aggregation.estimateMinSum, aggregation.estimateMaxSum, 'JPY')
                      : formatMoney(aggregation.totals.estimate, 'JPY')}
                  </span>
                </div>
                <div className="cost-summary-row">
                  <span>확정</span>
                  <span>{formatMoney(aggregation.totals.committed, 'JPY')}</span>
                </div>
                <div className="cost-summary-row">
                  <span>지불</span>
                  <span>{formatMoney(aggregation.totals.actual, 'JPY')}</span>
                </div>
                <div className="cost-summary-row">
                  <span>환불</span>
                  <span>{formatMoney(aggregation.totals.refund, 'JPY')}</span>
                </div>
                <div className="cost-summary-row cost-summary-net">
                  <span>실 지출</span>
                  <span>{formatMoney(aggregation.netActual, 'JPY')}</span>
                </div>
              </div>
            </div>
          </div>
          {aggregation.unsupportedCurrencies.length > 0 && (
            <p className="cost-summary-note">
              미지원 통화 (제외됨): {aggregation.unsupportedCurrencies.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* List */}
      {filteredRecords.length === 0 ? (
        <div className="cost-empty">
          <h3>비용 기록 없음</h3>
          <p>조건에 맞는 비용 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="cost-list" aria-label="비용 기록 목록">
          {groupedRecords.map((group) => (
            <div key={group.key} className="cost-group">
              <h3 className="cost-group-title">{group.label}</h3>
              <div className="cost-group-items">
                {group.records.map(renderRecordCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
