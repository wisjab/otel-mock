// src/App.js
//
// Config-driven dashboard.
// Fetches the device/metric schema from the backend (/api/devices) once on
// mount, then polls /api/metrics every 3 s for live values.
//
// No metric names, labels, units, or colors are hardcoded here.
// Add or remove metrics in config/devices.json → the UI updates automatically.

import React, { useState, useEffect } from 'react';
import MetricCard  from './components/MetricCard';
import MetricChart from './components/MetricChart';
import StatusBar   from './components/StatusBar';

const BACKEND       = 'http://localhost:4320';
const POLL_INTERVAL = 3000;

const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080a0f; color: #e8eaf0; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

export default function App() {
  // Schema from /api/devices — array of device objects with their metrics
  const [devices,      setDevices]      = useState([]);
  // Live data from /api/metrics
  const [current,      setCurrent]      = useState({});
  const [history,      setHistory]      = useState([]);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [receiveCount, setReceiveCount] = useState(0);
  const [error,        setError]        = useState(null);

  // ── 1. Fetch the schema once on mount ──────────────────────────────────────
  useEffect(() => {
    fetch(BACKEND + '/api/devices')
      .then(r => r.json())
      .then(data => setDevices(data.devices || []))
      .catch(e => setError('Cannot load device schema: ' + e.message));
  }, []);

  // ── 2. Poll live metrics every POLL_INTERVAL ms ────────────────────────────
  useEffect(() => {
    const fetchMetrics = () => {
      fetch(BACKEND + '/api/metrics')
        .then(r => { if (!r.ok) throw new Error('Backend returned ' + r.status); return r.json(); })
        .then(data => {
          setCurrent(data.current || {});
          setHistory(data.history || []);
          setLastUpdated(data.lastUpdated);
          setReceiveCount(data.receiveCount);
          setError(null);
        })
        .catch(e => setError(e.message));
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // ── 3. Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyle}</style>
      <StatusBar receiveCount={receiveCount} lastUpdated={lastUpdated} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40, animation: 'fadeIn 0.6s ease' }}>
          <p style={{
            fontSize: 11, letterSpacing: '0.15em', color: '#2a3a55',
            textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6
          }}>
            opentelemetry · live pipeline
          </p>
          <h1 style={{
            fontSize: 26, fontWeight: 300, color: '#c8cad8',
            fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '-0.02em'
          }}>
            Live Sensor Dashboard
          </h1>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: 6,
            padding: '10px 16px', marginBottom: 24,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#8a3030'
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── One section per device ─────────────────────────────────────── */}
        {devices.map(device => {
          const collected = device.metrics.filter(m => m.collect);
          const filtered  = device.metrics.filter(m => !m.collect);

          return (
            <div key={device.id} style={{ marginBottom: 56 }}>
              <h2 style={{
                fontSize: 13, fontWeight: 400, color: '#3a4a6a',
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 24,
                borderBottom: '1px solid #10141e', paddingBottom: 10
              }}>
                {device.label}
              </h2>

              {/* Current readings — collected metrics */}
              <section style={{ marginBottom: 32 }}>
                <SectionLabel>current readings</SectionLabel>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {collected.map(m => (
                    <MetricCard
                      key={m.name}
                      label={m.label}
                      value={current[m.name] !== undefined ? current[m.name] : null}
                      unit={m.unit}
                      accentColor={m.color}
                    />
                  ))}
                  {/* Show filtered metrics as greyed-out cards for contrast */}
                  {filtered.map(m => (
                    <MetricCard key={m.name} label={m.label} unit={m.unit} filtered />
                  ))}
                </div>
              </section>

              {/* One chart per collected metric */}
              {collected.map(m => (
                <section key={m.name} style={{ marginBottom: 28 }}>
                  <SectionLabel>{m.label.toLowerCase()} history</SectionLabel>
                  <ChartBox>
                    <MetricChart
                      history={history}
                      metric={m.name}
                      color={m.color}
                      unit={m.unit}
                    />
                  </ChartBox>
                </section>
              ))}
            </div>
          );
        })}

        {/* ── OTel filter explainer ──────────────────────────────────────── */}
        <section>
          <SectionLabel>active collector filter</SectionLabel>
          <div style={{
            background: '#0a0d14', border: '1px solid #1a1f2e', borderRadius: 8,
            padding: '16px 20px', fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: '#3a4a5a', lineHeight: 1.9
          }}>
            <p style={{ color: '#00d4a0', marginBottom: 8 }}># config/devices.json → collector filter</p>
            {devices.map(device => device.metrics.map(m => (
              <p key={m.name} style={{ color: m.collect ? '#5a8a6a' : '#3a2a2a' }}>
                {m.collect ? '  ✓ pass  ' : '  ✗ drop  '}{m.name}
                <span style={{ color: '#2a3040', marginLeft: 12 }}>
                  {m.collect ? '(collect: true)' : '(collect: false)'}
                </span>
              </p>
            )))}
          </div>
        </section>

        <p style={{
          marginTop: 40, fontSize: 11, color: '#1a2030',
          fontFamily: "'IBM Plex Mono', monospace", textAlign: 'center'
        }}>
          polling every {POLL_INTERVAL / 1000}s · {history.length} data points stored
        </p>
      </div>
    </>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: '#2a3050', fontFamily: "'IBM Plex Mono', monospace",
      marginBottom: 12, borderBottom: '1px solid #10141e', paddingBottom: 8
    }}>
      {children}
    </p>
  );
}

function ChartBox({ children }) {
  return (
    <div style={{
      background: '#0a0d14', border: '1px solid #1a1f2e',
      borderRadius: 8, padding: '16px 8px 8px'
    }}>
      {children}
    </div>
  );
}
