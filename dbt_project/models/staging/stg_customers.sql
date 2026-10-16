WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_customers') }}
),

renamed_and_cast AS (
    SELECT
        customer_id,
        customer_unique_id,
        customer_zip_code_prefix,
        LOWER(TRIM(customer_city)) AS customer_city,
        UPPER(TRIM(customer_state)) AS customer_state
    FROM source
    WHERE customer_id IS NOT NULL
)

SELECT * FROM renamed_and_cast
