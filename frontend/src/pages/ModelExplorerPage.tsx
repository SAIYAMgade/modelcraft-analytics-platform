import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Search, 
  Terminal, 
  CheckCircle2, 
  Play, 
  Copy, 
  Check, 
  Database, 
  Layers, 
  Table2, 
  Cpu, 
  Sparkles,
  ExternalLink,
  RefreshCw,
  Info,
  HelpCircle,
  FileCode2
} from 'lucide-react';
import { api } from '../services/api';
import { ModelMetadata, ModelLayer } from '../types';

interface ModelExplorerPageProps {
  initialModelName?: string;
  onNavigateToLineage?: (modelName: string) => void;
}

export const ModelExplorerPage: React.FC<ModelExplorerPageProps> = ({
  initialModelName,
  onNavigateToLineage
}) => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [selectedModelName, setSelectedModelName] = useState<string>(initialModelName || 'fact_orders');
  const [activeTab, setActiveTab] = useState<'sql' | 'schema' | 'tests' | 'preview'>('sql');
  const [layerFilter, setLayerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Direct execution preview
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // dbt CLI runner
  const [cliRunning, setCliRunning] = useState<boolean>(false);
  const [cliOutput, setCliOutput] = useState<{ command: string; status: string; duration_ms: number; stdout: string } | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalyticsEngineeringModels();
      setModels(data);
      if (initialModelName) {
        setSelectedModelName(initialModelName);
      } else if (data.length > 0 && !selectedModelName) {
        setSelectedModelName('fact_orders');
      }
    } catch (err) {
      console.error('Failed to load dbt models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [initialModelName]);

  const selectedModel = models.find(m => m.name === selectedModelName) || models[0];

  // Fetch preview when preview tab opens or model changes
  useEffect(() => {
    if (activeTab === 'preview' && selectedModel) {
      const loadPreview = async () => {
        try {
          setPreviewLoading(true);
          const res = await api.executeSqlQuery(`SELECT * FROM ${selectedModel.name} LIMIT 15;`);
          setPreviewData({ columns: res.columns, rows: res.rows });
        } catch (err) {
          console.error('Failed to load table preview:', err);
          setPreviewData(null);
        } finally {
          setPreviewLoading(false);
        }
      };
      loadPreview();
    }
  }, [activeTab, selectedModelName]);

  const handleCopySql = () => {
    if (selectedModel) {
      navigator.clipboard.writeText(selectedModel.raw_sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRunDbt = async (command: string) => {
    try {
      setCliRunning(true);
      setCliOutput(null);
      const res = await api.runDbtCli(command);
      setCliOutput(res);
      fetchModels();
    } catch (err: any) {
      setCliOutput({
        command,
        status: 'ERROR',
        duration_ms: 0,
        stdout: err.message || 'Failed to execute dbt command'
      });
    } finally {
      setCliRunning(false);
    }
  };

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.business_description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLayer = layerFilter === 'ALL' || m.layer.toUpperCase() === layerFilter.toUpperCase();
    return matchesSearch && matchesLayer;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-semibold text-[#334155] mb-2">
            <Code2 className="w-3.5 h-3.5 text-blue-600" />
            <span>dbt Core 1.12 • DuckDB Warehouse</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            SQL Model Explorer
          </h1>
          <p className="mt-1 text-sm text-[#64748B] max-w-2xl leading-relaxed">
            Inspect authentic analytical models, declared grains, surrogate primary keys, automated schema tests, and live DuckDB execution results.
          </p>
        </div>

        {/* dbt Orchestration Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunDbt('build')}
            disabled={cliRunning}
            className="px-3.5 py-2 rounded-lg bg-[#334155] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {cliRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run dbt build</span>
          </button>
          <button
            onClick={() => handleRunDbt('test')}
            disabled={cliRunning}
            className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#172B4D] hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Run dbt test</span>
          </button>
        </div>
      </div>

      {/* CLI Output Terminal (if executed) */}
      {cliOutput && (
        <div className="p-4 rounded-xl border border-slate-700 bg-[#1E293B] font-mono text-xs space-y-2 animate-fadeIn shadow-md">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">dbt {cliOutput.command}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cliOutput.status === 'SUCCESS' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {cliOutput.status}
              </span>
            </div>
            <span className="text-slate-400">{cliOutput.duration_ms}ms</span>
          </div>
          <pre className="text-slate-200 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
            {cliOutput.stdout}
          </pre>
        </div>
      )}

      {/* Main Two-Column Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Model Navigator */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-4 shadow-sm">
          {/* Layer Filter Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-[#E2E8F0] pb-3">
            {['ALL', 'STAGING', 'INTERMEDIATE', 'MARTS_CORE', 'MARTS_ANALYTICS', 'SNAPSHOTS'].map(layer => (
              <button
                key={layer}
                onClick={() => setLayerFilter(layer)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  layerFilter === layer
                    ? 'bg-[#334155] text-white font-semibold shadow-sm'
                    : 'text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100'
                }`}
              >
                {layer.replace('MARTS_', '')}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dbt models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#64748B] focus:outline-none focus:border-[#334155] focus:bg-white transition-colors"
            />
          </div>

          {/* Model List */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredModels.map(model => {
              const isSelected = model.name === selectedModelName;
              return (
                <button
                  key={model.name}
                  onClick={() => setSelectedModelName(model.name)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs group ${
                    isSelected
                      ? 'bg-slate-100/90 border-[#334155] text-[#172B4D] shadow-sm ring-1 ring-[#334155]/20'
                      : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#172B4D] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#172B4D] truncate font-mono text-xs">
                      {model.name}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
                      {model.layer.replace('marts_', '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="capitalize">{model.materialization}</span>
                    <span className="font-mono">{model.row_count > 0 ? `${model.row_count.toLocaleString()} rows` : 'View'}</span>
                  </div>
                </button>
              );
            })}
            {filteredModels.length === 0 && (
              <div className="text-center py-8 text-[#64748B] text-xs">
                No models match your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Model Inspector */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6 shadow-sm">
          {selectedModel ? (
            <>
              {/* Header Details */}
              <div className="border-b border-[#E2E8F0] pb-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] uppercase">
                      {selectedModel.layer.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] capitalize">
                      {selectedModel.materialization}
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      {selectedModel.row_count > 0 ? `${selectedModel.row_count.toLocaleString()} rows` : 'Live View'}
                    </span>
                  </div>

                  {onNavigateToLineage && (
                    <button
                      onClick={() => onNavigateToLineage(selectedModel.name)}
                      className="text-xs font-semibold text-[#334155] hover:text-[#0F172A] flex items-center gap-1.5 border border-[#E2E8F0] hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Trace in DAG Lineage</span>
                    </button>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold font-mono text-[#172B4D] tracking-tight">
                    {selectedModel.name}
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                    {selectedModel.business_description}
                  </p>
                </div>

                {/* Grain & Primary Keys */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#64748B] mb-1">
                      <span>Declared Model Grain</span>
                      <span title="The atomic level of real-world event represented by 1 row">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </div>
                    <span className="text-xs text-[#172B4D] font-semibold">{selectedModel.grain}</span>
                  </div>
                  <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#64748B] mb-1">
                      <span>Primary / Surrogate Key</span>
                      <span title="Unique identifier ensuring model uniqueness tests pass">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#172B4D] font-semibold">
                      {selectedModel.primary_keys.join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="flex border-b border-[#E2E8F0] gap-6">
                {[
                  { id: 'sql', label: 'Transformation SQL' },
                  { id: 'schema', label: `Columns (${selectedModel.columns.length})` },
                  { id: 'tests', label: `dbt Tests (${selectedModel.tests.length})` },
                  { id: 'preview', label: 'Live DuckDB Preview' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3 text-xs font-semibold transition-all border-b-2 -mb-[1px] ${
                      activeTab === tab.id
                        ? 'border-[#334155] text-[#172B4D]'
                        : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Transformation SQL */}
              {activeTab === 'sql' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#64748B]">
                      models/{selectedModel.name}.sql
                    </span>
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#172B4D] hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                  </div>

                  <div className="relative rounded-xl border border-slate-700 bg-[#1E293B] p-4 font-mono text-xs overflow-x-auto max-h-[450px] shadow-sm">
                    <pre className="text-slate-200 leading-relaxed font-mono">
                      {selectedModel.raw_sql}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 2: Schema & Columns */}
              {activeTab === 'schema' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] text-[#172B4D] border-b border-[#E2E8F0] font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Column Name</th>
                          <th className="py-2.5 px-4">Data Type</th>
                          <th className="py-2.5 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] font-mono">
                        {selectedModel.columns.map((col, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-[#172B4D]">{col.name}</td>
                            <td className="py-2.5 px-4 text-[#64748B]">{col.data_type}</td>
                            <td className="py-2.5 px-4 text-[#334155] font-sans font-normal">{col.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: dbt Tests */}
              {activeTab === 'tests' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="space-y-2">
                    {selectedModel.tests.map((t, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-[#172B4D] font-mono">{t.test_name}</span>
                          {t.column_name && (
                            <span className="text-[11px] text-[#64748B]">on column <code className="text-[#172B4D] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">{t.column_name}</code></span>
                          )}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                          {t.status}
                        </span>
                      </div>
                    ))}
                    {selectedModel.tests.length === 0 && (
                      <div className="p-8 text-center text-[#64748B] text-xs border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                        Custom assertions enforced at warehouse pipeline boundary.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Live DuckDB Preview */}
              {activeTab === 'preview' && (
                <div className="space-y-3 animate-fadeIn">
                  {previewLoading ? (
                    <div className="py-12 text-center text-[#64748B] text-xs">
                      Executing query against DuckDB warehouse...
                    </div>
                  ) : previewData && previewData.rows.length > 0 ? (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto max-h-[400px] shadow-sm">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-[#F8FAFC] text-[#172B4D] sticky top-0 border-b border-[#E2E8F0] font-semibold">
                          <tr>
                            {previewData.columns.map((col, idx) => (
                              <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {previewData.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="py-2 px-3 text-[#334155] whitespace-nowrap">
                                  {cell !== null && cell !== undefined ? String(cell) : <span className="text-slate-400">null</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-[#64748B] text-xs border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                      Preview not available for this model.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-[#64748B] text-xs">
              Select a model from the left column to view transformation SQL, schema, and tests.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
