// backend/server.js
//
// Config-driven OTel backend.
// Reads config/devices.json at startup — no metric names are hardcoded here.
//
// Routes:
//   POST /v1/metrics   ← OTel Collector posts filtered metrics here
//   GET  /api/metrics  ← React polls for the latest values + history
//   GET  /api/devices  ← React fetches the device/metric schema (labels, units, colors)
//   GET  /health       ← health check

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 4320;

app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*' }));

// ─── Load device config ───────────────────────────────────────────────────────
//
// Resolve relative to this file so it works regardless of cwd.
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'devices.json');
const config      = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Build a flat lookup: metricName → { label, unit, color, deviceId }
// Only include metrics where collect === true (mirrors the collector filter).
const metricMeta = {};
for (const device of config.devices) {
  for (const m of device.metrics) {
    if (m.collect) {
      metricMeta[m.name] = {
        label:    m.label,
        unit:     m.unit,
        color:    m.color,
        deviceId: device.id,
      };
    }
  }
}

const collectedNames = Object.keys(metricMeta);
console.log(`Loaded ${collectedNames.length} collected metric(s): ${collectedNames.join(', ')}`);

// ─── In-memory store ──────────────────────────────────────────────────────────
//
// current     — latest value per metric name  { "device.temperature": 71.3, ... }
// history     — last MAX_HISTORY snapshots    [{ time, "device.temperature": 71.3, ... }, ...]
// receiveCount — total batches received

const MAX_HISTORY = 30;

const store = {
  current:      {},
  history:      [],
  lastUpdated:  null,
  receiveCount: 0,
};

// Pre-fill current with null for every collected metric
for (const name of collectedNames) {
  store.current[name] = null;
}

// ─── Route 1: OTel Collector POSTs metrics here ───────────────────────────────

app.post('/v1/metrics', (req, res) => {
  store.receiveCount++;

  const resourceMetrics = (req.body && req.body.resourceMetrics) || [];
  let updated = false;

  for (const rm of resourceMetrics) {
    for (const sm of (rm.scopeMetrics || [])) {
      for (const metric of (sm.metrics || [])) {

        // Only process metrics that are in our collected set
        if (!metricMeta[metric.name]) {
          console.log('[SKIP] Unexpected metric from collector: ' + metric.name);
          continue;
        }

        const dataPoints = (metric.gauge && metric.gauge.dataPoints) || [];
        if (dataPoints.length === 0) continue;

        const dp = dataPoints[0];
        const value = (dp.asDouble !== undefined && dp.asDouble !== null) ? dp.asDouble
                    : (dp.asInt    !== undefined && dp.asInt    !== null) ? dp.asInt
                    : null;

        if (value === null) continue;

        store.current[metric.name] = value;
        updated = true;
      }
    }
  }

  // Push a history snapshot when at least one metric was updated
  if (updated) {
    store.lastUpdated = new Date().toISOString();
    const snapshot = { time: store.lastUpdated };
    for (const n of collectedNames) snapshot[n] = store.current[n];
    store.history.push(snapshot);
    if (store.history.length > MAX_HISTORY) store.history.shift();
  }

  console.log(
    `[${new Date().toLocaleTimeString()}] batch #${store.receiveCount} — ` +
    collectedNames.map(n => {
      const v = store.current[n];
      return n.replace('device.', '') + '=' + (v !== null ? v.toFixed(2) : 'null');
    }).join('  ')
  );

  res.status(200).json({ partialSuccess: {} });
});

// ─── Route 2: React polls this for current values + history ───────────────────

app.get('/api/metrics', (req, res) => {
  res.json({
    current:      store.current,
    history:      store.history,
    lastUpdated:  store.lastUpdated,
    receiveCount: store.receiveCount,
  });
});

// ─── Route 3: React fetches the device/metric schema ─────────────────────────
//
// Returns the full devices.json so the frontend knows:
//   - which metrics exist (collect: true and false)
//   - their labels, units, and colors
// The frontend uses this to render cards and charts dynamically.

app.get('/api/devices', (req, res) => {
  res.json(config);
});

// ─── Route 4: Health check ────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', receiveCount: store.receiveCount });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nOTel backend running on http://localhost:${PORT}`);
  console.log(`  POST /v1/metrics  ← OTel Collector`);
  console.log(`  GET  /api/metrics ← React live data`);
  console.log(`  GET  /api/devices ← React schema`);
  console.log(`  GET  /health      ← health check\n`);
});
