import os
import hashlib
import urllib.request
import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.app.config import RAW_DIR, OLIST_FILES
from backend.app.database import SessionLocal
from backend.app.models.schema_models import SourceProvenance

def calculate_sha256(filepath: Path) -> str:
    """Calculate SHA256 fingerprint for data integrity verification."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def inspect_csv_schema(filepath: Path) -> Dict[str, Any]:
    """Inspect CSV columns, sample types, and record count."""
    row_count = 0
    headers = []
    sample_rows = []
    
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            return {"columns": [], "row_count": 0, "sample": []}
            
        for i, row in enumerate(reader):
            row_count += 1
            if i < 3:
                sample_rows.append(row)
                
    return {
        "columns": headers,
        "row_count": row_count,
        "sample": sample_rows
    }

def fetch_or_verify_source(file_name: str, force_download: bool = False) -> Dict[str, Any]:
    """
    Downloads or verifies a single dataset file from the official Olist repository.
    Ensures traceable source provenance and records metadata into the provenance registry.
    """
    if file_name not in OLIST_FILES:
        raise ValueError(f"Unknown source file: {file_name}")
        
    cfg = OLIST_FILES[file_name]
    target_path = RAW_DIR / file_name
    
    db = SessionLocal()
    try:
        prov = db.query(SourceProvenance).filter(SourceProvenance.source_name == file_name).first()
        if not prov:
            prov = SourceProvenance(
                source_name=file_name,
                source_url=cfg["url"],
                license="MIT",
                file_format="CSV",
                notes=cfg["description"],
                ingestion_status="NOT_INGESTED"
            )
            db.add(prov)
            db.commit()
            db.refresh(prov)
            
        # Download if file doesn't exist or force_download requested
        if not target_path.exists() or force_download:
            req = urllib.request.Request(cfg["url"], headers={"User-Agent": "CommerceFlow-DataEngine/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response, open(target_path, "wb") as out_file:
                chunk_size = 64 * 1024
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    
        # Verify and extract provenance metrics
        file_size = target_path.stat().st_size
        fingerprint = calculate_sha256(target_path)
        schema_info = inspect_csv_schema(target_path)
        
        prov.file_size_bytes = file_size
        prov.file_fingerprint = fingerprint
        prov.raw_record_count = schema_info["row_count"]
        prov.schema_fields = schema_info["columns"]
        prov.retrieval_timestamp = datetime.utcnow()
        prov.ingestion_status = "READY_FOR_INGESTION"
        db.commit()
        
        return {
            "source_name": file_name,
            "status": "READY_FOR_INGESTION",
            "file_size_bytes": file_size,
            "file_fingerprint": fingerprint,
            "record_count": schema_info["row_count"],
            "columns": schema_info["columns"]
        }
    finally:
        db.close()

def fetch_all_sources(force_download: bool = False) -> List[Dict[str, Any]]:
    """Fetches all canonical Olist dataset files and registers their provenance."""
    results = []
    for file_name in OLIST_FILES.keys():
        res = fetch_or_verify_source(file_name, force_download=force_download)
        results.append(res)
    return results

def get_registered_sources_status() -> List[Dict[str, Any]]:
    """Returns provenance and verification status of all registered sources."""
    db = SessionLocal()
    try:
        sources = db.query(SourceProvenance).all()
        result = []
        for s in sources:
            file_exists = (RAW_DIR / s.source_name).exists()
            result.append({
                "id": s.id,
                "source_name": s.source_name,
                "source_url": s.source_url,
                "license": s.license,
                "file_fingerprint": s.file_fingerprint,
                "file_size_bytes": s.file_size_bytes,
                "retrieval_timestamp": s.retrieval_timestamp.isoformat() if s.retrieval_timestamp else None,
                "file_format": s.file_format,
                "schema_fields": s.schema_fields or [],
                "raw_record_count": s.raw_record_count,
                "accepted_record_count": s.accepted_record_count,
                "quarantined_record_count": s.quarantined_record_count,
                "ingestion_status": s.ingestion_status if file_exists else "FILE_MISSING",
                "last_processed_at": s.last_processed_at.isoformat() if s.last_processed_at else None,
                "notes": s.notes,
                "file_exists": file_exists
            })
        return result
    finally:
        db.close()
