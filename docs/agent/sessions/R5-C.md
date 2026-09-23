# R5-C Session Handoff — Map Feature

## Summary
Implemented the Map view for the new platform app (Session C of R5). The MapView component uses Leaflet to display plan items with coordinates as markers, supports selection synchronization via `onSelectItem`/`selectedItemId`, and shows a notice list for items without confirmed coordinates.

## Files Created/Modified
- `src/platform/features/map/MapView.jsx` — Map component with Leaflet integration, marker rendering, selection focus, and coordinate-missing notice list. Exports `resolvePrimaryPlace` and `buildMarkers` helper functions.
- `src/platform/features/map/MapView.css` — Styles for map container, notice list, and responsive layout.
- `tests/platform/map-helpers.test.ts` — Pure logic tests for `resolvePrimaryPlace` and `buildMarkers` functions (6 test cases covering primary reference resolution, fallback behavior, coordinate filtering, and edge cases).

## Implementation Details
- **MapView Component**: Accepts `PlatformViewProps` (`state`, `timezone`, `selectedItemId`, `onSelectItem`). Uses `selectByDay` from R4 selectors to get all plan items, then `buildMarkers` to filter items with valid coordinates. Renders Leaflet map with circle markers, tooltips showing title/place/time, and click handlers for selection. Selected item gets larger radius and red color. Map auto-fits bounds to all markers and focuses selected item.
- **Coordinate-missing items**: Items without valid coordinates are not shown on the map but listed in a notice section below the map with clickable buttons for selection.
- **Helper functions**: `resolvePrimaryPlace` finds the primary place reference (falls back to first reference if no primary). `buildMarkers` converts PlanItems + Places into marker data arrays with id, title, lat, lng, placeName.

## Validation Results
- **build**: PASS (vite build successful, 33 modules transformed, both entries built)
- **runtime**: PASS (18 tests passed, 0 failed — includes 6 new map-helpers tests plus existing dataSource and timeline tests)

## Notes
- The test file uses inline copies of the helper functions since Node.js test runner cannot import `.jsx` files directly. The logic is identical to what's in MapView.jsx.
- MapView is not yet integrated into PlatformApp.jsx (Session A's responsibility for final integration). The component is ready to be imported and rendered when `view === 'map'`.
- No new dependencies added. Uses existing Leaflet 1.9.4 and R4 selectors.
