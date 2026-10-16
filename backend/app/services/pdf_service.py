import os
import re
import io
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pypdf
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.config import DOCUMENTS_DIR
from backend.app.database import SessionLocal, get_duckdb_conn
from backend.app.models.schema_models import DocumentRecord

MAX_FILE_SIZE = 50 * 1024 * 1024 # 50 MB limit

def calculate_sha256_bytes(data: bytes) -> str:
    """Calculates SHA-256 fingerprint from bytes."""
    return hashlib.sha256(data).hexdigest()

def sanitize_filename(filename: str) -> str:
    """Sanitizes filename against directory traversal and illegal characters."""
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', os.path.basename(filename))
    return clean or "unnamed_document.pdf"

def extract_structured_fields_from_text(full_text: str, conn=None) -> Dict[str, Any]:
    """
    Extracts key structured entities from text and cross-references them
    against the actual warehouse fact tables.
    """
    fields = {}
    
    # 1. Detect currency values
    currencies = re.findall(r'R\$\s*[\d.,]+', full_text)
    if currencies:
        fields["detected_amounts"] = list(dict.fromkeys(currencies[:5]))
        
    # 2. Detect dates
    dates = re.findall(r'\b(201[6-8]-\d{2}-\d{2})\b', full_text)
    if dates:
        fields["detected_dates"] = list(dict.fromkeys(dates[:5]))
        
    # 3. Detect 32-character hex order identifiers
    order_ids = re.findall(r'\b[a-f0-9]{32}\b', full_text)
    downstream_links = []
    
    if order_ids and conn:
        try:
            placeholders = ",".join(f"'{oid}'" for oid in order_ids[:10])
            matched = conn.execute(f"""
                SELECT order_id, order_status, total_order_cost, customer_id
                FROM fact_orders
                WHERE order_id IN ({placeholders})
                LIMIT 5;
            """).fetchall()
            for m in matched:
                downstream_links.append({
                    "table": "fact_orders",
                    "order_id": m[0],
                    "status": m[1],
                    "cost": float(m[2] or 0.0),
                    "customer_id": m[3]
                })
        except Exception:
            pass

    fields["detected_order_ids"] = list(dict.fromkeys(order_ids[:5]))
    return {
        "key_fields": fields,
        "downstream_links": downstream_links
    }

