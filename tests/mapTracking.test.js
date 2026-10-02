import assert from 'node:assert/strict'
import test from 'node:test'
import { nextTrackingMode, trackingFocus } from '../src/mapTracking.js'

test('GPS and schedule following replace each other', () => {
  assert.equal(nextTrackingMode('schedule', 'gps'), 'gps')
  assert.equal(nextTrackingMode('gps', 'follow'), 'schedule')
  assert.equal(nextTrackingMode('schedule', 'follow'), 'manual')
  assert.equal(nextTrackingMode('gps', 'manual'), 'manual')
})

test('the camera follows only the active location source', () => {
  const planned = { lat: 34.7, lng: 135.5 }
  const gps = { lat: 37.5, lng: 127.0 }
  assert.deepEqual(trackingFocus('schedule', planned, gps), [34.7, 135.5])
  assert.deepEqual(trackingFocus('gps', planned, gps), [37.5, 127.0])
  assert.equal(trackingFocus('manual', planned, gps), null)
  assert.equal(trackingFocus('gps', planned, null), null)
})
