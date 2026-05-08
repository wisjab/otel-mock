// src/components/StatusBar.jsx
//
// Shows the health of each layer in the pipeline.
// Helps you see at a glance which parts are working.
//
// Props:
//   receiveCount — how many metric batches the backend has received
//   lastUpdated  — ISO timestamp of last received data

import React from 'react';

function Dot({ on }) {
  return (
    <span style={{
      display:       'inline-block',
      width:         7,
      height:        7,
      borderRadius:  '50%',
      background:    on ? '#00d4a0' : '#2a3050',
      marginRight:   7,
      boxShadow:     on ? '0 0 6px #00d4a044' : 'none',
      transition:    'all 0.4s',
    }} />
  );
}

export default function StatusBar({ receiveCount, lastUpdated }) {
  const hasData    = receiveCount > 0;
  const secondsAgo = lastUpdated
    ? Math.round((Date.now() - new Date(lastUpdated).getTime()) / 1000)
    : null;

  const isLive = secondsAgo !== null && secondsAgo < 10;

  const style = {
    display:        'flex',
    gap:            32,
    padding:        '10px 20px',
    background:     '#080a0f',
    borderBottom:   '1px solid #1a1f2e',
    fontFamily:     "'IBM Plex Mono', monospace",
    fontSize:       11,
    color:          '#3a4055',
    alignItems:     'center',
    flexWrap:       'wrap',
  };

  const item = (label, on, detail) => (
    <span key={label} style={{ display: 'flex', alignItems: 'center' }}>
      <Dot on={on} />
      <span style={{ color: on ? '#5a6880' : '#2a3050' }}>
        {label}
        {detail && <span style={{ color: '#2a3050', marginLeft: 6 }}>{detail}</span>}
      </span>
    </span>
  );

  return (
    <div style={style}>
      <span style={{ color: '#1e2535', marginRight: 8 }}>pipeline</span>
      {item('device A',  hasData,   null)}
      {item('collector', hasData,   null)}
      {item('backend',   hasData,   hasData ? `${receiveCount} batches` : null)}
      {item('react',     true,      null)}
      {isLive
        ? <span style={{ marginLeft: 'auto', color: '#00d4a066' }}>live · {secondsAgo}s ago</span>
        : <span style={{ marginLeft: 'auto', color: '#2a3050' }}>waiting for data</span>
      }
    </div>
  );
}
