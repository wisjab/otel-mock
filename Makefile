# Makefile — OTel Mock Project
#
# Prerequisites: run `bash inc/install.sh` once before using these targets.
#
# Targets:
#   make collector   — run the OTel Collector inside Docker (--network host)
#   make backend     — start the Node.js backend (port 4320)
#   make frontend    — start the React dev server (port 3000)
#   make device      — run the fake sensor using the Python venv
#   make run-all     — launch all four in parallel (background) then tail logs
#   make install     — run the one-time setup script

SHELL := /bin/bash
REPO_ROOT := $(shell pwd)

# ── Collector ─────────────────────────────────────────────────────────────────
.PHONY: collector
collector:
	@echo "→ Starting OTel Collector (Docker, --network host)..."
	docker run --rm \
	  --network host \
	  -v "$(REPO_ROOT)/collector/collector.yaml:/etc/otel/config.yaml" \
	  otel/opentelemetry-collector-contrib:latest \
	  --config /etc/otel/config.yaml

# ── Backend ───────────────────────────────────────────────────────────────────
.PHONY: backend
backend:
	@echo "→ Starting Node.js backend..."
	cd backend && node server.js

# ── Frontend ──────────────────────────────────────────────────────────────────
.PHONY: frontend
frontend:
	@echo "→ Starting React frontend..."
	cd frontend && npm start

# ── Device ────────────────────────────────────────────────────────────────────
.PHONY: device
device:
	@echo "→ Starting fake Device A (Python venv)..."
	cd device && .venv/bin/python device_a.py

# ── Run all (parallel) ────────────────────────────────────────────────────────
# Each service is started in the background and writes to its own log file.
# Ctrl-C will send SIGINT to this shell; the trap kills the whole process group.
.PHONY: run-all
run-all:
	@echo ""
	@echo "========================================"
	@echo "  Starting all services..."
	@echo "  Logs: /tmp/otel-{collector,backend,frontend,device}.log"
	@echo "  Press Ctrl-C to stop everything."
	@echo "========================================"
	@echo ""
	@mkdir -p /tmp
	@# Start each service in the background
	docker run --rm \
	  --network host \
	  -v "$(REPO_ROOT)/collector/collector.yaml:/etc/otel/config.yaml" \
	  otel/opentelemetry-collector-contrib:latest \
	  --config /etc/otel/config.yaml \
	  > /tmp/otel-collector.log 2>&1 & COLLECTOR_PID=$$!; \
	\
	(cd "$(REPO_ROOT)/backend" && node server.js) \
	  > /tmp/otel-backend.log 2>&1 & BACKEND_PID=$$!; \
	\
	(cd "$(REPO_ROOT)/frontend" && npm start) \
	  > /tmp/otel-frontend.log 2>&1 & FRONTEND_PID=$$!; \
	\
	sleep 3; \
	(cd "$(REPO_ROOT)/device" && .venv/bin/python device_a.py) \
	  > /tmp/otel-device.log 2>&1 & DEVICE_PID=$$!; \
	\
	echo "  collector PID=$$COLLECTOR_PID"; \
	echo "  backend   PID=$$BACKEND_PID"; \
	echo "  frontend  PID=$$FRONTEND_PID"; \
	echo "  device    PID=$$DEVICE_PID"; \
	echo ""; \
	trap "echo 'Stopping...'; kill $$COLLECTOR_PID $$BACKEND_PID $$FRONTEND_PID $$DEVICE_PID 2>/dev/null; exit 0" INT TERM; \
	tail -f /tmp/otel-collector.log /tmp/otel-backend.log /tmp/otel-frontend.log /tmp/otel-device.log

# ── Install (one-time setup) ──────────────────────────────────────────────────
.PHONY: install
install:
	@bash inc/install.sh

# ── Gen config (regenerate collector.yaml from devices.json) ──────────────────
.PHONY: gen-config
gen-config:
	@echo "→ Regenerating collector/collector.yaml from config/devices.json..."
	node inc/gen-collector.js
	@echo "   Restart 'make collector' for changes to take effect."
