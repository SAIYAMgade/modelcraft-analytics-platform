WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

fulfillment AS (
    SELECT
        order_id,
        customer_id,
        order_status,
        order_purchase_timestamp,
        order_approved_at,
        order_delivered_carrier_date,
        order_delivered_customer_date,
        order_estimated_delivery_date,
        -- Approval Lead Time in Hours
        ROUND(EXTRACT(EPOCH FROM (order_approved_at - order_purchase_timestamp)) / 3600.0, 2) AS approval_delay_hours,
        -- Carrier Transit Time in Days
        ROUND(EXTRACT(EPOCH FROM (order_delivered_customer_date - order_delivered_carrier_date)) / 86400.0, 2) AS carrier_transit_days,
        -- Total Customer Delivery Lead Time in Days
        ROUND(EXTRACT(EPOCH FROM (order_delivered_customer_date - order_purchase_timestamp)) / 86400.0, 2) AS delivery_lead_time_days,
        -- Delivery Margin vs SLA in Days (positive = delivered ahead of deadline, negative = late)
        ROUND(EXTRACT(EPOCH FROM (order_estimated_delivery_date - order_delivered_customer_date)) / 86400.0, 2) AS estimated_delivery_margin_days,
        -- Status Flags
        CASE 
            WHEN order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date <= order_estimated_delivery_date THEN 1
            WHEN order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date > order_estimated_delivery_date THEN 0
            ELSE NULL 
        END AS is_delivered_on_time,
        CASE
            WHEN order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date > order_estimated_delivery_date THEN 1
            WHEN order_delivered_customer_date IS NOT NULL THEN 0
            ELSE NULL
        END AS is_delayed
    FROM orders
)

SELECT * FROM fulfillment
