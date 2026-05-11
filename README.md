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

# 2. Python 3 + venv
sudo apt install python3 python3-pip python3-venv

# 3. Docker (for the OTel Collector)
sudo apt install docker.io
sudo usermod -aG docker $USER   # then log out and back in
```

## One-time setup

Run the install script **once** to install all dependencies and create the
Python virtual environment for the device:

```bash
cd otel-mock
bash inc/install.sh
# or: make install
```

This sets up:
- `backend/node_modules`
- `frontend/node_modules`
- `device/.venv` with the Python requirements

## Running the project

### Option A — Makefile (recommended)

```bash
# In 4 separate terminals:
make collector   # Terminal 1
make backend     # Terminal 2
make frontend    # Terminal 3
make device      # Terminal 4

# Or everything at once (logs go to /tmp/otel-*.log):
make run-all
```

### Option B — Manual (4 terminals)

#### Terminal 1 — OTel Collector (Docker, `--network host`)

> **Why `--network host`?**  The collector runs inside Docker and needs to
> reach the Node.js backend at `localhost:4320` on the *host*.  With
> `--network host` the container shares the host's network stack, so
> `localhost` inside the container is the same as on your machine.
> Port mapping (`-p`) is not used with `--network host`.

```bash
cd otel-mock
docker run --rm \
  --network host \
  -v $(pwd)/collector/collector.yaml:/etc/otel/config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config /etc/otel/config.yaml
```

Ports exposed on the host automatically (no `-p` needed):
| Port | Purpose |
|------|---------|
| 4317 | gRPC receiver (Device A → Collector) |
| 4318 | HTTP receiver (alternative) |
| 9464 | Prometheus scrape endpoint |

#### Terminal 2 — Backend

```bash
cd otel-mock/backend
node server.js
# Listening on http://localhost:4320
```

#### Terminal 3 — Frontend

```bash
cd otel-mock/frontend
npm start
# Opens http://localhost:3000 automatically
```

#### Terminal 4 — Device A (Python venv)

```bash
cd otel-mock/device
.venv/bin/python device_a.py
# Uses the venv created by inc/install.sh
```

## What to expect
- Device A emits: temperature, pressure, battery_level, error_count
- The OTel Collector filters to ONLY pass temperature + pressure
- The React dashboard at http://localhost:3000 shows live readings
- Battery and error_count never reach the UI (filtered out)
