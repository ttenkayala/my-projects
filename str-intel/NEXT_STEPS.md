# STR Intel — Next steps

## 1) Fix the attraction / POI layer before using it for decisions

The current distance-to-attraction field is not trustworthy enough for analytics decisions. It is based on a small hardcoded demo list, not a real or curated POI database.

Priority actions:
- replace the demo attraction list with a real POI dataset (for example: attractions, beaches, downtown cores, entertainment districts, parks, airport nodes)
- store the POI layer in a structured table or CSV source
- compute nearest attraction using geospatial distance against the actual listing coordinates
- add a confidence flag or data-quality note for any POI-derived metric

## 2) Separate demo fallback data from real data in the app narrative

The app currently mixes:
- actual raw Airbnb listing data
- fallback generated pricing for missing rows
- demo attraction markers

To reduce confusion, the dashboard should clearly distinguish:
- data source = actual raw listings
- data source = generated fallback
- demo/placeholder = attraction layer

This should be surfaced in the UI or in the README notes.

## 3) Add real market-neighborhood drilldown

The listing detail panel should feel like an actual drilldown, not just a top-N list from a market.

Recommended flow:
- choose market
- choose neighborhood or region
- view listing cards / table
- sort by annual revenue, occupancy, nightly rate, distance to attraction
- filter by room type

## 4) Improve the scoring definition

The market scorecards are useful, but their composite score should be explained in plain language.

Add:
- score formula documentation
- weight explanation for occupancy, nightly rate, reviews, and yield
- what is a “good” score vs. “high risk” score

## 5) Add true geospatial analysis for investment screening

The next stage should be location intelligence, not just listing detail.

Suggested analyses:
- median revenue by neighborhood
- occupancy by room type
- listing density near attractions
- distance-to-attraction bucket analysis
- top performers within 1 mi / 5 mi / 10 mi of attractions

## 6) Add a proper data-quality pipeline

Need a lightweight data quality status layer:
- source completeness by market
- % of listings with missing prices
- % of listings with missing coordinates
- % of listings with null neighborhood
- duplicates and invalid values

## 7) Add a realistic “front-end” UX for decision making

The current dashboard is a prototype. To make it real:
- use a search/filter bar for neighborhood and room type
- make the map clickable and update the table
- add a market summary card with actual score explanation
- allow sorting by revenue, yield, occupancy, and distance

## 8) Decide the product definition of “STR market opportunity”

The app should explicitly answer:
- where should an investor target next?
- which neighborhoods are best for a specific room type?
- which markets are close to attractions but still yield well?
- which areas are crowded or overbuilt?

This should be codified as a specific screening model.

## 9) Validate against real geography and real POIs

Before using the dashboard in user-facing analysis, validate manually against a few neighborhoods:
- South Diamond Bar
- Santa Fe Springs
- Del Mar Heights
- other high-variance areas

Check that:
- actual distance to nearest attraction is plausible
- rankings reflect actual geo location, not a default list

## 10) Add a handoff-ready documentation pass

The repository should explicitly separate:
- data source documentation
- analytics definitions
- dashboard UX notes
- environment setup and run steps
- artifact ownership / what is demo vs production

This is the next milestone before the project is ready for broader product use.
