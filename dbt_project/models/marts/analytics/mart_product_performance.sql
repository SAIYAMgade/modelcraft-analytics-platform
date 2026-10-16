WITH items AS (
    SELECT * FROM {{ ref('fact_order_items') }}
),

products AS (
    SELECT * FROM {{ ref('dim_products') }}
),

perf AS (
    SELECT
        p.category_name,
        COUNT(DISTINCT i.order_id) AS total_orders,
        COUNT(i.order_item_id) AS total_units_sold,
        COUNT(DISTINCT i.product_id) AS distinct_products_sold,
        ROUND(SUM(i.item_price), 2) AS total_item_revenue,
        ROUND(SUM(i.freight_value), 2) AS total_freight_revenue,
        ROUND(SUM(i.total_item_cost), 2) AS total_gross_sales,
        ROUND(AVG(i.item_price), 2) AS avg_unit_price,
        ROUND(AVG(i.freight_value), 2) AS avg_freight_per_item
    FROM items i
    JOIN products p ON i.product_id = p.product_id
    GROUP BY p.category_name
)

SELECT * FROM perf
ORDER BY total_gross_sales DESC
