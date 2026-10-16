import uuid
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import duckdb

from backend.app.config import RAW_DIR, DUCKDB_PATH, WAREHOUSE_DIR
from backend.app.database import SessionLocal, get_duckdb_conn
from backend.app.models.schema_models import (
    PipelineRun,
    QualityCheckResult,
    QuarantineRecord,
    SourceProvenance
)

def run_full_pipeline(trigger_type: str = "MANUAL", inject_failure: bool = False) -> Dict[str, Any]:
    """
    Executes the complete Bronze -> Silver -> Gold pipeline.
    Tracks execution steps, records, run_id, and data quality checks.
    Supports controlled failure injection for testing recovery workflows.
    """
    run_id = f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    start_time = datetime.utcnow()
    t0 = time.time()
    
    db = SessionLocal()
    pipeline_run = PipelineRun(
        run_id=run_id,
        pipeline_name="olist_ecommerce_elt",
        trigger_type=trigger_type,
        status="RUNNING",
        start_time=start_time,
        execution_steps=[],
        is_failure_injected=inject_failure
    )
    db.add(pipeline_run)
    db.commit()
    
    steps = []
    total_in = 0
    total_out = 0
    conn = get_duckdb_conn()
    
    try:
        # Step 1: Bronze Ingestion
        step1_start = time.time()
        bronze_results = ingest_bronze_layer(conn, run_id)
        step1_duration = int((time.time() - step1_start) * 1000)
        total_in = sum(bronze_results.values())
        steps.append({
            "step_name": "bronze_ingestion",
            "layer": "Bronze",
            "status": "COMPLETED",
            "duration_ms": step1_duration,
            "details": f"Ingested {total_in} raw records across {len(bronze_results)} tables."
        })
        
        # Controlled Failure Injection Check
        if inject_failure:
            raise RuntimeError("SIMULATED_DATA_CORRUPTION: Injected failure in transformation step to verify pipeline recovery.")
            
        # Step 2: Silver Cleaning & Quarantine
        step2_start = time.time()
        silver_results, quarantine_items = transform_silver_layer(conn, run_id, db)
        step2_duration = int((time.time() - step2_start) * 1000)
        steps.append({
            "step_name": "silver_cleansing_and_quarantine",
            "layer": "Silver",
            "status": "COMPLETED",
            "duration_ms": step2_duration,
            "details": f"Cleaned records. Quarantined {len(quarantine_items)} defective rows into governance quarantine."
        })
        
        # Step 3: Gold Warehouse & Dimensional Marts
        step3_start = time.time()
        gold_results = transform_gold_layer(conn, run_id)
        step3_duration = int((time.time() - step3_start) * 1000)
        total_out = gold_results.get("fact_orders", 0) + gold_results.get("fact_order_items", 0)
        steps.append({
            "step_name": "gold_star_schema_marts",
            "layer": "Gold",
            "status": "COMPLETED",
            "duration_ms": step3_duration,
            "details": f"Modeled facts and dimensions. fact_orders: {gold_results.get('fact_orders', 0)}, fact_items: {gold_results.get('fact_order_items', 0)}"
        })
        
        # Step 4: Quality & Integrity Suite
        step4_start = time.time()
        quality_summary = run_quality_suite(conn, run_id, db)
        step4_duration = int((time.time() - step4_start) * 1000)
        steps.append({
            "step_name": "data_quality_verification",
            "layer": "Observability",
            "status": "COMPLETED" if quality_summary["failed_rules"] == 0 else "WARNING",
            "duration_ms": step4_duration,
            "details": f"Evaluated {quality_summary['total_rules']} quality rules. Passed: {quality_summary['passed_rules']}, Failed: {quality_summary['failed_rules']}."
        })
        
        duration_ms = int((time.time() - t0) * 1000)
        pipeline_run.status = "COMPLETED"
        pipeline_run.end_time = datetime.utcnow()
        pipeline_run.duration_ms = duration_ms
        pipeline_run.records_in = total_in
        pipeline_run.records_out = total_out
        pipeline_run.execution_steps = steps
        db.commit()
        
        # Update Provenance processed status
        for s in db.query(SourceProvenance).all():
            s.last_processed_at = datetime.utcnow()
            s.ingestion_status = "PROCESSED"
        db.commit()
        
        return {
            "run_id": run_id,
            "status": "COMPLETED",
            "duration_ms": duration_ms,
            "records_in": total_in,
            "records_out": total_out,
            "steps": steps,
            "quality": quality_summary
        }
        
    except Exception as e:
        duration_ms = int((time.time() - t0) * 1000)
        pipeline_run.status = "FAILED"
        pipeline_run.end_time = datetime.utcnow()
        pipeline_run.duration_ms = duration_ms
        pipeline_run.error_message = str(e)
        steps.append({
            "step_name": "pipeline_failure",
            "layer": "Pipeline",
            "status": "FAILED",
            "duration_ms": 0,
            "details": str(e)
        })
        pipeline_run.execution_steps = steps
        db.commit()
        return {
            "run_id": run_id,
            "status": "FAILED",
            "duration_ms": duration_ms,
            "error_message": str(e),
            "steps": steps
        }
    finally:
        conn.close()
        db.close()

