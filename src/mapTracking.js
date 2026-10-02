export function nextTrackingMode(mode, action) {
  if (action === 'follow') return mode === 'schedule' ? 'manual' : 'schedule'
  if (action === 'gps') return 'gps'
  if (action === 'manual') return 'manual'
  return mode
}

export function trackingFocus(mode, planned, gps) {
  const position = mode === 'gps' ? gps : mode === 'schedule' ? planned : null
  return position ? [position.lat, position.lng] : null
}
