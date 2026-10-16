WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_order_payments') }}
),

renamed_and_cast AS (
    SELECT
        order_id,
        TRY_CAST(payment_sequential AS INTEGER) AS payment_sequential,
        LOWER(TRIM(payment_type)) AS payment_type,
        TRY_CAST(payment_installments AS INTEGER) AS payment_installments,
        ROUND(TRY_CAST(payment_value AS DOUBLE), 2) AS payment_value
    FROM source
    WHERE order_id IS NOT NULL
      AND TRY_CAST(payment_value AS DOUBLE) >= 0
)

SELECT * FROM renamed_and_cast