def recover_failed_pipeline(failed_run_id: str) -> Dict[str, Any]:
    """
    Recovers from a failed pipeline run by retrying without failure injection
    and verifying idempotent warehouse state.
    """
    db = SessionLocal()
    try:
        prev_run = db.query(PipelineRun).filter(PipelineRun.run_id == failed_run_id).first()
        if not prev_run:
            raise ValueError(f"Run ID {failed_run_id} not found.")
            
        recovery_result = run_full_pipeline(trigger_type="RECOVERY_RETRY", inject_failure=False)
        prev_run.recovery_attempted = True
        db.commit()
        
        return {
            "original_failed_run": failed_run_id,
            "recovery_status": recovery_result["status"],
            "new_run_id": recovery_result["run_id"],
            "duration_ms": recovery_result["duration_ms"]
        }
    finally:
        db.close()

def ingest_bronze_layer(conn: duckdb.DuckDBPyConnection, run_id: str) -> Dict[str, int]:
    """Preserves raw CSV files into DuckDB bronze tables with provenance metadata."""
    counts = {}
    
    file_table_map = {
        "olist_orders_dataset.csv": "bronze_orders",
        "olist_order_items_dataset.csv": "bronze_order_items",
        "olist_order_payments_dataset.csv": "bronze_order_payments",
        "olist_products_dataset.csv": "bronze_products",
        "olist_customers_dataset.csv": "bronze_customers",
        "olist_sellers_dataset.csv": "bronze_sellers",
        "olist_order_reviews_dataset.csv": "bronze_order_reviews",
        "product_category_name_translation.csv": "bronze_category_translation"
    }
    
    for filename, tablename in file_table_map.items():
        filepath = RAW_DIR / filename
        if filepath.exists():
            clean_path = str(filepath).replace('\\', '/')
            conn.execute(f"DROP TABLE IF EXISTS {tablename};")
            conn.execute(f"""
                CREATE TABLE {tablename} AS 
                SELECT *, 
                       '{run_id}' AS _run_id, 
                       CURRENT_TIMESTAMP AS _ingested_at,
                       '{filename}' AS _source_file
                FROM read_csv_auto('{clean_path}', all_varchar=True);
            """)
            c = conn.execute(f"SELECT COUNT(*) FROM {tablename}").fetchone()[0]
            counts[tablename] = c
        else:
            counts[tablename] = 0
            
    return counts

