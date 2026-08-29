-- ============================================================
-- STR Intel — Dimension Layer
-- ============================================================

CREATE SCHEMA IF NOT EXISTS dims;

CREATE TABLE IF NOT EXISTS dims.dim_property_type (
    property_type_key   INTEGER PRIMARY KEY,
    room_type           VARCHAR,
    property_category   VARCHAR,
    is_entire_unit      BOOLEAN
);

INSERT OR IGNORE INTO dims.dim_property_type VALUES
    (1, 'Entire home/apt',  'Entire Unit',   true),
    (2, 'Entire condo',     'Entire Unit',   true),
    (3, 'Entire villa',     'Entire Unit',   true),
    (4, 'Entire bungalow',  'Entire Unit',   true),
    (5, 'Private room',     'Private Room',  false),
    (6, 'Shared room',      'Shared Room',   false),
    (7, 'Hotel room',       'Hotel',         false);

CREATE TABLE IF NOT EXISTS dims.dim_geography (
    geo_key         INTEGER PRIMARY KEY,
    city            VARCHAR,
    county          VARCHAR,
    state           VARCHAR,
    zip_code        VARCHAR,
    neighbourhood   VARCHAR,
    market_name     VARCHAR,
    latitude        DOUBLE,
    longitude       DOUBLE
);

CREATE TABLE IF NOT EXISTS dims.dim_date (
    date_key        INTEGER PRIMARY KEY,
    full_date       DATE,
    year            INTEGER,
    quarter         INTEGER,
    month           INTEGER,
    month_name      VARCHAR,
    week            INTEGER,
    day_of_week     INTEGER,
    is_weekend      BOOLEAN
);

INSERT OR IGNORE INTO dims.dim_date
SELECT
    CAST(strftime(d::DATE, '%Y%m%d') AS INTEGER)    AS date_key,
    d::DATE                                          AS full_date,
    YEAR(d::DATE)                                    AS year,
    QUARTER(d::DATE)                                 AS quarter,
    MONTH(d::DATE)                                   AS month,
    strftime(d::DATE, '%B')                          AS month_name,
    WEEK(d::DATE)                                    AS week,
    DAYOFWEEK(d::DATE)                               AS day_of_week,
    DAYOFWEEK(d::DATE) IN (1, 7)                     AS is_weekend
FROM generate_series(
    '2020-01-01'::DATE,
    '2027-12-31'::DATE,
    INTERVAL '1 day'
) t(d);