def process_pdf_document(
    file_bytes: bytes,
    filename: str,
    title: Optional[str] = None,
    document_category: str = "OPERATIONAL_REPORT",
    source_url: Optional[str] = None,
    run_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validates, extracts, catalogs, and securely stores an uploaded or generated PDF.
    Handles corrupted, encrypted, empty, and multi-page documents gracefully.
    """
    safe_name = sanitize_filename(filename)
    file_size = len(file_bytes)
    fingerprint = calculate_sha256_bytes(file_bytes)
    doc_id = f"doc_{fingerprint[:16]}"
    
    # Validation 1: Empty file check
    if file_size == 0:
        return {
            "doc_id": doc_id,
            "filename": safe_name,
            "status": "FAILED",
            "error": "The uploaded file is 0 bytes (empty document)."
        }
        
    # Validation 2: Maximum file size check
    if file_size > MAX_FILE_SIZE:
        return {
            "doc_id": doc_id,
            "filename": safe_name,
            "status": "FAILED",
            "error": f"The uploaded file exceeds the 50 MB limit ({file_size / (1024*1024):.1f} MB)."
        }

    # Validation 3: Magic bytes check
    is_pdf_magic = file_bytes.startswith(b'%PDF-')
    if not is_pdf_magic:
        return {
            "doc_id": doc_id,
            "filename": safe_name,
            "status": "UNSUPPORTED",
            "error": "Invalid document signature. File does not contain standard %PDF- header."
        }

    # Save original PDF file to disk with fingerprint prefix
    stored_filename = f"{fingerprint[:12]}_{safe_name}"
    stored_path = DOCUMENTS_DIR / stored_filename
    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    # Process with PyPDF
    extracted_pages = []
    total_pages = 0
    processing_status = "READY"
    extraction_status = "PENDING"
    validation = {
        "is_valid_pdf": True,
        "is_encrypted": False,
        "is_corrupt": False,
        "error_detail": None
    }
    extracted_text_all = ""

    conn = None
    try:
        conn = get_duckdb_conn()
    except Exception:
        pass

    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        
        # Encryption check
        if reader.is_encrypted:
            validation["is_encrypted"] = True
            validation["error_detail"] = "Document is password encrypted. Text extraction is restricted."
            processing_status = "ENCRYPTED"
            extraction_status = "EXTRACTION_FAILED"
        else:
            total_pages = len(reader.pages)
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                extracted_text_all += f"\n{page_text}"
                
                # Check for table / lines in text
                lines = [l.strip() for l in page_text.splitlines() if l.strip()]
                extracted_pages.append({
                    "page_number": idx + 1,
                    "text": page_text,
                    "char_count": len(page_text),
                    "word_count": len(page_text.split()),
                    "line_count": len(lines)
                })
                
            if any(p["char_count"] > 0 for p in extracted_pages):
                extraction_status = "EXTRACTED"
                processing_status = "PROCESSED"
            else:
                extraction_status = "NO_TEXT_FOUND"
                processing_status = "PROCESSED"
                
    except Exception as e:
        validation["is_corrupt"] = True
        validation["is_valid_pdf"] = False
        validation["error_detail"] = f"PDF Read Error: {str(e)}"
        processing_status = "CORRUPTED"
        extraction_status = "EXTRACTION_FAILED"

    # Extract structured key fields and downstream warehouse links
    analysis = extract_structured_fields_from_text(extracted_text_all, conn=conn)
    if conn:
        conn.close()

    extracted_data = {
        "pages": extracted_pages,
        "key_fields": analysis["key_fields"],
        "downstream_links": analysis["downstream_links"],
        "summary": {
            "total_pages": total_pages,
            "total_characters": sum(p["char_count"] for p in extracted_pages),
            "total_words": sum(p["word_count"] for p in extracted_pages)
        }
    }

    # Save to SQLite Metadata Database
    db = SessionLocal()
    try:
        doc = db.query(DocumentRecord).filter(DocumentRecord.doc_id == doc_id).first()
        if not doc:
            doc = DocumentRecord(
                doc_id=doc_id,
                filename=safe_name,
                title=title or safe_name.replace("_", " ").replace(".pdf", "").title(),
                document_category=document_category,
                stored_path=str(stored_path.relative_to(DOCUMENTS_DIR.parent)),
                file_size_bytes=file_size,
                file_fingerprint=fingerprint,
                mime_type="application/pdf",
                source_url=source_url,
                page_count=total_pages,
                processing_status=processing_status,
                extraction_status=extraction_status,
                associated_run_id=run_id,
                validation_results=validation,
                extracted_data=extracted_data
            )
            db.add(doc)
        else:
            doc.title = title or doc.title
            doc.page_count = total_pages
            doc.processing_status = processing_status
            doc.extraction_status = extraction_status
            doc.validation_results = validation
            doc.extracted_data = extracted_data
            
        db.commit()
        db.refresh(doc)
        
        return {
            "doc_id": doc.doc_id,
            "filename": doc.filename,
            "title": doc.title,
            "page_count": doc.page_count,
            "file_size_bytes": doc.file_size_bytes,
            "file_fingerprint": doc.file_fingerprint,
            "processing_status": doc.processing_status,
            "extraction_status": doc.extraction_status,
            "validation": validation,
            "downstream_links": analysis["downstream_links"]
        }
    finally:
        db.close()

def get_document_path(doc_id: str) -> Optional[Path]:
    """
    Safely retrieves the absolute path of a stored PDF.
    Enforces strict path containment within DOCUMENTS_DIR.
    """
    db = SessionLocal()
    try:
        doc = db.query(DocumentRecord).filter(DocumentRecord.doc_id == doc_id).first()
        if not doc:
            return None
            
        full_path = (DOCUMENTS_DIR.parent / doc.stored_path).resolve()
        # Path traversal guard
        if not full_path.is_relative_to(DOCUMENTS_DIR.resolve()) or not full_path.exists():
            return None
            
        return full_path
    finally:
        db.close()

def get_all_documents(search_query: Optional[str] = None, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all indexed document records with optional text search and status filters."""
    db = SessionLocal()
    try:
        query = db.query(DocumentRecord)
        if status_filter and status_filter != "ALL":
            query = query.filter(DocumentRecord.processing_status == status_filter)
            
        docs = query.order_by(DocumentRecord.upload_timestamp.desc()).all()
        results = []
        
        for d in docs:
            # Check search match across filename, title, or extracted pages text
            matches = True
            if search_query:
                q = search_query.lower()
                text_match = False
                if q in d.filename.lower() or q in d.title.lower():
                    text_match = True
                elif d.extracted_data and "pages" in d.extracted_data:
                    for p in d.extracted_data["pages"]:
                        if q in p.get("text", "").lower():
                            text_match = True
                            break
                matches = text_match

            if matches:
                results.append({
                    "doc_id": d.doc_id,
                    "filename": d.filename,
                    "title": d.title,
                    "document_category": d.document_category,
                    "file_size_bytes": d.file_size_bytes,
                    "file_fingerprint": d.file_fingerprint,
                    "page_count": d.page_count,
                    "processing_status": d.processing_status,
                    "extraction_status": d.extraction_status,
                    "upload_timestamp": d.upload_timestamp.isoformat() if d.upload_timestamp else None,
                    "validation_results": d.validation_results,
                    "downstream_count": len(d.extracted_data.get("downstream_links", [])) if d.extracted_data else 0
                })
        return results
    finally:
        db.close()

def get_document_details(doc_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves comprehensive document details, extracted text per page, and downstream links."""
    db = SessionLocal()
    try:
        d = db.query(DocumentRecord).filter(DocumentRecord.doc_id == doc_id).first()
        if not d:
            return None
            
        extracted = dict(d.extracted_data or {})
        if "pages" not in extracted or not extracted["pages"]:
            full_path = (DOCUMENTS_DIR.parent / d.stored_path).resolve()
            pages = []
            if full_path.exists():
                try:
                    reader = pypdf.PdfReader(str(full_path))
                    for i, p in enumerate(reader.pages):
                        t = p.extract_text() or ""
                        pages.append({
                            "page_number": i + 1,
                            "text": t,
                            "char_count": len(t),
                            "word_count": len(t.split())
                        })
                except Exception:
                    pass
            extracted["pages"] = pages
            extracted.setdefault("key_fields", {})
            extracted.setdefault("downstream_links", [])

        return {
            "doc_id": d.doc_id,
            "filename": d.filename,
            "title": d.title,
            "document_category": d.document_category,
            "file_size_bytes": d.file_size_bytes,
            "file_fingerprint": d.file_fingerprint,
            "mime_type": d.mime_type,
            "source_url": d.source_url,
            "page_count": d.page_count,
            "processing_status": d.processing_status,
            "extraction_status": d.extraction_status,
            "upload_timestamp": d.upload_timestamp.isoformat() if d.upload_timestamp else None,
            "validation_results": d.validation_results,
            "extracted_data": extracted
        }
    finally:
        db.close()

# -------------------------------------------------------------------------
# Real E-Commerce PDF Generator & Seed Engine
# -------------------------------------------------------------------------
def generate_and_seed_ecommerce_pdfs() -> List[Dict[str, Any]]:
    """
    Generates 3 authentic, multi-page operational e-commerce PDF documents
    compiled directly from the physical Brazilian e-commerce warehouse data.
    Registers them into the document library.
    """
    conn = get_duckdb_conn()
    tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
    if "fact_orders" not in tables:
        conn.close()
        return []
        
    results = []
    
    # ---------------------------------------------------------------------
    # Document 1: Brazilian E-Commerce Comprehensive Audit Report (3 pages)
    # ---------------------------------------------------------------------
    audit_buf = io.BytesIO()
    doc1 = SimpleDocTemplate(audit_buf, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.black)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.black)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#222222'))
    mono_style = ParagraphStyle('Mono', parent=styles['Normal'], fontName='Courier', fontSize=8, leading=10, textColor=colors.black)
    
    elements = []
    
    # Page 1: Executive Audit Summary
    elements.append(Paragraph("COMMERCEFLOW PLATFORM AUDIT REPORT", h1_style))
    elements.append(Paragraph("Brazilian E-Commerce Historical Dataset (Olist) • Fiscal Integrity & Reconciliation", body_style))
    elements.append(Spacer(1, 15))
    
    # Query summary metrics from warehouse
    stats = conn.execute("""
        SELECT COUNT(*), ROUND(SUM(total_order_cost), 2), SUM(total_items), 
               CAST(MIN(order_purchase_timestamp) AS VARCHAR), CAST(MAX(order_purchase_timestamp) AS VARCHAR)
        FROM fact_orders;
    """).fetchone()
    
    elements.append(Paragraph("1. Executive Summary & Verification Metrics", h2_style))
    elements.append(Paragraph(f"This document represents the formal data audit report for the Brazilian E-Commerce dataset. Total verified orders: <b>{stats[0]:,}</b>. Total verified observed sales: <b>R$ {stats[1]:,.2f}</b>. Total order items sold: <b>{stats[2]:,}</b>. Historical transaction date span spans from <b>{stats[3][:10]}</b> to <b>{stats[4][:10]}</b>.", body_style))
    elements.append(Spacer(1, 10))
    
    # Table of Category Top 5
    cat_rows = conn.execute("""
        SELECT p.category_name, COUNT(i.order_item_id) AS items, ROUND(SUM(i.item_price), 2) AS sales
        FROM fact_order_items i
        JOIN dim_products p ON i.product_id = p.product_id
        GROUP BY p.category_name
        ORDER BY sales DESC
        LIMIT 5;
    """).fetchall()
    
    table_data = [["Product Category", "Items Sold", "Observed Sales (BRL)"]]
    for r in cat_rows:
        table_data.append([str(r[0]).replace('_', ' ').title(), f"{r[1]:,}", f"R$ {r[2]:,.2f}"])
        
    t = Table(table_data, colWidths=[240, 100, 160])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Page 2: State Delivery Lead Times
    elements.append(PageBreak())
    elements.append(Paragraph("2. Regional Logistics & State Delivery Transit Performance", h2_style))
    elements.append(Paragraph("Observed delivery transit lead times (purchase to door) across top destination Brazilian federative units:", body_style))
    elements.append(Spacer(1, 10))
    
    state_rows = conn.execute("""
        SELECT c.customer_state, COUNT(o.order_id) AS orders, ROUND(AVG(o.delivery_days), 1) AS avg_days
        FROM fact_orders o
        JOIN dim_customers c ON o.customer_id = c.customer_id
        WHERE o.delivery_days IS NOT NULL
        GROUP BY c.customer_state
        ORDER BY orders DESC
        LIMIT 6;
    """).fetchall()
    
    state_table_data = [["State (UF)", "Delivered Orders", "Average Delivery Lead Time (Days)"]]
    for r in state_rows:
        state_table_data.append([r[0], f"{r[1]:,}", f"{r[2]} days"])
        
    st = Table(state_table_data, colWidths=[120, 180, 200])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
    ]))
    elements.append(st)
    elements.append(Spacer(1, 20))
    
    # Page 3: Sample Verified Order Evidence
    elements.append(PageBreak())
    elements.append(Paragraph("3. Transaction Ledger & Downstream Reconciled Order Records", h2_style))
    elements.append(Paragraph("Actual order transaction IDs extracted from the gold fact warehouse for traceability:", body_style))
    elements.append(Spacer(1, 10))
    
    sample_orders = conn.execute("""
        SELECT order_id, customer_id, order_status, total_order_cost, payment_methods
        FROM fact_orders
        WHERE total_order_cost > 500
        ORDER BY total_order_cost DESC
        LIMIT 6;
    """).fetchall()
    
    order_table_data = [["Order Identifier (Hash)", "Status", "Amount (BRL)", "Payment Channel"]]
    for o in sample_orders:
        order_table_data.append([o[0], o[2], f"R$ {o[3]:,.2f}", str(o[4] or 'N/A')])
        
    ot = Table(order_table_data, colWidths=[240, 70, 90, 100])
    ot.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
    ]))
    elements.append(ot)
    
    doc1.build(elements)
    audit_bytes = audit_buf.getvalue()
    
    res1 = process_pdf_document(
        file_bytes=audit_bytes,
        filename="olist_brazilian_ecommerce_audit_report.pdf",
        title="Olist E-Commerce Comprehensive Audit Report",
        document_category="AUDIT_REPORT",
        source_url="https://raw.githubusercontent.com/olist/work-at-olist-data/master/datasets",
        run_id="audit_baseline_01"
    )
    results.append(res1)

    # ---------------------------------------------------------------------
    # Document 2: Carrier Logistics Shipping Manifest (2 pages)
    # ---------------------------------------------------------------------
    manifest_buf = io.BytesIO()
    doc2 = SimpleDocTemplate(manifest_buf, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements2 = []
    
    elements2.append(Paragraph("CARRIER DISPATCH MANIFEST — SOUTHEAST CORRIDOR", h1_style))
    elements2.append(Paragraph("Logistics Manifest ID: MNF-2018-SP-RJ-009 • Fleet Express Attendant", body_style))
    elements2.append(Spacer(1, 15))
    
    elements2.append(Paragraph("Carrier Freight Dispatch Ledger", h2_style))
    elements2.append(Paragraph("Certified parcel shipment entries with verified shipping limit dates and carrier freight values:", body_style))
    elements2.append(Spacer(1, 10))
    
    carrier_orders = conn.execute("""
        SELECT o.order_id, c.customer_city, c.customer_state, o.total_order_cost, o.delivery_days
        FROM fact_orders o
        JOIN dim_customers c ON o.customer_id = c.customer_id
        WHERE c.customer_state IN ('SP', 'RJ') AND o.delivery_days IS NOT NULL
        ORDER BY o.order_purchase_timestamp DESC
        LIMIT 10;
    """).fetchall()
    
    manifest_table = [["Order Identifier", "Destination City", "State", "Freight Value", "Transit Days"]]
    for co in carrier_orders:
        manifest_table.append([co[0], co[1].title(), co[2], f"R$ {co[3]:.2f}", f"{co[4]} days"])
        
    mt = Table(manifest_table, colWidths=[220, 110, 50, 70, 70])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
    ]))
    elements2.append(mt)
    
    # Page 2: Carrier SLA Regulations
    elements2.append(PageBreak())
    elements2.append(Paragraph("Carrier SLA Compliance & Transit Guidelines", h2_style))
    elements2.append(Paragraph("Terms of carriage: All parcels listed herein were checked against warehouse weight distributions. In transit delays exceeding estimated delivery margin days must be logged with dispatch customer support.", body_style))
    
    doc2.build(elements2)
    manifest_bytes = manifest_buf.getvalue()
    
    res2 = process_pdf_document(
        file_bytes=manifest_bytes,
        filename="carrier_logistics_manifest_sp_rj.pdf",
        title="Carrier Logistics Dispatch Manifest (SP-RJ)",
        document_category="CARRIER_MANIFEST",
        source_url="internal://logistics/manifest/2018-009",
        run_id="manifest_009"
    )
    results.append(res2)

    # ---------------------------------------------------------------------
    # Document 3: Fiscal Commercial Invoice Summary (1 page)
    # ---------------------------------------------------------------------
    invoice_buf = io.BytesIO()
    doc3 = SimpleDocTemplate(invoice_buf, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements3 = []
    
    elements3.append(Paragraph("FISCAL COMMERCIAL INVOICE SUMMARY", h1_style))
    elements3.append(Paragraph("Nota Fiscal Settlement Reference • Boleto & Credit Card Clearing", body_style))
    elements3.append(Spacer(1, 15))
    
    invoice_orders = conn.execute("""
        SELECT o.order_id, o.customer_id, o.total_item_value, o.total_freight_value, o.total_payment_value, o.payment_methods
        FROM fact_orders o
        WHERE o.payment_methods LIKE '%boleto%'
        LIMIT 6;
    """).fetchall()
    
    inv_table = [["Order Hash", "Item Value", "Freight", "Total Payment", "Payment Type"]]
    for io_row in invoice_orders:
        inv_table.append([io_row[0], f"R$ {io_row[2]:.2f}", f"R$ {io_row[3]:.2f}", f"R$ {io_row[4]:.2f}", io_row[5]])
        
    it = Table(inv_table, colWidths=[210, 70, 70, 80, 90])
    it.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
    ]))
    elements3.append(it)
    
    doc3.build(elements3)
    invoice_bytes = invoice_buf.getvalue()
    
    res3 = process_pdf_document(
        file_bytes=invoice_bytes,
        filename="fiscal_invoice_summary_sample.pdf",
        title="Fiscal Commercial Invoice & Payment Settlement",
        document_category="INVOICE_REPORT",
        source_url="internal://finance/fiscal/invoice-batch-04",
        run_id="invoice_batch_04"
    )
    results.append(res3)

    conn.close()
    return results
