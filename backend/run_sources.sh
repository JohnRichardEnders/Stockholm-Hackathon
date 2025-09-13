#!/bin/bash
# Script to run get_sources_service.py with virtual environment activated

cd "$(dirname "$0")"
source .venv/bin/activate
python app/services/get_sources_service.py
