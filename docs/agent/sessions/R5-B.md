# R5-B Handoff — Timeline Feature

## Summary
Implemented the Timeline view for the new platform app. The `TimelineView` component uses the R4 `selectByDay` selector to group plan items by day in the project's timezone. Each item row is clickable and calls `onSelectItem(item.id)`. Items without confirmed coordinates display a "위치 미확정" label. The selected item is highlighted with a distinct style.

## Files Created/Modified
- `src/platform/features/timeline/TimelineView.jsx`: React component that renders the timeline grouped by day. Uses `selectByDay` from `src/store/selectors/timeline.ts`. Handles timezone-aware date formatting, item selection, and location status display.
- `src/platform/features/timeline/TimelineView.css`: Styles for the timeline view, including day sections, item rows, selection highlighting, and responsive layout for mobile.
- `tests/platform/timeline-helpers.test.ts`: Unit tests for the `selectByDay` selector covering day grouping, sorting, unscheduled items, multi-day items, timezone boundaries, and place coordinate access.

## Validation Results
- **build**: PASS (vite build successful, 33 modules transformed)
- **runtime**: PASS (18 tests passed, 0 failed)

## Notes
- The TimelineView component is ready to be integrated into `PlatformApp.jsx` by Session A (replacing the placeholder).
- The component follows the `PlatformViewProps` contract: `{ state, timezone, selectedItemId, onSelectItem }`.
- All tests are pure logic tests (no React rendering), as specified in the task requirements.
- The CSS uses the platform design tokens defined in `src/platform/platform.css`.
