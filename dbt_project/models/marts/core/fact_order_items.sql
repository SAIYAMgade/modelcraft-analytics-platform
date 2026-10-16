WITH items AS (
    SELECT * FROM {{ ref('int_order_items_enriched') }}
)

SELECT
    order_id,
    order_item_id,
    product_id,
    seller_id,
    shipping_limit_date,
    item_price,
    freight_value,
    total_item_cost,
    category_name,
    seller_city,
    seller_state
FROM items
