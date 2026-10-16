import React, { useState, useEffect } from 'react';
import { Sidebar, PageId, PersonaMode } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HomePage } from './pages/HomePage';
import { GettingStartedPage } from './pages/GettingStartedPage';
import { FollowTheDataPage } from './pages/FollowTheDataPage';
import { SourcesPage } from './pages/SourcesPage';
import { QualityPage } from './pages/QualityPage';
import { ModelExplorerPage } from './pages/ModelExplorerPage';
import { DataLineagePage } from './pages/DataLineagePage';
import { StarSchemaPage } from './pages/StarSchemaPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { WarehousePage } from './pages/WarehousePage';
import { RunsPage } from './pages/RunsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { ArchitectureDocsPage } from './pages/ArchitectureDocsPage';
import { PdfViewerModal } from './components/PdfViewerModal';
import { api } from './services/api';
import { 
  OverviewData, 
  SourceItem, 
  PipelineRunItem, 
  QualityRule, 
  QuarantineRecordItem, 
  WarehouseTable 
} from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [personaMode, setPersonaMode] = useState<PersonaMode>('business');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // PDF Viewer Modal State
  const [activePdfDocId, setActivePdfDocId] = useState<string | null>(null);
  const [activePdfPage, setActivePdfPage] = useState<number>(1);

  const openPdf = (docId: string, page: number = 1) => {
    setActivePdfDocId(docId);
    setActivePdfPage(page);
  };

  const closePdf = () => {
    setActivePdfDocId(null);
  };

  // Model navigation state
  const [selectedModelForExplorer, setSelectedModelForExplorer] = useState<string | null>(null);

  const navigateToModel = (modelName?: string) => {
    if (modelName) setSelectedModelForExplorer(modelName);
    setCurrentPage('models');
  };

  const navigateToLineage = (modelName?: string) => {
    if (modelName) setSelectedModelForExplorer(modelName);
    setCurrentPage('lineage');
  };

  // Core state
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [runs, setRuns] = useState<PipelineRunItem[]>([]);
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineRecordItem[]>([]);
  const [tables, setTables] = useState<WarehouseTable[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ovRes, srcRes, pipeRes, qRulesRes, qRecRes, whRes] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getSources().catch(() => []),
        api.getPipelines().catch(() => []),
        api.getQualityRules().catch(() => []),
        api.getQuarantineRecords().catch(() => []),
        api.getWarehouseTables().catch(() => [])
      ]);

      if (ovRes) {
        setOverview(ovRes);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }

      setSources(srcRes);
      setRuns(pipeRes);
      setRules(qRulesRes);
      setQuarantine(qRecRes);
      setTables(whRes);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      setError(err.message);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  // Dedicated Keep-Alive Heartbeat: sends a request every 4 minutes
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/health')
        .then((r) => r.json())
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    };
    const heartbeatTimer = setInterval(sendHeartbeat, 4 * 60 * 1000);
    return () => clearInterval(heartbeatTimer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#172B4D] font-sans flex flex-col selection:bg-slate-200">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isOnline={isOnline}
      />

      {/* Main Container adjusted for Sidebar width */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'md:pl-16' : 'md:pl-64'
      }`}>
        {/* Compact TopBar with breadcrumbs, persona toggle, and DuckDB status */}
        <TopBar
          currentPage={currentPage}
          onOpenMobile={() => setIsMobileOpen(true)}
          personaMode={personaMode}
          onTogglePersona={setPersonaMode}
          onSelectPage={setCurrentPage}
          isOnline={isOnline}
        />

        {/* Page Content Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
          {currentPage === 'home' && (
            <HomePage
              onNavigate={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentPage === 'getting-started' && (
            <GettingStartedPage
              onNavigate={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentPage === 'flow' && (
            <FollowTheDataPage
              onNavigateToLineage={navigateToLineage}
              onNavigateToModels={navigateToModel}
            />
          )}

          {currentPage === 'sources' && (
            <SourcesPage
              sources={sources}
              loading={loading}
              onRefresh={loadData}
              onOpenPdf={openPdf}
            />
          )}

          {currentPage === 'quality' && (
            <QualityPage
              rules={rules}
              quarantine={quarantine}
              loading={loading}
              onRefresh={loadData}
            />
          )}

          {currentPage === 'models' && (
            <ModelExplorerPage
              initialModelName={selectedModelForExplorer || undefined}
              onNavigateToLineage={navigateToLineage}
            />
          )}

          {currentPage === 'lineage' && (
            <DataLineagePage
              initialSelectedModel={selectedModelForExplorer || undefined}
              onNavigateToModel={navigateToModel}
            />
          )}

          {currentPage === 'schema' && (
            <StarSchemaPage
              onNavigateToModel={navigateToModel}
            />
          )}

          {currentPage === 'analytics' && (
            <AnalyticsPage />
          )}

          {currentPage === 'reconciliation' && (
            <ReconciliationPage />
          )}

          {currentPage === 'warehouse' && (
            <WarehousePage
              tables={tables}
              loading={loading}
              onRefresh={loadData}
            />
          )}

          {currentPage === 'runs' && (
            <RunsPage
              runs={runs}
              loading={loading}
              onRefresh={loadData}
            />
          )}

          {currentPage === 'documentation' && (
            <DocumentationPage />
          )}

          {currentPage === 'architecture' && (
            <ArchitectureDocsPage
              onNavigate={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#E2E8F0] bg-white py-6 px-4 sm:px-8 mt-auto text-xs text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#172B4D]">MODELCRAFT</span>
            <span>•</span>
            <span>Analytics Engineering Studio</span>
            <span>•</span>
            <span>Kimball Dimensional Modeling & dbt Core</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage('documentation')}
              className="hover:text-[#172B4D] transition-colors"
            >
              Docs & Glossary
            </button>
            <button 
              onClick={() => setCurrentPage('architecture')}
              className="hover:text-[#172B4D] transition-colors"
            >
              Architecture
            </button>
            <a 
              href="https://github.com/jaiminbabariya7/analytics-engineering-dbt-bigquery" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-[#172B4D] transition-colors"
            >
              Reference Repo ↗
            </a>
          </div>
        </footer>
      </div>

      {/* Integrated PDF Viewer Modal */}
      {activePdfDocId && (
        <PdfViewerModal
          docId={activePdfDocId}
          initialPage={activePdfPage}
          onClose={closePdf}
        />
      )}
    </div>
  );
};
