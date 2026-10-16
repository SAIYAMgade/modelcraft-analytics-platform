WITH daily AS (
    SELECT
        order_purchase_date AS date_day,
        order_purchase_date AS order_date,
        COUNT(DISTINCT order_id) AS total_orders,
        COUNT(DISTINCT CASE WHEN order_status = 'delivered' THEN order_id ELSE NULL END) AS delivered_orders,
        COUNT(DISTINCT CASE WHEN order_status = 'canceled' THEN order_id ELSE NULL END) AS canceled_orders,
        SUM(total_items) AS items_sold,
        ROUND(SUM(total_item_value), 2) AS gross_merchandise_value,
        ROUND(SUM(total_item_value), 2) AS observed_sales,
        ROUND(SUM(total_freight_value), 2) AS total_freight_value,
        ROUND(SUM(total_order_cost), 2) AS total_order_value,
        ROUND(AVG(total_order_cost), 2) AS avg_order_value,
        ROUND(AVG(CASE WHEN order_status = 'delivered' THEN delivery_lead_time_days ELSE NULL END), 1) AS avg_delivery_days
    FROM {{ ref('fact_orders') }}
    WHERE order_purchase_date IS NOT NULL
    GROUP BY order_purchase_date
)

SELECT * FROM daily
ORDER BY date_day
