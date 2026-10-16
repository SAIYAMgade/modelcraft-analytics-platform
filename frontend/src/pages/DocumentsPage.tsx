import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../types';
import { api } from '../services/api';
import { 
  FileText, 
  Search, 
  Upload, 
  Sparkles, 
  Eye, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Database, 
  Layers,
  ArrowRight
} from 'lucide-react';

interface DocumentsPageProps {
  onOpenPdf: (docId: string, page?: number) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onOpenPdf }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.getDocuments(searchQuery, statusFilter);
      setDocuments(docs);
    } catch (e: any) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadMessage(`Uploading & parsing ${file.name}...`);
      await api.uploadPdfDocument(file, file.name.replace('.pdf', ''), 'USER_UPLOAD');
      setUploadMessage(`Successfully ingested & indexed ${file.name}.`);
      loadDocuments();
    } catch (err: any) {
      setUploadMessage(`Upload failed: ${err.message}`);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setUploadMessage('Generating authentic operational e-commerce PDFs from warehouse data...');
      const res = await api.seedDocuments();
      setUploadMessage(`Generated and cataloged ${res.seeded} authentic e-commerce documents.`);
      loadDocuments();
    } catch (err: any) {
      setUploadMessage(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const statusCategories = ['ALL', 'PROCESSED', 'READY', 'CORRUPTED', 'ENCRYPTED'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
            Unstructured Document Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Interactive PDF Document Explorer
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Audit-grade PDF reader integrated with data pipelines. Render original documents, 
            search text across pages, inspect extracted structured entities, and trace downstream links.
          </p>
        </div>

        {/* Actions: Upload PDF & Seed Real PDFs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-200 text-xs font-mono rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seeding ? 'Generating...' : 'Seed Real E-Commerce PDFs'}</span>
          </button>

          <label className="flex items-center space-x-2 px-3 py-1.5 border border-white bg-white text-black text-xs font-mono font-semibold rounded cursor-pointer hover:bg-neutral-200 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {uploadMessage && (
        <div className="border border-neutral-700 bg-neutral-900 p-3 rounded text-xs font-mono text-neutral-200 flex items-center justify-between">
          <span>{uploadMessage}</span>
          <button onClick={() => setUploadMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, filename, or extracted text..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-neutral-500"
          />
        </form>

        <div className="flex items-center space-x-1.5 font-mono text-xs">
          {statusCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setStatusFilter(cat)}
              className={`px-3 py-1 rounded transition-colors ${
                statusFilter === cat
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Library Table */}
      <div className="border border-neutral-800 rounded bg-neutral-950 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
              Document Catalog ({documents.length})
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Click any row to open the complete document in the integrated viewer
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-400 space-y-3">
            <div>No documents matching query.</div>
            <button
              onClick={handleSeed}
              className="px-3 py-1.5 border border-white text-white rounded hover:bg-neutral-900"
            >
              Generate Operational E-Commerce Documents
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-neutral-300">
              <thead className="bg-neutral-900/80 border-b border-neutral-800 text-[11px] text-neutral-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Document Title & Filename</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Downstream Links</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {documents.map((doc) => {
                  const isCorrupt = doc.processing_status === 'CORRUPTED';
                  const isEncrypted = doc.processing_status === 'ENCRYPTED';
                  return (
                    <tr
                      key={doc.doc_id}
                      onClick={() => onOpenPdf(doc.doc_id)}
                      className="hover:bg-neutral-900/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-start space-x-2.5">
                          <FileText className="w-4 h-4 text-neutral-400 group-hover:text-white mt-0.5" />
                          <div>
                            <div className="font-semibold text-white group-hover:underline text-sm font-sans">
                              {doc.title}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              {doc.filename} • SHA: {doc.file_fingerprint.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        <span className="border border-neutral-800 px-2 py-0.5 rounded text-[10px]">
                          {doc.document_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-200">
                        {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                          isCorrupt || isEncrypted
                            ? 'border-neutral-700 bg-neutral-900 text-neutral-300'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-200'
                        }`}>
                          {isCorrupt ? <AlertTriangle className="w-2.5 h-2.5" /> : (isEncrypted ? <ShieldAlert className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5 text-white" />)}
                          <span>{doc.processing_status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {doc.downstream_count && doc.downstream_count > 0 ? (
                          <span className="text-white font-semibold flex items-center space-x-1">
                            <Database className="w-3 h-3" />
                            <span>{doc.downstream_count} linked fact rows</span>
                          </span>
                        ) : (
                          <span>None detected</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-neutral-400 group-hover:text-white inline-flex items-center space-x-1 font-mono text-xs">
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
