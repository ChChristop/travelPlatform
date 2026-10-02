import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createInitialState, play, pause, tick, setSpeed, scrub, applyScenario, getSnapshot } from '../../../simulation/engine.ts';
import './SimulationView.css';

export function SimulationView({ state }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [scenarioError, setScenarioError] = useState(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');

  const timerRef = useRef(null);
  const lastTickTimeRef = useRef(0);

  // Determine project and plan version
  const project = state?.projects?.[0];
  const timezone = project?.timezone || 'Asia/Tokyo';

  // Find published plan version (first one with status 'published' or just first)
  const planVersion = useMemo(() => {
    if (!state?.planVersions) return null;
    const published = state.planVersions.find(pv => pv.status === 'published');
    return published || state.planVersions[0];
  }, [state]);

  // Initialize session
  useEffect(() => {
    if (!state || !planVersion) {
      setSession(null);
      setError(null);
      setSelectedScenarioId('');
      setScenarioError(null);
      return;
    }

    try {
      const initialSession = createInitialState({
        entityState: state,
        planVersionId: planVersion.id,
        seed: 1
      });
      setSession(initialSession);
      setError(null);
      setSelectedScenarioId('');
      setScenarioError(null);
    } catch (e) {
      setSession(null);
      setError(e.message || 'Failed to initialize simulation');
    }
  }, [state, planVersion]);

  // Get scenarios for the plan version
  const scenarios = useMemo(() => {
    if (!state?.scenarios || !planVersion) return [];
    return state.scenarios.filter(s => s.planVersionId === planVersion.id);
  }, [state, planVersion]);

  // Handle scenario change
  const handleScenarioChange = useCallback((e) => {
    const id = e.target.value;
    setScenarioError(null);

    if (!session) return;

    try {
      if (id === '') {
        const newSession = applyScenario(session, null);
        setSession(newSession);
        setSelectedScenarioId('');
      } else if (id === 'local-delay-10') {
        const localScenario = {
          id: 'sim-local-delay-10',
          planVersionId: planVersion.id,
          title: '지연 +10분',
          type: 'delay',
          variables: { delayMinutes: 10 },
          optionSelections: []
        };
        const newSession = applyScenario(session, localScenario);
        setSession(newSession);
        setSelectedScenarioId(id);
      } else {
        const scenario = scenarios.find(s => s.id === id);
        if (scenario) {
          const newSession = applyScenario(session, scenario);
          setSession(newSession);
          setSelectedScenarioId(id);
        } else {
          setScenarioError('Selected scenario not found');
        }
      }
    } catch (err) {
      setScenarioError(err.message || 'Failed to apply scenario');
    }
  }, [session, scenarios, planVersion]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    if (!session) return;

    if (session.playing) {
      const newSession = pause(session);
      setSession(newSession);
    } else {
      // If at end, restart from beginning
      if (session.clockMs >= session.bounds.endMs) {
        const scrubbed = scrub(session, session.bounds.startMs);
        const played = play(scrubbed);
        setSession(played);
        lastTickTimeRef.current = performance.now();
      } else {
        const newSession = play(session);
        setSession(newSession);
        lastTickTimeRef.current = performance.now();
      }
    }
  }, [session]);

  const handleSpeedChange = useCallback((e) => {
    const newSpeed = Number(e.target.value);
    if (session) {
      try {
        const newSession = setSpeed(session, newSpeed);
        setSession(newSession);
      } catch (err) {
        // Speed change error is unlikely but handle gracefully
      }
    }
  }, [session]);

  const handleScrub = useCallback((e) => {
    const timeMs = Number(e.target.value);
    if (session) {
      try {
        const newSession = scrub(session, timeMs);
        setSession(newSession);
      } catch (err) {
        // Scrub error
      }
    }
  }, [session]);

  // Timer effect
  useEffect(() => {
    if (session?.playing) {
      lastTickTimeRef.current = performance.now();

      timerRef.current = setInterval(() => {
        const now = performance.now();
        const delta = now - lastTickTimeRef.current;
        lastTickTimeRef.current = now;

        setSession(prev => {
          if (!prev || !prev.playing) return prev;
          return tick(prev, delta);
        });
      }, 200);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session?.playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Get snapshot for display
  const { snapshot, snapshotError } = useMemo(() => {
    if (!session) return { snapshot: null, snapshotError: null };
    try {
      return { snapshot: getSnapshot(session), snapshotError: null };
    } catch (e) {
      return { snapshot: null, snapshotError: e.message || 'Failed to get snapshot' };
    }
  }, [session]);

  // Format time
  const formatTime = useCallback((ms) => {
    if (!ms) return '';
    const date = new Date(ms);
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(date);
  }, [timezone]);

  const formatDateTime = useCallback((ms) => {
    if (!ms) return '';
    const date = new Date(ms);
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(date);
  }, [timezone]);

  if (error) {
    return (
      <div className="simulation-view simulation-error">
        <h2>시뮬레이션 오류</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="simulation-view simulation-empty">
        <h2>시뮬레이션</h2>
        <p>시뮬레이션할 수 있는 데이터가 없습니다.</p>
      </div>
    );
  }

  if (snapshotError) {
    return (
      <div className="simulation-view simulation-error">
        <h2>시뮬레이션 오류</h2>
        <p>{snapshotError}</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="simulation-view simulation-empty">
        <h2>시뮬레이션</h2>
        <p>시뮬레이션할 수 있는 데이터가 없습니다.</p>
      </div>
    );
  }

  const { current, next, warnings, clockMs, bounds } = snapshot;
  const atEnd = clockMs >= bounds.endMs;
  const isPlaying = session.playing;
  const speed = session.speed;

  return (
    <div className="simulation-view">
      <div className="simulation-header">
        <h2>시뮬레이션</h2>
        <div className="simulation-clock">
          <span className="clock-label">현재 시간</span>
          <span className="clock-value">{formatDateTime(clockMs)}</span>
        </div>
      </div>

      <div className="simulation-controls">
        <div className="control-group">
          <button
            className="sim-btn play-pause-btn"
            onClick={handlePlayPause}
            aria-label={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <select
            className="sim-select speed-select"
            value={speed}
            onChange={handleSpeedChange}
            aria-label="재생 속도"
          >
            <option value={1}>1x</option>
            <option value={60}>60x</option>
            <option value={300}>300x</option>
            <option value={900}>900x</option>
            <option value={3600}>3600x</option>
          </select>
        </div>

        <div className="control-group scrub-group">
          <label className="scrub-label" htmlFor="sim-scrub">
            시간 이동
          </label>
          <input
            type="range"
            id="sim-scrub"
            className="sim-scrub"
            min={bounds.startMs}
            max={bounds.endMs}
            step={60000}
            value={clockMs}
            onChange={handleScrub}
            aria-valuemin={bounds.startMs}
            aria-valuemax={bounds.endMs}
            aria-valuenow={clockMs}
            aria-valuetext={formatDateTime(clockMs)}
          />
          <div className="scrub-times">
            <span>{formatTime(bounds.startMs)}</span>
            <span>{formatTime(bounds.endMs)}</span>
          </div>
        </div>

        <div className="control-group scenario-group">
          <label className="scenario-label" htmlFor="sim-scenario">
            시나리오
          </label>
          <select
            id="sim-scenario"
            className="sim-select scenario-select"
            value={selectedScenarioId}
            onChange={handleScenarioChange}
          >
            <option value="">정상</option>
            <option value="local-delay-10">지연 +10분</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>
                {s.title || s.id}
              </option>
            ))}
          </select>
          {scenarioError && (
            <div className="scenario-error" role="alert">
              {scenarioError}
            </div>
          )}
        </div>
      </div>

      <div className="simulation-content">
        <div className="item-panel">
          <h3>현재 항목</h3>
          {current ? (
            <div className="item-card">
              <div className="item-title">{current.title}</div>
              <div className="item-time">
                <span>{formatTime(current.startMs)}</span>
                <span>~</span>
                <span>{formatTime(current.endMs)}</span>
              </div>
              {current.placeName && (
                <div className="item-place">📍 {current.placeName}</div>
              )}
            </div>
          ) : (
            <div className="item-empty">현재 진행 중인 항목 없음</div>
          )}
        </div>

        <div className="item-panel">
          <h3>다음 항목</h3>
          {next ? (
            <div className="item-card">
              <div className="item-title">{next.title}</div>
              <div className="item-time">
                <span>{formatTime(next.startMs)}</span>
                <span>~</span>
                <span>{formatTime(next.endMs)}</span>
              </div>
              {next.placeName && (
                <div className="item-place">📍 {next.placeName}</div>
              )}
            </div>
          ) : (
            <div className="item-empty">다음 항목 없음</div>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="simulation-warnings" role="alert">
          <h3>경고</h3>
          <ul>
            {warnings.map((w, i) => (
              <li key={i} className={`warning-${w.type}`}>
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}