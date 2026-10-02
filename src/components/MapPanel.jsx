import React from 'react'
import { IconCrosshair } from './Icons'

export default function MapPanel({ mapEl, trackingMode, toggleFollow, gps, gpsError, askGps }) {
  const follow = trackingMode === 'schedule'
  const gpsActive = trackingMode === 'gps'
  return (
    <section className="panel mapPanel">
      <div className="mapHead">
        <div className="mapTitle"><strong>지도</strong><span>{follow ? '일정 위치 따라가기' : gpsActive ? 'GPS 위치 표시' : '지도 자유 탐색'}</span></div>
        <div className="mapActions">
          <button className={`gpsBtn ${gpsActive ? 'followOn' : ''}`} onClick={askGps} aria-pressed={gpsActive}><IconCrosshair /> GPS</button>
          <button className={`followBtn ${follow ? 'followOn' : ''}`} onClick={toggleFollow} aria-pressed={follow}>
            {follow ? <><IconCrosshair /> 따라가기 중</> : <><IconCrosshair /> 따라가기</>}
          </button>
        </div>
      </div>
      <div ref={mapEl} className="map" />
      <div className="mapLegend">
        <span><i className="dot ev" />일정 지점</span>
        <span><i className="dot plan" />예정 위치</span>
        {gpsActive && gps && <span><i className="dot gps" />실제 GPS ±{Math.round(gps.accuracy)}m</span>}
      </div>
      {gpsError && <div className="mapError">{gpsError}</div>}
    </section>
  )
}
