// src/components/MetricChart.jsx
//
// A line chart that shows the last 30 readings over time.
// Uses the "recharts" library — a React-friendly chart library.
//
// Props:
//   history — array of { time, temperature, pressure } objects
//   metric  — which metric to chart: "temperature" | "pressure"
//   color   — line color

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Custom tooltip (the popup when you hover a data point)
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const time  = new Date(label).toLocaleTimeString();
  const value = payload[0]?.value;
  const unit  = payload[0]?.name === 'temperature' ? '°C' : 'bar';

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a3050',
      borderRadius: 6, padding: '8px 12px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#e8eaf0'
    }}>
      <p style={{ margin: 0, color: '#5a6070' }}>{time}</p>
      <p style={{ margin: '4px 0 0' }}>{value?.toFixed(3)} {unit}</p>
    </div>
  );
}

export default function MetricChart({ history, metric, color }) {
  // Format time labels on the X axis (show only HH:MM:SS)
  const formatTime = (iso) => new Date(iso).toLocaleTimeString();

  if (!history || history.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0',
                    color: '#2a3050', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        waiting for data...
      </div>
    );
  }

  return (
    // ResponsiveContainer makes the chart fill its parent width automatically
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={history} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>

        {/* Subtle grid lines */}
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />

        {/* X axis — timestamps */}
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          tick={{ fontSize: 10, fill: '#3a4055', fontFamily: "'IBM Plex Mono', monospace" }}
          interval="preserveStartEnd"
          axisLine={{ stroke: '#1a1f2e' }}
          tickLine={false}
        />

        {/* Y axis — auto-scaled to data range */}
        <YAxis
          tick={{ fontSize: 10, fill: '#3a4055', fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => v.toFixed(2)}
        />

        {/* Hover tooltip */}
        <Tooltip content={<CustomTooltip />} />

        {/* The actual line */}
        <Line
          type="monotone"
          dataKey={metric}
          stroke={color}
          strokeWidth={1.5}
          dot={false}               // no dots on each point (cleaner)
          activeDot={{ r: 4, fill: color }}
          isAnimationActive={false} // disable animation to avoid flicker on poll
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