def transform_silver_layer(conn: duckdb.DuckDBPyConnection, run_id: str, db) -> tuple:
    """
    Cleanses, parses data types, standardizes timestamps,
    and isolates defective records into quarantine.
    """
    quarantined = []
    
    # 1. Silver Orders: Type casting & validation
    conn.execute("DROP TABLE IF EXISTS silver_orders;")
    conn.execute("""
        CREATE TABLE silver_orders AS
        SELECT 
            order_id,
            customer_id,
            order_status,
            TRY_CAST(order_purchase_timestamp AS TIMESTAMP) AS order_purchase_timestamp,
            TRY_CAST(order_approved_at AS TIMESTAMP) AS order_approved_at,
            TRY_CAST(order_delivered_carrier_date AS TIMESTAMP) AS order_delivered_carrier_date,
            TRY_CAST(order_delivered_customer_date AS TIMESTAMP) AS order_delivered_customer_date,
            TRY_CAST(order_estimated_delivery_date AS TIMESTAMP) AS order_estimated_delivery_date,
            _run_id,
            CURRENT_TIMESTAMP AS _transformed_at
        FROM bronze_orders
        WHERE order_id IS NOT NULL 
          AND customer_id IS NOT NULL;
    """)
    
    # Quarantine orders with delivered_date before purchase_date (temporal anomaly)
    invalid_delivery_orders = conn.execute("""
        SELECT order_id, order_purchase_timestamp, order_delivered_customer_date
        FROM silver_orders
        WHERE order_delivered_customer_date IS NOT NULL
          AND order_delivered_customer_date < order_purchase_timestamp;
    """).fetchall()
    
    for row in invalid_delivery_orders:
        q = QuarantineRecord(
            run_id=run_id,
            entity_name="orders",
            record_identifier=str(row[0]),
            violated_rule="TEMPORAL_LOGIC_DELIVERY_BEFORE_PURCHASE",
            severity="WARNING",
            reason=f"Delivered date ({row[2]}) is prior to order purchase timestamp ({row[1]}).",
            raw_payload={"order_id": row[0], "purchase": str(row[1]), "delivered": str(row[2])}
        )
        db.add(q)
        quarantined.append(q)
        
    # 2. Silver Order Items: Cast numeric prices & freight
    conn.execute("DROP TABLE IF EXISTS silver_order_items;")
    conn.execute("""
        CREATE TABLE silver_order_items AS
        SELECT 
            order_id,
            TRY_CAST(order_item_id AS INTEGER) AS order_item_id,
            product_id,
            seller_id,
            TRY_CAST(shipping_limit_date AS TIMESTAMP) AS shipping_limit_date,
            TRY_CAST(price AS DOUBLE) AS price,
            TRY_CAST(freight_value AS DOUBLE) AS freight_value,
            _run_id,
            CURRENT_TIMESTAMP AS _transformed_at
        FROM bronze_order_items
        WHERE order_id IS NOT NULL 
          AND product_id IS NOT NULL
          AND TRY_CAST(price AS DOUBLE) >= 0;
    """)
    
    # Check for negative price anomalies to quarantine
    negative_prices = conn.execute("""
        SELECT order_id, order_item_id, price 
        FROM bronze_order_items
        WHERE TRY_CAST(price AS DOUBLE) < 0;
    """).fetchall()
    for row in negative_prices:
        q = QuarantineRecord(
            run_id=run_id,
            entity_name="order_items",
            record_identifier=f"{row[0]}-{row[1]}",
            violated_rule="INVALID_NEGATIVE_PRICE",
            severity="ERROR",
            reason=f"Item price is negative ({row[2]}).",
            raw_payload={"order_id": row[0], "order_item_id": row[1], "price": row[2]}
        )
        db.add(q)
        quarantined.append(q)

    # 3. Silver Order Payments
    conn.execute("DROP TABLE IF EXISTS silver_order_payments;")
    conn.execute("""
        CREATE TABLE silver_order_payments AS
        SELECT 
            order_id,
            TRY_CAST(payment_sequential AS INTEGER) AS payment_sequential,
            payment_type,
            TRY_CAST(payment_installments AS INTEGER) AS payment_installments,
            TRY_CAST(payment_value AS DOUBLE) AS payment_value,
            _run_id,
            CURRENT_TIMESTAMP AS _transformed_at
        FROM bronze_order_payments
        WHERE order_id IS NOT NULL;
    """)
    
    # 4. Silver Products + Category Translation
    conn.execute("DROP TABLE IF EXISTS silver_products;")
    conn.execute("""
        CREATE TABLE silver_products AS
        SELECT 
            p.product_id,
            COALESCE(t.product_category_name_english, p.product_category_name, 'unspecified') AS category_name,
            TRY_CAST(p.product_name_lenght AS INTEGER) AS product_name_length,
            TRY_CAST(p.product_description_lenght AS INTEGER) AS product_desc_length,
            TRY_CAST(p.product_photos_qty AS INTEGER) AS product_photos_qty,
            TRY_CAST(p.product_weight_g AS DOUBLE) AS product_weight_g,
            TRY_CAST(p.product_length_cm AS DOUBLE) AS product_length_cm,
            TRY_CAST(p.product_height_cm AS DOUBLE) AS product_height_cm,
            TRY_CAST(p.product_width_cm AS DOUBLE) AS product_width_cm
        FROM bronze_products p
        LEFT JOIN bronze_category_translation t 
          ON p.product_category_name = t.product_category_name;
    """)
    
    # 5. Silver Customers
    conn.execute("DROP TABLE IF EXISTS silver_customers;")
    conn.execute("""
        CREATE TABLE silver_customers AS
        SELECT 
            customer_id,
            customer_unique_id,
            customer_zip_code_prefix,
            LOWER(TRIM(customer_city)) AS customer_city,
            UPPER(TRIM(customer_state)) AS customer_state
        FROM bronze_customers
        WHERE customer_id IS NOT NULL;
    """)
    
    # 6. Silver Sellers
    conn.execute("DROP TABLE IF EXISTS silver_sellers;")
    conn.execute("""
        CREATE TABLE silver_sellers AS
        SELECT 
            seller_id,
            seller_zip_code_prefix,
            LOWER(TRIM(seller_city)) AS seller_city,
            UPPER(TRIM(seller_state)) AS seller_state
        FROM bronze_sellers
        WHERE seller_id IS NOT NULL;
    """)

    # 7. Silver Reviews
    conn.execute("DROP TABLE IF EXISTS silver_order_reviews;")
    conn.execute("""
        CREATE TABLE silver_order_reviews AS
        SELECT 
            review_id,
            order_id,
            TRY_CAST(review_score AS INTEGER) AS review_score,
            review_comment_title,
            review_comment_message,
            TRY_CAST(review_creation_date AS TIMESTAMP) AS review_creation_date,
            TRY_CAST(review_answer_timestamp AS TIMESTAMP) AS review_answer_timestamp
        FROM bronze_order_reviews
        WHERE review_id IS NOT NULL AND order_id IS NOT NULL;
    """)
    
    db.commit()
    return {"quarantined_count": len(quarantined)}, quarantined

