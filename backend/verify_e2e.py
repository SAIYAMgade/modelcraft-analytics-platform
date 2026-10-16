import httpx
import json
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_verification():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    results = {}
    print("=" * 60)
    print("COMMERCEFLOW LIVE E2E VERIFICATION SUITE")
    print("=" * 60)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    results["health"] = res.json()
    print("[PASS] 1. Health check: 200 OK")

    # 2. Overview metrics
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert "business_kpis" in data
    assert "governance" in data
    kpis = data["business_kpis"]
    gov = data["governance"]
    results["overview"] = {
        "total_orders": kpis["total_orders"],
        "total_revenue": kpis["total_observed_sales"],
        "data_quality_pass_rate": gov["quality_score_pct"],
        "last_pipeline_status": gov["last_pipeline_status"]
    }
    print(f"[PASS] 2. Overview: Total Orders={kpis['total_orders']:,}, Revenue=R${kpis['total_observed_sales']:,.2f}, Pass Rate={gov['quality_score_pct']}%")

    # 3. Sources check
    res = client.get("/api/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 8
    total_raw_rows = sum(s["raw_record_count"] for s in sources)
    results["sources"] = {
        "count": len(sources),
        "total_raw_rows": total_raw_rows,
        "files": [s["source_name"] for s in sources]
    }
    print(f"[PASS] 3. Sources: {len(sources)} canonical Olist files verified, Total Raw Records={total_raw_rows:,}")

    # 4. Pipeline runs
    res = client.get("/api/pipelines")
    assert res.status_code == 200
    runs = res.json()
    results["pipelines"] = {
        "total_runs": len(runs),
        "latest_run_id": runs[0]["run_id"] if runs else None,
        "latest_status": runs[0]["status"] if runs else None
    }
    print(f"[PASS] 4. Pipelines: {len(runs)} historical execution runs recorded. Latest Status={results['pipelines']['latest_status']}")

    # 5. Quality checks and Quarantine
    res_q = client.get("/api/quality/rules")
    assert res_q.status_code == 200
    rules = res_q.json()
    res_quar = client.get("/api/quality/quarantine")
    assert res_quar.status_code == 200
    quarantine = res_quar.json()
    results["quality"] = {
        "rules_evaluated": len(rules),
        "quarantined_records": len(quarantine)
    }
    print(f"[PASS] 5. Quality Engine: {len(rules)} validation rules executed across Bronze/Silver/Gold. Quarantined records = {len(quarantine)}")

    # 6. Warehouse Tables and Read-only SQL Runner
    res_tables = client.get("/api/warehouse/tables")
    assert res_tables.status_code == 200
    tables = res_tables.json()
    table_names = [t["table_name"] for t in tables]
    assert "fact_orders" in table_names
    assert "dim_customers" in table_names
    assert "dim_products" in table_names
    assert "mart_daily_sales" in table_names

    # Test read-only SQL execution
    sql_res = client.post("/api/warehouse/query", json={"sql": "SELECT count(*) AS order_count, round(sum(total_payment_value), 2) AS sum_rev FROM fact_orders WHERE order_status = 'delivered'"})
    assert sql_res.status_code == 200
    sql_data = sql_res.json()
    delivered_orders = sql_data["rows"][0][0]
    delivered_rev = sql_data["rows"][0][1]
    results["warehouse"] = {
        "tables_count": len(tables),
        "tables": table_names,
        "delivered_orders_in_dw": delivered_orders,
        "delivered_rev_in_dw": delivered_rev
    }
    print(f"[PASS] 6. Warehouse & SQL Engine: {len(tables)} tables indexed. DuckDB Query Verified: {delivered_orders:,} delivered orders, R${delivered_rev:,.2f}")

    # 7. Analytics Data
    res_sales = client.get("/api/analytics/daily-sales")
    assert res_sales.status_code == 200
    sales = res_sales.json()
    res_cats = client.get("/api/analytics/categories")
    assert res_cats.status_code == 200
    cats = res_cats.json()
    results["analytics"] = {
        "daily_sales_data_points": len(sales),
        "categories_analyzed": len(cats),
        "top_category": cats[0]["category"] if cats else None
    }
    print(f"[PASS] 7. Analytics: {len(sales)} daily sales points, Top Category='{results['analytics']['top_category']}'")

    # 8. Streaming / Event Replay
    res_stream = client.get("/api/streaming/status")
    assert res_stream.status_code == 200
    stream_status = res_stream.json()
    assert "is_running" in stream_status
    assert "replay_speed" in stream_status
    # Test control action
    res_ctrl = client.post("/api/streaming/control", json={"action": "set_speed", "speed": 100})
    assert res_ctrl.status_code == 200
    results["streaming"] = {
        "is_running": stream_status["is_running"],
        "speed": stream_status["replay_speed"],
        "events_processed": stream_status["events_processed"]
    }
    print(f"[PASS] 8. Streaming Engine: is_running={stream_status['is_running']}, Replay Speed={stream_status['replay_speed']}x, Events Processed={stream_status['events_processed']}")

    # 9. Observability & System Metrics
    res_obs = client.get("/api/observability/metrics")
    assert res_obs.status_code == 200
    obs = res_obs.json()
    results["observability"] = {
        "total_runs": obs["total_pipeline_runs"],
        "total_records_processed": obs["total_records_processed"],
        "quarantined_count": obs["total_quarantined_records"]
    }
    print(f"[PASS] 9. Observability: Total Pipeline Runs={obs['total_pipeline_runs']}, Records Processed={obs['total_records_processed']:,}, Quarantined={obs['total_quarantined_records']}")

    # 10. Benchmarks Engine
    res_bench = client.get("/api/benchmarks/history")
    assert res_bench.status_code == 200
    bench = res_bench.json()
    results["benchmarks"] = {
        "runs_count": len(bench),
        "latest_p50_ms": bench[0]["query_p50_ms"] if bench else None,
        "latest_throughput_rec_sec": bench[0]["throughput_rec_sec"] if bench else None
    }
    print(f"[PASS] 10. Benchmarks: {len(bench)} execution runs. Latest P50={results['benchmarks']['latest_p50_ms']} ms, Throughput={results['benchmarks']['latest_throughput_rec_sec']:,} rec/s")

    # 11. PDF Explorer Document Endpoints
    res_docs = client.get("/api/documents")
    assert res_docs.status_code == 200
    docs = res_docs.json()
    assert len(docs) >= 3
    doc0 = docs[0]
    # Check detail endpoint
    res_doc_detail = client.get(f"/api/documents/{doc0['doc_id']}")
    assert res_doc_detail.status_code == 200
    detail = res_doc_detail.json()
    assert "extracted_data" in detail
    assert "page_count" in detail
    # Check file streaming/download
    res_file = client.get(f"/api/documents/{doc0['doc_id']}/file")
    assert res_file.status_code == 200
    assert len(res_file.content) > 1000
    print(f"[PASS] 11. PDF Documents: {len(docs)} documents indexed. First doc '{doc0['filename']}' ({detail['page_count']} pages, {len(detail['extracted_data']['pages'])} pages parsed, {len(res_file.content)} bytes stream)")

    # 12. PDF Upload Tests: Valid Multi-page, Corrupted, and Empty
    # 12a. Valid Multi-page PDF
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    c.drawString(100, 750, "CommerceFlow Ingestion Test Document - Page 1")
    c.drawString(100, 700, "Reference Order ID: 29150127e05858029d3e405d79b7f339")
    c.drawString(100, 650, "Auditor: Antigravity Automated Verification")
    c.showPage()
    c.drawString(100, 750, "CommerceFlow Ingestion Test Document - Page 2")
    c.drawString(100, 700, "Verified delivered order totals and warehouse reconciliation.")
    c.showPage()
    c.save()
    pdf_bytes = pdf_buffer.getvalue()

    upload_res = client.post(
        "/api/documents/upload",
        files={"file": ("live_verification_audit.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_res.status_code == 200
    uploaded_doc = upload_res.json()
    assert uploaded_doc["page_count"] == 2
    assert uploaded_doc["file_fingerprint"] is not None
    print(f"[PASS] 12a. Upload Valid Multi-page PDF: Successfully processed, 2 pages, SHA-256={uploaded_doc['file_fingerprint'][:16]}...")

    # 12b. Empty PDF rejection
    empty_res = client.post(
        "/api/documents/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")}
    )
    assert empty_res.status_code == 400
    print("[PASS] 12b. Upload Empty File: Gracefully rejected with HTTP 400")

    # 12c. Corrupted PDF rejection
    corrupted_res = client.post(
        "/api/documents/upload",
        files={"file": ("corrupted.pdf", b"This is not a real PDF header at all", "application/pdf")}
    )
    assert corrupted_res.status_code == 400
    print("[PASS] 12c. Upload Corrupted File: Gracefully rejected with HTTP 400")

    # 13. Data Reconciliation (Source vs Warehouse vs Dashboard)
    print("\n--- DATA RECONCILIATION AUDIT ---")
    raw_orders_source = [s for s in sources if s["source_name"] == "olist_orders_dataset.csv"][0]
    print(f"1. Raw CSV Source Record Count (olist_orders_dataset.csv): {raw_orders_source['raw_record_count']:,}")
    print(f"2. DuckDB Gold `fact_orders` Count (All Statuses):          {kpis['total_orders']:,}")
    print(f"3. DuckDB Gold `fact_orders` Delivered Orders Count:        {delivered_orders:,}")
    reconciliation_delta = raw_orders_source['raw_record_count'] - kpis['total_orders']
    print(f"Reconciliation Variance: {reconciliation_delta} records (100% matched: {raw_orders_source['raw_record_count'] == kpis['total_orders']})")
    assert raw_orders_source['raw_record_count'] == kpis['total_orders']
    print("[PASS] 13. Data Reconciliation: Perfect 1-to-1 parity between Raw Olist Orders and Warehouse Fact Orders!")

    # 14. Report Center & Multi-Page Document Compilation
    print("\n--- REPORT CENTER MULTI-PAGE AUDIT ---")
    rep_res = client.get("/api/reports")
    assert rep_res.status_code == 200
    existing_reports = rep_res.json()
    assert len(existing_reports) >= 1
    
    # Test generation of custom engineering audit report
    gen_res = client.post("/api/reports/generate", json={
        "title": "E2E VERIFIED PRODUCTION DATA ENGINEERING AUDIT",
        "sections": ["section_1", "section_2", "section_3", "section_4", "section_8", "section_10", "appendices"]
    })
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["status"] == "SUCCESS"
    rep_info = gen_data["report"]
    assert rep_info["page_count"] >= 7
    assert rep_info["file_size_bytes"] > 15000
    assert rep_info["doc_id"] is not None
    
    # Verify report can be streamed as PDF
    doc_file_res = client.get(f"/api/documents/{rep_info['doc_id']}/file")
    assert doc_file_res.status_code == 200
    assert doc_file_res.content.startswith(b"%PDF-")
    print(f"[PASS] 14. Report Center: Compiled multi-page engineering audit ({rep_info['page_count']} pages, {rep_info['file_size_bytes']:,} bytes, SHA-256={rep_info['file_fingerprint'][:16]}...)")

    print("=" * 60)
    print("ALL 14 LIVE END-TO-END SUITE TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_verification()

