import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Download, 
  Eye, 
  RefreshCw, 
  ShieldCheck, 
  Database, 
  Layers, 
  CheckSquare, 
  Square, 
  FileText, 
  AlertCircle,
  Copy,
  Check,
  Cpu
} from 'lucide-react';
import { ReportItem, ReportGeneratePayload } from '../types';
import { api } from '../services/api';

interface ReportCenterPageProps {
  onOpenPdf: (docId: string, page?: number) => void;
}

interface SectionOption {
  id: string;
  number: string;
  title: string;
  description: string;
}

const ALL_SECTIONS: SectionOption[] = [
  { id: 'section_1', number: '01', title: 'Executive Summary', description: 'Business problem, dataset bounds, and verified summary KPIs' },
  { id: 'section_2', number: '02', title: 'Dataset Provenance & Source Audit', description: '8 canonical Olist CSVs, licenses, sizes, and SHA-256 fingerprints' },
  { id: 'section_3', number: '03', title: 'Data Profiling & Quality Engine', description: 'Column null counts, distinct counts, and 10 quality rule matrices' },
  { id: 'section_4', number: '04', title: 'Architecture & Medallion Data Flow', description: 'Component topology, Bronze/Silver/Gold progression, and rationale' },
  { id: 'section_5', number: '05', title: 'Data Lineage & Warehouse Modeling', description: 'Kimball star schema specification, grains, PK/FK relationships' },
  { id: 'section_6', number: '06', title: 'Transformation & SQL Engineering', description: 'Deduplication logic, timestamp formatting, lead times, and SQL excerpts' },
  { id: 'section_7', number: '07', title: 'Business Analytics & Visual Findings', description: 'Vector charts for category performance, monthly orders, and logistics' },
  { id: 'section_8', number: '08', title: 'Reconciliation & Correctness Matrix', description: 'Source vs warehouse queries, expected vs actual values, zero variance' },
  { id: 'section_9', number: '09', title: 'Pipeline Operations & Reliability', description: 'Run execution history, durations, failure-injection, and recovery' },
  { id: 'section_10', number: '10', title: 'Benchmarking & Physical Performance', description: 'DuckDB micro-benchmarks: 754k rec/s, P50/P95 latencies, memory peak' },
  { id: 'section_11', number: '11', title: 'Automated Testing & Verification', description: '24 backend pytest cases, 13 live E2E assertions, and test criteria' },
  { id: 'section_12', number: '12', title: 'Security & Operational Boundaries', description: 'Path traversal guards, read-only SQL sanitization, upload limits' },
  { id: 'section_13', number: '13', title: 'Architectural Decision Records (ADR)', description: 'Why DuckDB, why medallion pattern, why event time vs ingestion time' },
  { id: 'section_14', number: '14', title: 'Honest Limitations & Future Work', description: 'Known constraints, OCR dependency, single-node bounds, and roadmap' },
  { id: 'appendices', number: 'APP', title: 'Appendices: Data Dictionary & Glossary', description: 'Column glossaries, rule definitions, system acronyms, report metadata' },
];

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({ onOpenPdf }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Form Configuration
  const [preset, setPreset] = useState<string>('comprehensive');
  const [reportTitle, setReportTitle] = useState<string>('KINETIQ DATA ENGINEERING PLATFORM AUDIT REPORT');
  const [selectedSections, setSelectedSections] = useState<string[]>(ALL_SECTIONS.map(s => s.id));

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReports();
      setReports(data);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to retrieve reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Handle Preset changes
  const handlePresetChange = (presetKey: string) => {
    setPreset(presetKey);
    if (presetKey === 'comprehensive') {
      setReportTitle('KINETIQ DATA ENGINEERING PLATFORM AUDIT REPORT');
      setSelectedSections(ALL_SECTIONS.map(s => s.id));
    } else if (presetKey === 'quality_reconciliation') {
      setReportTitle('DATA QUALITY & MATHEMATICAL RECONCILIATION AUDIT');
      setSelectedSections(['section_1', 'section_2', 'section_3', 'section_8', 'appendices']);
    } else if (presetKey === 'architecture_sql') {
      setReportTitle('WAREHOUSE ARCHITECTURE & SQL ENGINEERING AUDIT');
      setSelectedSections(['section_1', 'section_4', 'section_5', 'section_6', 'section_13', 'appendices']);
    } else if (presetKey === 'performance_benchmarks') {
      setReportTitle('PHYSICAL BENCHMARKING & ENGINE PERFORMANCE AUDIT');
      setSelectedSections(['section_1', 'section_9', 'section_10', 'section_11', 'section_14', 'appendices']);
    }
  };

  const toggleSection = (id: string) => {
    setPreset('custom');
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedSections(ALL_SECTIONS.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedSections(['section_1', 'appendices']);
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      setError('Please select at least one section to include in the report.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccessMsg(null);

      const payload: ReportGeneratePayload = {
        title: reportTitle.trim() || 'KINETIQ DATA ENGINEERING PLATFORM AUDIT REPORT',
        report_type: preset.toUpperCase(),
        sections: selectedSections,
        parameters: { generated_from_ui: true }
      };

      const res = await api.generateReport(payload);
      setSuccessMsg(`Report generated successfully! (${res.report.page_count} pages, ${roundBytes(res.report.file_size_bytes)})`);
      await loadReports();
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const roundBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-mono">Report Center</h1>
            <span className="bg-neutral-800 text-neutral-300 text-xs px-2 py-0.5 rounded font-mono">ReportLab Multi-Page Engine</span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Generate publication-quality, 12–25 page technical engineering reports derived 100% from live DuckDB queries, quality check results, and benchmark executions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 text-xs font-mono rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Archive
          </button>
        </div>
      </div>

      {/* Top Evidence Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded">
          <div className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-neutral-300" />
            Verified Order Base
          </div>
          <div className="text-xl font-bold text-white font-mono mt-1">99,441</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">100% genuine historical Olist orders</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded">
          <div className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
            Quality Pass Rate
          </div>
          <div className="text-xl font-bold text-white font-mono mt-1">100.0%</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">10 of 10 automated quality gates passed</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded">
          <div className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-300" />
            Reconciliation Parity
          </div>
          <div className="text-xl font-bold text-white font-mono mt-1">0 Variance</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Exact source-to-warehouse equality</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded">
          <div className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-neutral-300" />
            DuckDB Throughput
          </div>
          <div className="text-xl font-bold text-white font-mono mt-1">754,772 rec/s</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">P50 query latency: 60.90 ms</div>
        </div>
      </div>

      {/* Report Generator Configuration Box */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white font-mono uppercase flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-neutral-300" />
            Configure & Generate Engineering Report
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Choose a curated preset or customize included sections. All charts are rendered as vector graphics with repeated table headers and dynamic page numbering.
          </p>
        </div>

        {/* Preset Selector */}
        <div>
          <label className="block text-xs font-mono text-neutral-300 uppercase mb-2">Audit Focus Preset</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { id: 'comprehensive', label: 'Comprehensive Engineering Audit', tag: 'All 14 Sections + Appx (~12-20 pages)' },
              { id: 'quality_reconciliation', label: 'Data Quality & Reconciliation', tag: 'Sections 1, 2, 3, 8 & Appx' },
              { id: 'architecture_sql', label: 'Architecture & SQL Engineering', tag: 'Sections 1, 4, 5, 6, 13 & Appx' },
              { id: 'performance_benchmarks', label: 'Performance & Benchmarking', tag: 'Sections 1, 9, 10, 11, 14 & Appx' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`text-left p-3 rounded border transition-colors ${
                  preset === p.id 
                    ? 'bg-neutral-800 border-white text-white' 
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold text-xs font-mono">{p.label}</div>
                <div className="text-[10px] text-neutral-500 mt-1">{p.tag}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Report Title */}
        <div>
          <label className="block text-xs font-mono text-neutral-300 uppercase mb-1">Document Title</label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
            placeholder="Document Title"
          />
        </div>

        {/* Section Checkboxes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono text-neutral-300 uppercase">
              Sections to Include ({selectedSections.length} of {ALL_SECTIONS.length} selected)
            </label>
            <div className="flex items-center gap-2 text-xs font-mono">
              <button onClick={handleSelectAll} className="text-neutral-400 hover:text-white underline">Select All</button>
              <span className="text-neutral-700">•</span>
              <button onClick={handleDeselectAll} className="text-neutral-400 hover:text-white underline">Minimal</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-neutral-950 p-4 border border-neutral-800 rounded max-h-72 overflow-y-auto">
            {ALL_SECTIONS.map((sec) => {
              const isChecked = selectedSections.includes(sec.id);
              return (
                <div
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={`flex items-start gap-2 p-2 rounded cursor-pointer border transition-colors ${
                    isChecked 
                      ? 'bg-neutral-900/80 border-neutral-700 text-white' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-neutral-600" />
                    )}
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span className="font-mono text-[10px] text-neutral-400 mr-1.5">{sec.number}</span>
                    <span className="font-medium">{sec.title}</span>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{sec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-neutral-950 border border-neutral-600 text-neutral-200 text-xs rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-neutral-950 border border-white text-white text-xs rounded">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-neutral-500 font-mono">
            Output format: Searchable PDF • 100% Vector Charts • Verified Parity
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-bold rounded transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executing Warehouse Queries & Compiling PDF...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                Generate Engineering Audit Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Reports Archive Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-mono uppercase flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-300" />
            Persisted Technical Reports Archive ({reports.length})
          </h2>
          <span className="text-xs text-neutral-500 font-mono">Cryptographically Fingerprinted Documents</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
            Loading generated reports archive...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 bg-neutral-900 border border-neutral-800 rounded text-center text-neutral-400 text-xs font-mono">
            No reports generated yet. Click "Generate Engineering Audit Report" above to compile a fresh multi-page audit.
          </div>
        ) : (
          <div className="border border-neutral-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Document Title & Type</th>
                  <th className="px-4 py-3">Pages</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">SHA-256 Fingerprint</th>
                  <th className="px-4 py-3">Generated Timestamp</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-950/60">
                {reports.map((r) => (
                  <tr key={r.report_id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-xs">{r.title}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {r.report_type} • {r.sections_included?.length || 0} sections included
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-[11px] px-2 py-0.5 rounded">
                        {r.page_count} pages
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-400">
                      {roundBytes(r.file_size_bytes)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <span className="text-[11px] font-mono">{r.file_fingerprint.slice(0, 16)}...</span>
                        <button
                          onClick={() => copyToClipboard(r.file_fingerprint)}
                          title="Copy full SHA-256 fingerprint"
                          className="hover:text-white transition-colors"
                        >
                          {copiedHash === r.file_fingerprint ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-400 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenPdf(r.doc_id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded transition-colors"
                          title="Open in Interactive PDF Document Explorer"
                        >
                          <Eye className="w-3 h-3" />
                          Open in Viewer
                        </button>
                        <a
                          href={api.getDocumentDownloadUrl(r.doc_id)}
                          download
                          className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-500 text-xs rounded transition-colors"
                          title="Download Authentic PDF"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
