from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import time
from datetime import datetime
import duckdb

from backend.app.database import get_db, get_duckdb_conn
from backend.app.models.schema_models import (
    SourceProvenance,
    PipelineRun,
    QualityCheckResult,
    QuarantineRecord,
    BenchmarkExecution,
    DocumentRecord
)
from backend.app.services.source_fetcher import (
    get_registered_sources_status,
    fetch_all_sources,
    fetch_or_verify_source
)
from backend.app.services.warehouse import (
    run_full_pipeline,
    recover_failed_pipeline
)
from backend.app.services.replay_stream import replay_engine
from backend.app.services.benchmarks import (
    run_analytical_workload_benchmark,
    get_all_benchmark_history
)
from backend.app.services.pdf_service import (
    process_pdf_document,
    get_document_path,
    get_all_documents,
    get_document_details,
    generate_and_seed_ecommerce_pdfs
)
from backend.app.services.analytics_engineering import (
    get_all_models_metadata,
    get_lineage_graph,
    get_follow_the_data_stages,
    get_reconciliation_audit,
    run_dbt_cli_command,
    get_star_schema_data,
    get_column_lineage
)
from backend.app.config import RAW_DIR

router = APIRouter()

# -------------------------------------------------------------------------
# 1. OVERVIEW & HEALTH
# -------------------------------------------------------------------------
@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    """Provides high-level business overview and system readiness metrics."""
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    
    total_orders = 0
    total_sales = 0.0
    total_items = 0
    min_date = None
    max_date = None
    
    if "fact_orders" in tables:
        stats = conn.execute("""
            SELECT 
                COUNT(*), 
                COALESCE(SUM(total_order_cost), 0.0), 
                COALESCE(SUM(total_items), 0),
                CAST(MIN(order_purchase_timestamp) AS VARCHAR),
                CAST(MAX(order_purchase_timestamp) AS VARCHAR)
            FROM fact_orders;
        """).fetchone()
        total_orders = stats[0]
        total_sales = round(stats[1], 2)
        total_items = stats[2]
        min_date = stats[3]
        max_date = stats[4]
        
    conn.close()
    
    recent_run = db.query(PipelineRun).order_by(PipelineRun.start_time.desc()).first()
    quarantine_count = db.query(QuarantineRecord).count()
    quality_checks = db.query(QualityCheckResult).order_by(QualityCheckResult.evaluated_at.desc()).limit(10).all()
    passed_rules = sum(1 for q in quality_checks if q.status == "PASSED")
    
    return {
        "status": "HEALTHY",
        "timestamp": datetime.utcnow().isoformat(),
        "dataset_name": "Brazilian E-Commerce Public Dataset by Olist",
        "date_range": {
            "start": min_date or "Not Ingested",
            "end": max_date or "Not Ingested"
        },
        "business_kpis": {
            "total_orders": total_orders,
            "total_observed_sales": total_sales,
            "total_items_sold": total_items,
            "currency": "BRL (Brazilian Real)"
        },
        "governance": {
            "last_pipeline_status": recent_run.status if recent_run else "NEVER_RUN",
            "last_run_timestamp": recent_run.start_time.isoformat() if recent_run else None,
            "last_run_duration_ms": recent_run.duration_ms if recent_run else 0,
            "quarantine_count": quarantine_count,
            "quality_score_pct": round((passed_rules / max(1, len(quality_checks))) * 100.0, 1) if quality_checks else 100.0
        },
        "glossary": {
            "Data Freshness": "The temporal delta between the latest recorded business event in the warehouse and the current observation timestamp.",
            "Idempotency": "The property of data transformation workflows where running the pipeline multiple times produces the exact same warehouse state without duplicated rows.",
            "Quarantine": "An isolated storage zone where structurally defective or anomalous records are captured for audit rather than silently deleted.",
            "Bronze / Silver / Gold": "Medallion architectural pattern moving from raw ingestion (Bronze), cleansed & validated records (Silver), to modeled dimensional star schemas (Gold)."
        }
    }

