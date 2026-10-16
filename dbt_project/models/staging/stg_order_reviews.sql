WITH source AS (
    SELECT * FROM {{ source('bronze', 'bronze_order_reviews') }}
),

renamed_and_cast AS (
    SELECT
        review_id,
        order_id,
        TRY_CAST(review_score AS INTEGER) AS review_score,
        review_comment_title,
        review_comment_message,
        TRY_CAST(review_creation_date AS TIMESTAMP) AS review_creation_date,
        TRY_CAST(review_answer_timestamp AS TIMESTAMP) AS review_answer_timestamp
    FROM source
    WHERE review_id IS NOT NULL 
      AND order_id IS NOT NULL
)

SELECT * FROM renamed_and_cast
