// src/components/MetricCard.jsx
//
// A single metric card.
// Props:
//   label     — display name, e.g. "Temperature"
//   value     — number or null (null shows a dash)
//   unit      — unit string, e.g. "°C"
//   accentColor — CSS color for the top bar
//   filtered  — if true, shows a "filtered out" state (demo only)

import React from 'react';

export default function MetricCard({ label, value, unit, accentColor, filtered = false }) {
  // Format the value nicely — show 2 decimal places, or "—" if no data yet
  const display = filtered
    ? 'filtered'
    : value !== null && value !== undefined
      ? value.toFixed(2)
      : '—';

  return (
    <div style={{
      background:   '#0f1117',
      border:       '1px solid #1e2130',
      borderTop:    `3px solid ${filtered ? '#333' : accentColor}`,
      borderRadius: 8,
      padding:      '20px 24px',
      minWidth:     160,
      flex:         1,
      opacity:      filtered ? 0.45 : 1,
      transition:   'opacity 0.3s',
    }}>
      {/* Metric label at the top */}
      <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#5a6070', fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {label}
      </p>

      {/* Big value in the middle */}
      <p style={{ margin: '12px 0 4px', fontSize: filtered ? 14 : 36,
                  fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace",
                  color: filtered ? '#333' : '#e8eaf0', letterSpacing: '-0.02em' }}>
        {display}
      </p>

      {/* Unit below */}
      <p style={{ margin: 0, fontSize: 12, color: filtered ? '#333' : '#3a4055',
                  fontFamily: "'IBM Plex Mono', monospace" }}>
        {filtered ? 'blocked by collector filter' : unit}
      </p>
    </div>
  );
}