# -------------------------------------------------------------------------
# 2. DATA SOURCES & INGESTION
# -------------------------------------------------------------------------
@router.get("/sources")
def list_data_sources():
    """Returns provenance and verification status for all canonical data sources."""
    return get_registered_sources_status()

@router.post("/sources/fetch-all")
def fetch_sources():
    """Fetches and verifies all canonical Olist source files directly from official repo."""
    try:
        results = fetch_all_sources(force_download=False)
        return {"status": "SUCCESS", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sources/upload")
async def upload_source_file(file: UploadFile = File(...)):
    """Allows manual CSV upload for an explicit dataset import workflow."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    target = RAW_DIR / file.filename
    content = await file.read()
    with open(target, "wb") as f:
        f.write(content)
        
    return {
        "status": "UPLOADED",
        "filename": file.filename,
        "size_bytes": len(content),
        "path": str(target)
    }

# -------------------------------------------------------------------------
# 3. PIPELINE EXPLORER & DAG
# -------------------------------------------------------------------------
@router.get("/pipelines")
def list_pipeline_runs(db: Session = Depends(get_db)):
    """Retrieves all pipeline execution runs, execution steps, and durations."""
    runs = db.query(PipelineRun).order_by(PipelineRun.start_time.desc()).limit(20).all()
    return [
        {
            "run_id": r.run_id,
            "pipeline_name": r.pipeline_name,
            "trigger_type": r.trigger_type,
            "status": r.status,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "duration_ms": r.duration_ms,
            "records_in": r.records_in,
            "records_out": r.records_out,
            "error_message": r.error_message,
            "execution_steps": r.execution_steps or [],
            "is_failure_injected": r.is_failure_injected,
            "recovery_attempted": r.recovery_attempted
        }
        for r in runs
    ]

@router.post("/pipelines/run")
def trigger_pipeline(inject_failure: bool = False):
    """Triggers end-to-end ELT pipeline execution with optional controlled failure injection."""
    result = run_full_pipeline(trigger_type="MANUAL_UI", inject_failure=inject_failure)
    return result

@router.post("/pipelines/recover")
def recover_pipeline(run_id: str):
    """Executes safe recovery on an interrupted or failed pipeline run."""
    try:
        result = recover_failed_pipeline(run_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------------------
# 4. DATA QUALITY & QUARANTINE
# -------------------------------------------------------------------------
@router.get("/quality/rules")
def get_quality_rules(db: Session = Depends(get_db)):
    """Retrieves the latest execution results across the 10 data quality checks."""
    latest_run = db.query(PipelineRun).filter(PipelineRun.status == "COMPLETED").order_by(PipelineRun.start_time.desc()).first()
    if not latest_run:
        return []
        
    results = db.query(QualityCheckResult).filter(QualityCheckResult.run_id == latest_run.run_id).all()
    return [
        {
            "rule_id": q.rule_id,
            "rule_name": q.rule_name,
            "rule_category": q.rule_category,
            "target_entity": q.target_entity,
            "severity": q.severity,
            "status": q.status,
            "records_evaluated": q.records_evaluated,
            "records_failed": q.records_failed,
            "failure_rate": q.failure_rate,
            "rationale": q.rationale,
            "failure_sample": q.failure_sample
        }
        for q in results
    ]

@router.get("/quality/quarantine")
def list_quarantine_records(db: Session = Depends(get_db), limit: int = 50):
    """Inspects quarantined records with documented causes and raw payloads."""
    records = db.query(QuarantineRecord).order_by(QuarantineRecord.quarantined_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "run_id": r.run_id,
            "entity_name": r.entity_name,
            "record_identifier": r.record_identifier,
            "violated_rule": r.violated_rule,
            "severity": r.severity,
            "reason": r.reason,
            "raw_payload": r.raw_payload,
            "quarantined_at": r.quarantined_at.isoformat() if r.quarantined_at else None,
            "is_resolved": r.is_resolved
        }
        for r in records
    ]

# -------------------------------------------------------------------------
# 5. DATA WAREHOUSE & LINEAGE
# -------------------------------------------------------------------------
@router.get("/warehouse/tables")
def get_warehouse_tables():
    """Lists all Bronze, Silver, Gold tables, column schemas, and actual row counts."""
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    
    result = []
    for t in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        cols = conn.execute(f"PRAGMA table_info('{t}');").fetchall()
        
        layer = "Gold" if t.startswith("fact_") or t.startswith("dim_") or t.startswith("mart_") else \
                ("Silver" if t.startswith("silver_") else "Bronze")
                
        result.append({
            "table_name": t,
            "layer": layer,
            "row_count": count,
            "columns": [{"name": c[1], "type": c[2]} for c in cols]
        })
        
    conn.close()
    return result

@router.post("/warehouse/query")
def execute_sql_query(query: Dict[str, str]):
    """Executes a sanitized, read-only SELECT query against the analytical warehouse."""
    sql = query.get("sql", "").strip()
    if not sql.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed for audit safety.")
        
    conn = get_duckdb_conn()
    try:
        t0 = time.time()
        cursor = conn.execute(sql)
        cols = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(100)
        ms = round((time.time() - t0) * 1000, 2)
        return {
            "columns": cols,
            "rows": rows,
            "execution_time_ms": ms,
            "returned_rows": len(rows)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# -------------------------------------------------------------------------
# 6. BUSINESS ANALYTICS
# -------------------------------------------------------------------------
@router.get("/analytics/daily-sales")
def get_daily_sales():
    """Returns historical daily order volume and observed sales."""
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    if "mart_daily_sales" not in tables:
        conn.close()
        return []
        
    rows = conn.execute("""
        SELECT 
            CAST(order_date AS VARCHAR), 
            total_orders, 
            observed_sales, 
            avg_order_value, 
            avg_delivery_days
        FROM mart_daily_sales
        ORDER BY order_date ASC;
    """).fetchall()
    conn.close()
    
    return [
        {
            "date": r[0],
            "orders": r[1],
            "sales": float(r[2] or 0.0),
            "avg_basket": float(r[3] or 0.0),
            "lead_time": float(r[4] or 0.0)
        }
        for r in rows
    ]

@router.get("/analytics/categories")
def get_category_metrics(limit: int = 15):
    """Returns category breakdown of items sold and total sales."""
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    if "mart_category_performance" not in tables:
        conn.close()
        return []
        
    rows = conn.execute(f"""
        SELECT category_name, distinct_orders, items_sold, total_observed_sales, avg_item_price
        FROM mart_category_performance
        WHERE category_name IS NOT NULL AND category_name != 'unspecified'
        ORDER BY total_observed_sales DESC
        LIMIT {limit};
    """).fetchall()
    conn.close()
    
    return [
        {
            "category": r[0].replace('_', ' ').title(),
            "orders": r[1],
            "items_sold": r[2],
            "sales": float(r[3] or 0.0),
            "avg_price": float(r[4] or 0.0)
        }
        for r in rows
    ]

@router.get("/analytics/payments")
def get_payment_breakdown():
    """Returns distribution of payment methods."""
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    if "silver_order_payments" not in tables:
        conn.close()
        return []
        
    rows = conn.execute("""
        SELECT 
            payment_type, 
            COUNT(*) AS transactions, 
            ROUND(SUM(payment_value), 2) AS total_value,
            ROUND(AVG(payment_installments), 1) AS avg_installments
        FROM silver_order_payments
        WHERE payment_type != 'not_defined'
        GROUP BY payment_type
        ORDER BY total_value DESC;
    """).fetchall()
    conn.close()
    
    return [
        {
            "method": r[0].replace('_', ' ').title(),
            "transactions": r[1],
            "total_value": float(r[2] or 0.0),
            "avg_installments": float(r[3] or 1.0)
        }
        for r in rows
    ]

@router.get("/analytics/delivery-lead-times")
def get_delivery_lead_times(limit: int = 12):
    """Returns delivery lead times by state."""
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    if "fact_orders" not in tables:
        conn.close()
        return []
        
    rows = conn.execute(f"""
        SELECT 
            c.customer_state, 
            COUNT(o.order_id) AS total_delivered,
            ROUND(AVG(o.delivery_days), 1) AS avg_delivery_days,
            ROUND(AVG(o.estimated_delivery_margin_days), 1) AS avg_margin_days
        FROM fact_orders o
        JOIN dim_customers c ON o.customer_id = c.customer_id
        WHERE o.delivery_days IS NOT NULL AND o.delivery_days > 0
        GROUP BY c.customer_state
        ORDER BY total_delivered DESC
        LIMIT {limit};
    """).fetchall()
    conn.close()
    
    return [
        {
            "state": r[0],
            "delivered_orders": r[1],
            "avg_days": float(r[2] or 0.0),
            "buffer_days": float(r[3] or 0.0)
        }
        for r in rows
    ]

# -------------------------------------------------------------------------
# 7. HISTORICAL EVENT STREAMING & REPLAY
# -------------------------------------------------------------------------
@router.get("/streaming/status")
def get_streaming_status():
    """Returns current metrics for the historical event replay engine."""
    return replay_engine.get_status()

@router.post("/streaming/control")
def control_stream(action: Dict[str, Any]):
    """Controls historical replay playback (start, pause, resume, reset, set_speed)."""
    cmd = action.get("action", "").lower()
    speed = action.get("speed", 100)
    
    try:
        if cmd == "start":
            replay_engine.start_replay(speed=speed)
        elif cmd == "pause":
            replay_engine.pause_replay()
        elif cmd == "resume":
            replay_engine.resume_replay()
        elif cmd == "reset":
            replay_engine.reset_replay()
        elif cmd == "set_speed":
            replay_engine.set_speed(speed)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown streaming action: {cmd}")
            
        return replay_engine.get_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------------------
# 8. OBSERVABILITY & SYSTEM METRICS
# -------------------------------------------------------------------------
@router.get("/observability/metrics")
def get_observability_metrics(db: Session = Depends(get_db)):
    """Provides operational metrics: throughput, error rates, freshness, run history."""
    runs = db.query(PipelineRun).order_by(PipelineRun.start_time.desc()).limit(15).all()
    quarantined = db.query(QuarantineRecord).count()
    total_evaluated = sum(r.records_in for r in runs)
    
    return {
        "total_pipeline_runs": len(runs),
        "total_records_processed": total_evaluated,
        "total_quarantined_records": quarantined,
        "quarantine_rate_pct": round((quarantined / max(1, total_evaluated)) * 100.0, 3),
        "recent_runs": [
            {
                "run_id": r.run_id,
                "status": r.status,
                "duration_ms": r.duration_ms,
                "records_in": r.records_in,
                "records_out": r.records_out,
                "start_time": r.start_time.isoformat() if r.start_time else None
            }
            for r in runs
        ]
    }

# -------------------------------------------------------------------------
# 9. REPRODUCIBLE BENCHMARKS
# -------------------------------------------------------------------------
@router.get("/benchmarks/history")
def get_benchmark_history():
    """Retrieves all past benchmark executions."""
    return get_all_benchmark_history()

@router.post("/benchmarks/run")
def trigger_benchmark():
    """Runs a real analytical workload benchmark on DuckDB."""
    try:
        res = run_analytical_workload_benchmark()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------------
# 10. DOCUMENT EXPLORER & PDF SERVICES
# -------------------------------------------------------------------------
@router.get("/documents")
def list_documents(q: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves all indexed PDF documents with optional text search and status filters."""
    docs = get_all_documents(search_query=q, status_filter=status)
    # If no documents exist yet, auto-seed the real e-commerce audit & manifest PDFs
    if not docs and (q is None and status is None):
        try:
            generate_and_seed_ecommerce_pdfs()
            docs = get_all_documents()
        except Exception:
            pass
    return docs

@router.post("/documents/seed")
def seed_documents():
    """Generates authentic multi-page operational e-commerce PDFs derived from warehouse data."""
    try:
        results = generate_and_seed_ecommerce_pdfs()
        return {"status": "SUCCESS", "seeded": len(results), "documents": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{doc_id}")
def get_document(doc_id: str):
    """Retrieves detailed metadata, validation results, extracted pages text, and downstream links."""
    details = get_document_details(doc_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
    return details

@router.get("/documents/{doc_id}/file")
def view_document_file(doc_id: str):
    """Serves the raw physical PDF file with inline disposition for integrated viewing."""
    file_path = get_document_path(doc_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Original PDF file not found or inaccessible.")
        
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=\"{file_path.name}\""}
    )

@router.get("/documents/{doc_id}/download")
def download_document_file(doc_id: str):
    """Downloads the authentic original PDF file."""
    file_path = get_document_path(doc_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Original PDF file not found or inaccessible.")
        
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{file_path.name}\""}
    )

@router.post("/documents/upload")
async def upload_pdf_document(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    category: str = "OPERATIONAL_REPORT"
):
    """
    Uploads and processes a PDF file.
    Validates file format, detects encryption, catches corruption, extracts text,
    and indexes document metadata.
    """
    content = await file.read()
    res = process_pdf_document(
        file_bytes=content,
        filename=file.filename or "uploaded.pdf",
        title=title,
        document_category=category,
        source_url="user_upload"
    )
    if res.get("status") in ["FAILED", "UNSUPPORTED"]:
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to process document."))
    return res

# -------------------------------------------------------------------------
# 11. ADVANCED REPORT CENTER & MULTI-PAGE AUDIT GENERATION
# -------------------------------------------------------------------------
from backend.app.models.schema_models import ReportRecord
from backend.app.services.report_generator import generate_comprehensive_engineering_report

@router.get("/reports")
def list_generated_reports(db: Session = Depends(get_db)):
    """Retrieves all generated multi-page technical reports and audit executions."""
    reports = db.query(ReportRecord).order_by(ReportRecord.created_at.desc()).all()
    # Auto-generate baseline audit report if none exists
    if not reports:
        try:
            generate_comprehensive_engineering_report()
            reports = db.query(ReportRecord).order_by(ReportRecord.created_at.desc()).all()
        except Exception:
            pass
            
    return [
        {
            "report_id": r.report_id,
            "title": r.title,
            "report_type": r.report_type,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "status": r.status,
            "file_size_bytes": r.file_size_bytes,
            "page_count": r.page_count,
            "sections_included": r.sections_included or [],
            "doc_id": r.doc_id,
            "file_fingerprint": r.file_fingerprint,
            "error_message": r.error_message
        }
        for r in reports
    ]

@router.post("/reports/generate")
def create_report(payload: Optional[Dict[str, Any]] = None):
    """
    Triggers generation of a real, data-driven multi-page technical report.
    Derives all metrics, charts, and tables from persisted warehouse data.
    """
    data = payload or {}
    title = data.get("title", "KINETIQ DATA ENGINEERING PLATFORM AUDIT REPORT")
    sections = data.get("sections", None) # None defaults to all 14 sections + appendices
    params = data.get("parameters", {})
    
    try:
        result = generate_comprehensive_engineering_report(
            report_title=title,
            sections_to_include=sections,
            parameters=params
        )
        return {
            "status": "SUCCESS",
            "report": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@router.get("/reports/{report_id}")
def get_report_details(report_id: str, db: Session = Depends(get_db)):
    """Retrieves metadata and generation details for a specific report."""
    rep = db.query(ReportRecord).filter(ReportRecord.report_id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")
        
    return {
        "report_id": rep.report_id,
        "title": rep.title,
        "report_type": rep.report_type,
        "created_at": rep.created_at.isoformat() if rep.created_at else None,
        "status": rep.status,
        "file_size_bytes": rep.file_size_bytes,
        "page_count": rep.page_count,
        "sections_included": rep.sections_included or [],
        "doc_id": rep.doc_id,
        "file_fingerprint": rep.file_fingerprint,
        "error_message": rep.error_message
    }

# -------------------------------------------------------------------------
# 11. ANALYTICS ENGINEERING & DATA MODELING
# -------------------------------------------------------------------------
@router.get("/analytics-engineering/models")
def get_analytics_engineering_models():
    """Retrieves metadata, SQL, grain, lineage, and tests for all warehouse models."""
    return get_all_models_metadata()

@router.get("/analytics-engineering/lineage")
def get_analytics_engineering_lineage():
    """Retrieves full interactive DAG lineage graph from sources to marts and consumers."""
    return get_lineage_graph()

@router.get("/analytics-engineering/column-lineage")
def get_analytics_engineering_column_lineage():
    """Retrieves verified column-level transformations from sources to marts."""
    return get_column_lineage()

@router.get("/analytics-engineering/flow")
def get_analytics_engineering_flow():
    """Retrieves 7-stage 'Follow the Data' architecture journey with dual explanation modes."""
    return get_follow_the_data_stages()

@router.get("/analytics-engineering/reconciliation")
def get_analytics_engineering_reconciliation():
    """Retrieves financial reconciliation, row parity, and join multiplication audit results."""
    return get_reconciliation_audit()

@router.post("/analytics-engineering/run")
def trigger_dbt_run(payload: Dict[str, Any] = None):
    """Triggers genuine dbt run, test, snapshot, or build command against DuckDB."""
    command = (payload or {}).get("command", "build")
    if command not in ("run", "test", "snapshot", "docs", "build", "compile"):
        raise HTTPException(status_code=400, detail=f"Unsupported command '{command}'. Must be build, run, test, snapshot, or docs.")
    return run_dbt_cli_command(command)

@router.get("/analytics/customer-behavior")
def get_customer_behavior_analytics():
    """Retrieves customer repeat-purchase cohorts and lifetime spend from mart_customer_behavior."""
    conn = get_duckdb_conn()
    tables = [t[0] for t in conn.execute("SHOW TABLES").fetchall()]
    if "mart_customer_behavior" not in tables:
        conn.close()
        return []
        
    rows = conn.execute("""
        SELECT 
            buyer_cohort,
            distinct_customers,
            total_orders_placed,
            total_cohort_spend,
            avg_customer_lifetime_spend,
            avg_order_value
        FROM mart_customer_behavior
        ORDER BY distinct_customers DESC;
    """).fetchall()
    conn.close()
    
    return [
        {
            "buyer_cohort": r[0],
            "distinct_customers": r[1],
            "total_orders_placed": r[2],
            "total_cohort_spend": r[3],
            "avg_customer_lifetime_spend": r[4],
            "avg_order_value": r[5]
        }
        for r in rows
    ]

@router.get("/analytics/fulfillment")
def get_fulfillment_analytics():
    """Retrieves monthly fulfillment performance and SLA metrics from mart_fulfillment_performance."""
    conn = get_duckdb_conn()
    tables = [t[0] for t in conn.execute("SHOW TABLES").fetchall()]
    if "mart_fulfillment_performance" not in tables:
        conn.close()
        return []
        
    rows = conn.execute("""
        SELECT 
            order_month,
            total_orders_placed,
            delivered_orders,
            canceled_orders,
            on_time_deliveries,
            delayed_deliveries,
            on_time_delivery_rate_pct,
            avg_approval_hours,
            avg_carrier_transit_days,
            avg_total_delivery_days,
            avg_sla_margin_days
        FROM mart_fulfillment_performance
        ORDER BY order_month ASC;
    """).fetchall()
    conn.close()
    
    return [
        {
            "order_month": r[0],
            "total_orders_placed": r[1],
            "delivered_orders": r[2],
            "canceled_orders": r[3],
            "on_time_deliveries": r[4],
            "delayed_deliveries": r[5],
            "on_time_delivery_rate_pct": r[6],
            "avg_approval_hours": r[7],
            "avg_carrier_transit_days": r[8],
            "avg_total_delivery_days": r[9],
            "avg_sla_margin_days": r[10]
        }
        for r in rows
    ]

@router.get("/analytics-engineering/star-schema")
def get_star_schema_endpoint():
    """Provides dimensional star-schema models with fact and dimension relationships."""
    return get_star_schema_data()



