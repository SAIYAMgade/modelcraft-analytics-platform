# CommerceFlow: Enterprise Data Engineering & Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-black.svg?style=flat-square)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-black.svg?style=flat-square)](https://fastapi.tiangolo.com)
[![DuckDB](https://img.shields.io/badge/DuckDB-1.0+-black.svg?style=flat-square)](https://duckdb.org)
[![React](https://img.shields.io/badge/React-19.0-black.svg?style=flat-square)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-black.svg?style=flat-square)](LICENSE)

**CommerceFlow** is an original, production-grade data engineering platform built around real-world e-commerce data from the **Brazilian E-Commerce Public Dataset by Olist**.

Designed for modern high-velocity e-commerce and quick-commerce operations, CommerceFlow solves a foundational engineering question:
> *"Can we transform messy, heterogeneous source data into trustworthy business insights, and can we prove that the resulting data is correct?"*

---

## Executive Summary (For Recruiters & Business Leaders)

In high-velocity commerce (such as quick commerce), data arrives from diverse systems: payment gateways, order management systems, warehouse logistics, and customer apps. A single corrupt record (e.g. negative prices, delivery recorded before purchase, or missing customer keys) can silently distort inventory, financial accounting, and executive KPIs.

CommerceFlow eliminates silent data loss through strict, automated gatekeeping:
1. **Traceable Ingestion:** Preserves raw data as received and fingerprints every source file with SHA-256 checksums.
2. **Automated Quarantine:** Automatically intercepts corrupt rows and moves them to an isolated quarantine zone with documented failure reasons—never silently discarding or hiding errors.
3. **Financial Reconciliation:** Reconciles order item sums and freight charges against payment transaction values to prevent double-counting.
4. **Historical Event Replay:** Demonstrates event-driven architecture by streaming historical order events in sequential order with configurable velocity.
5. **Strict Monochrome Interface:** A deliberate, distraction-free visual design system (pure black, white, and neutral grays) tailored for high-signal technical decision making.

---

## Technical Deep-Dive (For Senior Data Engineers)

CommerceFlow implements a **Medallion Lakehouse Architecture** (Bronze → Silver → Gold) powered by DuckDB's vectorized columnar engine, SQLite ACID governance, FastAPI REST services, and a React 19 / TypeScript frontend.

```
[Raw Sources: Olist CSV / APIs]
               │
               ▼
   [Bronze Layer: Raw Storage]
   - Source fingerprinting (SHA-256)
   - Metadata & provenance cataloging
   - Schema enforcement & type inspection (550,759 rows across 8 tables)
               │
               ▼
[Silver Layer: Cleaning & Quarantine]
   - Temporal validation (order_delivered_date >= order_purchase_timestamp)
   - Numeric domain boundaries (price >= 0, freight >= 0, payment >= 0)
   - Category name translation (PT -> EN)
   - Defective rows isolated into SQLite Quarantine table
               │
               ▼
   [Gold Layer: Star Schema Warehouse]
   - Fact Tables: fact_orders (99,441 rows), fact_order_items (112,650 rows)
   - Dimensions: dim_customers, dim_products, dim_sellers
   - Analytical Marts: mart_daily_sales, mart_category_performance
               │
               ▼
[Operational & Analytics Serving]
   - DuckDB vectorized OLAP engine (< 65ms query latency)
   - Historical Event Replay (Event-time vs Ingestion-time streaming)
   - Real Benchmark Runner (750k+ records/sec analytical throughput)
   - Controlled failure injection & recovery verification
```

---

## Real Data Provenance & Ethics

- **Primary Source:** Brazilian E-Commerce Public Dataset by Olist
- **Repository:** Official Olist Data Team repository (`olist/work-at-olist-data`)
- **License:** MIT License
- **Time Range:** September 4, 2016 – October 17, 2018
- **Total Ingested Volume:** 550,759 records across 8 canonical tables:
  - `olist_orders_dataset.csv` (99,441 rows, 17.6 MB, SHA: `8df58ef3d2d7e994...`)
  - `olist_order_items_dataset.csv` (112,650 rows, 15.0 MB, SHA: `4f6abdbbc94036d0...`)
  - `olist_order_payments_dataset.csv` (103,886 rows, 5.6 MB, SHA: `61674868ed7b872a...`)
  - `olist_order_reviews_dataset.csv` (99,224 rows, 14.4 MB, SHA: `012b61c7593e34f5...`)
  - `olist_products_dataset.csv` (32,951 rows, 2.3 MB, SHA: `3e6569628a17fbc7...`)
  - `olist_customers_dataset.csv` (99,441 rows, 8.5 MB, SHA: `c26c17f59f3027a6...`)
  - `olist_sellers_dataset.csv` (3,095 rows, 163 KB, SHA: `31eb9bd50d684526...`)
  - `product_category_name_translation.csv` (71 rows, 2.6 KB, SHA: `a81f0d1f27b27e72...`)

*Note: No fake records, synthetic revenue, or simulated orders are fabricated in user dashboards.*

---

## 11 Functional Application Pages

1. **Overview:** Dual-mode briefing (Business Overview vs Engineering Console), source coverage, data freshness, and interactive glossary.
2. **Data Sources:** Registered canonical sources, SHA-256 fingerprints, file sizes, schema column inspection, and manual CSV import.
3. **Report Center:** Interactive multi-page PDF audit compiler (12–25 pages) powered by ReportLab, vector charts, customizable sections, and instant viewer integration.
4. **PDF Explorer:** Integrated PDF.js viewer with selectable text layer, direct page navigation, in-document search, thumbnail drawer, download, and dual Original vs Extracted Data views with downstream warehouse links.
5. **Pipeline Explorer:** Interactive DAG (Bronze → Silver → Gold → Quality), run logs, controlled failure injection, and idempotent recovery workflows.
6. **Data Quality:** Scorecard of 10 automated rules (completeness, uniqueness, validity, referential integrity, reconciliation) and quarantined record payload inspector.
7. **Data Warehouse:** Schema browser (Bronze, Silver, Gold), row counts, and an interactive read-only SQL query sandbox.
8. **Analytics:** Strict monochrome charts: daily sales trends, top product categories, payment channel breakdowns, and geographic delivery transit lead times.
9. **Streaming & Replay:** Controlled historical event replay simulating Kafka streaming with speed multipliers (10x-500x), live stream acknowledgement logs, and event-time vs ingestion-time diagnostics.
10. **Observability:** Telemetry on pipeline durations, records processed throughput, error rates, and subsystem health matrices.
11. **Benchmarks:** Live reproducible benchmark suite measuring query execution latencies (P50, P95), throughput, and hardware environment specifications.

---

## Quick Start & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- (Optional) Docker & Docker Compose

### Option A: Local-First Native Execution (Recommended)

1. **Clone and Enter Workspace:**
   ```bash
   cd Data
   ```

2. **Install Python Backend Dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Verify and Fetch Real Olist Dataset:**
   ```bash
   python scripts/test_pipeline_run.py
   ```
   *This automatically downloads the official Olist CSVs into `data/raw/`, runs the Bronze-Silver-Gold pipeline, and verifies data quality checks.*

4. **Start the FastAPI Backend:**
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```
   *Backend API docs available at `http://localhost:8000/docs`.*

5. **Start the React Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

---

### Option B: Docker Compose Deployment

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## Automated Testing Suite

Execute the complete automated test suite covering unit tests, warehouse transformations, failure recovery, and API endpoints:

```bash
python -m pytest tests/ -v
```

### Verified Test Results (30 / 30 Passed)
```
tests/test_api_endpoints.py (10 tests) ................. PASSED
tests/test_pdf_api.py (6 tests) ....................... PASSED
tests/test_pdf_service.py (6 tests) ................... PASSED
tests/test_report_generator.py (6 tests) .............. PASSED
tests/test_warehouse_elt.py (2 tests) ................. PASSED

====================== 30 passed in 33.88s =======================
```

---

## Reproducible Benchmark Results

Executed on local hardware (Windows 11 AMD64, 16 CPU cores, Python 3.14.7, DuckDB 1.5.6):
- **Workload:** Multi-table relational joins, time-series window rolling aggregations, state delivery metrics, and payment distributions.
- **Dataset Evaluated:** 212,091 records (`fact_orders` + `fact_order_items`).
- **Throughput:** ~754,772 records/second.
- **Query P50 Latency:** 60.9 ms.
- **Query P95 Latency:** 119.3 ms.

---

## Honest Engineering Disclosure & Known Limitations

1. **Local-First Architecture:** DuckDB was selected over an Apache Spark or Snowflake cluster for single-node efficiency, zero cloud idle costs, and instant setup. For workloads under 50 million rows, DuckDB consistently outperforms distributed clusters by eliminating network serialization bottlenecks.
2. **Historical Event Replay vs Live Feeds:** The streaming module replays authentic historical order events chronologically with configurable acceleration (10x-500x). It is labeled "Historical Event Replay" rather than a fabricated live business feed.
3. **Controlled Failure Injection:** Deliberate failure injection is restricted to testing and audit evaluation to verify pipeline idempotency and recovery runbooks.
