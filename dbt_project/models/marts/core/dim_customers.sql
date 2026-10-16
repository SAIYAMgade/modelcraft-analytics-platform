WITH customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),

orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

customer_orders AS (
    SELECT
        c.customer_unique_id,
        COUNT(DISTINCT o.order_id) AS lifetime_orders_count,
        MIN(o.order_purchase_timestamp) AS first_order_timestamp,
        MAX(o.order_purchase_timestamp) AS latest_order_timestamp
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_unique_id
)

SELECT
    c.customer_id,
    c.customer_unique_id,
    c.customer_zip_code_prefix,
    c.customer_city,
    c.customer_state,
    co.lifetime_orders_count,
    co.first_order_timestamp,
    co.latest_order_timestamp,
    CASE WHEN co.lifetime_orders_count > 1 THEN 1 ELSE 0 END AS is_repeat_buyer
FROM customers c
LEFT JOIN customer_orders co ON c.customer_unique_id = co.customer_unique_id
