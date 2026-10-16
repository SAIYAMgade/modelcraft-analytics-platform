import React, { useState } from 'react';
import { SourceItem } from '../types';
import { api } from '../services/api';
import { 
  Database, 
  DownloadCloud, 
  Upload, 
  CheckCircle, 
  FileText, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

interface SourcesPageProps {
  sources: SourceItem[];
  loading: boolean;
  onRefresh: () => void;
  onOpenPdf?: (docId: string, page?: number) => void;
}

export const SourcesPage: React.FC<SourcesPageProps> = ({
  sources,
  loading,
  onRefresh,
  onOpenPdf
}) => {
  const [documents, setDocuments] = useState<any[]>([]);

  React.useEffect(() => {
    api.getDocuments().then(docs => setDocuments(docs)).catch(() => {});
  }, []);
  const [fetching, setFetching] = useState(false);
  const [expandedSourceId, setExpandedSourceId] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFetchAll = async () => {
    try {
      setFetching(true);
      await api.fetchAllSources();
      onRefresh();
    } catch (e: any) {
      alert(`Error fetching sources: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus(`Uploading ${file.name}...`);
      await api.uploadSourceFile(file);
      setUploadStatus(`Uploaded ${file.name} successfully.`);
      onRefresh();
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            <Database className="w-4 h-4 text-[#334155]" />
            <span>Bronze Ingestion Catalogs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            Data Sources & Provenance Registry
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Audit and verify source files. Every dataset contains an immutable SHA-256 fingerprint, 
            canonical retrieval URL, and schema definition.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-3.5 py-2 border border-[#E2E8F0] bg-white text-[#172B4D] text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={handleFetchAll}
            disabled={fetching}
            className="flex items-center gap-2 px-4 py-2 bg-[#334155] text-white text-xs font-semibold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm disabled:opacity-50"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{fetching ? 'Verifying Sources...' : 'Sync Olist Repositories'}</span>
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 rounded-lg text-xs font-mono text-[#334155]">
          {uploadStatus}
        </div>
      )}

      {/* Sources Table */}
      <div className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#334155]" />
            <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
              Registered Canonical Sources ({sources.length})
            </span>
          </div>
          <div className="text-xs text-[#64748B]">
            Official Source: olist/work-at-olist-data (MIT)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#172B4D] font-semibold">
              <tr>
                <th className="py-3 px-4">Source Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Raw Records</th>
                <th className="py-3 px-4">SHA-256 Fingerprint</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {sources.map((s) => {
                const isExpanded = expandedSourceId === s.id;
                const sizeMb = (s.file_size_bytes / (1024 * 1024)).toFixed(2);
                return (
                  <React.Fragment key={s.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">
                        <div className="flex items-center gap-2 font-sans">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{s.source_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{sizeMb} MB</td>
                      <td className="py-3 px-4 text-[#172B4D] font-bold">
                        {s.raw_record_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] text-[11px]">
                        {s.file_fingerprint ? `${s.file_fingerprint.slice(0, 16)}...` : 'Pending sync'}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.file_exists
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.file_exists ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <ShieldAlert className="w-3 h-3 text-slate-400" />}
                          <span>{s.ingestion_status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => setExpandedSourceId(isExpanded ? null : s.id)}
                          className="text-[#334155] hover:text-[#0F172A] inline-flex items-center gap-1 font-semibold"
                        >
                          <span>{isExpanded ? 'Hide' : 'Schema'}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Schema & Metadata Drawer */}
                    {isExpanded && (
                      <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
                        <td colSpan={6} className="p-4 space-y-3 font-sans">
                          <div className="flex flex-col md:flex-row md:items-center justify-between text-xs text-[#64748B] pb-2 border-b border-[#E2E8F0]">
                            <div>
                              <span>Canonical URL: </span>
                              <a 
                                href={s.source_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1 ml-1"
                              >
                                <span>{s.source_url}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div>License: <strong className="text-[#172B4D]">{s.license}</strong></div>
                          </div>

                          <div>
                            <div className="text-xs uppercase font-bold text-[#172B4D] mb-2">
                              Schema Columns ({s.schema_fields?.length || 0}):
                            </div>
                            <div className="flex flex-wrap gap-1.5 font-mono">
                              {s.schema_fields?.map((col, idx) => (
                                <span 
                                  key={idx} 
                                  className="border border-[#E2E8F0] bg-white px-2.5 py-1 rounded text-xs text-[#172B4D] shadow-sm"
                                >
                                  {col}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Associated Unstructured PDF Source Documents */}
      {documents.length > 0 && (
        <div className="border border-[#E2E8F0] rounded-xl bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase text-[#172B4D] tracking-wider">
                Associated Operational Evidence & Ingested Documents ({documents.length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.map((doc: any) => (
              <div
                key={doc.doc_id}
                onClick={() => onOpenPdf?.(doc.doc_id)}
                className="border border-[#E2E8F0] hover:border-[#334155] bg-[#F8FAFC] hover:bg-white p-4 rounded-xl cursor-pointer transition-all group flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div>
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                    {doc.document_category} • {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                  </div>
                  <div className="font-bold text-[#172B4D] text-sm group-hover:text-blue-600 transition-colors">
                    {doc.title}
                  </div>
                  <div className="text-xs text-[#64748B] font-mono mt-0.5 truncate">
                    {doc.filename}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-mono">{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                  <span className="text-[#334155] font-semibold group-hover:underline">Open in PDF Viewer →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
