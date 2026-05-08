// src/App.js
//
// The root component. It:
//   1. Polls the backend every 3 seconds for new metrics
//   2. Passes data down to child components
//
// Key React concepts used here:
//   useState  — stores values that cause re-renders when they change
//   useEffect — runs code on a schedule (like setInterval) or on mount

import React, { useState, useEffect } from 'react';
import MetricCard  from './components/MetricCard';
import MetricChart from './components/MetricChart';
import StatusBar   from './components/StatusBar';

// Where our backend lives
const API_URL      = 'http://localhost:4320/api/metrics';
const POLL_INTERVAL = 3000; // ms

// ─── Styles ───────────────────────────────────────────────────────────────────
const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080a0f; color: #e8eaf0; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function App() {

  // useState: declare a piece of state and a setter function.
  // When the setter is called, React re-renders the component automatically.
  const [current,      setCurrent]      = useState({ temperature: null, pressure: null });
  const [history,      setHistory]      = useState([]);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [receiveCount, setReceiveCount] = useState(0);
  const [error,        setError]        = useState(null);

  // useEffect: run this block when the component first mounts ([] = run once).
  // We set up a polling interval here, and clean it up when the component unmounts.
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res  = await fetch(API_URL);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data = await res.json();

        setCurrent(data.current);
        setHistory(data.history);
        setLastUpdated(data.lastUpdated);
        setReceiveCount(data.receiveCount);
        setError(null);
      } catch (e) {
        setError(e.message);
      }
    };

    // Fetch once immediately on load
    fetchMetrics();

    // Then fetch every POLL_INTERVAL ms
    const timer = setInterval(fetchMetrics, POLL_INTERVAL);

    // Cleanup: stop the interval when this component is removed from the page
    return () => clearInterval(timer);
  }, []); // [] means "only run once on mount"

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{globalStyle}</style>

      {/* Pipeline status bar at the very top */}
      <StatusBar receiveCount={receiveCount} lastUpdated={lastUpdated} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40, animation: 'fadeIn 0.6s ease' }}>
          <p style={{
            fontSize: 11, letterSpacing: '0.15em', color: '#2a3a55',
            textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 6
          }}>
            opentelemetry · device A · zone-1
          </p>
          <h1 style={{
            fontSize: 26, fontWeight: 300, color: '#c8cad8',
            fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '-0.02em'
          }}>
            Live Sensor Dashboard
          </h1>
        </div>

        {/* Error banner — only shown if the backend is unreachable */}
        {error && (
          <div style={{
            background: '#1a0a0a', border: '1px solid #4a1a1a',
            borderRadius: 6, padding: '10px 16px', marginBottom: 24,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#8a3030'
          }}>
            ⚠ Cannot reach backend — {error}
            <span style={{ color: '#3a2020', marginLeft: 12 }}>
              Is <code>node server.js</code> running?
            </span>
          </div>
        )}

        {/* ── Metric cards row ───────────────────────────────────────────── */}
        {/*
          These show the CURRENT (latest) value.
          The "filtered" prop on the last two shows they are blocked by the collector.
        */}
        <section style={{ marginBottom: 40 }}>
          <SectionLabel>current readings</SectionLabel>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <MetricCard
              label="Temperature"
              value={current.temperature}
              unit="°C"
              accentColor="#e05a3a"
            />
            <MetricCard
              label="Pressure"
              value={current.pressure}
              unit="bar"
              accentColor="#3a8be0"
            />
            {/* These two are filtered — shown here for educational contrast */}
            <MetricCard label="Battery Level" unit="%" filtered />
            <MetricCard label="Error Count"   unit="errors" filtered />
          </div>
        </section>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        {/*
          Each chart shows the last 30 readings over time.
          MetricChart takes the full history array and picks one metric to plot.
        */}
        <section style={{ marginBottom: 40 }}>
          <SectionLabel>temperature history</SectionLabel>
          <ChartBox>
            <MetricChart history={history} metric="temperature" color="#e05a3a" />
          </ChartBox>
        </section>

        <section style={{ marginBottom: 40 }}>
          <SectionLabel>pressure history</SectionLabel>
          <ChartBox>
            <MetricChart history={history} metric="pressure" color="#3a8be0" />
          </ChartBox>
        </section>

        {/* ── OTel pipeline explainer ────────────────────────────────────── */}
        <section>
          <SectionLabel>what the otel filter is doing</SectionLabel>
          <div style={{
            background: '#0a0d14', border: '1px solid #1a1f2e',
            borderRadius: 8, padding: '16px 20px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            color: '#3a4a5a', lineHeight: 1.9
          }}>
            <p style={{ color: '#00d4a0', marginBottom: 8 }}>
              # collector.yaml — filter processor
            </p>
            <p>processors:</p>
            <p>&nbsp; filter/device_a_subset:</p>
            <p>&nbsp;&nbsp;&nbsp; metrics:</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; metric:</p>
            <p style={{ color: '#e0a03a' }}>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - 'name != "device.temperature"
              and name != "device.pressure"'
            </p>
            <p style={{ marginTop: 12, color: '#2a3a4a' }}>
              # battery_level and errors match this rule → they are DROPPED
            </p>
            <p style={{ color: '#2a3a4a' }}>
              # temperature and pressure do NOT match → they PASS THROUGH
            </p>
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

// ─── Small helper components ──────────────────────────────────────────────────

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
