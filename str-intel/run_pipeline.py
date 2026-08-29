"""
STR Intel — Pipeline Runner
Builds schema, runs ingestion, transforms to facts and marts.
"""

import duckdb
import subprocess
import sys
from pathlib import Path

DB_PATH  = Path(__file__).parent / 'str_intel.db'
SQL_DIR  = Path(__file__).parent / 'sql'
ING_DIR  = Path(__file__).parent / 'ingestion'
PYTHON   = sys.executable


def run_sql(conn, sql_file):
    sql = (SQL_DIR / sql_file).read_text()
    # Execute statement by statement
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if stmt:
            try:
                conn.execute(stmt)
            except Exception as e:
                print(f'  ERROR in {sql_file}: {e}')
                raise
    print(f'  ✓ {sql_file}')


def run_script(script):
    path = ING_DIR / script
    print(f'\n{"="*50}')
    print(f'Running: {script}')
    print('='*50)
    result = subprocess.run([PYTHON, str(path)])
    if result.returncode != 0:
        print(f'  ⚠  {script} exited with code {result.returncode}')


def main():
    print('╔══════════════════════════════════════╗')
    print('║     STR Intel — Pipeline Runner      ║')
    print('╚══════════════════════════════════════╝\n')

    conn = duckdb.connect(str(DB_PATH))

    print('=== Step 1: Building Schema ===')
    for sql_file in sorted(SQL_DIR.glob('*.sql')):
        run_sql(conn, sql_file.name)
    conn.close()

    print('\n=== Step 2: Ingestion ===')
    run_script('load_airbnb.py')
    run_script('load_redfin.py')
    run_script('load_tourism.py')

    print('\n=== Step 3: Build Facts ===')
    run_script('build_facts.py')

    # Summary
    conn = duckdb.connect(str(DB_PATH))
    print('\n=== Summary ===')
    for table in ['facts.fct_listing_snapshot', 'facts.fct_market_metrics']:
        count = conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        print(f'  {table}: {count:,} rows')
    scorecard = conn.execute('SELECT COUNT(*) FROM marts.mart_market_scorecard').fetchone()[0]
    print(f'  marts.mart_market_scorecard: {scorecard:,} markets scored')
    conn.close()

    print('\n✓ Pipeline complete. Database:', DB_PATH)
    print('\nQuery with:')
    print(f'  duckdb {DB_PATH}')
    print('  SELECT * FROM marts.mart_market_scorecard ORDER BY investment_score DESC LIMIT 10;')


if __name__ == '__main__':
    main()
