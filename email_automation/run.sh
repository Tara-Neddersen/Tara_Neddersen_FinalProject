#!/usr/bin/env bash
# Convenience wrapper — install deps (once) and run triage.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "Creating virtualenv..."
    python3 -m venv .venv
    .venv/bin/pip install --quiet --upgrade pip
    .venv/bin/pip install --quiet -r requirements.txt
fi

exec .venv/bin/python triage.py "$@"
