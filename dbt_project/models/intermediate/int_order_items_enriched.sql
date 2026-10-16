WITH items AS (
    SELECT * FROM {{ ref('stg_order_items') }}
),

products AS (
    SELECT * FROM {{ ref('stg_products') }}
),

categories AS (
    SELECT * FROM {{ ref('stg_category_translations') }}
),

sellers AS (
    SELECT * FROM {{ ref('stg_sellers') }}
),

enriched AS (
    SELECT
        i.order_id,
        i.order_item_id,
        i.product_id,
        i.seller_id,
        i.shipping_limit_date,
        i.item_price,
        i.freight_value,
        i.total_item_cost,
        COALESCE(c.product_category_name_english, p.product_category_name, 'unspecified') AS category_name,
        p.product_weight_g,
        p.product_length_cm,
        p.product_height_cm,
        p.product_width_cm,
        s.seller_city,
        s.seller_state
    FROM items i
    LEFT JOIN products p ON i.product_id = p.product_id
    LEFT JOIN categories c ON p.product_category_name = c.product_category_name
    LEFT JOIN sellers s ON i.seller_id = s.seller_id
)

SELECT * FROM enriched
