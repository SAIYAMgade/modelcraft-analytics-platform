WITH products AS (
    SELECT * FROM {{ ref('stg_products') }}
),

categories AS (
    SELECT * FROM {{ ref('stg_category_translations') }}
),

final AS (
    SELECT
        p.product_id,
        COALESCE(c.product_category_name_english, p.product_category_name, 'unspecified') AS category_name,
        p.product_category_name AS raw_category_name,
        p.product_name_length,
        p.product_description_length,
        p.product_photos_qty,
        p.product_weight_g,
        p.product_length_cm,
        p.product_height_cm,
        p.product_width_cm,
        ROUND((p.product_length_cm * p.product_height_cm * p.product_width_cm) / 1000.0, 2) AS product_volume_liters
    FROM products p
    LEFT JOIN categories c ON p.product_category_name = c.product_category_name
)

SELECT * FROM final
