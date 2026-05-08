// backend/server.js
//
// This is the middleman between the OTel Collector and the React frontend.
//
// It does two things:
//   1. Receives filtered metrics from the collector (POST /v1/metrics)
//   2. Serves those metrics to React (GET /api/metrics)
//
// Run with: node server.js

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 4320;

app.use(express.json({ limit: '10mb' }));

// Allow React (localhost:3000) to call this API without browser security errors
app.use(cors({ origin: '*' }));

// ─── In-memory store ──────────────────────────────────────────────────────────
//
// In a real app you'd write to a database (InfluxDB, PostgreSQL, etc.)
// For learning purposes we keep the last reading in memory.

const store = {
  temperature:  null,   // latest °C value
  pressure:     null,   // latest bar value
  history:      [],     // last 30 data points (for the chart)
  lastUpdated:  null,
  receiveCount: 0,      // how many batches we've received total
};

const MAX_HISTORY = 30; // keep 30 data points for the chart

// ─── Route 1: OTel Collector POSTs metrics here ───────────────────────────────
//
// The collector.yaml has:
//   exporters:
//     otlphttp/backend:
//       endpoint: "http://host.docker.internal:4319"
//
// OTel always posts to /v1/metrics when using OTLP HTTP format.

app.post('/v1/metrics', (req, res) => {
  store.receiveCount++;

  console.log(`\n[DEBUG ${store.receiveCount}] Raw request body:`, JSON.stringify(req.body, null, 2));

  // The OTel payload is nested:
  //   body
  //   └─ resourceMetrics[]       (one per "resource" / device)
  //      └─ scopeMetrics[]       (one per instrumentation scope)
  //         └─ metrics[]         (each individual metric)
  //            └─ gauge.dataPoints[]  (actual values)

  const resourceMetrics = req.body?.resourceMetrics ?? [];
  
  console.log(`[DEBUG ${store.receiveCount}] Full payload keys:`, Object.keys(req.body));
  console.log(`[DEBUG ${store.receiveCount}] resourceMetrics.length:`, resourceMetrics.length);

  for (const rm of resourceMetrics) {
    console.log(`[DEBUG ${store.receiveCount}] Resource:`, Object.keys(rm));
    for (const sm of rm.scopeMetrics ?? []) {
      console.log(`[DEBUG ${store.receiveCount}] ScopeMetrics:`, Object.keys(sm));
      for (const metric of sm.metrics ?? []) {
        console.log(`[DEBUG ${store.receiveCount}] Metric name: "${metric.name}", keys:`, Object.keys(metric));

        // Extract the numeric value from the gauge data point
        const dataPoints = metric.gauge?.dataPoints ?? [];
        console.log(`[DEBUG ${store.receiveCount}] dataPoints:`, dataPoints);
        if (dataPoints.length === 0) {
          console.log(`[DEBUG ${store.receiveCount}] No dataPoints, checking alternative structures...`);
          console.log(`[DEBUG ${store.receiveCount}] metric.gauge:`, metric.gauge);
          console.log(`[DEBUG ${store.receiveCount}] full metric:`, JSON.stringify(metric, null, 2));
          continue;
        }

        const dp = dataPoints[0];
        console.log(`[DEBUG ${store.receiveCount}] dataPoint keys:`, Object.keys(dp));
        console.log(`[DEBUG ${store.receiveCount}] the value we get is:`, dp);
        const value = dp.asDouble ?? dp.asInt ?? null;
        console.log(`[DEBUG ${store.receiveCount}] Extracted value:`, value);
        
        if (value === null) {
          console.log(`No numeric value found in dataPoint!`);
          continue;
        }

        // Map metric name → store field
        if (metric.name === 'device.temperature') store.temperature = value;
        if (metric.name === 'device.pressure')    store.pressure    = value;
        console.log(`The effing value we get is:`, value);
      }
    }
  }

  // Record a history snapshot when we have both values
  if (store.temperature !== null && store.pressure !== null) {
    store.lastUpdated = new Date().toISOString();

    store.history.push({
      time:        store.lastUpdated,
      temperature: store.temperature,
      pressure:    store.pressure,
    });

    // Keep only the last N points
    if (store.history.length > MAX_HISTORY) {
      store.history.shift();
    }
  }

  console.log(
    `[${new Date().toLocaleTimeString()}] Received batch #${store.receiveCount} ` +
    `— temp=${store.temperature?.toFixed(1)}°C  pressure=${store.pressure?.toFixed(4)}bar`
  );
  res.status(200).json({ partialSuccess: {} });
});

// ─── Route 2: React polls this to get current readings ────────────────────────

app.get('/api/metrics', (req, res) => {
  res.json({
    current: {
      temperature: store.temperature,
      pressure:    store.pressure,
    },
    history:      store.history,
    lastUpdated:  store.lastUpdated,
    receiveCount: store.receiveCount,
  });
});

// ─── Route 3: Health check (useful for debugging) ─────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', receiveCount: store.receiveCount });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nOTel backend running on http://localhost:${PORT}`);
  console.log(`  POST /v1/metrics  ← OTel Collector sends here`);
  console.log(`  GET  /api/metrics ← React polls here`);
  console.log(`  GET  /health      ← health check\n`);
});
