WITH sellers AS (
    SELECT * FROM {{ ref('stg_sellers') }}
)

SELECT
    seller_id,
    seller_zip_code_prefix,
    seller_city,
    seller_state
FROM sellers
