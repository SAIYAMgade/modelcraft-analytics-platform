import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
QUARANTINE_DIR = DATA_DIR / "quarantine"
WAREHOUSE_DIR = DATA_DIR / "warehouse"
DOCUMENTS_DIR = DATA_DIR / "documents"

# Ensure directories exist
for p in [RAW_DIR, PROCESSED_DIR, QUARANTINE_DIR, WAREHOUSE_DIR, DOCUMENTS_DIR]:
    p.mkdir(parents=True, exist_ok=True)

SQLITE_DB_PATH = WAREHOUSE_DIR / "commerceflow_meta.db"
DUCKDB_PATH = WAREHOUSE_DIR / "commerceflow_analytics.duckdb"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_DB_PATH}")

# Source configuration
OLIST_REPO_BASE_URL = "https://raw.githubusercontent.com/olist/work-at-olist-data/master/datasets"
OLIST_FILES = {
    "olist_orders_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_orders_dataset.csv",
        "description": "Core order header table containing customer reference, status, and lifecycle timestamps.",
        "entity": "orders"
    },
    "olist_order_items_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_order_items_dataset.csv",
        "description": "Order line items detailing product reference, seller, shipping limit, price and freight.",
        "entity": "order_items"
    },
    "olist_order_payments_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_order_payments_dataset.csv",
        "description": "Payment transactions per order including payment type, installments, and transaction values.",
        "entity": "order_payments"
    },
    "olist_products_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_products_dataset.csv",
        "description": "Product catalog with categories, dimensions, and weights.",
        "entity": "products"
    },
    "olist_customers_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_customers_dataset.csv",
        "description": "Customer registry mapping orders to customer zip prefixes, cities, and states.",
        "entity": "customers"
    },
    "olist_sellers_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_sellers_dataset.csv",
        "description": "Seller directory mapping merchant identifiers to locations.",
        "entity": "sellers"
    },
    "olist_order_reviews_dataset.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/olist_order_reviews_dataset.csv",
        "description": "Customer satisfaction review scores (1-5) and feedback timestamps.",
        "entity": "order_reviews"
    },
    "product_category_name_translation.csv": {
        "url": f"{OLIST_REPO_BASE_URL}/product_category_name_translation.csv",
        "description": "Category name translation dictionary from Portuguese to English.",
        "entity": "category_translation"
    }
}
