import React from 'react';
import { OverviewData } from '../types';
import { PersonaMode } from '../components/Header';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Database, 
  ShieldCheck, 
  ArrowUpRight, 
  HelpCircle,
  TrendingUp,
  Package,
  Layers,
  FileText,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem } from '../types';

interface OverviewPageProps {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  personaMode: PersonaMode;
  onNavigate: (page: any) => void;
  onOpenPdf?: (docId: string, page?: number) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  loading,
  error,
  personaMode,
  onNavigate,
  onOpenPdf
}) => {
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);

  React.useEffect(() => {
    api.getDocuments().then(docs => setDocuments(docs)).catch(() => {});
  }, []);
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 font-mono text-xs text-neutral-400">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div>Connecting to KINETIQ analytical backend...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-neutral-800 bg-neutral-900/60 p-8 rounded my-8 text-neutral-300 font-mono text-sm max-w-2xl mx-auto">
        <div className="flex items-center space-x-2 text-white font-bold mb-2">
          <AlertTriangle className="w-5 h-5 text-white" />
          <span>Backend Connection Error</span>
        </div>
        <p className="text-neutral-400 mb-4">{error}</p>
        <div className="text-xs text-neutral-400">
          Make sure the FastAPI backend is running at <code className="text-white">http://127.0.0.1:8000</code>.
        </div>
      </div>
    );
  }

  const kpis = data?.business_kpis;
  const gov = data?.governance;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Editorial Header */}
      <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
            {personaMode === 'business' ? 'Executive Briefing' : 'Data Architecture Overview'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            {personaMode === 'business' ? 'Operational & Commerce Performance' : 'Medallion Data Platform Status'}
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
            {personaMode === 'business'
              ? 'Raw data arrives from different sources. KINETIQ validates and processes it, builds trusted analytical datasets, detects problems, and helps teams make decisions using traceable evidence.'
              : 'End-to-end ELT system processing 550k+ raw records across Bronze, Silver, and Gold layers with DuckDB ACID analytics, automated quarantine, and continuous validation.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('flow')}
            className="flex items-center space-x-2 px-3 py-1.5 border border-white bg-white text-black text-xs font-mono font-medium rounded hover:bg-neutral-200 transition-colors"
          >
            <span>Follow The Data</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Analytics Engineering & Data Modeling Showcase Banner */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-neutral-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Flagship Architecture Explorer</span>
            </div>
            <h2 className="text-xl md:text-2xl font-mono font-bold text-white">
              FOLLOW THE DATA
            </h2>
            <p className="text-xs md:text-sm text-neutral-400 font-sans mt-0.5">
              From raw commerce events to trusted business decisions. Explore all 7 stages, interactive DAG lineage, dbt models, and reconciliation audits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('flow')}
              className="px-4 py-2 bg-white text-black font-mono text-xs font-bold rounded hover:bg-neutral-200 transition-colors flex items-center space-x-1.5"
            >
              <span>Explore Data Flow</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('lineage')}
              className="px-3 py-2 border border-neutral-700 bg-neutral-900 text-white font-mono text-xs rounded hover:bg-neutral-800 transition-colors"
            >
              Lineage DAG
            </button>
            <button
              onClick={() => onNavigate('models')}
              className="px-3 py-2 border border-neutral-700 bg-neutral-900 text-white font-mono text-xs rounded hover:bg-neutral-800 transition-colors"
            >
              SQL Models (21)
            </button>
            <button
              onClick={() => onNavigate('reconciliation')}
              className="px-3 py-2 border border-neutral-700 bg-neutral-900 text-white font-mono text-xs rounded hover:bg-neutral-800 transition-colors"
            >
              Reconciliation (98.9%)
            </button>
          </div>
        </div>

        {/* 7-stage miniature strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 font-mono text-[11px]">
          {[
            { id: 'raw_sources', name: 'Raw Sources', metric: '8 CSV Files' },
            { id: 'ingestion', name: 'Ingestion', metric: '350k+ rows/s' },
            { id: 'bronze', name: 'Bronze', metric: '551,759 rows' },
            { id: 'silver', name: 'Silver', metric: 'Clean Staging' },
            { id: 'dimensional_models', name: 'Kimball Models', metric: 'Facts & Dims' },
            { id: 'analytics_marts', name: 'Analytics Marts', metric: 'Marts & Snapshots' },
            { id: 'business_insights', name: 'Business Insights', metric: 'Live Executive' },
          ].map((stage, idx) => (
            <button
              key={stage.id}
              onClick={() => onNavigate('flow')}
              className="p-2.5 rounded border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:border-neutral-700 text-left transition-all group"
            >
              <div className="text-[10px] text-neutral-400 group-hover:text-neutral-300">STAGE 0{idx + 1}</div>
              <div className="font-bold text-white truncate mt-0.5">{stage.name}</div>
              <div className="text-[10px] text-neutral-400 mt-1">{stage.metric}</div>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono mb-2">
            <span>OBSERVED ORDERS</span>
            <Package className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {kpis?.total_orders.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Delivered, shipped & in-flight
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono mb-2">
            <span>OBSERVED GMV / SALES</span>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            R$ {kpis?.total_observed_sales.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Total verified order merchandise
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono mb-2">
            <span>DATA QUALITY SCORE</span>
            <ShieldCheck className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {gov?.quality_score_pct || 100}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            10 automated rules verified
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono mb-2">
            <span>QUARANTINE RECORDS</span>
            <AlertTriangle className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {gov?.quarantine_count || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Isolated defective anomalies
          </div>
        </div>
      </div>

      {/* Dataset Provenance & Freshness Bar */}
      <div className="border border-neutral-800 bg-neutral-900/40 p-5 rounded font-mono text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div>
              <span className="text-neutral-400">DATASET:</span>{' '}
              <span className="text-white font-semibold">{data?.dataset_name}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-neutral-400">
            <div>
              <span className="text-neutral-400">HISTORICAL SPAN:</span>{' '}
              <span className="text-neutral-200">
                {data?.date_range.start ? data.date_range.start.slice(0, 10) : 'N/A'} to{' '}
                {data?.date_range.end ? data.date_range.end.slice(0, 10) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">LAST PIPELINE:</span>{' '}
              <span className="text-neutral-200">
                {gov?.last_pipeline_status} ({gov?.last_run_duration_ms}ms)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Click-to-Open Evidence & Operational PDF Documents */}
      {documents.length > 0 && (
        <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-white" />
              <span className="font-mono text-xs font-semibold uppercase text-white tracking-wider">
                Audited Operational PDF Documents ({documents.length})
              </span>
            </div>
            <button
              onClick={() => onNavigate('documentation')}
              className="text-xs font-mono text-neutral-400 hover:text-white flex items-center space-x-1"
            >
              <span>Architecture Documentation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.slice(0, 3).map((doc) => (
              <div
                key={doc.doc_id}
                onClick={() => onOpenPdf?.(doc.doc_id)}
                className="border border-neutral-800 hover:border-neutral-600 bg-black p-4 rounded cursor-pointer transition-all hover:bg-neutral-900/40 group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                    <span>{doc.document_category}</span>
                    <span>{doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}</span>
                  </div>
                  <div className="font-semibold text-white text-xs font-sans group-hover:underline">
                    {doc.title}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono mt-1 truncate">
                    {doc.filename}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                  <span className="text-white group-hover:underline inline-flex items-center space-x-1">
                    <span>View PDF</span>
                    <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dual Experience Section */}
      {personaMode === 'business' ? (
        /* BUSINESS PERSONA CONTENT */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-4">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Business Assurance: How We Know The Data Is Accurate</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              In high-velocity commerce, corrupt inputs (missing buyer tags, negative payments, delivery dates 
              occurring before purchase dates) distort executive revenue forecasts. KINETIQ eliminates 
              silent errors by enforcing strict gatekeeping:
            </p>
            <ul className="text-xs text-neutral-300 space-y-2 list-disc list-inside">
              <li><strong className="text-white">Zero Silent Loss:</strong> Bad data is neither ignored nor blindly dropped; it is moved to Quarantine.</li>
              <li><strong className="text-white">Financial Reconciliation:</strong> Order item totals, shipping charges, and payment transactions are balanced to prevent double-counting.</li>
              <li><strong className="text-white">Traceable Provenance:</strong> Every dashboard figure traces back to raw CSV checksums and execution run logs.</li>
            </ul>
          </div>

          <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-4">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <HelpCircle className="w-4 h-4 text-neutral-400" />
              <span>Nontechnical Data Dictionary & Glossary</span>
            </div>
            <div className="space-y-3 text-xs">
              {data?.glossary && Object.entries(data.glossary).map(([term, definition]) => (
                <div key={term} className="border-b border-neutral-900 pb-2">
                  <div className="text-white font-semibold font-mono">{term}</div>
                  <div className="text-neutral-400 mt-0.5">{definition}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ENGINEERING PERSONA CONTENT */
        <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <div className="text-xs font-mono uppercase text-neutral-400">Technical Architecture</div>
              <h3 className="text-base font-semibold text-white">Medallion Data Flow (Bronze → Silver → Gold)</h3>
            </div>
            <span className="text-xs font-mono border border-neutral-700 px-2 py-0.5 rounded text-neutral-300">
              DUCKDB 1.5.6 OLAP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="border border-neutral-800 p-4 rounded bg-black">
              <div className="text-neutral-400 uppercase text-[10px] tracking-wider mb-1">Layer 01</div>
              <div className="text-white font-bold text-sm mb-2">Bronze Ingestion</div>
              <p className="text-neutral-400 text-[11px] mb-3">
                Preserves raw CSV files in DuckDB with immutable metadata (<code className="text-neutral-300">_run_id</code>, <code className="text-neutral-300">_ingested_at</code>).
              </p>
              <div className="text-neutral-200">Records: 550,759 rows</div>
            </div>

            <div className="border border-neutral-800 p-4 rounded bg-black">
              <div className="text-neutral-400 uppercase text-[10px] tracking-wider mb-1">Layer 02</div>
              <div className="text-white font-bold text-sm mb-2">Silver Cleanse & Quarantine</div>
              <p className="text-neutral-400 text-[11px] mb-3">
                Type casts timestamps, filters corrupt values, and isolates invalid records into the quarantine store.
              </p>
              <div className="text-neutral-200">Rules Applied: 10 integrity checks</div>
            </div>

            <div className="border border-neutral-800 p-4 rounded bg-black">
              <div className="text-neutral-400 uppercase text-[10px] tracking-wider mb-1">Layer 03</div>
              <div className="text-white font-bold text-sm mb-2">Gold Star Schema & Marts</div>
              <p className="text-neutral-400 text-[11px] mb-3">
                Builds fact tables (<code className="text-neutral-300">fact_orders</code>, <code className="text-neutral-300">fact_order_items</code>) and analytical marts for queries.
              </p>
              <div className="text-neutral-200">Fact Orders: 99,441 rows</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
