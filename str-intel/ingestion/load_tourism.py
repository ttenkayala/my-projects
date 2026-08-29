"""
Load tourism demand and neighborhood quality data.
CSV source: data/raw/tourism_demand.csv
"""

import duckdb
import pandas as pd
from pathlib import Path

DB_PATH  = Path(__file__).parent.parent / 'str_intel.db'
DATA_DIR = Path(__file__).parent.parent / 'data' / 'raw'
CSV_PATH = DATA_DIR / 'tourism_demand.csv'


def main():
    if not CSV_PATH.exists():
        print(f'  ⚠  tourism_demand.csv not found — {CSV_PATH}')
        return 0

    print(f'  Loading tourism demand from {CSV_PATH.name}...')
    df = pd.read_csv(CSV_PATH)

    conn = duckdb.connect(str(DB_PATH))
    
    # Remove existing rows and insert
    conn.execute('DELETE FROM staging.stg_tourism_demand')
    conn.execute('INSERT INTO staging.stg_tourism_demand SELECT * FROM df')
    
    count = conn.execute('SELECT COUNT(*) FROM staging.stg_tourism_demand').fetchone()[0]
    print(f'  ✓ Tourism: {count} neighborhoods loaded')
    
    conn.close()
    return count


if __name__ == '__main__':
    main()
