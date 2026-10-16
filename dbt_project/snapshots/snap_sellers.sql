{% snapshot snap_sellers %}

{{
    config(
      target_schema='main',
      unique_key='seller_id',
      strategy='check',
      check_cols=['seller_city', 'seller_state', 'seller_zip_code_prefix']
    )
}}

/*
   HONEST HISTORICAL MODELING NOTE:
   The Brazilian Olist dataset provides static registry state for sellers (as of 2018).
   This SCD Type 2 snapshot demonstrates production change-data-capture tracking
   using dbt's 'check' strategy over merchant location attributes.
   Future batches or ongoing CDC event streams will populate new version rows
   with valid_from and valid_to timestamps when a seller relocates.
*/

SELECT
    seller_id,
    seller_zip_code_prefix,
    LOWER(TRIM(seller_city)) AS seller_city,
    UPPER(TRIM(seller_state)) AS seller_state
FROM {{ source('bronze', 'bronze_sellers') }}

{% endsnapshot %}
