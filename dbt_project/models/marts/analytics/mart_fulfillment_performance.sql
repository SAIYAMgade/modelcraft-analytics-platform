WITH orders AS (
    SELECT * FROM {{ ref('fact_orders') }}
),

monthly_fulfillment AS (
    SELECT
        STRFTIME(order_purchase_timestamp, '%Y-%m') AS order_month,
        COUNT(order_id) AS total_orders_placed,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) AS delivered_orders,
        COUNT(CASE WHEN order_status = 'canceled' THEN 1 END) AS canceled_orders,
        COUNT(CASE WHEN is_delivered_on_time = 1 THEN 1 END) AS on_time_deliveries,
        COUNT(CASE WHEN is_delayed = 1 THEN 1 END) AS delayed_deliveries,
        ROUND(
            (COUNT(CASE WHEN is_delivered_on_time = 1 THEN 1 END) * 100.0) / 
            NULLIF(COUNT(CASE WHEN order_status = 'delivered' THEN 1 END), 0),
            2
        ) AS on_time_delivery_rate_pct,
        ROUND(AVG(approval_delay_hours), 2) AS avg_approval_hours,
        ROUND(AVG(carrier_transit_days), 2) AS avg_carrier_transit_days,
        ROUND(AVG(delivery_lead_time_days), 2) AS avg_total_delivery_days,
        ROUND(AVG(estimated_delivery_margin_days), 2) AS avg_sla_margin_days
    FROM orders
    WHERE order_purchase_timestamp IS NOT NULL
    GROUP BY STRFTIME(order_purchase_timestamp, '%Y-%m')
)

SELECT * FROM monthly_fulfillment
ORDER BY order_month
