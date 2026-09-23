/**
 * Resolves the primary place for a PlanItem from state.
 * @param {import('../../../store/entities/state').EntityState} state
 * @param {import('../../../domain/plan').PlanItem} item
 * @returns {import('../../../domain/place').Place | null}
 */
export function resolvePrimaryPlace(state, item) {
  if (!item.places || item.places.length === 0) {
    return null;
  }
  const primaryRef = item.places.find((ref) => ref.role === 'primary') || item.places[0];
  if (!primaryRef) {
    return null;
  }
  const place = state.places.find((p) => p.id === primaryRef.placeId);
  return place || null;
}

/**
 * Converts PlanItems and Places into marker data for Leaflet.
 * @param {import('../../../store/entities/state').EntityState} state
 * @param {import('../../../domain/plan').PlanItem[]} items
 * @returns {Array<{id: string, title: string, lat: number, lng: number, placeName: string}>}
 */
export function buildMarkers(state, items) {
  const markers = [];
  for (const item of items) {
    const place = resolvePrimaryPlace(state, item);
    if (place && place.coordinates && Number.isFinite(place.coordinates.lat) && Number.isFinite(place.coordinates.lng)) {
      markers.push({
        id: item.id,
        title: item.title,
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
        placeName: place.name,
      });
    }
  }
  return markers;
}
