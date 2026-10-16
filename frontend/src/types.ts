export interface OverviewData {
  status: string;
  timestamp: string;
  dataset_name: string;
  date_range: {
    start: string;
    end: string;
  };
  business_kpis: {
    total_orders: number;
    total_observed_sales: number;
    total_items_sold: number;
    currency: string;
  };
  governance: {
    last_pipeline_status: string;
    last_run_timestamp: string | null;
    last_run_duration_ms: number;
    quarantine_count: number;
    quality_score_pct: number;
  };
  glossary: Record<string, string>;
}

export interface SourceItem {
  id: number;
  source_name: string;
  source_url: string;
  license: string;
  file_fingerprint: string | null;
  file_size_bytes: number;
  retrieval_timestamp: string | null;
  file_format: string;
  schema_fields: string[];
  raw_record_count: number;
  accepted_record_count: number;
  quarantined_record_count: number;
  ingestion_status: string;
  last_processed_at: string | null;
  notes: string | null;
  file_exists: boolean;
}

export interface PipelineStep {
  step_name: string;
  layer: string;
  status: string;
  duration_ms: number;
  details: string;
}

export interface PipelineRunItem {
  run_id: string;
  pipeline_name: string;
  trigger_type: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_ms: number;
  records_in: number;
  records_out: number;
  error_message: string | null;
  execution_steps: PipelineStep[];
  is_failure_injected: boolean;
  recovery_attempted: boolean;
}

export interface QualityRule {
  rule_id: string;
  rule_name: string;
  rule_category: string;
  target_entity: string;
  severity: string;
  status: string;
  records_evaluated: number;
  records_failed: number;
  failure_rate: number;
  rationale: string;
  failure_sample: any;
}

export interface QuarantineRecordItem {
  id: number;
  run_id: string;
  entity_name: string;
  record_identifier: string;
  violated_rule: string;
  severity: string;
  reason: string;
  raw_payload: any;
  quarantined_at: string | null;
  is_resolved: boolean;
}

export interface WarehouseTable {
  table_name: string;
  layer: "Bronze" | "Silver" | "Gold";
  row_count: number;
  columns: Array<{ name: string; type: string }>;
}

export interface DailySalesItem {
  date: string;
  orders: number;
  sales: number;
  avg_basket: number;
  lead_time: number;
}

export interface CategoryMetricItem {
  category: string;
  orders: number;
  items_sold: number;
  sales: number;
  avg_price: number;
}

export interface PaymentMethodItem {
  method: string;
  transactions: number;
  total_value: number;
  avg_installments: number;
}

export interface DeliveryLeadTimeItem {
  state: string;
  delivered_orders: number;
  avg_days: number;
  buffer_days: number;
}

export interface ReplayEventItem {
  event_id: string;
  order_id: string;
  event_type: string;
  event_time: string;
  ingestion_time: string;
  amount: number;
  payment_methods: string;
  status: string;
}

export interface StreamingStatus {
  is_running: boolean;
  is_paused: boolean;
  replay_speed: number;
  total_events: number;
  events_processed: number;
  events_errored: number;
  out_of_order_events: number;
  current_event_time: string | null;
  last_ingestion_time: string | null;
  accumulated_stream_revenue: number;
  reconciliation_pct: number;
  recent_events: ReplayEventItem[];
}

export interface ObservabilityMetrics {
  total_pipeline_runs: number;
  total_records_processed: number;
  total_quarantined_records: number;
  quarantine_rate_pct: number;
  recent_runs: Array<{
    run_id: string;
    status: string;
    duration_ms: number;
    records_in: number;
    records_out: number;
    start_time: string | null;
  }>;
}

export interface BenchmarkItem {
  run_id: string;
  workload_type: string;
  dataset_records: number;
  dataset_bytes: number;
  execution_time_ms: number;
  throughput_rec_sec: number;
  memory_peak_mb: number;
  query_p50_ms: number;
  query_p95_ms: number;
  environment_specs: {
    os?: string;
    python_version?: string;
    duckdb_version?: string;
    cpu_count?: number;
    runtime_architecture?: string;
  } | null;
  executed_at: string | null;
  status: string;
}

export interface ExtractedPageItem {
  page_number: number;
  text: string;
  char_count: number;
  word_count: number;
  line_count: number;
}

export interface DocumentItem {
  doc_id: string;
  filename: string;
  title: string;
  document_category: string;
  file_size_bytes: number;
  file_fingerprint: string;
  page_count: number;
  processing_status: string;
  extraction_status: string;
  upload_timestamp: string | null;
  validation_results: {
    is_valid_pdf?: boolean;
    is_encrypted?: boolean;
    is_corrupt?: boolean;
    error_detail?: string | null;
  } | null;
  downstream_count?: number;
  extracted_data?: {
    pages: ExtractedPageItem[];
    key_fields: Record<string, any>;
    downstream_links: Array<{
      table: string;
      order_id: string;
      status: string;
      cost: number;
      customer_id: string;
    }>;
    summary: {
      total_pages: number;
      total_characters: number;
      total_words: number;
    };
  } | null;
}

