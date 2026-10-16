import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentItem } from '../types';
import { api } from '../services/api';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  Download, 
  ExternalLink, 
  Search, 
  FileText, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Sidebar
} from 'lucide-react';

// Set up worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization:', e);
}

interface PdfViewerModalProps {
  docId: string;
  onClose: () => void;
  initialPage?: number;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  docId,
  onClose,
  initialPage = 1
}) => {
  const [docDetails, setDocDetails] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rendering, setRendering] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Dual View: Original PDF vs Extracted Data
  const [viewMode, setViewMode] = useState<'ORIGINAL' | 'EXTRACTED'>('ORIGINAL');

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [matches, setMatches] = useState<Array<{ page: number; text: string }>>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [searching, setSearching] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch document metadata & details
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const details = await api.getDocumentDetails(docId);
        if (!isMounted) return;
        setDocDetails(details);

        // Check validation status
        if (details.processing_status === 'CORRUPTED') {
          setError(details.validation_results?.error_detail || 'Document data is corrupted and cannot be rendered.');
          setLoading(false);
          return;
        }
        if (details.processing_status === 'ENCRYPTED') {
          setError('Document is password encrypted. Text rendering is restricted.');
          setLoading(false);
          return;
        }

        // Load PDF using PDF.js
        const fileUrl = api.getDocumentFileUrl(docId);
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const loadedPdf = await loadingTask.promise;
        if (!isMounted) return;
        setPdfDoc(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        setCurrentPage(Math.min(initialPage, loadedPdf.numPages));
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load PDF:', err);
        setError(err.message || 'Failed to render PDF document.');
        setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [docId, initialPage]);

  // 2. Render Page on Canvas + Text Layer
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || viewMode !== 'ORIGINAL') return;

    let cancelRender = false;
    let renderTask: any = null;

    async function renderPage() {
      try {
        setRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        if (cancelRender) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (cancelRender) return;

        // Render HTML Text Layer for real text selection & copying
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();
          if (cancelRender) return;

          // Render text layer items
          textContent.items.forEach((item: any) => {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
            
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - fontHeight}px`;
            span.style.fontSize = `${fontHeight}px`;
            span.style.fontFamily = item.fontName || 'sans-serif';
            span.className = 'absolute text-transparent select-text cursor-text';
            textLayerRef.current?.appendChild(span);
          });
        }
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', e);
        }
      } finally {
        if (!cancelRender) setRendering(false);
      }
    }

    renderPage();

    return () => {
      cancelRender = true;
      if (renderTask) {
        try { renderTask.cancel(); } catch {}
      }
    };
  }, [pdfDoc, currentPage, scale, viewMode]);

  // 3. Search in Document Text
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !docDetails?.extracted_data?.pages) {
      setMatches([]);
      setCurrentMatchIdx(0);
      return;
    }

    const q = query.toLowerCase();
    const foundMatches: Array<{ page: number; text: string }> = [];

    docDetails.extracted_data.pages.forEach((p) => {
      if (p.text.toLowerCase().includes(q)) {
        foundMatches.push({
          page: p.page_number,
          text: p.text
        });
      }
    });

    setMatches(foundMatches);
    setCurrentMatchIdx(0);
    if (foundMatches.length > 0) {
      setCurrentPage(foundMatches[0].page);
    }
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matches.length;
    setCurrentMatchIdx(nextIdx);
    setCurrentPage(matches[nextIdx].page);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matches.length) % matches.length;
    setCurrentMatchIdx(prevIdx);
    setCurrentPage(matches[prevIdx].page);
  };

  // Zoom helpers
  const handleZoomIn = () => setScale(prev => Math.min(3.0, Math.round((prev + 0.2) * 10) / 10));
  const handleZoomOut = () => setScale(prev => Math.max(0.5, Math.round((prev - 0.2) * 10) / 10));
  const handleFitWidth = () => setScale(1.4);
  const handleFitPage = () => setScale(0.9);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col p-2 sm:p-4 overflow-hidden animate-fadeIn">
      {/* Container Card */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden shadow-2xl"
      >
        {/* Top Bar: Title, Provenance Tag, Mode Switcher, Window Controls */}
        <div className="bg-black border-b border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-6 h-6 border border-neutral-700 bg-neutral-900 rounded flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold text-white truncate font-sans">
                {docDetails?.title || docDetails?.filename || 'Document Explorer'}
              </div>
              <div className="text-[10px] font-mono text-neutral-400 flex items-center space-x-2">
                <span>{docDetails?.filename}</span>
                <span>•</span>
                <span>{docDetails ? (docDetails.file_size_bytes / 1024).toFixed(1) : 0} KB</span>
                <span>•</span>
                <span className="truncate">SHA: {docDetails?.file_fingerprint.slice(0, 12)}...</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher: Original PDF vs Extracted Data */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center border border-neutral-800 bg-neutral-900 rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode('ORIGINAL')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'ORIGINAL'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Original PDF
              </button>
              <button
                onClick={() => setViewMode('EXTRACTED')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'EXTRACTED'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Extracted Data
              </button>
            </div>

            {/* Actions: Open in New Tab, Download, Fullscreen, Close */}
            <div className="flex items-center space-x-1 pl-2 border-l border-neutral-800">
              <a
                href={api.getDocumentFileUrl(docId)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded transition-colors"
                title="Open original document in new browser tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={api.getDocumentDownloadUrl(docId)}
                download
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded transition-colors"
                title="Download original PDF"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded transition-colors"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded transition-colors"
                title="Close viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Second Toolbar: Navigation, Zoom, Search (Only in ORIGINAL mode) */}
        {viewMode === 'ORIGINAL' && (
          <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-300">
            {/* Page Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className={`p-1.5 rounded border ${showThumbnails ? 'border-neutral-600 bg-neutral-800 text-white' : 'border-neutral-800 text-neutral-400'}`}
                title="Toggle thumbnails sidebar"
              >
                <Sidebar className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center space-x-1 pl-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1 || rendering}
                  className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1">
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= totalPages) setCurrentPage(val);
                    }}
                    className="w-10 bg-black border border-neutral-700 rounded px-1.5 py-0.5 text-center text-white font-mono"
                  />
                  <span>of {totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || rendering}
                  className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-12 text-center text-neutral-200">{Math.round(scale * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center space-x-1 pl-2 border-l border-neutral-800 text-[11px]">
                <button
                  onClick={handleFitWidth}
                  className="px-2 py-0.5 rounded border border-neutral-800 hover:border-neutral-600 hover:text-white"
                >
                  Fit Width
                </button>
                <button
                  onClick={handleFitPage}
                  className="px-2 py-0.5 rounded border border-neutral-800 hover:border-neutral-600 hover:text-white"
                >
                  Fit Page
                </button>
              </div>
            </div>

            {/* In-Document Search */}
            <div className="flex items-center space-x-1.5">
              <div className="relative">
                <Search className="w-3 h-3 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Find in document..."
                  className="bg-black border border-neutral-700 rounded pl-7 pr-2 py-1 text-xs text-white placeholder-neutral-500 font-mono w-40 focus:outline-none focus:border-neutral-500"
                />
              </div>

              {matches.length > 0 && (
                <div className="flex items-center space-x-1 text-[11px] text-neutral-400">
                  <span>{currentMatchIdx + 1}/{matches.length}</span>
                  <button onClick={handlePrevMatch} className="p-0.5 hover:text-white">▲</button>
                  <button onClick={handleNextMatch} className="p-0.5 hover:text-white">▼</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Body Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* VIEW MODE 1: ORIGINAL PDF RENDERER */}
          {viewMode === 'ORIGINAL' && (
            <>
              {/* Optional Thumbnails Sidebar */}
              {showThumbnails && !error && !loading && (
                <div className="w-48 bg-neutral-950 border-r border-neutral-800 p-3 overflow-y-auto hidden sm:flex flex-col space-y-3">
                  <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                    Pages ({totalPages})
                  </div>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                    const isSelected = pNum === currentPage;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`border rounded p-2 text-center text-xs font-mono transition-all ${
                          isSelected
                            ? 'border-white bg-neutral-900 text-white font-bold'
                            : 'border-neutral-800 hover:border-neutral-700 text-neutral-400'
                        }`}
                      >
                        <div className="w-full h-16 bg-neutral-900 border border-neutral-800 rounded mb-1 flex items-center justify-center text-[10px] text-neutral-400">
                          [ Page {pNum} ]
                        </div>
                        <div>Page {pNum}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Main Reading Canvas */}
              <div className="flex-1 bg-neutral-900/60 overflow-auto flex justify-center p-4 sm:p-8 relative">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3 font-mono text-xs text-neutral-400">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <div>Loading document pages...</div>
                  </div>
                )}

                {error && (
                  <div className="max-w-md my-auto border border-neutral-800 bg-neutral-950 p-6 rounded text-center space-y-3 font-mono text-xs text-neutral-300">
                    <AlertTriangle className="w-8 h-8 text-neutral-400 mx-auto" />
                    <div className="font-bold text-sm text-white">Document Cannot Be Rendered</div>
                    <p className="text-neutral-400 text-[11px]">{error}</p>
                    <div className="pt-2">
                      <a
                        href={api.getDocumentDownloadUrl(docId)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-white text-white rounded hover:bg-neutral-900"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Raw File for Audit</span>
                      </a>
                    </div>
                  </div>
                )}

                {!loading && !error && (
                  <div className="relative shadow-2xl rounded overflow-hidden bg-white">
                    {/* Render Canvas */}
                    <canvas ref={canvasRef} className="block max-w-full" />
                    {/* HTML Text Overlay Layer for Selection & Copying */}
                    <div 
                      ref={textLayerRef} 
                      className="absolute inset-0 pointer-events-auto overflow-hidden leading-none select-text" 
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIEW MODE 2: EXTRACTED STRUCTURED DATA */}
          {viewMode === 'EXTRACTED' && (
            <div className="flex-1 bg-black overflow-y-auto p-6 space-y-6">
              {/* Provenance & Extraction Summary */}
              <div className="border border-neutral-800 bg-neutral-950 p-5 rounded space-y-3">
                <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                  <Database className="w-4 h-4 text-white" />
                  <span>Document Extraction & Warehouse Provenance</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="border border-neutral-800 p-2.5 rounded bg-black">
                    <div className="text-neutral-400 text-[10px] uppercase">Extraction Status</div>
                    <div className="text-white font-bold mt-0.5">{docDetails?.extraction_status}</div>
                  </div>
                  <div className="border border-neutral-800 p-2.5 rounded bg-black">
                    <div className="text-neutral-400 text-[10px] uppercase">Total Pages</div>
                    <div className="text-white font-bold mt-0.5">{docDetails?.page_count} pages</div>
                  </div>
                  <div className="border border-neutral-800 p-2.5 rounded bg-black">
                    <div className="text-neutral-400 text-[10px] uppercase">Extracted Words</div>
                    <div className="text-white font-bold mt-0.5">
                      {docDetails?.extracted_data?.summary.total_words.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="border border-neutral-800 p-2.5 rounded bg-black">
                    <div className="text-neutral-400 text-[10px] uppercase">Linked Records</div>
                    <div className="text-white font-bold mt-0.5">
                      {docDetails?.extracted_data?.downstream_links.length || 0} fact rows
                    </div>
                  </div>
                </div>
              </div>

              {/* Downstream Data Links */}
              {docDetails?.extracted_data?.downstream_links && docDetails.extracted_data.downstream_links.length > 0 && (
                <div className="border border-neutral-800 bg-neutral-950 p-5 rounded space-y-3">
                  <div className="flex items-center space-x-2 text-white font-semibold text-xs font-mono uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Downstream Data Warehouse Links (fact_orders)</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    The following real order hashes were extracted from this document and matched against gold warehouse tables:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs text-neutral-300">
                      <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase">
                        <tr>
                          <th className="py-2 px-3">Order Identifier</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Cost (BRL)</th>
                          <th className="py-2 px-3">Customer ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {docDetails.extracted_data.downstream_links.map((link, idx) => (
                          <tr key={idx} className="hover:bg-neutral-900/40">
                            <td className="py-2 px-3 font-bold text-white">{link.order_id}</td>
                            <td className="py-2 px-3 text-neutral-300">{link.status}</td>
                            <td className="py-2 px-3 text-neutral-200">R$ {link.cost.toFixed(2)}</td>
                            <td className="py-2 px-3 text-neutral-400">{link.customer_id.slice(0, 16)}...</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extracted Text Page by Page */}
              <div className="border border-neutral-800 bg-neutral-950 p-5 rounded space-y-4">
                <div className="text-xs font-mono font-semibold uppercase text-white tracking-wider">
                  Extracted Content by Page
                </div>

                <div className="space-y-4">
                  {docDetails?.extracted_data?.pages.map((p) => (
                    <div key={p.page_number} className="border border-neutral-800 rounded bg-black p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <span className="font-mono text-xs font-bold text-white">Page {p.page_number}</span>
                        <div className="flex items-center space-x-3 text-[11px] font-mono text-neutral-400">
                          <span>{p.word_count} words</span>
                          <button
                            onClick={() => {
                              setCurrentPage(p.page_number);
                              setViewMode('ORIGINAL');
                            }}
                            className="text-white hover:underline inline-flex items-center space-x-1"
                          >
                            <span>Jump to Original Page</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <pre className="font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {p.text || '[No extractable text on this page]'}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
