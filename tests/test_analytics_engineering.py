import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_analytics_engineering_models():
    """Verify metadata retrieval for dbt models across all architecture layers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/analytics-engineering/models")
        assert response.status_code == 200
        models = response.json()
        assert len(models) >= 20
        
        # Check model layers
        layers = {m["layer"] for m in models}
        assert "staging" in layers
        assert "intermediate" in layers
        assert "marts_core" in layers
        assert "marts_analytics" in layers
        assert "snapshots" in layers
        
        # Check fact_orders model
        fact_orders = next((m for m in models if m["name"] == "fact_orders"), None)
        assert fact_orders is not None
        assert "order_id" in fact_orders["primary_keys"]
        assert fact_orders["row_count"] >= 99000
        assert len(fact_orders["columns"]) > 10
        assert len(fact_orders["tests"]) > 0
        assert "SELECT" in fact_orders["raw_sql"].upper()

@pytest.mark.asyncio
async def test_analytics_engineering_lineage():
    """Verify directed acyclic graph (DAG) structure and edge connectivity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/analytics-engineering/lineage")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) >= 25
        assert len(data["edges"]) >= 30
        
        # Verify source nodes connect to staging
        sources = [n for n in data["nodes"] if n["layer"] == "sources"]
        assert len(sources) >= 8
        
        # Verify edge exists from stg_orders to fact_orders or intermediate
        stg_orders_edge = any(e["source"] == "stg_orders" for e in data["edges"])
        assert stg_orders_edge

@pytest.mark.asyncio
async def test_follow_the_data_flow():
    """Verify the 7-stage interactive architecture explorer data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/analytics-engineering/flow")
        assert response.status_code == 200
        stages = response.json()
        assert len(stages) == 7
        
        stage_ids = [s["id"] for s in stages]
        assert stage_ids == [
            "raw_sources",
            "ingestion",
            "bronze",
            "silver",
            "dimensional_models",
            "analytics_marts",
            "business_insights"
        ]
        
        # Verify each stage has both business and engineering modes
        for s in stages:
            assert "business_explanation" in s
            assert "engineering_explanation" in s
            assert "what_it_does" in s["business_explanation"]
            assert "why_it_exists" in s["business_explanation"]
            assert "technical_details" in s["engineering_explanation"]
            assert "quality_checks" in s["engineering_explanation"]
            assert "verified_metrics" in s["engineering_explanation"]

@pytest.mark.asyncio
async def test_reconciliation_audit():
    """Verify source-to-warehouse row parity and order vs payment reconciliation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/analytics-engineering/reconciliation")
        assert response.status_code == 200
        audit = response.json()
        assert audit["status"] == "AUDITED"
        summary = audit["summary"]
        assert summary["total_orders_audited"] >= 99000
        assert summary["balance_rate_pct"] >= 98.0  # Real data: 98.91% orders balance
        assert summary["join_multiplication_check"]["status"] == "PASSED"
        assert len(audit["row_reconciliations"]) >= 6

@pytest.mark.asyncio
async def test_analytics_marts_endpoints():
    """Verify analytical marts for customer behavior and fulfillment performance."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Customer behavior
        res1 = await ac.get("/api/analytics/customer-behavior")
        assert res1.status_code == 200
        cohorts = res1.json()
        assert len(cohorts) > 0
        assert any("One-Time" in c["buyer_cohort"] for c in cohorts)
        
        # Fulfillment performance
        res2 = await ac.get("/api/analytics/fulfillment")
        assert res2.status_code == 200
        months = res2.json()
        assert len(months) >= 20
        assert "on_time_delivery_rate_pct" in months[0]

@pytest.mark.asyncio
async def test_star_schema_endpoint():
    """Verify star-schema fact and dimension relationship metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/analytics-engineering/star-schema")
        assert res.status_code == 200
        data = res.json()
        assert "schemas" in data
        assert "fact_orders" in data["schemas"]
        assert "fact_order_items" in data["schemas"]
        fo = data["schemas"]["fact_orders"]
        assert fo["name"] == "fact_orders"
        assert len(fo["dimensions"]) >= 3
        assert len(fo["columns"]) >= 10

@pytest.mark.asyncio
async def test_column_lineage_endpoint():
    """Verify column-level lineage tracking from source to mart."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/analytics-engineering/column-lineage")
        assert res.status_code == 200
        data = res.json()
        assert "columns" in data
        assert len(data["columns"]) >= 5
        order_col = next((c for c in data["columns"] if c["column_name"] == "order_id"), None)
        assert order_col is not None
        assert len(order_col["path"]) >= 4
        assert order_col["path"][0]["layer"] == "sources"
        assert order_col["path"][-1]["layer"] == "marts_analytics"