export interface ReportItem {
  report_id: string;
  title: string;
  report_type: string;
  created_at: string | null;
  status: string;
  file_size_bytes: number;
  page_count: number;
  sections_included: string[];
  doc_id: string;
  file_fingerprint: string;
  error_message?: string | null;
}

export interface ReportGeneratePayload {
  title?: string;
  report_type?: string;
  sections?: string[];
  parameters?: Record<string, any>;
}

// -------------------------------------------------------------------------
// ANALYTICS ENGINEERING & DATA MODELING TYPES
// -------------------------------------------------------------------------
export type ModelLayer = 'staging' | 'intermediate' | 'marts_core' | 'marts_analytics' | 'snapshots';

export interface ModelColumn {
  name: string;
  description: string;
  data_type: string;
}

export interface ModelTestItem {
  test_id: string;
  test_name: string;
  column_name?: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
}

export interface ModelMetadata {
  model_id: string;
  name: string;
  layer: ModelLayer;
  materialization: string;
  business_description: string;
  grain: string;
  primary_keys: string[];
  row_count: number;
  status: string;
  raw_sql: string;
  compiled_sql: string;
  columns: ModelColumn[];
  upstream_dependencies: string[];
  downstream_dependencies: string[];
  tests: ModelTestItem[];
  tests_count: number;
  last_modified: string;
}

export interface LineageNode {
  id: string;
  label: string;
  type: string;
  layer: string;
  row_count: number;
  status: string;
  materialization?: string;
  grain?: string;
  tests_count?: number;
  tests?: ModelTestItem[];
  columns?: ModelColumn[];
  primary_keys?: string[];
  raw_sql?: string;
  description?: string;
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  transformation?: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    layers: string[];
  };
}

export interface ColumnLineageStep {
  layer: string;
  model: string;
  column: string;
  type: string;
  transformation: string;
}

export interface ColumnLineageItem {
  column_name: string;
  display_name: string;
  description: string;
  path: ColumnLineageStep[];
}

export interface FollowTheDataStage {
  id: string;
  stage_index: number;
  title: string;
  badge: string;
  business_summary: string;
  business_explanation: {
    what_it_does: string;
    why_it_exists: string;
    example: string;
    key_takeaway: string;
  };
  engineering_explanation: {
    technical_details: string;
    source_files: string[];
    data_entering: string;
    transformations: string | string[];
    data_leaving: string;
    quality_checks: string[];
    verified_metrics: Record<string, any>;
    upstream: string[];
    downstream: string[];
  };
}

export interface RowReconciliationItem {
  entity: string;
  raw_count: number;
  warehouse_count: number;
  variance: number;
  status: string;
  rule: string;
}

export interface VarianceSampleItem {
  order_id: string;
  order_status: string;
  items_count: number;
  order_cost: number;
  payment_value: number;
  variance: number;
  payment_methods: string;
  explanation: string;
}

export interface ReconciliationAudit {
  status: string;
  generated_at: string;
  summary: {
    total_orders_audited: number;
    balanced_orders_count: number;
    unbalanced_orders_count: number;
    balance_rate_pct: number;
    total_item_revenue: number;
    total_freight_revenue: number;
    total_order_cost: number;
    total_payment_value: number;
    overall_financial_variance: number;
    tolerance_rule: string;
    join_multiplication_check: {
      fact_order_items_rows: number;
      expected_items: number;
      fanout_detected: boolean;
      status: string;
    };
  };
  row_reconciliations: RowReconciliationItem[];
  variance_samples: VarianceSampleItem[];
  reconciliation_notes: string[];
}

export interface CustomerBehaviorCohort {
  buyer_cohort: string;
  distinct_customers: number;
  total_orders_placed: number;
  total_cohort_spend: number;
  avg_customer_lifetime_spend: number;
  avg_order_value: number;
}

export interface FulfillmentMonth {
  order_month: string;
  total_orders_placed: number;
  delivered_orders: number;
  canceled_orders: number;
  on_time_deliveries: number;
  delayed_deliveries: number;
  on_time_delivery_rate_pct: number;
  avg_approval_hours: number;
  avg_carrier_transit_days: number;
  avg_total_delivery_days: number;
  avg_sla_margin_days: number;
}

export interface StarSchemaColumn {
  name: string;
  type: string;
  role: 'primary_key' | 'foreign_key' | 'measure' | 'dimension' | 'attribute';
  references?: string;
  description?: string;
}

export interface StarSchemaDimension {
  table_name: string;
  title: string;
  type: string;
  join_cardinality: string;
  foreign_key: string;
  primary_key: string;
  join_key?: string;
  row_count: number;
  description: string;
  columns: StarSchemaColumn[];
}

export interface StarSchemaFact {
  name: string;
  type: string;
  title: string;
  grain: string;
  description: string;
  row_count: number;
  primary_key: string[];
  columns: StarSchemaColumn[];
  dimensions: StarSchemaDimension[];
}

export interface StarSchemaData {
  schemas: Record<string, StarSchemaFact>;
}



