# OTel Mock Project — Learn as You Go

A complete local simulation of OpenTelemetry: a fake device sending
metrics → OTel Collector filtering them → Node.js backend → React dashboard.

## What's inside

```
otel-mock/
├── collector/          ← OTel Collector config (Docker)
│   └── collector.yaml
├── device/             ← Fake Device A (Python script)
│   ├── device_a.py
│   └── requirements.txt
├── backend/            ← Node.js server receiving OTel data
│   ├── server.js
│   └── package.json
└── frontend/           ← React dashboard
    ├── package.json
    └── src/
        ├── index.js
        ├── App.js
        └── components/
            ├── MetricCard.jsx
            ├── MetricChart.jsx
            └── StatusBar.jsx
```

## Prerequisites — install these first

```bash
# 1. Node.js (v18+)
sudo apt install nodejs npm

# 2. Python 3 + pip
sudo apt install python3 python3-pip

# 3. Docker (for the OTel Collector)
sudo apt install docker.io
sudo usermod -aG docker $USER   # then log out and back in
```

## Running the project (4 terminals)

Open 4 terminals in VSCode (click the + icon in the terminal panel).

### Terminal 1 — OTel Collector
```bash
cd otel-mock/collector
docker run --rm \
  -v $(pwd)/collector.yaml:/etc/otel/config.yaml \
  -p 4317:4317 -p 4318:4318 -p 9464:9464 \
  otel/opentelemetry-collector-contrib:latest \
  --config /etc/otel/config.yaml
```

### Terminal 2 — Backend
```bash
cd otel-mock/backend
npm install
node server.js
```

### Terminal 3 — Frontend
```bash
cd otel-mock/frontend
npm install
npm start
# Opens http://localhost:3000 automatically
```

### Terminal 4 — Device A (fake sensor)
```bash
cd otel-mock/device
pip3 install -r requirements.txt
python3 device_a.py
```

## What to expect
- Device A emits: temperature, pressure, battery_level, error_count
- The OTel Collector filters to ONLY pass temperature + pressure
- The React dashboard at http://localhost:3000 shows live readings
- Battery and error_count never reach the UI (filtered out)
