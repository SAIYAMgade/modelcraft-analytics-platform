# CommerceFlow: Platform Architecture & Engineering Plan

## 1. System Vision & Business Context
**CommerceFlow** is an enterprise data engineering platform designed around real e-commerce operations. It demonstrates how raw, heterogeneous e-commerce data (orders, items, payments, customers, sellers, logistics) is ingested, validated, quarantined when defective, modeled into an analytical warehouse, tracked for data quality and provenance, and streamed via historical event replay.

## 2. Real Data Provenance & Source Strategy
- **Primary Source**: Brazilian E-Commerce Public Dataset by Olist
- **Repository**: Official Olist Data Team repository (`olist/work-at-olist-data`) & Kaggle archive (`olistbr/brazilian-ecommerce`)
- **License**: MIT License
- **Time Range**: 2016-09-04 to 2018-10-17 (100,000+ real e-commerce orders)
- **Source Entities**:
  1. `olist_orders_dataset.csv`: Order status, order purchase timestamp, approved at, delivered to carrier, delivered to customer, estimated delivery.
  2. `olist_order_items_dataset.csv`: Order items, products, sellers, shipping limit dates, item prices, freight values.
  3. `olist_order_payments_dataset.csv`: Payment types (credit_card, boleto, voucher, debit_card), installments, sequential payments, payment values.
  4. `olist_order_reviews_dataset.csv`: Customer satisfaction scores (1-5), review comments, timestamps.
  5. `olist_products_dataset.csv`: Category names, dimensional weight and measurements.
  6. `olist_customers_dataset.csv`: Unique customer IDs, zip prefixes, cities, states.
  7. `olist_sellers_dataset.csv`: Seller IDs, zip prefixes, cities, states.
  8. `olist_geolocation_dataset.csv`: Geographic coordinates for Brazilian zip codes.
  9. `product_category_name_translation.csv`: Portuguese to English category translations.

## 3. Data Engineering Pipeline Architecture

```
[Raw Sources: Olist CSV / APIs]
               │
               ▼
   [Bronze Layer: Raw Storage]
   - Source fingerprinting (SHA-256)
   - Metadata & provenance cataloging
   - Schema enforcement & type inspection
               │
               ▼
[Silver Layer: Cleaning & Quarantine]
   - Quarantine defective records (e.g., negative prices, invalid timestamps)
   - Deduplication & surrogate key generation
   - Referential integrity verification
   - Currency & timestamp standardizations
               │
               ▼
   [Gold Layer: Star Schema Warehouse]
   - Fact Tables: `fact_orders`, `fact_order_items`, `fact_payments`
   - Dimension Tables: `dim_customers`, `dim_products`, `dim_sellers`, `dim_dates`
   - Analytical Marts: Daily sales, delivery lead times, category performance
               │
               ▼
[Operational & Analytics Serving]
   - FastAPI REST API + DuckDB / SQLite high-performance SQL engine
   - Historical Event Replay (Event-time vs Ingestion-time streaming)
   - Real Benchmark Runner (Full-refresh vs Incremental, throughput, latency)
   - Strict Monochrome React/Vite Frontend (Dual Mode: Recruiter vs Engineer)
```

## 4. Strict Monochrome Design Specification
- Strict black, white, and neutral grays: `#000000`, `#111111`, `#1a1a1a`, `#262626`, `#404040`, `#737373`, `#a3a3a3`, `#e5e5e5`, `#f5f5f5`, `#ffffff`.
- Zero colors (no blue, green, amber, red accents or colored chart gradients).
- Status communicated through iconography, contrast (solid black vs wireframe outline vs hatched patterns), badges with text labels.
- Dual-persona interface toggle:
  - **Business Overview**: Plain language, high-level KPIs, data freshness, validation health, glossary.
  - **Engineering Console**: Pipeline DAGs, SQL inspection, dbt/lineage models, raw logs, benchmark metrics, failure recovery controls.

## 5. Advanced Report Center & Document Intelligence System
- **ReportLab Multi-Page Vector Engine**: Generates comprehensive 12–25 page engineering audit reports derived 100% from persisted lakehouse data, test executions, and benchmark history.
- **Strict Monochrome Vector Charts**: Pure vector line plots, vertical bar charts, and component topology drawings without rasterization.
- **Dynamic Two-Pass Pagination**: Custom `NumberedCanvas` computing "Page X of Y" with professional running headers and footers.
- **Repeated Table Headers across Page Breaks**: Enforced via `repeatRows=1` for seamless flow across multi-page tables.
- **14 Structured Sections + Appendices**:
  1. Executive Summary & Core KPIs
  2. Dataset Provenance & Source Audit (8 Olist CSVs, SHA-256 fingerprints, record counts)
  3. Data Profiling & Quality Engine (column stats, null percentages, distinct bounds, 10 quality rules)
  4. Architecture & Medallion Data Flow (topological diagrams, component rationale)
  5. Data Lineage & Warehouse Modeling (Kimball star schema, grain definitions, model lineage)
  6. Transformation & SQL Engineering (ANSI SQL transformation excerpts, deduplication rules)
  7. Business Analytics & Visual Findings (vector charts for categories, monthly volume, logistics)
  8. Reconciliation & Mathematical Correctness (source vs warehouse queries, 0 variance parity)
  9. Pipeline Operations & Reliability (historical execution logs, controlled failure & recovery)
  10. Benchmarking & Physical Performance (DuckDB micro-benchmarks, P50/P95 latencies, 754k rec/s)
  11. Automated Testing & Verification (30 backend pytest tests, 14 live E2E assertions)
  12. Security & Operational Boundaries (path traversal guards, read-only SQL runner, upload limits)
  13. Architectural Decision Records (ADR: Why DuckDB, why Medallion, why dual database)
  14. Honest Limitations & Future Work (single-node ceiling, historical data bounds, OCR roadmap)
  - Appendices (Data dictionary, quality catalog, glossary, cryptographic metadata stamp)
- **Interactive PDF Document Explorer Integration**: All generated reports are indexed in `DocumentRecord` and can be inspected immediately in the integrated PDF.js viewer modal with selectable text layers, thumbnail sidebars, zoom, in-document search, and download.

