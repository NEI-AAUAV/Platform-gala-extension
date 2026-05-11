#!/bin/sh

# Use exec to ensure that uvicorn receives signals (like SIGTERM)
exec python -m uvicorn app.main:app --host ${HOST:-0.0.0.0} --port 8004 --reload
