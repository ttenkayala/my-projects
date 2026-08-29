-- ============================================================
-- STR Intel — Staging Layer
-- Raw data loaded as-is from source systems
-- ============================================================

CREATE SCHEMA IF NOT EXISTS staging;

-- Inside Airbnb listings (visualisations CSV format)
CREATE TABLE IF NOT EXISTS staging.stg_airbnb_listings (
    id                              BIGINT,
    name                            VARCHAR,
    host_id                         BIGINT,
    host_name                       VARCHAR,
    neighbourhood_group             VARCHAR,
    neighbourhood                   VARCHAR,
    latitude                        DOUBLE,
    longitude                       DOUBLE,
    room_type                       VARCHAR,
    price                           DECIMAL(10,2),
    minimum_nights                  INTEGER,
    number_of_reviews               INTEGER,
    last_review                     DATE,
    reviews_per_month               DOUBLE,
    calculated_host_listings_count  INTEGER,
    availability_365                INTEGER,
    number_of_reviews_ltm           INTEGER,
    license                         VARCHAR,
    source_market                   VARCHAR,
    snapshot_date                   DATE
);

-- Redfin zip-level housing market data
CREATE TABLE IF NOT EXISTS staging.stg_redfin_zip (
    period_begin        DATE,
    period_end          DATE,
    region              VARCHAR,
    region_type         VARCHAR,
    state               VARCHAR,
    state_code          VARCHAR,
    property_type       VARCHAR,
    median_sale_price   DECIMAL(12,2),
    median_list_price   DECIMAL(12,2),
    median_ppsf         DECIMAL(10,2),
    homes_sold          INTEGER,
    new_listings        INTEGER,
    inventory           INTEGER,
    months_of_supply    DOUBLE,
    median_dom          INTEGER,
    avg_sale_to_list    DOUBLE,
    sold_above_list     DOUBLE,
    price_drops         DOUBLE,
    off_market_in_two_weeks DOUBLE,
    parent_metro_region VARCHAR,
    last_updated        TIMESTAMP
);

-- Census ACS demographic data
CREATE TABLE IF NOT EXISTS staging.stg_census_acs (
    geo_id              VARCHAR,
    geo_name            VARCHAR,
    state_fips          VARCHAR,
    county_fips         VARCHAR,
    tract               VARCHAR,
    year                INTEGER,
    total_population    INTEGER,
    median_hh_income    DECIMAL(10,2),
    median_age          DOUBLE,
    total_housing_units INTEGER,
    vacant_units        INTEGER,
    owner_occupied      INTEGER,
    renter_occupied     INTEGER,
    median_home_value   DECIMAL(12,2),
    median_gross_rent   DECIMAL(10,2)
);

-- Tourism and visitor demand data
CREATE TABLE IF NOT EXISTS staging.stg_tourism_demand (
    market              VARCHAR,
    neighbourhood       VARCHAR,
    annual_visitors_thousands   DECIMAL(10,2),
    visitor_spend_millions      DECIMAL(10,2),
    tourism_season      VARCHAR,
    is_beach_area       BOOLEAN,
    is_downtown         BOOLEAN,
    is_entertainment    BOOLEAN,
    airport_distance_mi DECIMAL(10,2),
    median_hh_income    DECIMAL(12,0),
    population_thousands DECIMAL(10,2),
    PRIMARY KEY (market, neighbourhood)
);

-- STR permit data (manually scraped from city portals)
CREATE TABLE IF NOT EXISTS staging.stg_str_permits (
    city                VARCHAR,
    county              VARCHAR,
    snapshot_date       DATE,
    active_permits      INTEGER,
    total_issued        INTEGER,
    has_cap             BOOLEAN,
    cap_limit           INTEGER,
    notes               VARCHAR
);
