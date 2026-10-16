WITH customer_stats AS (
    SELECT
        c.customer_unique_id,
        MAX(c.customer_state) AS customer_state,
        COUNT(DISTINCT o.order_id) AS total_orders,
        ROUND(SUM(o.total_order_cost), 2) AS total_spend,
        ROUND(AVG(o.total_order_cost), 2) AS avg_order_spend,
        MIN(o.order_purchase_timestamp) AS first_order_date,
        MAX(o.order_purchase_timestamp) AS latest_order_date
    FROM {{ ref('dim_customers') }} c
    JOIN {{ ref('fact_orders') }} o ON c.customer_id = o.customer_id
    GROUP BY c.customer_unique_id
),

segmented AS (
    SELECT
        CASE 
            WHEN total_orders = 1 THEN '1 Order (One-Time Buyer)'
            WHEN total_orders = 2 THEN '2 Orders (Returning Buyer)'
            WHEN total_orders BETWEEN 3 AND 5 THEN '3-5 Orders (Loyal Buyer)'
            ELSE '6+ Orders (VIP Power Buyer)'
        END AS buyer_cohort,
        COUNT(customer_unique_id) AS distinct_customers,
        SUM(total_orders) AS total_orders_placed,
        ROUND(SUM(total_spend), 2) AS total_cohort_spend,
        ROUND(AVG(total_spend), 2) AS avg_customer_lifetime_spend,
        ROUND(AVG(avg_order_spend), 2) AS avg_order_value
    FROM customer_stats
    GROUP BY 
        CASE 
            WHEN total_orders = 1 THEN '1 Order (One-Time Buyer)'
            WHEN total_orders = 2 THEN '2 Orders (Returning Buyer)'
            WHEN total_orders BETWEEN 3 AND 5 THEN '3-5 Orders (Loyal Buyer)'
            ELSE '6+ Orders (VIP Power Buyer)'
        END
)

SELECT * FROM segmented
ORDER BY distinct_customers DESC
