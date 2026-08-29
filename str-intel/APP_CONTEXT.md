# STR Intel — App context and handoff

## Purpose

This project is a lightweight STR investment screening app built around a local DuckDB warehouse and a small FastAPI + dashboard front end. It is designed to help answer a simple analysis question:

- which STR markets or neighborhoods look promising to enter?
- what are the strongest listing profiles and returns?
- how do they relate to geography and nearby attractions?

The project is currently a working prototype / analytics sandbox rather than a production marketplace intelligence system.

## Design

### High-level architecture

The application follows a simple data warehouse pattern:

- staging layer
- dimensions layer
- facts layer
- marts layer
- API layer
- dashboard layer

The transformation flow is:

1. raw source files are loaded into staging tables
2. dimensions are created for categorical attributes such as property type
3. facts are built for listing snapshots and market metrics
4. marts are created for scorecards and listing drilldown views
5. FastAPI serves those marts to the front end
6. the dashboard renders summary cards, map views, and listing detail rows

### Data flow

The repository is organized around a few core pieces:

- run_pipeline.py: orchestrates schema creation, ingestion, and fact build
- sql/: schema and marts SQL definitions
- ingestion/: source loaders for Airbnb and Redfin-like data
- api/main.py: the FastAPI service
- dashboard/index.html: the single-page dashboard UI
- str_intel.db: generated local DuckDB database

### Current dashboard behavior

The dashboard currently supports:
- market filter dropdown
- min yield and occupancy filters
- market cards summary
- U.S. map heat/bar-style display
- market row table
- listing detail table for a selected market or neighborhood

The dashboard is intentionally lightweight and better suited to validating analytics logic than to presenting a full production-grade product UI.

## Data sources

### Airbnb listings

The main listing dataset is sourced from Airbnb CSV files in:

- data/raw/airbnb/los-angeles_listings.csv
- data/raw/airbnb/san-diego_listings.csv

The loader expects a listing dataset with fields such as:
- id
- name
- host_id
- neighbourhood
- latitude
- longitude
- room_type
- price
- minimum_nights
- number_of_reviews
- reviews_per_month
- availability_365
- license

Important caveat:
- some rows have missing price values
- the app includes a fallback generator for those rows so the pipeline does not fail
- those fallback values are not equivalent to true raw listing data and should be treated as placeholder values when used in business decisions

### Redfin-style market data

The market metrics layer is fed from a Redfin-like ZIP-level source, with fields such as:
- region
- median_sale_price
- median_list_price
- median_ppsf
- homes_sold
- new_listings
- inventory
- months_of_supply

This is used for market score logic and benchmark comparison.

### POI / attraction layer

This is the biggest gap in the current implementation.

The listing detail table includes a nearest attraction and distance column, but the attraction list is currently a small hardcoded demo set rather than a real POI dataset. That means the attraction field is not robust enough to be relied on for actual location analysis.

This is explicitly a future work item, not a final product-level feature.

## App organization

### SQL layer

Relevant files include:

- sql/001_staging.sql
- sql/002_dimensions.sql
- sql/003_facts.sql
- sql/004_marts.sql

Important views/tables:
- staging.stg_airbnb_listings
- facts.fct_listing_snapshot
- facts.fct_market_metrics
- marts.mart_market_scorecard
- marts.mart_listing_detail

### API layer

The API lives in:
- api/main.py

Main routes include:
- /healthz
- /markets
- /market-summary
- /us-heatmap
- /listing-detail
- /listing-poi

The API normalizes Pandas/NaN values to JSON-safe values and returns market or listing records directly from DuckDB.

### Dashboard layer

The UI lives in:
- dashboard/index.html

It renders:
- summary cards
- a market filter selector
- score bars
- U.S. map (Plotly choropleth)
- a market table
- a listing detail table with nearest attraction + distance data

## How the app is run

### Setup

From the project root:

```bash
cd /Users/thulasitenkayala/Documents/github_repo/my-projects/str-intel
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### Create the database / build facts

```bash
python run_pipeline.py
```

This executes:
- schema build
- staging ingestion
- fact generation
- market mart build

### Run the API

Important: run the API from the project directory, not from the parent repo folder.

```bash
cd /Users/thulasitenkayala/Documents/github_repo/my-projects/str-intel
PYTHONPATH=. python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Then open:

- http://127.0.0.1:8000/healthz
- http://127.0.0.1:8000/dashboard

### Common gotcha

If you start uvicorn from the parent directory, Python cannot import the `api` package and the app will fail with a module import error. That is the most common local run issue.

## Known limitations

- attraction distance is demo-like and not production-grade
- many listing rows rely on fallback logic when prices are missing
- the app is a prototype and is not yet a final market-screening product
- market scoring is informative, but not the final investment definition
- neighborhood-level detail is only as good as the source data quality

## Best next milestone

The next major milestone is to replace the simplified attraction layer with a real geospatial POI source and tie it into a validated neighborhood-level screening workflow.

Once that is done, the app becomes far more useful for actual STR market selection and investment analysis.
