# STR Intel

A small STR investment analytics project that ingests Airbnb and Redfin-style market data, builds a DuckDB warehouse, and exposes a simple FastAPI + dashboard interface.

## Project structure

- `run_pipeline.py` — builds schema, loads staging data, creates facts and marts
- `ingestion/` — source loaders
- `sql/` — schema and mart SQL
- `api/` — FastAPI service
- `dashboard/` — simple dashboard UI
- `str_intel.db` — generated DuckDB database

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run pipeline

```bash
python run_pipeline.py
```

## Start API

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open:

- http://localhost:8000/healthz
- http://localhost:8000/dashboard
- http://localhost:8000/markets?limit=10

## Notes

- The project includes a built-in sample Redfin fallback if the downloaded CA zip file is not present.
- Airbnb data should be placed in `data/raw/airbnb/` for the full dataset.
- The dashboard is intentionally lightweight and meant to demonstrate the analytics layer.
