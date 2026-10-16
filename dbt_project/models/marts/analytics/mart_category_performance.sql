WITH perf AS (
    SELECT
        category_name,
        total_orders AS distinct_orders,
        total_units_sold AS items_sold,
        total_item_revenue AS total_observed_sales,
        avg_unit_price AS avg_item_price,
        avg_freight_per_item AS avg_freight
    FROM {{ ref('mart_product_performance') }}
)

SELECT * FROM perf
