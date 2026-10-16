WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_order_items') }}
),

renamed_and_cast AS (
    SELECT
        order_id,
        TRY_CAST(order_item_id AS INTEGER) AS order_item_id,
        product_id,
        seller_id,
        TRY_CAST(shipping_limit_date AS TIMESTAMP) AS shipping_limit_date,
        TRY_CAST(price AS DOUBLE) AS item_price,
        TRY_CAST(freight_value AS DOUBLE) AS freight_value,
        ROUND(TRY_CAST(price AS DOUBLE) + TRY_CAST(freight_value AS DOUBLE), 2) AS total_item_cost
    FROM source
    WHERE order_id IS NOT NULL
      AND product_id IS NOT NULL
      AND seller_id IS NOT NULL
      AND TRY_CAST(price AS DOUBLE) >= 0
)

SELECT * FROM renamed_and_cast
