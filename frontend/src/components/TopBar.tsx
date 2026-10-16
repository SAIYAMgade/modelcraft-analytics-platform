import React from 'react';
import { 
  Menu, 
  Search, 
  Briefcase, 
  Terminal, 
  Database,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { PageId, PersonaMode } from './Sidebar';

interface TopBarProps {
  currentPage: PageId;
  onOpenMobile: () => void;
  personaMode: PersonaMode;
  onTogglePersona: (mode: PersonaMode) => void;
  onSelectPage: (page: PageId) => void;
  isOnline: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  onOpenMobile,
  personaMode,
  onTogglePersona,
  onSelectPage,
  isOnline
}) => {
  const getBreadcrumbs = (): { category: string; pageTitle: string } => {
    switch (currentPage) {
      case 'home':
        return { category: 'Overview', pageTitle: 'Home' };
      case 'getting-started':
        return { category: 'Overview', pageTitle: 'Getting Started' };
      case 'flow':
        return { category: 'Data Exploration', pageTitle: 'Follow the Data' };
      case 'sources':
        return { category: 'Data Exploration', pageTitle: 'Data Sources' };
      case 'quality':
        return { category: 'Data Exploration', pageTitle: 'Data Quality' };
      case 'models':
        return { category: 'Modeling', pageTitle: 'SQL Models' };
      case 'lineage':
        return { category: 'Modeling', pageTitle: 'Model Lineage' };
      case 'schema':
        return { category: 'Modeling', pageTitle: 'Star Schema' };
      case 'analytics':
        return { category: 'Modeling', pageTitle: 'Commercial Marts' };
      case 'reconciliation':
        return { category: 'Operations', pageTitle: 'Data Reconciliation' };
      case 'warehouse':
        return { category: 'Operations', pageTitle: 'DuckDB Warehouse' };
      case 'runs':
        return { category: 'Operations', pageTitle: 'Build & Test Runs' };
      case 'documentation':
        return { category: 'Resources', pageTitle: 'Documentation' };
      case 'architecture':
        return { category: 'Resources', pageTitle: 'Architecture' };
      default:
        return { category: 'Studio', pageTitle: 'ModelCraft' };
    }
  };

  const { category, pageTitle } = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E2E8F0] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-xs font-medium text-[#64748B]">
          <span>ModelCraft</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1]" />
          <span className="hidden sm:inline">{category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] hidden sm:inline" />
          <span className="font-semibold text-[#0F172A]">{pageTitle}</span>
        </div>
      </div>

      {/* Right: Dual Persona Mode & Warehouse Pill */}
      <div className="flex items-center space-x-3">
        {/* Persona Mode Switch */}
        <div className="flex items-center bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => onTogglePersona('business')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all ${
              personaMode === 'business'
                ? 'bg-white text-[#0F172A] font-semibold shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Business Mode</span>
            <span className="sm:hidden">Biz</span>
          </button>
          <button
            onClick={() => onTogglePersona('engineering')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all ${
              personaMode === 'engineering'
                ? 'bg-white text-[#0F172A] font-semibold shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Engineering Mode</span>
            <span className="sm:hidden">Eng</span>
          </button>
        </div>

        {/* Database Status Indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[#475569]">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span>DuckDB 1.0+</span>
        </div>
      </div>
    </header>
  );
};
