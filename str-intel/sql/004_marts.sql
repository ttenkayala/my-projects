-- ============================================================
-- STR Intel — Marts Layer
-- Investment scoring views
-- ============================================================

CREATE SCHEMA IF NOT EXISTS marts;

-- Market scorecard: one row per neighbourhood with investment metrics
CREATE OR REPLACE VIEW marts.mart_market_scorecard AS
WITH airbnb_agg AS (
    SELECT
        source_market,
        neighbourhood,
        COUNT(*)                            AS total_listings,
        ROUND(AVG(nightly_price), 2)        AS avg_nightly_rate,
        ROUND(AVG(occupancy_rate_est), 3)   AS avg_occupancy,
        ROUND(AVG(est_annual_revenue), 2)   AS median_annual_revenue,
        ROUND(AVG(est_monthly_revenue), 2)  AS median_monthly_revenue,
        ROUND(AVG(reviews_per_month), 2)    AS avg_reviews_per_month,
        COUNT(*) FILTER (WHERE is_multihost)    AS multihost_count,
        COUNT(*) FILTER (WHERE has_license)     AS licensed_count
    FROM facts.fct_listing_snapshot
    GROUP BY source_market, neighbourhood
),
redfin_agg AS (
    SELECT
        CASE
            WHEN region BETWEEN '90000' AND '91899' THEN 'los-angeles'
            WHEN region BETWEEN '92000' AND '93499' THEN 'san-diego'
            ELSE NULL
        END AS source_market,
        MAX(period_date_key)                         AS latest_period,
        ROUND(AVG(median_sale_price), 2)            AS avg_sale_price,
        ROUND(AVG(median_ppsf), 2)                  AS avg_ppsf,
        ROUND(AVG(price_yoy_change) * 100, 2)      AS price_appreciation_pct
    FROM facts.fct_market_metrics
    WHERE region IS NOT NULL
    GROUP BY
        CASE
            WHEN region BETWEEN '90000' AND '91899' THEN 'los-angeles'
            WHEN region BETWEEN '92000' AND '93499' THEN 'san-diego'
            ELSE NULL
        END
),
tourism_agg AS (
    SELECT
        market,
        neighbourhood,
        annual_visitors_thousands,
        visitor_spend_millions,
        median_hh_income,
        population_thousands,
        is_beach_area,
        is_downtown,
        is_entertainment
    FROM staging.stg_tourism_demand
)
SELECT
    a.source_market,
    a.neighbourhood,
    a.total_listings,
    a.avg_nightly_rate,
    a.avg_occupancy,
    a.median_annual_revenue,
    a.median_monthly_revenue,
    a.avg_reviews_per_month,
    ROUND(a.multihost_count::DOUBLE / NULLIF(a.total_listings, 0), 3) AS multihost_ratio,
    ROUND(a.licensed_count::DOUBLE / NULLIF(a.total_listings, 0), 3)  AS license_compliance,
    r.avg_sale_price,
    r.avg_ppsf,
    r.price_appreciation_pct,
    -- Gross yield: annual STR revenue / median home price
    CASE WHEN r.avg_sale_price > 0
         THEN ROUND(a.median_annual_revenue / r.avg_sale_price * 100, 2)
         ELSE NULL END                          AS gross_yield_pct,
    -- Net yield estimate (subtract ~40% for expenses)
    CASE WHEN r.avg_sale_price > 0
         THEN ROUND(a.median_annual_revenue * 0.60 / r.avg_sale_price * 100, 2)
         ELSE NULL END                          AS net_yield_pct,
    -- Break-even occupancy (cost ~40% of revenue)
    ROUND(0.40 / NULLIF(a.avg_occupancy, 0) * a.avg_occupancy, 3) AS breakeven_occupancy,
    -- Tourism and demographic factors
    COALESCE(t.annual_visitors_thousands, 0)     AS annual_visitors_k,
    COALESCE(t.visitor_spend_millions, 0)        AS visitor_spend_m,
    COALESCE(t.median_hh_income, 0)              AS median_household_income,
    COALESCE(t.population_thousands, 0)          AS neighbourhood_population_k,
    COALESCE(t.is_beach_area, false)             AS is_beach_area,
    COALESCE(t.is_downtown, false)               AS is_downtown,
    COALESCE(t.is_entertainment, false)          AS is_entertainment_district,
    -- Composite score with tourism boost
    ROUND(
        LEAST(a.avg_occupancy * 100, 40)         -- occupancy up to 40pts
        + LEAST(a.avg_reviews_per_month * 5, 20) -- demand signal up to 20pts
        + LEAST(COALESCE(
            a.median_annual_revenue / NULLIF(r.avg_sale_price, 0) * 1000, 0
          ), 40)                                  -- yield up to 40pts
        + LEAST(COALESCE(t.annual_visitors_thousands, 0) / 1000, 15)  -- tourism bonus up to 15pts
    , 1) AS investment_score
FROM airbnb_agg a
LEFT JOIN redfin_agg r
    ON r.source_market = a.source_market
LEFT JOIN tourism_agg t
    ON t.market = a.source_market
    AND LOWER(t.neighbourhood) = LOWER(a.neighbourhood)
ORDER BY investment_score DESC NULLS LAST;


-- Detailed listing view for drill-down
CREATE OR REPLACE VIEW marts.mart_listing_detail AS
SELECT
    f.listing_id,
    f.listing_name,
    f.source_market,
    f.neighbourhood,
    f.latitude,
    f.longitude,
    p.room_type,
    p.property_category,
    f.nightly_price,
    f.minimum_nights,
    f.occupancy_rate_est,
    f.est_annual_revenue,
    f.est_monthly_revenue,
    ROUND(f.est_monthly_revenue / NULLIF(f.nightly_price, 0), 0) AS est_monthly_days_booked,
    f.number_of_reviews,
    f.reviews_per_month,
    f.reviews_ltm,
    f.host_listing_count,
    f.is_multihost,
    f.has_license
FROM facts.fct_listing_snapshot f
LEFT JOIN dims.dim_property_type p USING (property_type_key);


-- Regulatory risk view
CREATE OR REPLACE VIEW marts.mart_regulatory_risk AS
SELECT
    city,
    county,
    snapshot_date,
    active_permits,
    has_cap,
    cap_limit,
    CASE
        WHEN has_cap AND active_permits >= cap_limit * 0.9 THEN 'HIGH'
        WHEN has_cap AND active_permits >= cap_limit * 0.7 THEN 'MEDIUM'
        WHEN has_cap THEN 'LOW'
        ELSE 'UNREGULATED'
    END AS regulatory_risk
FROM facts.fct_str_permits;
