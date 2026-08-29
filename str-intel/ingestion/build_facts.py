"""
Transform staging data into fact tables.
Run after all loaders have populated staging.
"""

import duckdb
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'str_intel.db'


def main():
    conn = duckdb.connect(str(DB_PATH))

    # fct_listing_snapshot from airbnb staging
    print('Building fct_listing_snapshot...')
    conn.execute('DELETE FROM facts.fct_listing_snapshot')
    conn.execute("""
        INSERT INTO facts.fct_listing_snapshot
        SELECT
            s.id                                                        AS listing_id,
            CAST(strftime(s.snapshot_date::DATE, '%Y%m%d') AS INTEGER) AS snapshot_date_key,
            s.source_market,
            s.neighbourhood,
            s.latitude,
            s.longitude,
            CASE s.room_type
                WHEN 'Entire home/apt'  THEN 1
                WHEN 'Private room'     THEN 5
                WHEN 'Shared room'      THEN 6
                WHEN 'Hotel room'       THEN 7
                ELSE 1
            END                                                         AS property_type_key,
            s.host_id,
            s.price                                                     AS nightly_price,
            s.minimum_nights,
            s.number_of_reviews,
            s.reviews_per_month,
            s.number_of_reviews_ltm                                     AS reviews_ltm,
            s.last_review::DATE                                         AS last_review_date,
            s.availability_365,
            365 - s.availability_365                                    AS booked_days_365,
            (365 - s.availability_365) / 365.0                         AS occupancy_rate_est,
            s.price * (365 - s.availability_365)                       AS est_annual_revenue,
            s.price * (365 - s.availability_365) / 12.0                AS est_monthly_revenue,
            s.calculated_host_listings_count                           AS host_listing_count,
            s.calculated_host_listings_count > 1                       AS is_multihost,
            s.license IS NOT NULL AND s.license != ''                  AS has_license,
            s.name                                                      AS listing_name
        FROM staging.stg_airbnb_listings s
        WHERE s.price > 0 AND s.price < 10000
    """)
    count = conn.execute('SELECT COUNT(*) FROM facts.fct_listing_snapshot').fetchone()[0]
    print(f'  ✓ {count:,} listing snapshots')

    # fct_market_metrics from redfin staging
    print('Building fct_market_metrics...')
    conn.execute('DELETE FROM facts.fct_market_metrics')
    conn.execute("""
        INSERT INTO facts.fct_market_metrics
        SELECT
            CAST(strftime(r.period_end::DATE, '%Y%m%d') AS INTEGER) AS period_date_key,
            r.region,
            r.property_type,
            r.median_sale_price,
            r.median_list_price,
            r.median_ppsf,
            r.homes_sold::INTEGER,
            r.new_listings::INTEGER,
            r.inventory::INTEGER,
            r.months_of_supply,
            r.median_dom::INTEGER,
            r.avg_sale_to_list,
            NULL AS price_yoy_change
        FROM staging.stg_redfin_zip r
        WHERE r.period_end IS NOT NULL
        ON CONFLICT DO NOTHING
    """)
    count = conn.execute('SELECT COUNT(*) FROM facts.fct_market_metrics').fetchone()[0]
    print(f'  ✓ {count:,} market metric rows')

    conn.close()
    print('\nFact build complete.')


if __name__ == '__main__':
    main()
