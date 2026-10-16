WITH payments AS (
    SELECT * FROM {{ ref('stg_order_payments') }}
),

aggregated AS (
    SELECT
        order_id,
        COUNT(payment_sequential) AS payment_transactions_count,
        ROUND(SUM(payment_value), 2) AS total_payment_value,
        MAX(payment_installments) AS max_installments,
        STRING_AGG(DISTINCT payment_type, ', ') AS payment_methods_list,
        -- Detect credit card usage
        MAX(CASE WHEN payment_type = 'credit_card' THEN 1 ELSE 0 END) AS has_credit_card,
        -- Detect voucher usage
        MAX(CASE WHEN payment_type = 'voucher' THEN 1 ELSE 0 END) AS has_voucher,
        -- Detect boleto usage
        MAX(CASE WHEN payment_type = 'boleto' THEN 1 ELSE 0 END) AS has_boleto
    FROM payments
    GROUP BY order_id
)

SELECT * FROM aggregated
