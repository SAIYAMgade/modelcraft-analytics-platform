WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_sellers') }}
),

renamed_and_cast AS (
    SELECT
        seller_id,
        seller_zip_code_prefix,
        LOWER(TRIM(seller_city)) AS seller_city,
        UPPER(TRIM(seller_state)) AS seller_state
    FROM source
    WHERE seller_id IS NOT NULL
)

SELECT * FROM renamed_and_cast
