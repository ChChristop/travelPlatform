import React from 'react'
import { IconCrosshair } from './Icons'

export default function MapPanel({ mapEl, follow, setFollow, gps, gpsError, askGps }) {
  return (
    <section className="panel mapPanel">
      <div className="mapHead">
        <div className="mapTitle"><strong>지도</strong><span>현재 위치 자동 추적</span></div>
        <div className="mapActions">
          <button className="gpsBtn" onClick={askGps}><IconCrosshair /> GPS</button>
          <button className={`followBtn ${follow ? 'followOn' : ''}`} onClick={() => setFollow(f => !f)}>
            {follow ? <><IconCrosshair /> 따라가기 중</> : <><IconCrosshair /> 따라가기</>}
          </button>
        </div>
      </div>
      <div ref={mapEl} className="map" />
      <div className="mapLegend">
        <span><i className="dot ev" />일정 지점</span>
        <span><i className="dot plan" />예정 위치</span>
        {gps && <span><i className="dot gps" />실제 GPS ±{Math.round(gps.accuracy)}m</span>}
      </div>
      {gpsError && <div className="mapError">{gpsError}</div>}
    </section>
  )
}
