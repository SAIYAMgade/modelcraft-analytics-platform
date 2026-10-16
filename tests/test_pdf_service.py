import pytest
import io
from pathlib import Path
from backend.app.services.pdf_service import (
    process_pdf_document,
    get_document_path,
    get_all_documents,
    get_document_details,
    generate_and_seed_ecommerce_pdfs
)
from backend.app.database import SessionLocal
from backend.app.models.schema_models import DocumentRecord

def test_generate_and_seed_real_ecommerce_pdfs():
    """Verify generation and indexing of authentic multi-page e-commerce PDFs."""
    results = generate_and_seed_ecommerce_pdfs()
    assert len(results) >= 3

    # Check Document 1: Audit report
    audit_doc = next((d for d in results if "audit_report" in d["filename"]), None)
    assert audit_doc is not None
    assert audit_doc["page_count"] == 3
    assert audit_doc["processing_status"] == "PROCESSED"
    assert audit_doc["extraction_status"] == "EXTRACTED"
    assert len(audit_doc["downstream_links"]) > 0

    # Verify retrieval
    details = get_document_details(audit_doc["doc_id"])
    assert details is not None
    assert len(details["extracted_data"]["pages"]) == 3
    assert "COMMERCEFLOW" in details["extracted_data"]["pages"][0]["text"]

def test_pdf_empty_file_validation():
    """Verify that 0-byte uploaded files are rejected safely."""
    res = process_pdf_document(
        file_bytes=b"",
        filename="empty_file.pdf"
    )
    assert res["status"] == "FAILED"
    assert "0 bytes" in res["error"]

def test_pdf_invalid_signature_validation():
    """Verify that non-PDF files without %PDF- magic bytes are rejected."""
    res = process_pdf_document(
        file_bytes=b"This is a text file masquerading as a pdf",
        filename="fake.pdf"
    )
    assert res["status"] == "UNSUPPORTED"
    assert "Invalid document signature" in res["error"]

def test_pdf_corrupted_file_handling():
    """Verify that corrupt PDF data is caught, marked CORRUPTED, and preserved without crashes."""
    corrupt_bytes = b"%PDF-1.4\n%corrupted data\ngarbage bytes not a valid xref table"
    res = process_pdf_document(
        file_bytes=corrupt_bytes,
        filename="corrupted_report.pdf",
        title="Corrupted Document Test"
    )
    assert res["processing_status"] == "CORRUPTED"
    assert res["extraction_status"] == "EXTRACTION_FAILED"
    assert res["validation"]["is_corrupt"] is True
    assert res["validation"]["error_detail"] is not None

def test_pdf_path_traversal_safety():
    """Verify that path traversal attempts cannot escape the document storage root."""
    # Searching for non-existent or malicious doc_id returns None
    assert get_document_path("../../../etc/passwd") is None
    assert get_document_path("invalid_id") is None

def test_document_full_text_search():
    """Verify text search across document titles and extracted page contents."""
    docs = get_all_documents(search_query="COMMERCEFLOW")
    assert len(docs) > 0
    assert any("audit_report" in d["filename"] for d in docs)
