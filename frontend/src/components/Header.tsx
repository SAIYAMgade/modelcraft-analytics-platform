import React from 'react';
import { 
  Layers, 
  Database, 
  Activity, 
  ShieldCheck, 
  BarChart3, 
  Radio, 
  Cpu, 
  FileText, 
  GitBranch, 
  Box,
  Briefcase,
  Terminal,
  FileCheck,
  Workflow,
  Network,
  Code2,
  Scale
} from 'lucide-react';

export type PageId = 
  | 'modelcraft'
  | 'flow'
  | 'lineage'
  | 'models'
  | 'reconciliation'
  | 'analytics'
  | 'warehouse'
  | 'quality'
  | 'sources'
  | 'overview'
  | 'documentation';

export type PersonaMode = 'business' | 'engineering';

interface HeaderProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  personaMode: PersonaMode;
  onTogglePersona: (mode: PersonaMode) => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onSelectPage,
  personaMode,
  onTogglePersona,
  isOnline
}) => {
  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; highlight?: boolean }> = [
    { id: 'modelcraft', label: 'Platform Home', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'flow', label: 'Follow The Data', icon: <Workflow className="w-3.5 h-3.5" />, highlight: true },
    { id: 'models', label: 'SQL Models', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'lineage', label: 'Lineage DAG', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'reconciliation', label: 'Reconciliation', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'analytics', label: 'Commercial Marts', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'warehouse', label: 'DuckDB Warehouse', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'quality', label: 'Data Quality', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'sources', label: 'Data Sources', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'documentation', label: 'Docs', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-50">
      {/* Top Banner: Brand, Dual-Mode Persona Switch, System Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={() => onSelectPage('modelcraft')} 
          className="flex items-center space-x-3 text-left group focus:outline-none"
          title="Go to ModelCraft Platform Home"
        >
          <div className="w-6 h-6 border-2 border-white bg-black flex items-center justify-center font-mono font-bold text-xs text-white group-hover:bg-white group-hover:text-black transition-colors">
            MC
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-widest text-white uppercase font-mono">
                MODELCRAFT
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 border border-neutral-700 rounded text-neutral-400">
                ANALYTICS ENG
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              dbt Core 1.12 &bull; DuckDB OLAP &bull; Kimball Dimensional Modeling
            </div>
          </div>
        </button>

        {/* Dual Mode Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-neutral-800 bg-neutral-900 rounded p-0.5">
            <button
              onClick={() => onTogglePersona('business')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                personaMode === 'business'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Business Overview</span>
            </button>
            <button
              onClick={() => onTogglePersona('engineering')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                personaMode === 'engineering'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Engineering Console</span>
            </button>
          </div>

          {/* Quick launch to ModelCraft Home */}
          <button
            onClick={() => onSelectPage('modelcraft')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-mono transition-all border ${
              currentPage === 'modelcraft'
                ? 'bg-white text-black border-white font-semibold'
                : 'border-neutral-800 bg-black text-neutral-300 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>HOME</span>
          </button>

          {/* Connection status indicator */}
          <div className="flex items-center space-x-1.5 text-xs font-mono border border-neutral-800 px-2.5 py-1 rounded bg-black">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white' : 'bg-neutral-600 animate-pulse'}`} />
            <span className="text-neutral-300">{isOnline ? 'DUCKDB ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="border-t border-neutral-900 bg-black overflow-x-auto">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 py-1.5">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                    : item.highlight
                    ? 'text-white border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
