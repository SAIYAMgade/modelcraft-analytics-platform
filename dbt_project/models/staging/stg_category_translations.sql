WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_category_translation') }}
),

renamed_and_cast AS (
    SELECT
        LOWER(TRIM(product_category_name)) AS product_category_name,
        LOWER(TRIM(product_category_name_english)) AS product_category_name_english
    FROM source
    WHERE product_category_name IS NOT NULL
)

SELECT * FROM renamed_and_cast
