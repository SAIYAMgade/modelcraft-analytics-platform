-- Test fails if any order has negative total order cost
SELECT
    order_id,
    total_order_cost
FROM {{ ref('fact_orders') }}
WHERE total_order_cost < 0
