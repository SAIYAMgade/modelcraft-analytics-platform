WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_orders') }}
),

renamed_and_cast AS (
    SELECT
        order_id,
        customer_id,
        LOWER(TRIM(order_status)) AS order_status,
        TRY_CAST(order_purchase_timestamp AS TIMESTAMP) AS order_purchase_timestamp,
        TRY_CAST(order_approved_at AS TIMESTAMP) AS order_approved_at,
        TRY_CAST(order_delivered_carrier_date AS TIMESTAMP) AS order_delivered_carrier_date,
        TRY_CAST(order_delivered_customer_date AS TIMESTAMP) AS order_delivered_customer_date,
        TRY_CAST(order_estimated_delivery_date AS TIMESTAMP) AS order_estimated_delivery_date
    FROM source
    WHERE order_id IS NOT NULL 
      AND customer_id IS NOT NULL
)

SELECT * FROM renamed_and_cast
