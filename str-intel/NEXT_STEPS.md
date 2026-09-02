# STR Intel — Next steps

## Current status

Completed in the current prototype:
- CSV-backed POI loading and haversine nearest-distance calculation
- tourism/demographic reference data for selected LA and SD neighborhoods
- listing names and pricing-driver fields in the listing detail view
- listing filters, sorting, and selected market/neighborhood context
- pipeline and API regression checks passing

The data and scores are still decision-support prototypes. Do not treat proxy tourism figures, fallback prices, or estimated occupancy as authoritative.

## 1) Replace proxy tourism and POI data with authoritative sources

The current distance-to-attraction field now reads from data/poi/attractions.csv, but the file is still small and curated. Tourism data in data/raw/tourism_demand.csv is also reference/proxy data rather than a documented authoritative source.

Priority actions:
- replace the small POI file with a sourced dataset such as OpenStreetMap/Overpass or an official tourism/municipal dataset
- document source URL, retrieval date, license, and geographic coverage for each source
- store the POI layer in a structured table or CSV source
- compute nearest attraction using geospatial distance against the actual listing coordinates
- add a confidence flag or data-quality note for any POI-derived metric
- replace tourism proxy values with LA Tourism and Authority/City of San Diego or other documented public sources

## 2) Add source and data-quality labels

The app currently mixes:
- actual raw Airbnb listing data
- fallback generated pricing for missing rows
- demo attraction markers

To reduce confusion, the dashboard should clearly distinguish:
- data source = actual raw listings
- data source = generated fallback
- reference/proxy = tourism and demographic layer
- curated/incomplete = current POI layer

This should be surfaced in the UI or in the README notes.

## 3) Add richer listing attributes

The current Inside Airbnb extracts do not contain beds, baths, area, or structured amenities. Find a permitted/authorized source or listing feed that includes:
- bedrooms, beds, bathrooms, and property size
- amenities as structured values
- review score and review count
- address or sufficiently precise coordinates, subject to privacy and source terms

Do not infer these fields from listing titles without labeling them as extracted estimates.

## 4) Add real market-neighborhood drilldown

The listing detail panel should feel like an actual drilldown, not just a top-N list from a market.

Recommended flow:
- choose market
- choose neighborhood or region
- view listing cards / table
- sort by annual revenue, occupancy, nightly rate, distance to attraction
- filter by room type, bedrooms, bathrooms, amenities, and price band once those fields are available

## 5) Improve the scoring definition

The market scorecards are useful, but their composite score should be explained in plain language.

Add:
- score formula documentation
- weight explanation for occupancy, nightly rate, reviews, and yield
- what is a “good” score vs. “high risk” score

## 6) Add true geospatial analysis for investment screening

The next stage should be location intelligence, not just listing detail.

Suggested analyses:
- median revenue by neighborhood
- occupancy by room type
- listing density near attractions
- distance-to-attraction bucket analysis
- top performers within 1 mi / 5 mi / 10 mi of attractions

## 7) Add a proper data-quality pipeline

Need a lightweight data quality status layer:
- source completeness by market
- % of listings with missing prices
- % of listings with missing coordinates
- % of listings with null neighborhood
- duplicates and invalid values

## 8) Add a realistic “front-end” UX for decision making

The current dashboard is a prototype. To make it real:
- use a search/filter bar for neighborhood and room type
- make the map clickable and update the table
- add a market summary card with actual score explanation
- allow sorting by revenue, yield, occupancy, and distance

## 9) Decide the product definition of “STR market opportunity”

The app should explicitly answer:
- where should an investor target next?
- which neighborhoods are best for a specific room type?
- which markets are close to attractions but still yield well?
- which areas are crowded or overbuilt?

This should be codified as a specific screening model.

## 10) Validate against real geography and real POIs

Before using the dashboard in user-facing analysis, validate manually against a few neighborhoods:
- South Diamond Bar
- Santa Fe Springs
- Del Mar Heights
- other high-variance areas

Check that:
- actual distance to nearest attraction is plausible
- rankings reflect actual geo location, not a default list

## 11) Add a handoff-ready documentation pass

The repository should explicitly separate:
- data source documentation
- analytics definitions
- dashboard UX notes
- environment setup and run steps
- artifact ownership / what is demo vs production

This is the next milestone before the project is ready for broader product use.
