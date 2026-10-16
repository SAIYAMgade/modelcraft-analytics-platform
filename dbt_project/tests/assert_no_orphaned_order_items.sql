-- Test fails if any order item points to a non-existent fact_orders record
SELECT
    i.order_id,
    i.order_item_id
FROM {{ ref('fact_order_items') }} i
LEFT JOIN {{ ref('fact_orders') }} o ON i.order_id = o.order_id
WHERE o.order_id IS NULL
