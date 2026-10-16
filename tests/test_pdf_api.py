from fastapi.testclient import TestClient
from backend.app.main import app
import io

client = TestClient(app)

def test_api_list_documents():
    res = client.get("/api/documents")
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 3
    doc_filenames = [d["filename"] for d in docs]
    assert "olist_brazilian_ecommerce_audit_report.pdf" in doc_filenames

def test_api_get_document_details():
    list_res = client.get("/api/documents")
    docs = list_res.json()
    valid_doc = next((d for d in docs if d.get("page_count", 0) > 0), docs[0])
    doc_id = valid_doc["doc_id"]

    res = client.get(f"/api/documents/{doc_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["doc_id"] == doc_id
    assert "extracted_data" in data
    assert "pages" in data["extracted_data"]
    assert len(data["extracted_data"]["pages"]) > 0

def test_api_view_document_file():
    list_res = client.get("/api/documents")
    doc_id = list_res.json()[0]["doc_id"]

    res = client.get(f"/api/documents/{doc_id}/file")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "inline" in res.headers.get("content-disposition", "")
    assert res.content.startswith(b"%PDF-")

def test_api_download_document_file():
    list_res = client.get("/api/documents")
    doc_id = list_res.json()[0]["doc_id"]

    res = client.get(f"/api/documents/{doc_id}/download")
    assert res.status_code == 200
    assert "attachment" in res.headers.get("content-disposition", "")

def test_api_upload_valid_pdf():
    # Valid minimal PDF
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    files = {"file": ("test_upload.pdf", io.BytesIO(pdf_content), "application/pdf")}
    res = client.post("/api/documents/upload", files=files, data={"title": "Uploaded Test Document"})
    assert res.status_code == 200
    data = res.json()
    assert data["filename"] == "test_upload.pdf"
    assert data["file_size_bytes"] == len(pdf_content)

def test_api_upload_empty_pdf_rejected():
    files = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 400
    assert "0 bytes" in res.json()["detail"]
