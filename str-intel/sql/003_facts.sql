-- ============================================================
-- STR Intel — Fact Layer
-- ============================================================

CREATE SCHEMA IF NOT EXISTS facts;

CREATE TABLE IF NOT EXISTS facts.fct_listing_snapshot (
    listing_id              BIGINT,
    snapshot_date_key       INTEGER,
    source_market           VARCHAR,
    neighbourhood           VARCHAR,
    latitude                DOUBLE,
    longitude               DOUBLE,
    property_type_key       INTEGER,
    host_id                 BIGINT,
    listing_name            VARCHAR,
    nightly_price           DECIMAL(10,2),
    minimum_nights          INTEGER,
    number_of_reviews       INTEGER,
    reviews_per_month       DOUBLE,
    reviews_ltm             INTEGER,
    last_review_date        DATE,
    availability_365        INTEGER,
    booked_days_365         INTEGER,
    occupancy_rate_est      DOUBLE,
    est_annual_revenue      DECIMAL(12,2),
    est_monthly_revenue     DECIMAL(10,2),
    host_listing_count      INTEGER,
    is_multihost            BOOLEAN,
    has_license             BOOLEAN,
    PRIMARY KEY (listing_id, snapshot_date_key)
);

CREATE TABLE IF NOT EXISTS facts.fct_market_metrics (
    period_date_key         INTEGER,
    region                  VARCHAR,
    property_type           VARCHAR,
    median_sale_price       DECIMAL(12,2),
    median_list_price       DECIMAL(12,2),
    median_ppsf             DECIMAL(10,2),
    homes_sold              INTEGER,
    new_listings            INTEGER,
    inventory               INTEGER,
    months_of_supply        DOUBLE,
    median_dom              INTEGER,
    avg_sale_to_list        DOUBLE,
    price_yoy_change        DOUBLE,
    PRIMARY KEY (period_date_key, region, property_type)
);

CREATE TABLE IF NOT EXISTS facts.fct_demographics (
    geo_id                  VARCHAR,
    year                    INTEGER,
    total_population        INTEGER,
    median_household_income DECIMAL(10,2),
    median_age              DOUBLE,
    total_housing_units     INTEGER,
    vacant_housing_units    INTEGER,
    vacancy_rate            DOUBLE,
    owner_occupied_pct      DOUBLE,
    renter_occupied_pct     DOUBLE,
    median_home_value       DECIMAL(12,2),
    median_gross_rent       DECIMAL(10,2),
    PRIMARY KEY (geo_id, year)
);

CREATE TABLE IF NOT EXISTS facts.fct_str_permits (
    city                VARCHAR,
    county              VARCHAR,
    snapshot_date       DATE,
    active_permits      INTEGER,
    total_issued        INTEGER,
    has_cap             BOOLEAN,
    cap_limit           INTEGER,
    notes               VARCHAR,
    PRIMARY KEY (city, snapshot_date)
);
