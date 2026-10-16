WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

fulfillment AS (
    SELECT * FROM {{ ref('int_order_fulfillment') }}
),

item_metrics AS (
    SELECT
        order_id,
        COUNT(order_item_id) AS total_items,
        ROUND(SUM(item_price), 2) AS total_item_value,
        ROUND(SUM(freight_value), 2) AS total_freight_value,
        ROUND(SUM(total_item_cost), 2) AS total_order_cost
    FROM {{ ref('stg_order_items') }}
    GROUP BY order_id
),

payment_metrics AS (
    SELECT
        order_id,
        payment_transactions_count,
        total_payment_value,
        payment_methods_list,
        max_installments,
        has_credit_card,
        has_voucher,
        has_boleto
    FROM {{ ref('int_order_payments_aggregated') }}
)

SELECT
    o.order_id,
    o.customer_id,
    o.order_status,
    o.order_purchase_timestamp,
    CAST(o.order_purchase_timestamp AS DATE) AS order_purchase_date,
    o.order_approved_at,
    o.order_delivered_carrier_date,
    o.order_delivered_customer_date,
    o.order_estimated_delivery_date,
    
    -- Operational & Fulfillment Measures
    f.approval_delay_hours,
    f.carrier_transit_days,
    f.delivery_lead_time_days,
    f.estimated_delivery_margin_days,
    f.is_delivered_on_time,
    f.is_delayed,
    
    -- Item Financial Measures (isolated from payment rows to avoid double-counting)
    COALESCE(i.total_items, 0) AS total_items,
    COALESCE(i.total_item_value, 0.0) AS total_item_value,
    COALESCE(i.total_freight_value, 0.0) AS total_freight_value,
    COALESCE(i.total_order_cost, 0.0) AS total_order_cost,
    
    -- Payment Financial Measures
    COALESCE(p.total_payment_value, 0.0) AS total_payment_value,
    COALESCE(p.payment_transactions_count, 0) AS payment_transactions_count,
    p.payment_methods_list,
    COALESCE(p.max_installments, 1) AS max_installments,
    COALESCE(p.has_credit_card, 0) AS has_credit_card,
    COALESCE(p.has_voucher, 0) AS has_voucher,
    COALESCE(p.has_boleto, 0) AS has_boleto,
    
    -- Financial Reconciliation Logic
    ROUND(ABS(COALESCE(i.total_order_cost, 0.0) - COALESCE(p.total_payment_value, 0.0)), 2) AS reconciliation_variance,
    CASE 
        WHEN ROUND(ABS(COALESCE(i.total_order_cost, 0.0) - COALESCE(p.total_payment_value, 0.0)), 2) <= 1.0 THEN 1 
        ELSE 0 
    END AS is_financially_balanced
FROM orders o
LEFT JOIN fulfillment f ON o.order_id = f.order_id
LEFT JOIN item_metrics i ON o.order_id = i.order_id
LEFT JOIN payment_metrics p ON o.order_id = p.order_id
