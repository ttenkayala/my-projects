import pandas as pd
from fastapi.testclient import TestClient

from api.main import app
from ingestion.load_airbnb import fill_missing_market_prices

client = TestClient(app)


def test_healthz():
    response = client.get('/healthz')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_markets_endpoint_returns_rows():
    response = client.get('/markets', params={'limit': 5})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    if data:
        assert 'source_market' in data[0]
        assert 'investment_score' in data[0]


def test_listing_detail_endpoint_returns_listing_rows():
    response = client.get('/listing-detail', params={'limit': 5})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    if data:
        assert 'listing_id' in data[0]
        assert 'room_type' in data[0]
        assert 'nightly_price' in data[0]


def test_listing_poi_endpoint_returns_proximity_rows():
    response = client.get('/listing-poi', params={'limit': 5})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    if data:
        assert 'listing_id' in data[0]
        assert 'nearest_attraction' in data[0]
        assert 'distance_to_attraction_mi' in data[0]


def test_fill_missing_market_prices_uses_realistic_variation():
    df = pd.DataFrame({
        'room_type': ['Entire home/apt', 'Entire home/apt', 'Private room', 'Private room', 'Hotel room'],
        'price': [None, None, None, None, None],
    })

    filled = fill_missing_market_prices(df.copy(), 'los-angeles')

    assert filled['price'].notna().all()
    assert filled['price'].nunique() > 2
    assert filled['price'].min() > 0
