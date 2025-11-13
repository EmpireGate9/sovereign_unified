#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python3 -m venv .venv || true
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
export PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
