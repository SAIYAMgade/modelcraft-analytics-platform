import pytest
from backend.app.services.warehouse import run_full_pipeline, recover_failed_pipeline
from backend.app.database import get_duckdb_conn, SessionLocal
from backend.app.models.schema_models import PipelineRun, QualityCheckResult

def test_full_pipeline_execution():
    """Verify that the full ELT pipeline runs to completion with actual tables populated."""
    result = run_full_pipeline(trigger_type="AUTOMATED_TEST", inject_failure=False)
    assert result["status"] == "COMPLETED"
    assert result["records_in"] > 500000
    assert result["records_out"] > 200000
    assert len(result["steps"]) == 4

    # Verify DuckDB gold fact tables
    conn = get_duckdb_conn()
    orders_count = conn.execute("SELECT COUNT(*) FROM fact_orders").fetchone()[0]
    items_count = conn.execute("SELECT COUNT(*) FROM fact_order_items").fetchone()[0]
    conn.close()

    assert orders_count > 90000
    assert items_count > 100000

def test_controlled_failure_injection_and_recovery():
    """Verify that failure injection is captured, recorded as FAILED, and recovers cleanly."""
    # 1. Trigger deliberate failure
    fail_res = run_full_pipeline(trigger_type="TEST_INJECTED_FAILURE", inject_failure=True)
    assert fail_res["status"] == "FAILED"
    failed_run_id = fail_res["run_id"]
    assert "SIMULATED_DATA_CORRUPTION" in fail_res["error_message"]

    # 2. Verify recorded in database
    db = SessionLocal()
    failed_record = db.query(PipelineRun).filter(PipelineRun.run_id == failed_run_id).first()
    assert failed_record is not None
    assert failed_record.status == "FAILED"
    assert failed_record.is_failure_injected is True
    db.close()

    # 3. Recover safely
    recovery_res = recover_failed_pipeline(failed_run_id)
    assert recovery_res["recovery_status"] == "COMPLETED"

    # 4. Verify previous record has recovery_attempted = True
    db2 = SessionLocal()
    updated_failed_rec = db2.query(PipelineRun).filter(PipelineRun.run_id == failed_run_id).first()
    assert updated_failed_rec.recovery_attempted is True
    db2.close()