def transform_gold_layer(conn: duckdb.DuckDBPyConnection, run_id: str) -> Dict[str, int]:
    """
    Builds the Dimensional Star Schema and Analytical Marts.
    Avoids double-counting revenue by properly isolating order items from payment totals.
    """
    counts = {}
    
    # 1. Dimension Tables
    conn.execute("DROP TABLE IF EXISTS dim_customers;")
    conn.execute("""
        CREATE TABLE dim_customers AS 
        SELECT DISTINCT customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state 
        FROM silver_customers;
    """)
    
    conn.execute("DROP TABLE IF EXISTS dim_products;")
    conn.execute("""
        CREATE TABLE dim_products AS 
        SELECT * FROM silver_products;
    """)
    
    conn.execute("DROP TABLE IF EXISTS dim_sellers;")
    conn.execute("""
        CREATE TABLE dim_sellers AS 
        SELECT * FROM silver_sellers;
    """)
    
    # 2. Fact Order Items
    conn.execute("DROP TABLE IF EXISTS fact_order_items;")
    conn.execute("""
        CREATE TABLE fact_order_items AS
        SELECT 
            i.order_id,
            i.order_item_id,
            i.product_id,
            i.seller_id,
            i.shipping_limit_date,
            i.price AS item_price,
            i.freight_value,
            (i.price + i.freight_value) AS total_item_cost
        FROM silver_order_items i;
    """)
    counts["fact_order_items"] = conn.execute("SELECT COUNT(*) FROM fact_order_items").fetchone()[0]

    # 3. Fact Orders: Reconciles item values, freight, payments, and delivery lead time
    conn.execute("DROP TABLE IF EXISTS fact_orders;")
    conn.execute("""
        CREATE TABLE fact_orders AS
        WITH item_agg AS (
            SELECT 
                order_id,
                COUNT(order_item_id) AS total_items,
                SUM(price) AS total_item_value,
                SUM(freight_value) AS total_freight_value,
                SUM(price + freight_value) AS total_order_cost
            FROM silver_order_items
            GROUP BY order_id
        ),
        payment_agg AS (
            SELECT 
                order_id,
                COUNT(payment_sequential) AS payment_transactions,
                COUNT(payment_sequential) AS payment_transactions_count,
                SUM(payment_value) AS total_payment_value,
                STRING_AGG(DISTINCT payment_type, ', ') AS payment_methods
            FROM silver_order_payments
            GROUP BY order_id
        )
        SELECT 
            o.order_id,
            o.customer_id,
            o.order_status,
            o.order_purchase_timestamp,
            CAST(o.order_purchase_timestamp AS DATE) AS order_purchase_date,
            o.order_approved_at,
            o.order_delivered_carrier_date,
            o.order_delivered_customer_date,
            o.order_estimated_delivery_date,
            -- Calculated Lead Times
            ROUND(EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_purchase_timestamp)) / 86400.0, 2) AS delivery_days,
            ROUND(EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_purchase_timestamp)) / 86400.0, 2) AS delivery_lead_time_days,
            ROUND(EXTRACT(EPOCH FROM (o.order_estimated_delivery_date - o.order_delivered_customer_date)) / 86400.0, 2) AS estimated_delivery_margin_days,
            CASE WHEN o.order_delivered_customer_date <= o.order_estimated_delivery_date THEN 1 ELSE 0 END AS is_delivered_on_time,
            -- Financial Aggregates
            COALESCE(i.total_items, 0) AS total_items,
            COALESCE(i.total_item_value, 0.0) AS total_item_value,
            COALESCE(i.total_freight_value, 0.0) AS total_freight_value,
            COALESCE(i.total_order_cost, 0.0) AS total_order_cost,
            COALESCE(p.total_payment_value, 0.0) AS total_payment_value,
            COALESCE(p.payment_transactions, 0) AS payment_transactions,
            COALESCE(p.payment_transactions_count, 0) AS payment_transactions_count,
            p.payment_methods,
            p.payment_methods AS payment_methods_list,
            -- Financial Reconciliation Difference (order total vs payments)
            ROUND(ABS(COALESCE(i.total_order_cost, 0.0) - COALESCE(p.total_payment_value, 0.0)), 2) AS reconciliation_variance
        FROM silver_orders o
        LEFT JOIN item_agg i ON o.order_id = i.order_id
        LEFT JOIN payment_agg p ON o.order_id = p.order_id;
    """)
    counts["fact_orders"] = conn.execute("SELECT COUNT(*) FROM fact_orders").fetchone()[0]

    # 4. Analytical Mart: Daily Sales & Operational Performance
    conn.execute("DROP TABLE IF EXISTS mart_daily_sales;")
    conn.execute("""
        CREATE TABLE mart_daily_sales AS
        SELECT 
            CAST(order_purchase_timestamp AS DATE) AS order_date,
            COUNT(DISTINCT order_id) AS total_orders,
            SUM(total_items) AS items_sold,
            ROUND(SUM(total_item_value), 2) AS observed_sales,
            ROUND(SUM(total_freight_value), 2) AS observed_freight,
            ROUND(AVG(total_order_cost), 2) AS avg_order_value,
            ROUND(AVG(delivery_days), 1) AS avg_delivery_days
        FROM fact_orders
        WHERE order_purchase_timestamp IS NOT NULL
        GROUP BY CAST(order_purchase_timestamp AS DATE)
        ORDER BY order_date;
    """)

    # 5. Analytical Mart: Category Performance
    conn.execute("DROP TABLE IF EXISTS mart_category_performance;")
    conn.execute("""
        CREATE TABLE mart_category_performance AS
        SELECT 
            p.category_name,
            COUNT(DISTINCT i.order_id) AS distinct_orders,
            COUNT(i.order_item_id) AS items_sold,
            ROUND(SUM(i.item_price), 2) AS total_observed_sales,
            ROUND(AVG(i.item_price), 2) AS avg_item_price,
            ROUND(AVG(i.freight_value), 2) AS avg_freight
        FROM fact_order_items i
        JOIN dim_products p ON i.product_id = p.product_id
        GROUP BY p.category_name
        ORDER BY total_observed_sales DESC;
    """)
    
    return counts

