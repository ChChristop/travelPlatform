import React, { useState } from 'react';
import './PlansView.css';

/**
 * @param {{
 *   state: import('../../types.js').EntityState;
 *   onPreview: (groupId: string, optionId: string) => void;
 *   onCommit: (preview: import('../../../store/commands/option.ts').PreviewState) => void;
 *   onCancel: () => void;
 *   preview: import('../../../store/commands/option.ts').PreviewState | null;
 *   onCreateGroup: (input: import('../../../store/commands/option.ts').CreateOptionGroupInput) => { ok: boolean; error?: string };
 * }} props
 */
export function PlansView({ state, onPreview, onCommit, onCancel, preview, onCreateGroup }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState(null);

  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [optionALabel, setOptionALabel] = useState('');
  const [optionAItems, setOptionAItems] = useState([]);
  const [optionBLabel, setOptionBLabel] = useState('');
  const [optionBItems, setOptionBItems] = useState([]);

  const planItems = state.planItems;
  const optionGroups = state.optionGroups;
  const planOptions = state.planOptions;
  const planFragments = state.planFragments;
  const costRecords = state.costRecords;

  const getItemTitle = (id) => {
    const item = planItems.find((i) => i.id === id);
    return item ? item.title : id;
  };

  const getOptionLabel = (optionId) => {
    const option = planOptions.find((o) => o.id === optionId);
    return option ? option.label : optionId;
  };

  const getFragmentItems = (fragmentId) => {
    const fragment = planFragments.find((f) => f.id === fragmentId);
    if (!fragment) return [];
    return fragment.planItemIds.map(getItemTitle);
  };

  const toggleItemSelection = (itemIds, setItemIds, itemId) => {
    if (itemIds.includes(itemId)) {
      setItemIds(itemIds.filter((id) => id !== itemId));
    } else {
      setItemIds([...itemIds, itemId]);
    }
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!groupId.trim()) {
      setFormError('그룹 ID를 입력하세요.');
      return;
    }
    if (!title.trim()) {
      setFormError('그룹 제목을 입력하세요.');
      return;
    }
    if (optionAItems.length === 0 || optionBItems.length === 0) {
      setFormError('각 옵션에 최소 1개의 항목을 선택하세요.');
      return;
    }

    const planVersionId = state.planVersions[0]?.id;
    if (!planVersionId) {
      setFormError('플랜 버전을 찾을 수 없습니다.');
      return;
    }

    const optAId = `opt_${groupId}_A`;
    const optBId = `opt_${groupId}_B`;

    const input = {
      id: groupId.trim(),
      planVersionId,
      title: title.trim(),
      options: [
        {
          id: optAId,
          label: optionALabel.trim() || '옵션 A',
          planItemIds: optionAItems,
        },
        {
          id: optBId,
          label: optionBLabel.trim() || '옵션 B',
          planItemIds: optionBItems,
        },
      ],
      selectedOptionId: optAId,
    };

    const result = onCreateGroup(input);

    if (result && result.ok) {
      // Success: reset form
      setShowCreateForm(false);
      setGroupId('');
      setTitle('');
      setOptionALabel('');
      setOptionAItems([]);
      setOptionBLabel('');
      setOptionBItems([]);
    } else {
      // Failure: keep form data and show error
      const errorMsg = (result && result.error) ? result.error : '그룹 생성에 실패했습니다.';
      setFormError(errorMsg);
    }
  };

  const handlePreview = (groupId, optionId) => {
    onPreview(groupId, optionId);
  };

  const calculateCostDelta = (preview) => {
    if (!preview) return null;

    const oldActiveCosts = [];
    const newActiveCosts = [];

    // We need to compare costs associated with added/removed items
    // Since preview provides added/removed plan items, we can filter costRecords by subject
    const addedItemIds = new Set(preview.addedPlanItems.map((i) => i.id));
    const removedItemIds = new Set(preview.removedPlanItems.map((i) => i.id));

    for (const record of costRecords) {
      if (record.subject.type === 'planItem') {
        if (addedItemIds.has(record.subject.id)) {
          newActiveCosts.push(record);
        }
        if (removedItemIds.has(record.subject.id)) {
          oldActiveCosts.push(record);
        }
      }
    }

    const sumByCurrency = (records) => {
      const totals = {};
      for (const r of records) {
        const cur = r.total.currency;
        if (!totals[cur]) totals[cur] = 0;
        if (r.type === 'actual') {
          totals[cur] += r.total.amount;
        } else if (r.type === 'refund') {
          totals[cur] -= r.total.amount;
        }
      }
      return totals;
    };

    const oldTotals = sumByCurrency(oldActiveCosts);
    const newTotals = sumByCurrency(newActiveCosts);

    const currencies = new Set([...Object.keys(oldTotals), ...Object.keys(newTotals)]);
    const deltas = [];
    for (const cur of currencies) {
      const oldVal = oldTotals[cur] || 0;
      const newVal = newTotals[cur] || 0;
      const delta = newVal - oldVal;
      if (delta !== 0) {
        deltas.push({ currency: cur, delta });
      }
    }

    return deltas;
  };

  const renderPreviewImpact = () => {
    if (!preview) return null;

    const costDeltas = calculateCostDelta(preview);

    return (
      <div className="plans-preview" aria-label="미리보기 영향 분석">
        <h3>변경 미리보기</h3>
        <p className="plans-preview-target">
          대상 옵션: {getOptionLabel(preview.targetId)}
        </p>

        {costDeltas && costDeltas.length > 0 && (
          <div className="plans-preview-section plans-preview-cost-delta">
            <h4>비용 차이 (Net Actual)</h4>
            <ul>
              {costDeltas.map((d) => (
                <li key={d.currency} className={d.delta > 0 ? 'plans-preview-cost-positive' : 'plans-preview-cost-negative'}>
                  {d.currency}: {d.delta > 0 ? '+' : ''}{d.delta.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="plans-preview-sections">
          {preview.addedPlanItems.length > 0 && (
            <div className="plans-preview-section">
              <h4>추가되는 항목 (Timeline/Map)</h4>
              <ul>
                {preview.addedPlanItems.map((item) => (
                  <li key={item.id} className="plans-preview-added">
                    {item.title}
                    {item.places && item.places.length > 0 && (
                      <span className="plans-preview-location">
                        ({item.places.map((p) => {
                          const place = state.places.find((pl) => pl.id === p.placeId);
                          return place ? place.name : p.placeId;
                        }).join(', ')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.removedPlanItems.length > 0 && (
            <div className="plans-preview-section">
              <h4>제거되는 항목 (Timeline/Map)</h4>
              <ul>
                {preview.removedPlanItems.map((item) => (
                  <li key={item.id} className="plans-preview-removed">
                    {item.title}
                    {item.places && item.places.length > 0 && (
                      <span className="plans-preview-location">
                        ({item.places.map((p) => {
                          const place = state.places.find((pl) => pl.id === p.placeId);
                          return place ? place.name : p.placeId;
                        }).join(', ')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.affectedBookings.length > 0 && (
            <div className="plans-preview-section">
              <h4>영향받는 예약</h4>
              <ul>
                {preview.affectedBookings.map((b) => (
                  <li key={b.id}>{b.id}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.affectedTasks.length > 0 && (
            <div className="plans-preview-section">
              <h4>영향받는 태스크</h4>
              <ul>
                {preview.affectedTasks.map((t) => (
                  <li key={t.id}>{t.title}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.affectedCostRecords.length > 0 && (
            <div className="plans-preview-section">
              <h4>영향받는 비용 기록</h4>
              <ul>
                {preview.affectedCostRecords.map((c) => (
                  <li key={c.id}>{c.id}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.affectedRoutes.length > 0 && (
            <div className="plans-preview-section">
              <h4>영향받는 경로</h4>
              <ul>
                {preview.affectedRoutes.map((r) => (
                  <li key={r.id}>{r.id}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.affectedPlaces.length > 0 && (
            <div className="plans-preview-section">
              <h4>영향받는 장소</h4>
              <ul>
                {preview.affectedPlaces.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="plans-preview-actions">
          <button className="plans-btn-commit" onClick={() => onCommit(preview)}>
            커밋
          </button>
          <button className="plans-btn-cancel" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="plans-view">
      <div className="plans-header">
        <h2>대안 관리</h2>
        <button
          className="plans-btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          aria-expanded={showCreateForm}
        >
          {showCreateForm ? '닫기' : '새 옵션 그룹'}
        </button>
      </div>

      {showCreateForm && (
        <form className="plans-form" onSubmit={handleCreateGroup} aria-label="새 옵션 그룹 생성">
          <div className="plans-form-grid">
            <div className="plans-form-field">
              <label htmlFor="plans-group-id">그룹 ID</label>
              <input
                id="plans-group-id"
                type="text"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="group_1"
                required
              />
            </div>
            <div className="plans-form-field">
              <label htmlFor="plans-group-title">그룹 제목</label>
              <input
                id="plans-group-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 점심 대안"
                required
              />
            </div>
            <div className="plans-form-field">
              <label htmlFor="plans-option-a-label">옵션 A 라벨</label>
              <input
                id="plans-option-a-label"
                type="text"
                value={optionALabel}
                onChange={(e) => setOptionALabel(e.target.value)}
                placeholder="옵션 A"
              />
            </div>
            <div className="plans-form-field plans-form-field-wide">
              <label id="plans-option-a-items-label">옵션 A 항목 선택</label>
              <div className="plans-item-selector" role="group" aria-labelledby="plans-option-a-items-label">
                {planItems.map((item) => (
                  <label key={item.id} className="plans-item-option">
                    <input
                      type="checkbox"
                      checked={optionAItems.includes(item.id)}
                      onChange={() => toggleItemSelection(optionAItems, setOptionAItems, item.id)}
                    />
                    <span>{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="plans-form-field">
              <label htmlFor="plans-option-b-label">옵션 B 라벨</label>
              <input
                id="plans-option-b-label"
                type="text"
                value={optionBLabel}
                onChange={(e) => setOptionBLabel(e.target.value)}
                placeholder="옵션 B"
              />
            </div>
            <div className="plans-form-field plans-form-field-wide">
              <label id="plans-option-b-items-label">옵션 B 항목 선택</label>
              <div className="plans-item-selector" role="group" aria-labelledby="plans-option-b-items-label">
                {planItems.map((item) => (
                  <label key={item.id} className="plans-item-option">
                    <input
                      type="checkbox"
                      checked={optionBItems.includes(item.id)}
                      onChange={() => toggleItemSelection(optionBItems, setOptionBItems, item.id)}
                    />
                    <span>{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {formError && <p className="plans-form-error" role="alert">{formError}</p>}
          <div className="plans-form-actions">
            <button type="submit" className="plans-btn-primary">생성</button>
            <button type="button" className="plans-btn-secondary" onClick={() => setShowCreateForm(false)}>취소</button>
          </div>
        </form>
      )}

      {optionGroups.length === 0 ? (
        <div className="plans-empty">
          <h3>옵션 그룹 없음</h3>
          <p>아직 생성된 옵션 그룹이 없습니다.</p>
        </div>
      ) : (
        <div className="plans-groups" aria-label="옵션 그룹 목록">
          {optionGroups.map((group) => (
            <article key={group.id} className="plans-group-card" aria-label={`옵션 그룹: ${group.title}`}>
              <div className="plans-group-header">
                <h3>{group.title}</h3>
                <span className="plans-group-id">{group.id}</span>
              </div>

              <div className="plans-group-options">
                {group.optionIds.map((optionId) => {
                  const option = planOptions.find((o) => o.id === optionId);
                  if (!option) return null;
                  const fragment = planFragments.find((f) => f.id === option.fragmentId);
                  const items = fragment ? fragment.planItemIds.map(getItemTitle) : [];
                  const isSelected = group.selectedOptionId === optionId;

                  return (
                    <div
                      key={optionId}
                      className={`plans-option ${isSelected ? 'selected' : ''}`}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <div className="plans-option-header">
                        <span className="plans-option-label">{option.label}</span>
                        {!preview && (
                          <button
                            className="plans-btn-preview"
                            onClick={() => handlePreview(group.id, optionId)}
                            aria-label={`${option.label} 미리보기`}
                          >
                            미리보기
                          </button>
                        )}
                      </div>
                      {items.length > 0 && (
                        <ul className="plans-option-items">
                          {items.map((title, idx) => (
                            <li key={idx}>{title}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {renderPreviewImpact()}
    </div>
  );
}