import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Workflow, 
  Code2, 
  Network, 
  Scale, 
  ShieldCheck, 
  Database, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  FileText, 
  Terminal, 
  Activity,
  Box,
  TrendingUp,
  Cpu,
  BarChart3,
  ExternalLink,
  Info
} from 'lucide-react';
import { PageId, PersonaMode } from '../components/Header';
import { api } from '../services/api';
import { FollowTheDataStage, ModelMetadata } from '../types';

interface ModelCraftLandingPageProps {
  onNavigate: (page: PageId, modelName?: string) => void;
  personaMode: PersonaMode;
  onTogglePersona: (mode: PersonaMode) => void;
}

export const ModelCraftLandingPage: React.FC<ModelCraftLandingPageProps> = ({
  onNavigate,
  personaMode,
  onTogglePersona
}) => {
  const [stages, setStages] = useState<FollowTheDataStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string>('raw_sources');
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadLandingData = async () => {
      try {
        setLoading(true);
        const [stagesRes, modelsRes] = await Promise.all([
          api.getFollowTheDataStages().catch(() => []),
          api.getAnalyticsEngineeringModels().catch(() => [])
        ]);
        setStages(stagesRes);
        setModels(modelsRes);
      } catch (err) {
        console.error('Failed to load landing data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLandingData();
  }, []);

  const activeStage = stages.find(s => s.id === activeStageId) || stages[0];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-24 text-neutral-100 font-sans selection:bg-neutral-800 selection:text-white pb-16">
      {/* ── 1. Hero Section ──────────────────────────────────────────────── */}
      <section className="pt-8 sm:pt-16 pb-12 text-center max-w-5xl mx-auto space-y-8 relative">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center space-x-2 border border-neutral-800 bg-neutral-900/90 px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wider text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>DBT CORE 1.12 &bull; DUCKDB OLAP &bull; KIMBALL DIMENSIONAL MODELING</span>
        </div>

        {/* Project Name and Hero Heading */}
        <div className="space-y-4">
          <div className="text-xs font-mono tracking-widest text-neutral-400 uppercase">
            MODELCRAFT ANALYTICS PLATFORM
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-mono font-bold tracking-tight text-white leading-[1.1]">
            From raw data to trusted decisions.
          </h1>
          <p className="max-w-3xl mx-auto text-neutral-300 text-base sm:text-lg leading-relaxed font-sans font-normal pt-2">
            An analytics engineering platform that transforms raw commerce data into tested dimensional models, 
            reliable business metrics, and transparent data lineage.
          </p>
        </div>

        {/* Primary & Secondary Call To Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate('models')}
            className="flex items-center space-x-2 px-6 py-3.5 rounded bg-white text-black hover:bg-neutral-200 transition-all font-semibold text-sm font-mono tracking-wider shadow-lg"
          >
            <Code2 className="w-4 h-4" />
            <span>Explore Models</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToSection('follow-the-data')}
            className="flex items-center space-x-2 px-6 py-3.5 rounded border border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 text-white transition-all font-medium text-sm font-mono tracking-wider"
          >
            <Workflow className="w-4 h-4 text-neutral-400" />
            <span>Follow the Data</span>
          </button>

          <button
            onClick={() => onNavigate('lineage')}
            className="flex items-center space-x-2 px-6 py-3.5 rounded border border-neutral-800 bg-black/60 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all font-medium text-sm font-mono tracking-wider"
          >
            <Network className="w-4 h-4 text-neutral-400" />
            <span>Lineage DAG</span>
          </button>
        </div>

        {/* Live Empirical Verification Proofs Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 text-left">
          <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-lg">
            <div className="text-[11px] font-mono text-neutral-400 uppercase">DBT CORE WAREHOUSE</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">21 Models</div>
            <div className="text-[11px] text-neutral-400 font-sans mt-0.5">Staging, Kimball core facts, dims & marts</div>
          </div>
          <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-lg">
            <div className="text-[11px] font-mono text-neutral-400 uppercase">AUTOMATED TESTS</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">65 Passed</div>
            <div className="text-[11px] text-neutral-400 font-sans mt-0.5">Schema integrity, referential & singular rules</div>
          </div>
          <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-lg">
            <div className="text-[11px] font-mono text-neutral-400 uppercase">FINANCIAL PARITY</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">98.91%</div>
            <div className="text-[11px] text-neutral-400 font-sans mt-0.5">0 join fanout; R$ 1.00 tolerance audited</div>
          </div>
          <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-lg">
            <div className="text-[11px] font-mono text-neutral-400 uppercase">OLAP ENGINE</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">&lt; 10ms</div>
            <div className="text-[11px] text-neutral-400 font-sans mt-0.5">DuckDB columnar vectorized execution</div>
          </div>
        </div>
      </section>

      {/* ── 2. Three Feature Highlights ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="border-b border-neutral-800 pb-4">
          <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
            CORE METHODOLOGY
          </div>
          <h2 className="text-2xl font-mono font-bold text-white mt-1">
            Engineered For Reliability & Trust
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Highlight 01 */}
          <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>HIGHLIGHT 01</span>
                <Box className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white">
                Dimensional Modeling
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Build facts, dimensions, and analytical marts with explicitly defined grains and relationships. 
                Prevents revenue duplication by grouping multi-item line charges before joining order headers.
              </p>
            </div>
            <button
              onClick={() => onNavigate('models')}
              className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-xs font-mono text-white hover:underline group"
            >
              <span>Inspect Kimball Models</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Highlight 02 */}
          <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>HIGHLIGHT 02</span>
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white">
                Data Quality
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Validate uniqueness, relationships, business rules, and source-to-warehouse reconciliation. 
                Automated gates isolate invalid temporal sequences and negative amounts into transparent quarantine.
              </p>
            </div>
            <button
              onClick={() => onNavigate('reconciliation')}
              className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-xs font-mono text-white hover:underline group"
            >
              <span>View Reconciliation Audit</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Highlight 03 */}
          <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>HIGHLIGHT 03</span>
                <Network className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white">
                Model Lineage
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Trace how source datasets become staging models, transformations, facts, dimensions, and business insights. 
                Every metric is auditable back to its exact origin with full upstream/downstream impact analysis.
              </p>
            </div>
            <button
              onClick={() => onNavigate('lineage')}
              className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-xs font-mono text-white hover:underline group"
            >
              <span>Open Lineage DAG</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. Interactive Centerpiece: Follow the Data ───────────────────── */}
      <section id="follow-the-data" className="max-w-6xl mx-auto space-y-8 scroll-mt-20">
        <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-neutral-400 mb-1">
              <Workflow className="w-4 h-4 text-white" />
              <span>Centerpiece Architecture Explorer</span>
            </div>
            <h2 className="text-3xl font-mono font-bold text-white">
              FOLLOW THE DATA
            </h2>
            <p className="text-neutral-400 text-sm mt-1 max-w-2xl font-sans">
              From raw commerce events to trusted business decisions. Select any stage to inspect transformation logic, schemas, and live verified metrics.
            </p>
          </div>

          {/* Dual Explanation Mode Switch */}
          <div className="flex items-center border border-neutral-800 bg-neutral-900 rounded p-0.5 shrink-0">
            <button
              onClick={() => onTogglePersona('business')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                personaMode === 'business'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Business Mode
            </button>
            <button
              onClick={() => onTogglePersona('engineering')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                personaMode === 'engineering'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Engineering Mode
            </button>
          </div>
        </div>

        {/* 6-Stage Pipeline Node Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'raw_sources', name: 'Raw Sources', subtitle: '8 CSV Files', badge: 'SOURCES' },
            { id: 'silver', name: 'Staging', subtitle: 'stg_* Views', badge: 'CLEAN' },
            { id: 'ingestion', name: 'Intermediate', subtitle: 'int_* Models', badge: 'TRANSFORM' },
            { id: 'dimensional_models', name: 'Facts & Dims', subtitle: 'Kimball Core', badge: 'STAR SCHEMA' },
            { id: 'analytics_marts', name: 'Analytics Marts', subtitle: 'mart_* & SCD2', badge: 'METRICS' },
            { id: 'business_insights', name: 'Business Insights', subtitle: 'Live Decisions', badge: 'PROD APIS' },
          ].map((stage, idx) => {
            const isSelected = activeStageId === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={`p-4 rounded border text-left transition-all relative ${
                  isSelected
                    ? 'border-white bg-neutral-900 shadow-md ring-1 ring-white/20'
                    : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                  <span>0{idx + 1}</span>
                  <span className="px-1.5 py-0.2 border border-neutral-800 rounded bg-black/60 text-[9px] text-neutral-300">
                    {stage.badge}
                  </span>
                </div>
                <div className="font-mono font-bold text-sm text-white truncate">
                  {stage.name}
                </div>
                <div className="text-[11px] text-neutral-400 font-sans mt-0.5 truncate">
                  {stage.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Detail Drawer */}
        {activeStage && (
          <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 mb-1">
                  <span>STAGE 0{activeStage.stage_index} OF 07</span>
                  <span>&bull;</span>
                  <span className="text-white uppercase font-bold">{activeStage.badge}</span>
                </div>
                <h3 className="text-2xl font-mono font-bold text-white">
                  {activeStage.title}
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onNavigate('flow')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 rounded text-xs font-mono text-white transition-colors"
                >
                  <span>Open Full Flow</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Content Based on Selected Persona Mode */}
            {personaMode === 'business' ? (
              <div className="space-y-6">
                <div className="p-4 border border-neutral-800 bg-neutral-900/40 rounded text-sm text-neutral-300 font-sans leading-relaxed">
                  <strong className="text-white font-mono block mb-1">Summary:</strong>
                  {activeStage.business_summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-neutral-800 bg-neutral-900/40 rounded space-y-2">
                    <div className="text-xs font-mono text-white font-bold uppercase">What It Does</div>
                    <div className="text-xs text-neutral-300 font-sans leading-relaxed">
                      {activeStage.business_explanation.what_it_does}
                    </div>
                  </div>

                  <div className="p-4 border border-neutral-800 bg-neutral-900/40 rounded space-y-2">
                    <div className="text-xs font-mono text-white font-bold uppercase">Why It Exists</div>
                    <div className="text-xs text-neutral-300 font-sans leading-relaxed">
                      {activeStage.business_explanation.why_it_exists}
                    </div>
                  </div>

                  <div className="p-4 border border-neutral-800 bg-neutral-900/40 rounded space-y-2">
                    <div className="text-xs font-mono text-white font-bold uppercase">E-Commerce Analogy</div>
                    <div className="text-xs text-neutral-300 font-sans leading-relaxed italic">
                      "{activeStage.business_explanation.example}"
                    </div>
                  </div>

                  <div className="p-4 border border-neutral-800 bg-neutral-900/40 rounded space-y-2">
                    <div className="text-xs font-mono text-white font-bold uppercase">Key Business Value</div>
                    <div className="text-xs text-neutral-300 font-sans leading-relaxed">
                      {activeStage.business_explanation.key_takeaway}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 border border-neutral-800 bg-neutral-900/50 rounded space-y-2 font-mono text-xs">
                  <div className="text-neutral-400 uppercase text-[10px]">Technical Implementation</div>
                  <div className="text-neutral-200 leading-relaxed font-sans text-xs">
                    {activeStage.engineering_explanation.technical_details}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-neutral-800 bg-neutral-900/30 rounded space-y-2">
                    <div className="text-xs font-mono text-white font-bold uppercase">Verified Quality Checks</div>
                    <ul className="space-y-1.5 text-xs text-neutral-300 font-mono">
                      {activeStage.engineering_explanation.quality_checks.map((check, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 border border-neutral-800 bg-neutral-900/30 rounded space-y-2">
                    <div className="text-xs font-mono text-white font-bold uppercase">Verified Metrics & Performance</div>
                    <div className="space-y-1.5 font-mono text-xs text-neutral-300">
                      {Object.entries(activeStage.engineering_explanation.verified_metrics).map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-neutral-800/60 pb-1">
                          <span className="text-neutral-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-white font-bold">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="p-3 border border-neutral-800 bg-neutral-900/20 rounded">
                    <span className="text-neutral-400 text-[10px] uppercase block mb-1">Upstream Sources:</span>
                    <div className="text-white">{activeStage.engineering_explanation.upstream.join(', ')}</div>
                  </div>
                  <div className="p-3 border border-neutral-800 bg-neutral-900/20 rounded">
                    <span className="text-neutral-400 text-[10px] uppercase block mb-1">Downstream Dependents:</span>
                    <div className="text-white">{activeStage.engineering_explanation.downstream.join(', ')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 4. Core Models Showcase ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="border-b border-neutral-800 pb-4 flex items-end justify-between">
          <div>
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
              WAREHOUSE CATALOG
            </div>
            <h2 className="text-2xl font-mono font-bold text-white mt-1">
              Curated Analytical Models
            </h2>
          </div>
          <button
            onClick={() => onNavigate('models')}
            className="text-xs font-mono text-white hover:underline flex items-center space-x-1"
          >
            <span>Browse All 22 Models</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto border border-neutral-800 bg-neutral-950 rounded-lg">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                <th className="py-3 px-4">MODEL NAME</th>
                <th className="py-3 px-4">LAYER</th>
                <th className="py-3 px-4">GRAIN DEFINITION</th>
                <th className="py-3 px-4 text-right">ROW COUNT</th>
                <th className="py-3 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              {models.slice(0, 8).map((m) => (
                <tr key={m.name} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">
                    {m.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 border border-neutral-700 bg-neutral-900 text-neutral-300 rounded uppercase">
                      {m.layer}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-400 font-sans text-xs">
                    {m.grain}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    {m.row_count.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onNavigate('models', m.name)}
                      className="px-2.5 py-1 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-white rounded text-[11px] transition-colors"
                    >
                      View SQL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. Clean Monochrome Footer ───────────────────────────────────── */}
      <footer className="border-t border-neutral-800/80 pt-8 max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono text-neutral-400">
        <div>
          <div className="text-white font-semibold mb-0.5">MODELCRAFT Platform</div>
          <div>Analytics Engineering &bull; Modern dbt Core &bull; DuckDB OLAP &bull; React 19</div>
        </div>
        <div className="text-left md:text-right">
          <div>Continuous Automated Reconciliation &bull; 98.91% Parity</div>
          <div>Strict Monochrome Dark Architecture</div>
        </div>
      </footer>
    </div>
  );
};
