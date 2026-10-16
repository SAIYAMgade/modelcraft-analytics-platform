import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal, get_duckdb_conn
from backend.app.models.schema_models import ReportRecord, DocumentRecord
from backend.app.services.report_generator import generate_comprehensive_engineering_report
from backend.app.services.profiler import get_complete_profiling_suite, profile_table

client = TestClient(app)

def test_profiler_suite_execution():
    """Verifies that the data profiler computes genuine statistical metrics from DuckDB."""
    suite = get_complete_profiling_suite()
    assert "tables" in suite
    assert "referential_integrity" in suite
    assert "reconciliation_matrix" in suite
    
    assert len(suite["tables"]) >= 4
    fact_orders_profile = next((t for t in suite["tables"] if t["table_name"] == "fact_orders"), None)
    assert fact_orders_profile is not None
    assert fact_orders_profile["row_count"] == 99441
    assert fact_orders_profile["column_count"] >= 15
    
    # Check referential integrity
    fk_checks = suite["referential_integrity"]
    assert len(fk_checks) >= 4
    assert all(c["status"] == "PASSED" for c in fk_checks)
    
    # Check reconciliation matrix
    rec_matrix = suite["reconciliation_matrix"]
    assert len(rec_matrix) >= 4
    for r in rec_matrix:
        assert r["variance"] == 0 or r["variance"] == 0.0
        assert r["is_reconciled"] is True

def test_generate_comprehensive_report_service():
    """Verifies the multi-page report generator produces a complete 12+ page auditable PDF."""
    result = generate_comprehensive_engineering_report(
        report_title="AUTOMATED TEST COMPREHENSIVE AUDIT"
    )
    assert result["report_id"].startswith("rep_")
    assert result["page_count"] >= 12
    assert result["file_size_bytes"] > 20000
    assert len(result["file_fingerprint"]) == 64
    assert result["doc_id"].startswith("doc_")
    
    # Verify records in database
    db = SessionLocal()
    try:
        rep = db.query(ReportRecord).filter(ReportRecord.report_id == result["report_id"]).first()
        assert rep is not None
        assert rep.title == "AUTOMATED TEST COMPREHENSIVE AUDIT"
        assert rep.page_count >= 12
        assert rep.status == "COMPLETED"
        
        doc = db.query(DocumentRecord).filter(DocumentRecord.doc_id == result["doc_id"]).first()
        assert doc is not None
        assert doc.page_count >= 12
    finally:
        db.close()

def test_generate_custom_sections_report():
    """Verifies generating a targeted subset report with custom section selection."""
    result = generate_comprehensive_engineering_report(
        report_title="FOCUSED RECONCILIATION AUDIT",
        sections_to_include=["section_1", "section_8", "appendices"]
    )
    assert result["page_count"] >= 4
    assert result["page_count"] < 12
    assert result["sections_count"] == 3

def test_api_list_reports():
    """Verifies GET /api/reports returns all recorded audit documents."""
    res = client.get("/api/reports")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "report_id" in data[0]
    assert "page_count" in data[0]
    assert "file_fingerprint" in data[0]

def test_api_generate_report_endpoint():
    """Verifies POST /api/reports/generate triggers end-to-end report compilation."""
    res = client.post("/api/reports/generate", json={
        "title": "API GENERATED QUALITY REPORT",
        "sections": ["section_1", "section_3", "appendices"]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert "report" in data
    assert data["report"]["title"] == "API GENERATED QUALITY REPORT"
    assert data["report"]["page_count"] >= 3

def test_api_get_report_details():
    """Verifies GET /api/reports/{report_id} retrieves accurate report metadata."""
    list_res = client.get("/api/reports")
    reports = list_res.json()
    assert len(reports) > 0
    first_id = reports[0]["report_id"]
    
    res = client.get(f"/api/reports/{first_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["report_id"] == first_id
    assert "page_count" in data
    assert "file_fingerprint" in data
