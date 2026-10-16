WITH date_spine AS (
    SELECT CAST(range AS DATE) AS date_day
    FROM range(DATE '2016-01-01', DATE '2019-01-01', INTERVAL 1 DAY)
),

final AS (
    SELECT
        date_day,
        EXTRACT(YEAR FROM date_day) AS year_num,
        EXTRACT(QUARTER FROM date_day) AS quarter_num,
        EXTRACT(MONTH FROM date_day) AS month_num,
        STRFTIME(date_day, '%B') AS month_name,
        STRFTIME(date_day, '%Y-%m') AS year_month,
        EXTRACT(DAYOFWEEK FROM date_day) AS day_of_week,
        STRFTIME(date_day, '%A') AS day_name,
        CASE WHEN EXTRACT(DAYOFWEEK FROM date_day) IN (0, 6) THEN true ELSE false END AS is_weekend
    FROM date_spine
)

SELECT * FROM final
ORDER BY date_day
