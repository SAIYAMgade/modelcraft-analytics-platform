from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "HEALTHY"

def test_api_overview():
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert "business_kpis" in data
    assert data["business_kpis"]["total_orders"] > 0
    assert "glossary" in data

def test_api_sources():
    res = client.get("/api/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 8
    order_source = next((s for s in sources if s["source_name"] == "olist_orders_dataset.csv"), None)
    assert order_source is not None
    assert order_source["raw_record_count"] == 99441

def test_api_pipelines_list():
    res = client.get("/api/pipelines")
    assert res.status_code == 200
    runs = res.json()
    assert len(runs) > 0

def test_api_quality_rules():
    res = client.get("/api/quality/rules")
    assert res.status_code == 200
    rules = res.json()
    assert len(rules) == 10
    assert any(r["rule_id"] == "QC_001_ORDER_PK_UNIQUENESS" for r in rules)

def test_api_warehouse_tables():
    res = client.get("/api/warehouse/tables")
    assert res.status_code == 200
    tables = res.json()
    table_names = [t["table_name"] for t in tables]
    assert "fact_orders" in table_names
    assert "dim_products" in table_names
    assert "mart_daily_sales" in table_names

def test_api_warehouse_query_sanitization():
    # Valid SELECT query
    res = client.post("/api/warehouse/query", json={"sql": "SELECT COUNT(*) FROM fact_orders"})
    assert res.status_code == 200
    assert res.json()["returned_rows"] == 1

    # Disallowed DROP statement
    res_drop = client.post("/api/warehouse/query", json={"sql": "DROP TABLE fact_orders"})
    assert res_drop.status_code == 400
    assert "Only SELECT queries are allowed" in res_drop.json()["detail"]

def test_api_analytics_endpoints():
    res_daily = client.get("/api/analytics/daily-sales")
    assert res_daily.status_code == 200
    assert len(res_daily.json()) > 100

    res_cat = client.get("/api/analytics/categories?limit=5")
    assert res_cat.status_code == 200
    assert len(res_cat.json()) == 5

    res_pay = client.get("/api/analytics/payments")
    assert res_pay.status_code == 200
    assert len(res_pay.json()) >= 3

def test_api_streaming_controls():
    res_status = client.get("/api/streaming/status")
    assert res_status.status_code == 200

    # Start replay with 500x speed
    res_start = client.post("/api/streaming/control", json={"action": "start", "speed": 500})
    assert res_start.status_code == 200
    assert res_start.json()["is_running"] is True

    # Pause replay
    res_pause = client.post("/api/streaming/control", json={"action": "pause"})
    assert res_pause.status_code == 200
    assert res_pause.json()["is_paused"] is True

    # Reset replay
    res_reset = client.post("/api/streaming/control", json={"action": "reset"})
    assert res_reset.status_code == 200
    assert res_reset.json()["is_running"] is False

def test_api_benchmarks():
    res = client.get("/api/benchmarks/history")
    assert res.status_code == 200
    assert len(res.json()) > 0