def run_quality_suite(conn: duckdb.DuckDBPyConnection, run_id: str, db) -> Dict[str, Any]:
    """
    Executes a comprehensive suite of 10 automated data quality checks covering:
    - Completeness
    - Uniqueness
    - Validity
    - Referential integrity
    - Financial reconciliation
    """
    rules = [
        {
            "id": "QC_001_ORDER_PK_UNIQUENESS",
            "name": "Order Primary Key Uniqueness",
            "category": "UNIQUENESS",
            "target": "silver_orders",
            "query": "SELECT COUNT(*) - COUNT(DISTINCT order_id) FROM silver_orders;",
            "rationale": "Every order in the warehouse must possess a globally unique identifier.",
            "threshold": 0
        },
        {
            "id": "QC_002_ORDER_CUSTOMER_COMPLETENESS",
            "name": "Order Customer Reference Completeness",
            "category": "COMPLETENESS",
            "target": "silver_orders",
            "query": "SELECT COUNT(*) FROM silver_orders WHERE customer_id IS NULL;",
            "rationale": "Orders without a customer reference break cohort and geographic attribution.",
            "threshold": 0
        },
        {
            "id": "QC_003_ORDER_TEMPORAL_LOGIC",
            "name": "Order Lifecycle Temporal Sequence Check",
            "category": "VALIDITY",
            "target": "silver_orders",
            "query": "SELECT COUNT(*) FROM silver_orders WHERE order_delivered_customer_date < order_purchase_timestamp;",
            "rationale": "Delivery timestamp cannot precede the original purchase timestamp.",
            "threshold": 0
        },
        {
            "id": "QC_004_ITEM_PRICE_NON_NEGATIVE",
            "name": "Order Item Non-Negative Price Check",
            "category": "VALIDITY",
            "target": "silver_order_items",
            "query": "SELECT COUNT(*) FROM silver_order_items WHERE price < 0;",
            "rationale": "Item prices must be strictly non-negative numbers.",
            "threshold": 0
        },
        {
            "id": "QC_005_ITEM_FREIGHT_NON_NEGATIVE",
            "name": "Order Item Non-Negative Freight Check",
            "category": "VALIDITY",
            "target": "silver_order_items",
            "query": "SELECT COUNT(*) FROM silver_order_items WHERE freight_value < 0;",
            "rationale": "Shipping charges cannot be negative.",
            "threshold": 0
        },
        {
            "id": "QC_006_ITEM_PRODUCT_FK_INTEGRITY",
            "name": "Order Item to Product Catalog Referential Integrity",
            "category": "INTEGRITY",
            "target": "fact_order_items",
            "query": "SELECT COUNT(*) FROM fact_order_items i LEFT JOIN dim_products p ON i.product_id = p.product_id WHERE p.product_id IS NULL;",
            "rationale": "Every purchased order item must link to a valid product in the product catalog.",
            "threshold": 0
        },
        {
            "id": "QC_007_ORDER_CUSTOMER_FK_INTEGRITY",
            "name": "Fact Order to Customer Dimension Referential Integrity",
            "category": "INTEGRITY",
            "target": "fact_orders",
            "query": "SELECT COUNT(*) FROM fact_orders o LEFT JOIN dim_customers c ON o.customer_id = c.customer_id WHERE c.customer_id IS NULL;",
            "rationale": "All orders must resolve to an existing customer record.",
            "threshold": 0
        },
        {
            "id": "QC_008_PAYMENT_VALUE_VALIDITY",
            "name": "Payment Transaction Value Validity",
            "category": "VALIDITY",
            "target": "silver_order_payments",
            "query": "SELECT COUNT(*) FROM silver_order_payments WHERE payment_value < 0;",
            "rationale": "Payment transactions must not have negative amounts.",
            "threshold": 0
        },
        {
            "id": "QC_009_FINANCIAL_RECONCILIATION",
            "name": "Order Total vs Payment Total Reconciliation",
            "category": "RECONCILIATION",
            "target": "fact_orders",
            "query": "SELECT COUNT(*) FROM fact_orders WHERE order_status = 'delivered' AND reconciliation_variance > 1.0;",
            "rationale": "For delivered orders, customer payment totals should match the sum of items and freight within rounding variance.",
            "threshold": 500 # Threshold accounting for vouchers and complex promo splits
        },
        {
            "id": "QC_010_ORDER_STATUS_VALIDITY",
            "name": "Permitted Order Status Vocabulary",
            "category": "VALIDITY",
            "target": "fact_orders",
            "query": "SELECT COUNT(*) FROM fact_orders WHERE order_status NOT IN ('delivered', 'shipped', 'canceled', 'invoiced', 'processing', 'created', 'approved', 'unavailable');",
            "rationale": "Order status values must conform to the documented e-commerce lifecycle vocabulary.",
            "threshold": 0
        }
    ]
    
    passed_rules = 0
    failed_rules = 0
    
    for r in rules:
        try:
            failed_count = conn.execute(r["query"]).fetchone()[0]
            status = "PASSED" if failed_count <= r["threshold"] else "FAILED"
            if status == "PASSED":
                passed_rules += 1
            else:
                failed_rules += 1
                
            qc = QualityCheckResult(
                run_id=run_id,
                rule_id=r["id"],
                rule_name=r["name"],
                rule_category=r["category"],
                target_entity=r["target"],
                severity="ERROR" if r["threshold"] == 0 else "WARNING",
                status=status,
                records_evaluated=100000, # approximate base evaluated
                records_failed=failed_count,
                failure_rate=round(failed_count / 100000.0, 4),
                rationale=r["rationale"],
                failure_sample={"failed_count": failed_count, "threshold": r["threshold"]}
            )
            db.add(qc)
        except Exception as ex:
            qc = QualityCheckResult(
                run_id=run_id,
                rule_id=r["id"],
                rule_name=r["name"],
                rule_category=r["category"],
                target_entity=r["target"],
                severity="ERROR",
                status="FAILED",
                records_evaluated=0,
                records_failed=1,
                failure_rate=1.0,
                rationale=r["rationale"],
                failure_sample={"error": str(ex)}
            )
            db.add(qc)
            failed_rules += 1
            
    db.commit()
    return {
        "total_rules": len(rules),
        "passed_rules": passed_rules,
        "failed_rules": failed_rules
    }
