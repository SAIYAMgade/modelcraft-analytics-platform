WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_products') }}
),

renamed_and_cast AS (
    SELECT
        product_id,
        COALESCE(product_category_name, 'unspecified') AS product_category_name,
        TRY_CAST(product_name_lenght AS INTEGER) AS product_name_length,
        TRY_CAST(product_description_lenght AS INTEGER) AS product_description_length,
        TRY_CAST(product_photos_qty AS INTEGER) AS product_photos_qty,
        TRY_CAST(product_weight_g AS DOUBLE) AS product_weight_g,
        TRY_CAST(product_length_cm AS DOUBLE) AS product_length_cm,
        TRY_CAST(product_height_cm AS DOUBLE) AS product_height_cm,
        TRY_CAST(product_width_cm AS DOUBLE) AS product_width_cm
    FROM source
    WHERE product_id IS NOT NULL
)

SELECT * FROM renamed_and_cast
