import {
  OverviewData,
  SourceItem,
  PipelineRunItem,
  QualityRule,
  QuarantineRecordItem,
  WarehouseTable,
  DailySalesItem,
  CategoryMetricItem,
  PaymentMethodItem,
  DeliveryLeadTimeItem,
  StreamingStatus,
  ObservabilityMetrics,
  BenchmarkItem,
  DocumentItem,
  ReportItem,
  ReportGeneratePayload,
  ModelMetadata,
  LineageGraph,
  FollowTheDataStage,
  ReconciliationAudit,
  CustomerBehaviorCohort,
  FulfillmentMonth,
  StarSchemaData,
  ColumnLineageItem
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    let errorDetail = `Request failed: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errorDetail = err.detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  getOverview: () => fetchJson<OverviewData>('/overview'),
  
  getSources: () => fetchJson<SourceItem[]>('/sources'),
  fetchAllSources: () => fetchJson<{ status: string; results: any[] }>('/sources/fetch-all', { method: 'POST' }),
  uploadSourceFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/sources/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  getPipelines: () => fetchJson<PipelineRunItem[]>('/pipelines'),
  runPipeline: (injectFailure: boolean = false) => 
    fetchJson<{ run_id: string; status: string; duration_ms: number; records_in: number; records_out: number; steps: any[] }>(
      `/pipelines/run?inject_failure=${injectFailure}`, 
      { method: 'POST' }
    ),
  recoverPipeline: (runId: string) => 
    fetchJson<{ original_failed_run: string; recovery_status: string; new_run_id: string; duration_ms: number }>(
      `/pipelines/recover?run_id=${encodeURIComponent(runId)}`, 
      { method: 'POST' }
    ),

  getQualityRules: () => fetchJson<QualityRule[]>('/quality/rules'),
  getQuarantineRecords: (limit: number = 50) => fetchJson<QuarantineRecordItem[]>(`/quality/quarantine?limit=${limit}`),

  getWarehouseTables: () => fetchJson<WarehouseTable[]>('/warehouse/tables'),
  executeSqlQuery: (sql: string) => 
    fetchJson<{ columns: string[]; rows: any[][]; execution_time_ms: number; returned_rows: number }>(
      '/warehouse/query', 
      { method: 'POST', body: JSON.stringify({ sql }) }
    ),

  getDailySales: () => fetchJson<DailySalesItem[]>('/analytics/daily-sales'),
  getCategoryMetrics: (limit: number = 15) => fetchJson<CategoryMetricItem[]>(`/analytics/categories?limit=${limit}`),
  getPaymentBreakdown: () => fetchJson<PaymentMethodItem[]>('/analytics/payments'),
  getDeliveryLeadTimes: (limit: number = 12) => fetchJson<DeliveryLeadTimeItem[]>(`/analytics/delivery-lead-times?limit=${limit}`),

  getStreamingStatus: () => fetchJson<StreamingStatus>('/streaming/status'),
  controlStream: (action: string, speed?: number) => 
    fetchJson<StreamingStatus>('/streaming/control', {
      method: 'POST',
      body: JSON.stringify({ action, speed })
    }),

  getObservabilityMetrics: () => fetchJson<ObservabilityMetrics>('/observability/metrics'),

  getBenchmarkHistory: () => fetchJson<BenchmarkItem[]>('/benchmarks/history'),
  runBenchmark: () => fetchJson<BenchmarkItem>('/benchmarks/run', { method: 'POST' }),

  getDocuments: (q?: string, status?: string) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (status && status !== 'ALL') params.append('status', status);
    return fetchJson<DocumentItem[]>(`/documents?${params.toString()}`);
  },
  getDocumentDetails: (docId: string) => fetchJson<DocumentItem>(`/documents/${encodeURIComponent(docId)}`),
  getDocumentFileUrl: (docId: string) => `${API_BASE}/documents/${encodeURIComponent(docId)}/file`,
  getDocumentDownloadUrl: (docId: string) => `${API_BASE}/documents/${encodeURIComponent(docId)}/download`,
  uploadPdfDocument: async (file: File, title?: string, category: string = 'OPERATIONAL_REPORT') => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    formData.append('category', category);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  seedDocuments: () => fetchJson<{ status: string; seeded: number; documents: any[] }>('/documents/seed', { method: 'POST' }),
  
  // Report Center API
  getReports: () => fetchJson<ReportItem[]>('/reports'),
  getReportDetails: (reportId: string) => fetchJson<ReportItem>(`/reports/${encodeURIComponent(reportId)}`),
  generateReport: (payload?: ReportGeneratePayload) => fetchJson<{ status: string; report: ReportItem }>('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),

  // Analytics Engineering & Data Modeling API
  getAnalyticsEngineeringModels: () => fetchJson<ModelMetadata[]>('/analytics-engineering/models'),
  getAnalyticsEngineeringLineage: () => fetchJson<LineageGraph>('/analytics-engineering/lineage'),
  getFollowTheDataStages: () => fetchJson<FollowTheDataStage[]>('/analytics-engineering/flow'),
  getReconciliationAudit: () => fetchJson<ReconciliationAudit>('/analytics-engineering/reconciliation'),
  triggerDbtRun: (command: string = 'build') => fetchJson<{
    command: string;
    status: string;
    return_code: number;
    duration_ms: number;
    stdout: string;
    stderr: string;
    timestamp: string;
  }>('/analytics-engineering/run', {
    method: 'POST',
    body: JSON.stringify({ command })
  }),
  runDbtCli: (command: string = 'build') => fetchJson<{
    command: string;
    status: string;
    return_code: number;
    duration_ms: number;
    stdout: string;
    stderr: string;
    timestamp: string;
  }>('/analytics-engineering/run', {
    method: 'POST',
    body: JSON.stringify({ command })
  }),
  getCustomerBehaviorAnalytics: () => fetchJson<CustomerBehaviorCohort[]>('/analytics/customer-behavior'),
  getFulfillmentAnalytics: () => fetchJson<FulfillmentMonth[]>('/analytics/fulfillment'),
  getStarSchemaData: () => fetchJson<StarSchemaData>('/analytics-engineering/star-schema'),
  getColumnLineage: () => fetchJson<{ columns: ColumnLineageItem[] }>('/analytics-engineering/column-lineage')
};
