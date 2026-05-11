#!/usr/bin/env bash
# inc/install.sh
#
# One-time project setup script.
# Run this ONCE before using the Makefile.
#
# What it does:
#   1. Installs Node.js dependencies for the backend
#   2. Installs Node.js dependencies for the frontend
#   3. Creates a Python virtual environment for the device
#   4. Installs Python requirements inside that venv
#
# Usage:
#   bash inc/install.sh
#   (or: chmod +x inc/install.sh && ./inc/install.sh)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "========================================"
echo "  OTel Mock — Project Setup"
echo "========================================"
echo ""

# ── 1. Backend ────────────────────────────────────────────────────────────────
# --no-audit suppresses the vulnerability report at install time.
# Packages are installed locally into backend/node_modules — nothing is global.
echo "→ [1/4] Installing backend Node.js dependencies..."
cd "$REPO_ROOT/backend"
npm install --no-audit
echo "   ✓ backend/node_modules ready"
echo ""

# ── 2. Frontend ───────────────────────────────────────────────────────────────
# Same: packages go into frontend/node_modules only.
# react-scripts 4.x is used for Node 12 compatibility (v5+ requires Node 14+).
echo "→ [2/4] Installing frontend Node.js dependencies..."
cd "$REPO_ROOT/frontend"
npm install --no-audit
echo "   ✓ frontend/node_modules ready"
echo ""

# ── 3. Python venv ────────────────────────────────────────────────────────────
echo "→ [3/4] Creating Python virtual environment at device/.venv ..."
cd "$REPO_ROOT/device"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "   ✓ venv created"
else
    echo "   ✓ venv already exists, skipping creation"
fi

# ── 4. Python requirements ────────────────────────────────────────────────────
echo "→ [4/4] Installing Python requirements into venv..."
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -r requirements.txt
echo "   ✓ Python packages installed"
echo ""

echo "========================================"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    make collector   ← start OTel Collector (Docker)"
echo "    make backend     ← start Node.js backend"
echo "    make frontend    ← start React dashboard"
echo "    make device      ← start fake sensor"
echo ""
echo "    make run-all     ← start everything at once"
echo "========================================"
echo ""
