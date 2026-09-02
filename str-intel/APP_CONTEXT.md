# STR Intel — App context and handoff

## Purpose

This project is a lightweight STR investment screening app built around a local DuckDB warehouse and a small FastAPI + dashboard front end. It is designed to help answer a simple analysis question:

- which STR markets or neighborhoods look promising to enter?
- what are the strongest listing profiles and returns?
- how do they relate to geography and nearby attractions?

The project is currently a working prototype / analytics sandbox rather than a production marketplace intelligence system. Current listing data is available for Los Angeles and San Diego; tourism and demographic coverage is a smaller neighborhood-level reference dataset.

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
- the current listing source does not provide beds, baths, square footage, or a structured amenities field
- listing titles may contain clues such as “3bd”, “pool”, or “parking”, but those are not validated property attributes

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

### Tourism and neighborhood reference data

The current reference file is:

- data/raw/tourism_demand.csv

It provides manually curated neighborhood-level proxy fields for Los Angeles and San Diego:
- annual visitors
- visitor spending
- tourism season
- beach, downtown, and entertainment flags
- airport distance
- median household income
- population

These values are useful for developing the data model and UI, but they are not yet connected to an authoritative tourism publication or API. They must be labeled as reference/proxy data until replaced with sourced figures.

### POI / attraction layer

The current POI file is:

- data/poi/attractions.csv

The API loads this CSV at startup and calculates nearest-POI distance from listing latitude and longitude using the haversine formula. The file is better than the previous hardcoded list, but it is still a small curated set and should not yet be treated as a complete POI inventory.

## App organization

### SQL layer

Relevant files include:

- sql/001_staging.sql
- sql/002_dimensions.sql
- sql/003_facts.sql
- sql/004_marts.sql
- data/raw/tourism_demand.csv

Important views/tables:
- staging.stg_airbnb_listings
- facts.fct_listing_snapshot
- facts.fct_market_metrics
- marts.mart_market_scorecard
- marts.mart_listing_detail
- staging.stg_tourism_demand

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
- a listing detail table with listing name, room type, nightly rate, minimum nights, demand, occupancy, estimated monthly revenue, host portfolio, and license status
- a selected market/neighborhood context label
- listing filters for nightly price, occupancy, and reviews per month
- clickable table headers for listing sorting

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
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

Then open:

- http://127.0.0.1:8000/healthz
- http://127.0.0.1:8000/dashboard
- http://127.0.0.1:8000/markets?market=los-angeles&limit=10

### Common gotcha

If you start uvicorn from the parent directory, Python cannot import the `api` package and the app will fail with a module import error. That is the most common local run issue.

## Known limitations

- the POI file is small and curated, not a complete authoritative attraction database
- many listing rows rely on fallback logic when prices are missing
- tourism and demographic values are reference/proxy data and need authoritative sourcing
- the app is a prototype and is not yet a final market-screening product
- market scoring is informative, but not the final investment definition
- neighborhood-level detail is only as good as the source data quality
- beds, baths, area, and structured amenities are not available in the current Airbnb extracts
- estimated occupancy currently uses availability as a proxy and should not be interpreted as booked data

## Best next milestone

The next major milestone is to replace proxy tourism and POI data with sourced datasets, then add a validated neighborhood-level screening workflow. The next listing enhancement should use a source that includes bedrooms, bathrooms, area, and amenities.

Once that is done, the app becomes far more useful for actual STR market selection and investment analysis.
