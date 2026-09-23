import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { selectByDay } from '../../../store/selectors/timeline';
import { resolvePrimaryPlace, buildMarkers } from './mapHelpers.js';
import './MapView.css';

/**
 * @typedef {import('../../../platform/types.js').PlatformViewProps} PlatformViewProps
 */

/**
 * Formats a time string for display.
 * @param {string} iso
 * @param {string} timezone
 * @returns {string}
 */
function formatTime(iso, timezone) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * @param {PlatformViewProps} props
 */
export function MapView({ state, timezone, selectedItemId, onSelectItem }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      center: [35.02, 135.55],
      zoom: 9,
      maxZoom: 19,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    const dayBuckets = selectByDay(state, timezone);
    const allItems = dayBuckets.flatMap((bucket) => bucket.items);
    const markers = buildMarkers(state, allItems);

    const markerPositions = [];

    for (const m of markers) {
      const isSelected = m.id === selectedItemId;
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: isSelected ? 10 : 6,
        color: isSelected ? '#e11d48' : '#2563eb',
        fillColor: isSelected ? '#e11d48' : '#2563eb',
        fillOpacity: isSelected ? 0.8 : 0.6,
        weight: isSelected ? 3 : 2,
      });

      const item = allItems.find((i) => i.id === m.id);
      marker.bindTooltip(
        `<strong>${m.title}</strong><br/>${m.placeName}<br/>${formatTime(item?.schedule.start, timezone)}`,
        { direction: 'top' }
      );

      marker.on('click', () => {
        onSelectItem(m.id);
      });

      marker.addTo(map);
      markersRef.current.set(m.id, marker);
      markerPositions.push([m.lat, m.lng]);
    }

    if (markerPositions.length > 0) {
      const bounds = L.latLngBounds(markerPositions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // Focus selected item
    if (selectedItemId) {
      const selectedMarker = markersRef.current.get(selectedItemId);
      if (selectedMarker) {
        const pos = selectedMarker.getLatLng();
        map.setView(pos, Math.max(map.getZoom(), 12));
      }
    }
  }, [state, timezone, selectedItemId, onSelectItem]);

  // Compute items without coordinates for the notice list
  const dayBuckets = selectByDay(state, timezone);
  const allItems = dayBuckets.flatMap((bucket) => bucket.items);
  const itemsWithoutCoords = allItems.filter((item) => {
    const place = resolvePrimaryPlace(state, item);
    return !place || !place.coordinates || !Number.isFinite(place.coordinates.lat) || !Number.isFinite(place.coordinates.lng);
  });

  return (
    <div className="map-view">
      <div className="map-container" ref={mapRef} />
      {itemsWithoutCoords.length > 0 && (
        <div className="map-notice">
          <h3>위치 미확정 항목</h3>
          <ul>
            {itemsWithoutCoords.map((item) => (
              <li key={item.id}>
                <button
                  className="notice-item-btn"
                  onClick={() => onSelectItem(item.id)}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
