from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from backend.app.database import Base

class SourceProvenance(Base):
    __tablename__ = "source_provenance"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(100), unique=True, index=True, nullable=False)
    source_url = Column(String(500), nullable=False)
    license = Column(String(100), default="MIT")
    file_fingerprint = Column(String(64), nullable=True) # SHA256
    file_size_bytes = Column(Integer, default=0)
    retrieval_timestamp = Column(DateTime, default=datetime.utcnow)
    file_format = Column(String(20), default="CSV")
    schema_fields = Column(JSON, nullable=True)
    raw_record_count = Column(Integer, default=0)
    accepted_record_count = Column(Integer, default=0)
    quarantined_record_count = Column(Integer, default=0)
    ingestion_status = Column(String(50), default="NOT_INGESTED") # NOT_INGESTED, INGESTED, FAILED
    last_processed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    run_id = Column(String(64), primary_key=True, index=True)
    pipeline_name = Column(String(100), nullable=False, index=True)
    trigger_type = Column(String(50), default="MANUAL") # MANUAL, SCHEDULED, REPLAY, BENCHMARK
    status = Column(String(50), default="PENDING") # PENDING, RUNNING, COMPLETED, FAILED, RECOVERED
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, default=0)
    records_in = Column(Integer, default=0)
    records_out = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    execution_steps = Column(JSON, nullable=True) # List of step dicts {name, status, duration_ms, details}
    is_failure_injected = Column(Boolean, default=False)
    recovery_attempted = Column(Boolean, default=False)

class QualityCheckResult(Base):
    __tablename__ = "quality_check_results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(64), index=True, nullable=False)
    rule_id = Column(String(50), index=True, nullable=False)
    rule_name = Column(String(200), nullable=False)
    rule_category = Column(String(50), nullable=False) # COMPLETENESS, UNIQUENESS, VALIDITY, INTEGRITY, RECONCILIATION
    target_entity = Column(String(100), nullable=False)
    severity = Column(String(20), default="ERROR") # ERROR, WARNING, INFO
    status = Column(String(20), nullable=False) # PASSED, FAILED, WARNING
    records_evaluated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    failure_rate = Column(Float, default=0.0)
    rationale = Column(Text, nullable=False)
    failure_sample = Column(JSON, nullable=True)
    evaluated_at = Column(DateTime, default=datetime.utcnow)

class QuarantineRecord(Base):
    __tablename__ = "quarantine_records"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(64), index=True, nullable=False)
    entity_name = Column(String(100), nullable=False, index=True)
    record_identifier = Column(String(200), nullable=False)
    violated_rule = Column(String(100), nullable=False)
    severity = Column(String(20), default="ERROR")
    reason = Column(Text, nullable=False)
    raw_payload = Column(JSON, nullable=False)
    quarantined_at = Column(DateTime, default=datetime.utcnow)
    is_resolved = Column(Boolean, default=False)
    resolution_notes = Column(Text, nullable=True)

class BenchmarkExecution(Base):
    __tablename__ = "benchmark_executions"

    run_id = Column(String(64), primary_key=True, index=True)
    workload_type = Column(String(100), nullable=False) # e.g. "FULL_REFRESH", "INCREMENTAL_MERGE", "DUCKDB_ANALYTICS"
    dataset_records = Column(Integer, default=0)
    dataset_bytes = Column(Integer, default=0)
    execution_time_ms = Column(Integer, default=0)
    throughput_rec_sec = Column(Float, default=0.0)
    memory_peak_mb = Column(Float, default=0.0)
    query_p50_ms = Column(Float, default=0.0)
    query_p95_ms = Column(Float, default=0.0)
    environment_specs = Column(JSON, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="SUCCESS")

class DocumentRecord(Base):
    __tablename__ = "document_records"

    doc_id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    document_category = Column(String(100), default="OPERATIONAL_REPORT", index=True)
    stored_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    file_fingerprint = Column(String(64), nullable=False, index=True) # SHA-256
    mime_type = Column(String(100), default="application/pdf")
    source_url = Column(String(500), nullable=True)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    page_count = Column(Integer, default=0)
    processing_status = Column(String(50), default="READY", index=True) # READY, PROCESSED, FAILED, CORRUPTED, ENCRYPTED, UNSUPPORTED
    extraction_status = Column(String(50), default="PENDING") # PENDING, EXTRACTED, NO_TEXT_FOUND, EXTRACTION_FAILED
    associated_run_id = Column(String(64), nullable=True, index=True)
    validation_results = Column(JSON, nullable=True) # {is_valid, is_encrypted, is_corrupt, error_detail}
    extracted_data = Column(JSON, nullable=True) # {pages: [...], key_fields: {...}, downstream_links: [...]}

class ReportRecord(Base):
    __tablename__ = "report_records"

    report_id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(100), default="COMPREHENSIVE_ENGINEERING_AUDIT", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="COMPLETED", index=True) # GENERATING, COMPLETED, FAILED
    file_path = Column(String(500), nullable=False)
    file_fingerprint = Column(String(64), nullable=False, index=True) # SHA-256
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    sections_included = Column(JSON, nullable=False)
    dataset_fingerprints = Column(JSON, nullable=True)
    parameters = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    doc_id = Column(String(64), nullable=True, index=True) # Reference to DocumentRecord for instant PDF explorer viewing

